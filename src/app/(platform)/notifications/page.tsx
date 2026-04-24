import Link from "next/link";

import { NotificationCommandCenter } from "@/components/notifications/realtime-notification-center";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { type NotificationOpsLane } from "@/lib/notification-ops";
import { getNotificationsPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildNotificationsHref({
  lane,
  page,
  query
}: {
  lane?: NotificationOpsLane | "all";
  page?: number;
  query?: string;
} = {}) {
  const searchParams = new URLSearchParams();

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  if (query?.trim()) {
    searchParams.set("query", query.trim());
  }

  if (page && page > 1) {
    searchParams.set("page", String(page));
  }

  const value = searchParams.toString();
  return value ? `/notifications?${value}` : "/notifications";
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: Promise<{
    lane?: string;
    page?: string;
    query?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    context,
    metrics,
    notifications,
    hero,
    filters,
    laneBreakdown,
    pageInfo,
    focusNotification,
    priorityNotifications,
    categorySpotlights,
    responsePlaybook
  } = await getNotificationsPageData({
    lane: params.lane,
    page: params.page,
    query: params.query
  });
  const activeLaneBadge =
    filters.lane === "all"
      ? null
      : laneBreakdown.find((lane) => lane.id === filters.lane)?.label ?? null;
  const dominantSpotlight = categorySpotlights[0] ?? null;

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Notifications"
        description="Command center premium pour trier les alertes ECCE entre action immédiate, lecture utile et archive exploitable sans casser le live."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight notifications-command-hero">
        <div className="notifications-command-copy">
          <span className="eyebrow">{hero.eyebrow}</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {activeLaneBadge ? <Badge tone="accent">{activeLaneBadge}</Badge> : null}
            {dominantSpotlight ? <Badge tone={dominantSpotlight.tone}>{dominantSpotlight.label}</Badge> : null}
          </div>

          <div className="messages-actions">
            <Link className="button" href={focusNotification?.href ?? "#notifications-live"}>
              Ouvrir le signal focus
            </Link>
            <Link className="button button-secondary" href={hero.crosslink.href}>
              {hero.crosslink.label}
            </Link>
            <Link className="button button-secondary" href="/account">
              Préférences
            </Link>
          </div>
        </div>

        <div className="notifications-command-side">
          <div className="notifications-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("notifications-lane-card", lane.isActive && "is-active")}
                href={buildNotificationsHref({
                  lane: filters.lane === lane.id ? "all" : lane.id,
                  query: filters.query
                })}
                key={lane.id}
              >
                <span>{lane.label}</span>
                <strong>{lane.count}</strong>
              </Link>
            ))}
          </div>

          <article className="notifications-focus-note">
            <span>Signal focus</span>
            <strong>{focusNotification?.title ?? "Flux live prêt"}</strong>
            <p>
              {focusNotification?.nextAction ??
                "Les prochains événements ECCE remonteront ici en temps réel dès qu'une activité pertinente arrive."}
            </p>
          </article>
        </div>
      </section>

      <section className="notifications-command-layout">
        <section className="panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Watchlist live</span>
              <h3>Les signaux à traiter en premier</h3>
              <p>
                Le flux temps réel reste la source de vérité. Cette vue ajoute la priorisation
                nécessaire pour ouvrir la bonne alerte, au bon moment.
              </p>
            </div>

            <Link className="button button-secondary" href="/notifications">
              Réinitialiser
            </Link>
          </div>

          <form className="library-search-bar" method="get">
            {filters.lane !== "all" ? <input name="lane" type="hidden" value={filters.lane} /> : null}
            <input
              defaultValue={filters.query}
              name="query"
              placeholder="Rechercher une notification, une action ou une destination..."
              type="search"
            />
            <button className="button button-secondary" type="submit">
              Rechercher
            </button>
          </form>

          <div className="tag-row">
            <Badge tone="neutral">
              {pageInfo.from}-{pageInfo.to} / {pageInfo.totalItems} signal(aux)
            </Badge>
            <Badge tone="accent">{priorityNotifications.length} dans la watchlist</Badge>
            {focusNotification ? <Badge tone={focusNotification.tone}>{focusNotification.categoryLabel}</Badge> : null}
          </div>

          <div className="notifications-playbook-grid">
            {responsePlaybook.map((item) => (
              <article className="notifications-playbook-card" key={item.title}>
                <Badge tone={item.tone}>{item.title}</Badge>
                <p>{item.body}</p>
                <Link className="inline-link" href={item.href}>
                  {item.cta}
                </Link>
              </article>
            ))}
          </div>

          {priorityNotifications.length ? (
            <div className="notifications-priority-list" id="notifications-watchlist">
              {priorityNotifications.map((notification) => {
                const content = (
                  <>
                    <div className="notifications-priority-copy">
                      <div className="notifications-priority-topline">
                        <strong>{notification.title}</strong>
                        <Badge tone={notification.tone}>{notification.laneLabel}</Badge>
                      </div>
                      <p>{notification.nextAction}</p>
                      <small>
                        {notification.categoryLabel} · {notification.recencyLabel} · {notification.createdAtLabel}
                      </small>
                    </div>

                    <div className="notifications-priority-meta">
                      <span>{notification.unread ? "Non lue" : "Lue"}</span>
                      <span>{notification.actionable ? "Ouvrable" : "Sans lien"}</span>
                    </div>
                  </>
                );

                return notification.href ? (
                  <Link className="notifications-priority-card" href={notification.href} key={notification.id}>
                    {content}
                  </Link>
                ) : (
                  <article className="notifications-priority-card is-static" key={notification.id}>
                    {content}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state empty-state-compact">
              <strong>Aucun signal dans cette vue.</strong>
              <p>Reviens sur la vue globale ou attends les prochains événements pour remplir la watchlist.</p>
            </div>
          )}

          {pageInfo.totalPages > 1 ? (
            <div className="tag-row">
              {pageInfo.hasPreviousPage ? (
                <Link
                  className="button button-secondary button-small"
                  href={buildNotificationsHref({
                    lane: filters.lane,
                    page: pageInfo.page - 1,
                    query: filters.query
                  })}
                >
                  Page précédente
                </Link>
              ) : null}
              <Badge tone="neutral">
                Page {pageInfo.page}/{pageInfo.totalPages}
              </Badge>
              {pageInfo.hasNextPage ? (
                <Link
                  className="button button-secondary button-small"
                  href={buildNotificationsHref({
                    lane: filters.lane,
                    page: pageInfo.page + 1,
                    query: filters.query
                  })}
                >
                  Page suivante
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="notifications-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Signal focus</h3>
              <p>Le meilleur point d&apos;entrée pour relancer le bon contexte maintenant.</p>
            </div>

            {focusNotification ? (
              <>
                <div className="tag-row">
                  <Badge tone={focusNotification.tone}>{focusNotification.laneLabel}</Badge>
                  <Badge tone="neutral">{focusNotification.categoryLabel}</Badge>
                </div>

                <div className="notifications-focus-copy">
                  <strong>{focusNotification.title}</strong>
                  <p>{focusNotification.body}</p>
                  <small>
                    {focusNotification.recencyLabel} · {focusNotification.createdAtLabel}
                  </small>
                </div>

                <div className="notifications-focus-metrics">
                  <article>
                    <strong>{focusNotification.unread ? "Oui" : "Non"}</strong>
                    <span>non lue</span>
                  </article>
                  <article>
                    <strong>{focusNotification.actionable ? "Oui" : "Non"}</strong>
                    <span>ouvre une action</span>
                  </article>
                </div>

                <p className="notifications-focus-action">{focusNotification.nextAction}</p>

                {focusNotification.href ? (
                  <Link className="button button-secondary button-small" href={focusNotification.href}>
                    Ouvrir maintenant
                  </Link>
                ) : null}
              </>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun focus pour le moment.</strong>
                <p>Le centre live est prêt à remonter le prochain événement utile dès qu&apos;il arrive.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Zones chaudes</h3>
              <p>Les catégories qui concentrent le plus de contexte dans la vue courante.</p>
            </div>

            {categorySpotlights.length ? (
              <div className="notifications-spotlight-list">
                {categorySpotlights.map((spotlight) => (
                  <article className="notifications-spotlight-item" key={spotlight.category}>
                    <div>
                      <strong>{spotlight.label}</strong>
                      <p>{spotlight.summary}</p>
                    </div>

                    <div className="notifications-spotlight-meta">
                      <Badge tone={spotlight.tone}>{spotlight.count} signal(aux)</Badge>
                      <small>
                        {spotlight.unreadCount} non lu(s) · {spotlight.actionableCount} ouvrable(s)
                      </small>
                      <Link className="inline-link" href={spotlight.href}>
                        {spotlight.cta}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune catégorie chaude.</strong>
                <p>Le centre live affichera ici les familles d&apos;alertes les plus actives dès qu&apos;elles émergent.</p>
              </div>
            )}
          </section>
        </aside>
      </section>

      <div id="notifications-live">
        <NotificationCommandCenter
          initialLane={filters.lane}
          initialNotifications={notifications}
          userId={context.user.id}
        />
      </div>
    </div>
  );
}
