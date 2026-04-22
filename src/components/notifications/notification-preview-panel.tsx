import Link from "next/link";

import { Badge } from "@/components/ui/badge";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  deeplink?: string | null;
};

type NotificationPreviewPanelProps = {
  title: string;
  description: string;
  href?: string;
  notifications: NotificationItem[];
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(dateString));
}

export function NotificationPreviewPanel({
  title,
  description,
  href = "/notifications",
  notifications
}: NotificationPreviewPanelProps) {
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const actionableCount = notifications.filter((item) => Boolean(item.deeplink)).length;

  return (
    <section className="panel dashboard-notification-panel notification-preview-panel">
      <div className="panel-header messaging-preview-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <Link className="button button-secondary" href={href}>
          Voir tout
        </Link>
      </div>

      <div className="messaging-preview-stats">
        <article>
          <strong>{notifications.length}</strong>
          <small>événements récents</small>
        </article>
        <article>
          <strong>{unreadCount}</strong>
          <small>encore à lire</small>
        </article>
        <article>
          <strong>{actionableCount}</strong>
          <small>ouvrent une action</small>
        </article>
      </div>

      {notifications.length ? (
        <div className="messaging-preview-list notification-preview-list">
          {notifications.slice(0, 4).map((item) => (
            <article className="messaging-preview-item notification-preview-item" key={item.id}>
              <div>
                <div className="messaging-preview-item-topline">
                  <strong>{item.title}</strong>
                  {!item.read_at ? <Badge tone="accent">Nouveau</Badge> : <Badge tone="neutral">Lu</Badge>}
                </div>
                <p>{item.body || "Notification système ECCE"}</p>
                <small>{formatDate(item.created_at)}</small>
              </div>
              <div className="table-actions">
                {item.deeplink ? <Badge tone="success">Action</Badge> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>Aucune notification.</strong>
          <p>Le centre live dédié affichera ici les prochains événements.</p>
        </div>
      )}
    </section>
  );
}
