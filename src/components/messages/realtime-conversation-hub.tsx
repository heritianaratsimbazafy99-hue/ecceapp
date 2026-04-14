"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  sendConversationMessageAction,
  type MessageActionState
} from "@/app/(platform)/messages/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ContactOption = {
  id: string;
  label: string;
};

type ConversationSummary = {
  id: string;
  counterpartId: string;
  counterpartName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type ConversationMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  mine: boolean;
};

type ConversationRecord = {
  id: string;
  coach_id: string;
  coachee_id: string;
  updated_at: string;
};

type MessagingHubProps = {
  userId: string;
  contacts: ContactOption[];
  conversations: ConversationSummary[];
  initialMessages: ConversationMessage[];
  initialConversationId: string | null;
  title: string;
  description: string;
  composerPlaceholder: string;
  emptyTitle: string;
  emptyBody: string;
};

const initialState: MessageActionState = {};

function sortConversations(items: ConversationSummary[]) {
  return [...items].sort((left, right) => {
    const leftDate = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
    const rightDate = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;

    return rightDate - leftDate;
  });
}

function sortMessages(items: ConversationMessage[]) {
  return [...items].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

function formatThreadDate(dateString: string | null) {
  if (!dateString) {
    return "Nouveau fil";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(dateString));
}

function normalizeMessage(
  payload: Partial<{
    id: string;
    conversation_id: string;
    sender_id: string;
    recipient_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
  }>,
  userId: string
): ConversationMessage | null {
  if (!payload.id || !payload.conversation_id || !payload.sender_id || !payload.recipient_id) {
    return null;
  }

  return {
    id: payload.id,
    conversationId: payload.conversation_id,
    senderId: payload.sender_id,
    recipientId: payload.recipient_id,
    body: payload.body ?? "",
    createdAt: payload.created_at ?? new Date().toISOString(),
    readAt: payload.read_at ?? null,
    mine: payload.sender_id === userId
  };
}

async function fetchConversationRecord(
  supabase: SupabaseClient,
  conversationId: string
) {
  const result = await supabase
    .from("coach_conversations")
    .select("id, coach_id, coachee_id, updated_at")
    .eq("id", conversationId)
    .maybeSingle<ConversationRecord>();

  return result.data ?? null;
}

async function fetchConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
) {
  const { data } = await supabase
    .from("coach_messages")
    .select("id, conversation_id, sender_id, recipient_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(60);

  return sortMessages(
    ((data ?? [])
      .map((item) => normalizeMessage(item, userId))
      .filter(Boolean) as ConversationMessage[])
  );
}

function upsertConversationSummary(
  current: ConversationSummary[],
  next: ConversationSummary
) {
  const map = new Map(current.map((item) => [item.id, item]));
  const existing = map.get(next.id);

  map.set(next.id, {
    ...existing,
    ...next,
    unreadCount: next.unreadCount ?? existing?.unreadCount ?? 0
  });

  return sortConversations(Array.from(map.values()));
}

function MessageSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? "Envoi..." : "Envoyer"}
    </button>
  );
}

export function RealtimeConversationHub({
  userId,
  contacts,
  conversations: initialConversations,
  initialMessages,
  initialConversationId,
  title,
  description,
  composerPlaceholder,
  emptyTitle,
  emptyBody
}: MessagingHubProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const contactMap = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact.label])),
    [contacts]
  );
  const [state, formAction] = useActionState(sendConversationMessageAction, initialState);
  const [conversations, setConversations] = useState(() => sortConversations(initialConversations));
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ConversationMessage[]>>(
    () => (initialConversationId ? { [initialConversationId]: initialMessages } : {})
  );
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId
  );
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    initialConversations[0]?.counterpartId ?? contacts[0]?.id ?? ""
  );
  const [liveBanner, setLiveBanner] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);
  const selectedConversationRef = useRef<string | null>(initialConversationId);

  const selectedConversation = conversations.find((item) => item.id === selectedConversationId) ?? null;
  const currentRecipientId = selectedConversation?.counterpartId ?? selectedRecipientId;
  const currentMessages = useMemo(
    () => (selectedConversationId ? messagesByConversation[selectedConversationId] ?? [] : []),
    [messagesByConversation, selectedConversationId]
  );

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    const conversationFromUrl = new URLSearchParams(window.location.search).get("conversation");

    if (conversationFromUrl) {
      setSelectedConversationId(conversationFromUrl);
    }
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const hasMessages = Boolean(messagesByConversation[selectedConversationId]?.length);

    if (!hasMessages) {
      void (async () => {
        const nextMessages = await fetchConversationMessages(supabase, selectedConversationId, userId);
        setMessagesByConversation((current) => ({
          ...current,
          [selectedConversationId]: nextMessages
        }));
      })();
    }

    if (selectedConversation?.unreadCount) {
      const readAt = new Date().toISOString();

      setConversations((current) =>
        current.map((item) =>
          item.id === selectedConversationId ? { ...item, unreadCount: 0 } : item
        )
      );
      setMessagesByConversation((current) => {
        const items = current[selectedConversationId] ?? [];

        return {
          ...current,
          [selectedConversationId]: items.map((item) =>
            item.recipientId === userId && !item.readAt ? { ...item, readAt } : item
          )
        };
      });

      void supabase
        .from("coach_messages")
        .update({ read_at: readAt })
        .eq("conversation_id", selectedConversationId)
        .eq("recipient_id", userId)
        .is("read_at", null);
    }
  }, [messagesByConversation, selectedConversation, selectedConversationId, supabase, userId]);

  useEffect(() => {
    if (!currentMessages.length || !scrollerRef.current) {
      return;
    }

    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [currentMessages]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    if (textareaRef.current) {
      textareaRef.current.value = "";
    }

    if (state.conversationId) {
      setSelectedConversationId(state.conversationId);
    }

    if (state.recipientId) {
      setSelectedRecipientId(state.recipientId);
    }
  }, [state]);

  useEffect(() => {
    const channel = supabase
      .channel(`coach-messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coach_messages",
          filter: `recipient_id=eq.${userId}`
        },
        async (payload) => {
          const nextMessage = normalizeMessage(
            payload.new as {
              id: string;
              conversation_id: string;
              sender_id: string;
              recipient_id: string;
              body: string;
              created_at: string;
              read_at: string | null;
            },
            userId
          );

          if (!nextMessage) {
            return;
          }

          setMessagesByConversation((current) => ({
            ...current,
            [nextMessage.conversationId]: sortMessages([
              ...(current[nextMessage.conversationId] ?? []),
              nextMessage
            ])
          }));

          const conversation = await fetchConversationRecord(supabase, nextMessage.conversationId);
          if (conversation) {
            const counterpartId =
              conversation.coach_id === userId ? conversation.coachee_id : conversation.coach_id;

            setConversations((current) => {
              const existing = current.find((item) => item.id === conversation.id);

              return upsertConversationSummary(current, {
                id: conversation.id,
                counterpartId,
                counterpartName: contactMap.get(counterpartId) ?? "Participant ECCE",
                lastMessagePreview: nextMessage.body,
                lastMessageAt: nextMessage.createdAt,
                unreadCount:
                  selectedConversationRef.current === nextMessage.conversationId
                    ? 0
                    : (existing?.unreadCount ?? 0) + 1
              });
            });
          }

          if (selectedConversationRef.current === nextMessage.conversationId) {
            const readAt = new Date().toISOString();
            void supabase
              .from("coach_messages")
              .update({ read_at: readAt })
              .eq("id", nextMessage.id)
              .eq("recipient_id", userId)
              .is("read_at", null);
          } else {
            setLiveBanner(`Nouveau message de ${contactMap.get(nextMessage.senderId) ?? "ton coach"}.`);

            if (bannerTimeoutRef.current) {
              window.clearTimeout(bannerTimeoutRef.current);
            }

            bannerTimeoutRef.current = window.setTimeout(() => {
              setLiveBanner(null);
            }, 3000);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coach_messages",
          filter: `sender_id=eq.${userId}`
        },
        async (payload) => {
          const nextMessage = normalizeMessage(
            payload.new as {
              id: string;
              conversation_id: string;
              sender_id: string;
              recipient_id: string;
              body: string;
              created_at: string;
              read_at: string | null;
            },
            userId
          );

          if (!nextMessage) {
            return;
          }

          setMessagesByConversation((current) => ({
            ...current,
            [nextMessage.conversationId]: sortMessages([
              ...(current[nextMessage.conversationId] ?? []),
              nextMessage
            ])
          }));

          const conversation = await fetchConversationRecord(supabase, nextMessage.conversationId);
          if (!conversation) {
            return;
          }

          const counterpartId =
            conversation.coach_id === userId ? conversation.coachee_id : conversation.coach_id;

          setConversations((current) =>
            upsertConversationSummary(current, {
              id: conversation.id,
              counterpartId,
              counterpartName: contactMap.get(counterpartId) ?? "Participant ECCE",
              lastMessagePreview: nextMessage.body,
              lastMessageAt: nextMessage.createdAt,
              unreadCount: current.find((item) => item.id === conversation.id)?.unreadCount ?? 0
            })
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "coach_messages",
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          const nextMessage = normalizeMessage(
            payload.new as {
              id: string;
              conversation_id: string;
              sender_id: string;
              recipient_id: string;
              body: string;
              created_at: string;
              read_at: string | null;
            },
            userId
          );

          if (!nextMessage) {
            return;
          }

          setMessagesByConversation((current) => ({
            ...current,
            [nextMessage.conversationId]: sortMessages(
              (current[nextMessage.conversationId] ?? []).map((item) =>
                item.id === nextMessage.id ? nextMessage : item
              )
            )
          }));
          setConversations((current) =>
            current.map((item) =>
              item.id === nextMessage.conversationId
                ? { ...item, unreadCount: nextMessage.readAt ? 0 : item.unreadCount }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      if (bannerTimeoutRef.current) {
        window.clearTimeout(bannerTimeoutRef.current);
      }

      void supabase.removeChannel(channel);
    };
  }, [contactMap, supabase, userId]);

  return (
    <section className="panel panel-messaging">
      <div className="panel-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      {liveBanner ? <div className="message-live-banner">{liveBanner}</div> : null}

      {contacts.length ? (
        <div className="conversation-shell">
          <aside className="conversation-sidebar">
            <div className="conversation-sidebar-head">
              <strong>Conversations</strong>
              <button
                className="inline-link button-reset"
                onClick={() => setSelectedConversationId(null)}
                type="button"
              >
                Nouveau message
              </button>
            </div>

            {conversations.length ? (
              <div className="conversation-list">
                {conversations.map((conversation) => (
                  <button
                    className={cn(
                      "conversation-list-item",
                      selectedConversationId === conversation.id && "is-active"
                    )}
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversationId(conversation.id);
                      setSelectedRecipientId(conversation.counterpartId);
                    }}
                    type="button"
                  >
                    <div>
                      <strong>{conversation.counterpartName}</strong>
                      <p>{conversation.lastMessagePreview || "Aucun message pour l'instant."}</p>
                    </div>
                    <div className="conversation-meta">
                      <small>{formatThreadDate(conversation.lastMessageAt)}</small>
                      {conversation.unreadCount ? (
                        <span className="conversation-unread">{conversation.unreadCount}</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>{emptyTitle}</strong>
                <p>{emptyBody}</p>
              </div>
            )}
          </aside>

          <div className="conversation-panel">
            <div className="conversation-panel-head">
              <div>
                <strong>
                  {selectedConversation?.counterpartName ??
                    contactMap.get(selectedRecipientId) ??
                    "Nouvelle conversation"}
                </strong>
                <p>
                  {selectedConversation
                    ? "Messagerie en direct via Supabase Realtime."
                    : "Choisis un contact puis envoie ton premier message."}
                </p>
              </div>
            </div>

            <div className="conversation-messages" ref={scrollerRef}>
              {selectedConversationId && currentMessages.length ? (
                currentMessages.map((message) => (
                  <article
                    className={cn("message-bubble", message.mine && "is-mine")}
                    key={message.id}
                  >
                    <p>{message.body}</p>
                    <small>
                      {formatThreadDate(message.createdAt)}
                      {message.mine && message.readAt ? " · lu" : ""}
                    </small>
                  </article>
                ))
              ) : (
                <div className="empty-state empty-state-compact">
                  <strong>{selectedConversationId ? "Commence la discussion" : emptyTitle}</strong>
                  <p>{selectedConversationId ? "Le fil est prêt, tu peux écrire ton prochain message." : emptyBody}</p>
                </div>
              )}
            </div>

            <form action={formAction} className="conversation-composer">
              <input name="recipient_id" type="hidden" value={currentRecipientId} />

              {!selectedConversationId ? (
                <label>
                  Destinataire
                  <select
                    name="recipient_id"
                    onChange={(event) => setSelectedRecipientId(event.target.value)}
                    required
                    value={selectedRecipientId}
                  >
                    <option disabled value="">
                      Choisir un contact
                    </option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label>
                Message
                <textarea
                  name="body"
                  placeholder={composerPlaceholder}
                  ref={textareaRef}
                  required
                  rows={4}
                />
              </label>

              {state.error ? <p className="form-error">{state.error}</p> : null}
              {state.success ? <p className="form-success">{state.success}</p> : null}

              <div className="conversation-composer-actions">
                <span className="form-helper">
                  Les nouveaux messages arrivent ici sans recharger la page.
                </span>
                <MessageSubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <strong>Aucun contact disponible.</strong>
          <p>Ajoute au moins un coach ou un coaché actif pour démarrer une conversation.</p>
        </div>
      )}
    </section>
  );
}
