import Link from "next/link";

import { Badge } from "@/components/ui/badge";

type ConversationSummary = {
  id: string;
  counterpartId: string;
  counterpartName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type MessagingPreviewPanelProps = {
  title: string;
  description: string;
  href?: string;
  contactsCount: number;
  conversations: ConversationSummary[];
  emptyTitle: string;
  emptyBody: string;
};

function formatThreadDate(dateString: string | null) {
  if (!dateString) {
    return "Aucun échange";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(dateString));
}

export function MessagingPreviewPanel({
  title,
  description,
  href = "/messages",
  contactsCount,
  conversations,
  emptyTitle,
  emptyBody
}: MessagingPreviewPanelProps) {
  const unreadConversationCount = conversations.filter((conversation) => conversation.unreadCount > 0).length;
  const unreadMessageCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  return (
    <section className="panel messaging-preview-panel">
      <div className="panel-header messaging-preview-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <Link className="button button-secondary" href={href}>
          Ouvrir l&apos;inbox
        </Link>
      </div>

      <div className="messaging-preview-stats">
        <article>
          <strong>{contactsCount}</strong>
          <small>contact(s) disponibles</small>
        </article>
        <article>
          <strong>{conversations.length}</strong>
          <small>fil(s) actifs</small>
        </article>
        <article>
          <strong>{unreadMessageCount}</strong>
          <small>message(s) non lus</small>
        </article>
      </div>

      {conversations.length ? (
        <div className="messaging-preview-list">
          {conversations.map((conversation) => (
            <article className="messaging-preview-item" key={conversation.id}>
              <div>
                <div className="messaging-preview-item-topline">
                  <strong>{conversation.counterpartName}</strong>
                  {conversation.unreadCount ? <Badge tone="accent">A lire</Badge> : <Badge tone="neutral">A jour</Badge>}
                </div>
                <p>{conversation.lastMessagePreview || "Aucun message pour l'instant."}</p>
                <small>{formatThreadDate(conversation.lastMessageAt)}</small>
              </div>
              <div className="messaging-preview-item-meta">
                {conversation.unreadCount ? <span>{conversation.unreadCount}</span> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>{emptyTitle}</strong>
          <p>{emptyBody}</p>
        </div>
      )}

      <div className="messaging-preview-footnote">
        <p>
          {unreadConversationCount
            ? `${unreadConversationCount} conversation(s) attendent une réponse.`
            : "Les échanges complets sont maintenant regroupés dans une inbox dédiée plus légère pour le dashboard."}
        </p>
      </div>
    </section>
  );
}
