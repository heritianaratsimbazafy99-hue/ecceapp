import Link from "next/link";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getLearnerProgressHistoryPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildProgressHref({
  query,
  lane,
  page
}: {
  query?: string;
  lane?: string;
  page?: number;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  if (page && page > 1) {
    searchParams.set("page", String(page));
  }

  const value = searchParams.toString();
  return value ? `/progress?${value}` : "/progress";
}

export default async function ProgressPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    lane?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const { events, filters, focusEvent, hero, highlights, laneBreakdown, metrics, pageInfo } =
    await getLearnerProgressHistoryPageData({
      query: params.query,
      lane: params.lane,
      page: params.page
    });
  const activeLaneBadge =
    filters.lane === "all" ? null : laneBreakdown.find((lane) => lane.id === filters.lane)?.label ?? null;

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Historique de progression"
        description="Une timeline coaché claire pour relier badges, résultats, contenus, parcours et séances terminées."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight learner-programs-hero learner-progress-history-hero">
        <div className="learner-programs-copy">
          <span className="eyebrow">Progression coaché</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {activeLaneBadge ? <Badge tone="accent">{activeLaneBadge}</Badge> : null}
            {focusEvent ? <Badge tone={focusEvent.tone}>{focusEvent.laneLabel}</Badge> : null}
          </div>

          <div className="learner-programs-actions">
            <Link className="button" href={focusEvent?.href ?? "#progress-timeline"}>
              {focusEvent?.ctaLabel ?? "Voir la timeline"}
            </Link>
            <Link className="button button-secondary" href="/programs">
              Mes parcours
            </Link>
            <Link className="button button-secondary" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="learner-programs-side">
          <div className="learner-programs-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("learner-programs-lane-card", lane.isActive && "is-active")}
                href={buildProgressHref({
                  query: filters.query,
                  lane: filters.lane === lane.id ? "all" : lane.id
                })}
                key={lane.id}
              >
                <span>{lane.label}</span>
                <strong>{lane.count}</strong>
              </Link>
            ))}
          </div>

          <article className="learner-programs-focus-note">
            <span>Dernier signal utile</span>
            <strong>{focusEvent?.title ?? "Timeline en attente"}</strong>
            <p>
              {focusEvent?.description ??
                "Dès qu’un quiz, un rendu, une séance ou un badge existe, ECCE transforme l’activité en historique lisible."}
            </p>
          </article>
        </div>
      </section>

      <section className="learner-progress-history-layout">
        <section className="panel library-search-panel" id="progress-timeline">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Timeline décisionnelle</span>
              <h3>Filtrer les jalons</h3>
              <p>Retrouve rapidement un résultat de quiz, un badge, un module terminé ou une séance finalisée.</p>
            </div>

            <Link className="button button-secondary" href="/progress">
              Réinitialiser
            </Link>
          </div>

          <form className="learner-programs-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input
                defaultValue={filters.query}
                name="query"
                placeholder="Badge, quiz, module, séance, contenu"
                type="search"
              />
            </label>

            <label className="conversation-composer-field">
              <span>Type</span>
              <select defaultValue={filters.lane} name="lane">
                <option value="all">Tous les jalons</option>
                <option value="badge">Badges</option>
                <option value="quiz">Quiz</option>
                <option value="content">Contenus</option>
                <option value="program">Parcours</option>
                <option value="coaching">Coaching</option>
              </select>
            </label>

            <div className="learner-programs-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>

          {events.length ? (
            <>
              <div className="tag-row">
                <Badge tone="neutral">
                  {pageInfo.from}-{pageInfo.to} / {pageInfo.totalItems} jalon(s)
                </Badge>
                <Badge tone="accent">
                  Page {pageInfo.page}/{pageInfo.totalPages}
                </Badge>
              </div>

              <div className="learner-progress-timeline">
                {events.map((event) => (
                  <article className="learner-progress-event" key={event.id}>
                    <div className={cn("learner-progress-event-marker", `tone-${event.tone}`)} aria-hidden="true" />

                    <div className="learner-progress-event-body">
                      <div className="learner-progress-event-topline">
                        <div>
                          <strong>{event.title}</strong>
                          <p>{event.description}</p>
                        </div>
                        <Badge tone={event.tone}>{event.laneLabel}</Badge>
                      </div>

                      <div className="learner-progress-event-meta">
                        <span>{event.occurredAt}</span>
                        {event.meta.slice(0, 4).map((meta) => (
                          <span key={`${event.id}-${meta}`}>{meta}</span>
                        ))}
                      </div>

                      {event.href && event.ctaLabel ? (
                        <Link className="inline-link" href={event.href}>
                          {event.ctaLabel}
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              {pageInfo.totalPages > 1 ? (
                <div className="tag-row">
                  {pageInfo.hasPreviousPage ? (
                    <Link
                      className="button button-secondary button-small"
                      href={buildProgressHref({
                        query: filters.query,
                        lane: filters.lane,
                        page: pageInfo.page - 1
                      })}
                    >
                      Page précédente
                    </Link>
                  ) : null}
                  {pageInfo.hasNextPage ? (
                    <Link
                      className="button button-secondary button-small"
                      href={buildProgressHref({
                        query: filters.query,
                        lane: filters.lane,
                        page: pageInfo.page + 1
                      })}
                    >
                      Page suivante
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <strong>Aucun jalon dans cette vue.</strong>
              <p>Élargis les filtres ou poursuis un quiz, un contenu ou une séance pour alimenter la timeline.</p>
            </div>
          )}
        </section>

        <aside className="learner-programs-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Repères rapides</h3>
              <p>Les signaux les plus utiles pour comprendre la progression sans fouiller le dashboard.</p>
            </div>

            <div className="learner-progress-highlight-list">
              {highlights.map((highlight) => (
                <article className="learner-progress-highlight-card" key={highlight.id}>
                  <Badge tone={highlight.tone}>{highlight.title}</Badge>
                  <strong>{highlight.body}</strong>
                  <p>{highlight.meta}</p>
                  {highlight.href && highlight.ctaLabel ? (
                    <Link className="inline-link" href={highlight.href}>
                      {highlight.ctaLabel}
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="panel panel-highlight">
            <div className="panel-header">
              <h3>Lecture recommandée</h3>
              <p>Cette page devient la mémoire de progression du coaché et complète le dashboard sans l’alourdir.</p>
            </div>

            <div className="learner-progress-next-actions">
              <Link className="button" href="/messages">
                Contacter mon coach
              </Link>
              <Link className="button button-secondary" href="/agenda">
                Voir l&apos;agenda
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
