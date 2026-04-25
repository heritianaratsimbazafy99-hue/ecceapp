import { formatMessagePreview } from "@/lib/platform-display";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ConversationRow = {
  id: string;
  coach_id: string;
  coachee_id: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type CoachConversationNoteRow = {
  conversation_id: string;
  body: string;
  next_follow_up_at: string | null;
  updated_at: string;
};

export async function getMessagingWorkspace(params: {
  organizationId: string;
  userId: string;
  viewerRole: "coach" | "coachee";
  contactOptions: Array<{ id: string; label: string }>;
  selectedConversationId?: string | null;
  conversationLimit?: number;
  recentMessageLimit?: number;
  initialMessageLimit?: number;
  includeInitialMessages?: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const conversationLimit = params.conversationLimit ?? 12;
  const recentMessageLimit = params.recentMessageLimit ?? 120;
  const initialMessageLimit = params.initialMessageLimit ?? 60;
  const includeInitialMessages = params.includeInitialMessages ?? true;

  let conversationQuery = admin
    .from("coach_conversations")
    .select("id, coach_id, coachee_id, updated_at")
    .eq("organization_id", params.organizationId)
    .order("updated_at", { ascending: false });

  const contactIds = params.contactOptions.map((contact) => contact.id);

  conversationQuery =
    params.viewerRole === "coach"
      ? conversationQuery.eq("coach_id", params.userId)
      : conversationQuery.eq("coachee_id", params.userId);

  if (contactIds.length) {
    conversationQuery =
      params.viewerRole === "coach"
        ? conversationQuery.in("coachee_id", contactIds)
        : conversationQuery.in("coach_id", contactIds);
  } else {
    return {
      contacts: params.contactOptions,
      conversations: [],
      initialConversationId: null,
      initialMessages: [],
      recentMessages: []
    };
  }

  const conversationsResult = await conversationQuery.limit(conversationLimit);
  let conversationRows = (conversationsResult.data ?? []) as ConversationRow[];
  const selectedConversationId = params.selectedConversationId ?? null;

  if (selectedConversationId && !conversationRows.some((conversation) => conversation.id === selectedConversationId)) {
    let selectedConversationQuery = admin
      .from("coach_conversations")
      .select("id, coach_id, coachee_id, updated_at")
      .eq("organization_id", params.organizationId)
      .eq("id", selectedConversationId);

    selectedConversationQuery =
      params.viewerRole === "coach"
        ? selectedConversationQuery.eq("coach_id", params.userId)
        : selectedConversationQuery.eq("coachee_id", params.userId);

    const selectedConversationResult = await selectedConversationQuery.maybeSingle<ConversationRow>();
    const selectedConversation = selectedConversationResult.data;

    if (selectedConversation) {
      const selectedCounterpartId =
        params.viewerRole === "coach" ? selectedConversation.coachee_id : selectedConversation.coach_id;

      if (contactIds.includes(selectedCounterpartId)) {
        conversationRows = [selectedConversation, ...conversationRows];
      }
    }
  }

  const conversationIds = conversationRows.map((conversation) => conversation.id);

  const messageRows = conversationIds.length
    ? ((await admin
        .from("coach_messages")
        .select("id, conversation_id, sender_id, recipient_id, body, created_at, read_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(recentMessageLimit)).data ?? []) as MessageRow[]
    : [];
  let noteRows: CoachConversationNoteRow[] = [];

  if (params.viewerRole === "coach" && conversationIds.length) {
    const notesResult = await admin
      .from("coach_conversation_notes")
      .select("conversation_id, body, next_follow_up_at, updated_at")
      .eq("organization_id", params.organizationId)
      .eq("coach_id", params.userId)
      .in("conversation_id", conversationIds);

    noteRows = notesResult.error ? [] : ((notesResult.data ?? []) as CoachConversationNoteRow[]);
  }

  const lastMessageByConversationId = new Map<string, MessageRow>();
  const unreadCountByConversationId = new Map<string, number>();
  const noteByConversationId = new Map(noteRows.map((note) => [note.conversation_id, note]));

  for (const message of messageRows) {
    if (!lastMessageByConversationId.has(message.conversation_id)) {
      lastMessageByConversationId.set(message.conversation_id, message);
    }

    if (message.recipient_id === params.userId && !message.read_at) {
      unreadCountByConversationId.set(
        message.conversation_id,
        (unreadCountByConversationId.get(message.conversation_id) ?? 0) + 1
      );
    }
  }

  const contactMap = new Map(params.contactOptions.map((contact) => [contact.id, contact.label]));
  const conversations = conversationRows.map((conversation) => {
    const counterpartId =
      params.viewerRole === "coach" ? conversation.coachee_id : conversation.coach_id;
    const lastMessage = lastMessageByConversationId.get(conversation.id);

    return {
      id: conversation.id,
      counterpartId,
      counterpartName: contactMap.get(counterpartId) ?? "Participant ECCE",
      lastMessagePreview: formatMessagePreview(lastMessage?.body ?? null),
      lastMessageAt: lastMessage?.created_at ?? conversation.updated_at,
      unreadCount: unreadCountByConversationId.get(conversation.id) ?? 0,
      coachNote: noteByConversationId.has(conversation.id)
        ? {
            body: noteByConversationId.get(conversation.id)?.body ?? "",
            nextFollowUpAt: noteByConversationId.get(conversation.id)?.next_follow_up_at ?? null,
            updatedAt: noteByConversationId.get(conversation.id)?.updated_at ?? conversation.updated_at
          }
        : null
    };
  });

  const initialConversationId =
    selectedConversationId && conversations.some((conversation) => conversation.id === selectedConversationId)
      ? selectedConversationId
      : conversations[0]?.id ?? null;
  const initialMessages = includeInitialMessages && initialConversationId
    ? (
        (
          await admin
            .from("coach_messages")
            .select("id, conversation_id, sender_id, recipient_id, body, created_at, read_at")
            .eq("conversation_id", initialConversationId)
            .order("created_at", { ascending: true })
            .limit(initialMessageLimit)
        ).data ?? []
      ).map((message) => ({
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        recipientId: message.recipient_id,
        body: message.body,
        createdAt: message.created_at,
        readAt: message.read_at,
        mine: message.sender_id === params.userId
      }))
    : [];

  return {
    contacts: params.contactOptions,
    conversations,
    initialConversationId,
    initialMessages,
    recentMessages: messageRows
  };
}
