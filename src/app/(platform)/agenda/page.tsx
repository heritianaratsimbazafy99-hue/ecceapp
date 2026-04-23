import Link from "next/link";

import { ScheduleCoachingSessionForm } from "@/app/(platform)/coach/forms";
import { AgendaCommandCenter } from "@/components/agenda/agenda-command-center";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAgendaPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function getRoleLabel(role: string | null) {
  switch (role) {
    case "admin":
      return "admin";
    case "coach":
      return "coach";
    case "coachee":
      return "coaché";
    default:
      return "utilisateur";
  }
}

function buildAgendaHref({
  query,
  lane,
  scope
}: {
  query?: string;
  lane?: string;
  scope?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  if (scope && scope !== "all") {
    searchParams.set("scope", scope);
  }

  const value = searchParams.toString();
  return value ? `/agenda?${value}` : "/agenda";
}

export default async function AgendaPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    lane?: string;
    scope?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    context,
    filters,
    metrics,
    hero,
    laneBreakdown,
    focusEvent,
    priorityEvents,
    daySpotlights,
    responsePlaybook,
    events,
    planner
  } = await getAgendaPageData({
    query: params.query,
    lane: params.lane,
    scope: params.scope
  });
  const roleLabel = getRoleLabel(context.role);
  const activeLaneBadge =
    filters.lane === "all"
      ? null
      : laneBreakdown.find((lane) => lane.id === filters.lane)?.label ?? null;

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Agenda"
        description={`Command center premium pour le rôle ${roleLabel}, afin d’arbitrer séances, deadlines et prochaines actions sans naviguer entre plusieurs espaces.`}
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight agenda-command-hero">
        <div className="agenda-command-copy">
          <span className="eyebrow">Agenda ops</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {activeLaneBadge ? <Badge tone="accent">{activeLaneBadge}</Badge> : null}
            {focusEvent ? <Badge tone={focusEvent.tone}>{focusEvent.laneLabel}</Badge> : null}
          </div>

          <div className="agenda-actions">
            <Link className="button" href={focusEvent?.href ?? "#agenda-timeline"}>
              {focusEvent?.ctaLabel ?? "Voir la timeline"}
            </Link>
            {planner ? (
              <Link className="button button-secondary" href="#agenda-planner">
                Planifier une séance
              </Link>
            ) : (
              <Link className="button button-secondary" href="/messages">
                Ouvrir les messages
              </Link>
            )}
            <Link className="button button-secondary" href="/programs">
              Voir les parcours
            </Link>
          </div>
        </div>

        <div className="agenda-command-side">
          <div className="agenda-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("agenda-lane-card", lane.isActive && "is-active")}
                href={buildAgendaHref({
                  query: filters.query,
                  scope: filters.scope,
                  lane: filters.lane === lane.id ? "all" : lane.id
                })}
                key={lane.id}
              >
                <span>{lane.label}</span>
                <strong>{lane.count}</strong>
              </Link>
            ))}
          </div>

          <article className="agenda-focus-note">
            <span>Signal focus</span>
            <strong>{focusEvent?.title ?? "La timeline reste prête"}</strong>
            <p>
              {focusEvent?.nextAction ??
                "La prochaine séance, deadline ou reprise récente utile remontera ici dès qu'elle entre dans ton périmètre agenda."}
            </p>
          </article>
        </div>
      </section>

      <section className="agenda-command-layout">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Filtrer l&apos;agenda</span>
              <h3>Recherche, scope et lane de priorité</h3>
              <p>Réduis la vue pour retrouver vite le bon temps fort avant d&apos;ouvrir la bonne action.</p>
            </div>

            <Link className="button button-secondary" href="/agenda">
              Réinitialiser
            </Link>
          </div>

          <form className="agenda-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input
                defaultValue={filters.query}
                name="query"
                placeholder="Titre, audience, séance, quiz, ressource"
                type="search"
              />
            </label>

            <label className="conversation-composer-field">
              <span>Scope</span>
              <select defaultValue={filters.scope} name="scope">
                <option value="all">Tout l&apos;agenda</option>
                <option value="sessions">Séances</option>
                <option value="deadlines">Deadlines</option>
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Lane</span>
              <select defaultValue={filters.lane} name="lane">
                <option value="all">Toutes les lanes</option>
                <option value="urgent">À sécuriser</option>
                <option value="today">Aujourd&apos;hui</option>
                <option value="upcoming">À venir</option>
                <option value="recent">Récent</option>
              </select>
            </label>

            <div className="agenda-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>

          <div className="agenda-summary">
            {metrics.map((metric) => (
              <article key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>

          <div className="agenda-playbook-grid">
            {responsePlaybook.map((item) => (
              <article className="agenda-playbook-card" key={item.id}>
                <Badge tone={item.tone}>{item.title}</Badge>
                <p>{item.body}</p>
                <Link className="inline-link" href={item.href}>
                  {item.ctaLabel}
                </Link>
              </article>
            ))}
          </div>

          <div className="panel-header">
            <div>
              <h3>Watchlist agenda</h3>
              <p>Les temps forts qui méritent d&apos;être ouverts en premier dans la vue active.</p>
            </div>
          </div>

          {priorityEvents.length ? (
            <div className="agenda-priority-list">
              {priorityEvents.map((event) => (
                <article className="agenda-priority-card" key={event.id}>
                  <div className="agenda-priority-copy">
                    <div className="agenda-priority-topline">
                      <strong>{event.title}</strong>
                      <Badge tone={event.tone}>{event.laneLabel}</Badge>
                    </div>
                    <p>{event.nextAction}</p>
                    <small>
                      {event.timeLabel} · {event.audienceLabel} · {event.contextLabel}
                    </small>
                  </div>

                  <div className="agenda-priority-meta">
                    <span>{event.type === "session" ? "Séance" : "Deadline"}</span>
                    {event.href ? (
                      <Link className="inline-link" href={event.href}>
                        {event.ctaLabel ?? "Ouvrir"}
                      </Link>
                    ) : (
                      <small>Sans lien direct</small>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state-compact">
              <strong>Aucun événement dans cette vue.</strong>
              <p>Élargis les filtres pour retrouver la timeline complète de ton périmètre ECCE.</p>
            </div>
          )}
        </section>

        <aside className="agenda-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Temps fort focus</h3>
              <p>Le meilleur point d&apos;entrée pour reprendre le bon événement maintenant.</p>
            </div>

            {focusEvent ? (
              <>
                <div className="tag-row">
                  <Badge tone={focusEvent.tone}>{focusEvent.laneLabel}</Badge>
                  <Badge tone={focusEvent.statusTone}>{focusEvent.statusLabel}</Badge>
                  <Badge tone={focusEvent.type === "session" ? "accent" : "neutral"}>
                    {focusEvent.type === "session" ? "séance" : "deadline"}
                  </Badge>
                </div>

                <div className="agenda-focus-metrics">
                  <article>
                    <strong>{focusEvent.dayLabel}</strong>
                    <span>fenêtre</span>
                  </article>
                  <article>
                    <strong>{focusEvent.timeLabel}</strong>
                    <span>horaire</span>
                  </article>
                </div>

                <div className="agenda-focus-copy">
                  <strong>{focusEvent.title}</strong>
                  <p>{focusEvent.subtitle}</p>
                  <small>
                    {focusEvent.audienceLabel} · {focusEvent.contextLabel}
                  </small>
                </div>

                <p className="agenda-focus-note-inline">{focusEvent.nextAction}</p>

                {focusEvent.href ? (
                  <Link className="button button-secondary button-small" href={focusEvent.href}>
                    {focusEvent.ctaLabel ?? "Ouvrir"}
                  </Link>
                ) : null}
              </>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun focus pour le moment.</strong>
                <p>Le prochain événement utile remontera ici dès qu&apos;il devient visible ou prioritaire.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Journées chaudes</h3>
              <p>Les jours qui concentrent le plus de contexte dans la vue active.</p>
            </div>

            {daySpotlights.length ? (
              <div className="agenda-day-spotlight-list">
                {daySpotlights.map((item) => (
                  <article className="agenda-day-spotlight-item" key={item.id}>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.summary}</p>
                    </div>

                    <div className="agenda-day-spotlight-meta">
                      <Badge tone={item.tone}>{item.count} événement(s)</Badge>
                      <Link className="inline-link" href={item.href}>
                        {item.ctaLabel}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune journée chaude.</strong>
                <p>Les regroupements journaliers réapparaîtront dès qu&apos;un filtre laisse remonter plusieurs événements.</p>
              </div>
            )}
          </section>
        </aside>
      </section>

      {planner ? (
        <section className="panel" id="agenda-planner">
          <div className="panel-header">
            <h3>Planification rapide</h3>
            <p>Depuis l&apos;agenda, le rôle {roleLabel} peut créer une séance et la relire immédiatement dans la timeline.</p>
          </div>

          <ScheduleCoachingSessionForm
            allowCoachSelection={planner.allowCoachSelection}
            coachOptions={planner.coachOptions}
            cohortOptions={planner.cohortOptions}
            coacheeOptions={planner.coacheeOptions}
          />
        </section>
      ) : null}

      <section className="panel" id="agenda-timeline">
        <div className="library-search-head">
          <div>
            <span className="eyebrow">Timeline détaillée</span>
            <h3>Vue chronologique des séances et deadlines</h3>
            <p>La timeline garde la lecture date par date, mais avec la bonne couche d&apos;intention et de priorité.</p>
          </div>

          <div className="tag-row">
            <Badge tone="neutral">{events.length} événement(s)</Badge>
            {focusEvent ? <Badge tone={focusEvent.tone}>{focusEvent.laneLabel}</Badge> : null}
          </div>
        </div>

        <AgendaCommandCenter events={events} />
      </section>
    </div>
  );
}
