import Link from "next/link";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getProfessorCoachingOpsPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildCoachingOpsHref({
  query,
  coachId,
  cohortId,
  status,
  period
}: {
  query?: string;
  coachId?: string;
  cohortId?: string;
  status?: string;
  period?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (coachId) {
    searchParams.set("coach", coachId);
  }

  if (cohortId) {
    searchParams.set("cohort", cohortId);
  }

  if (status && status !== "all") {
    searchParams.set("status", status);
  }

  if (period && period !== "upcoming") {
    searchParams.set("period", period);
  }

  const value = searchParams.toString();
  return value ? `/professor/coaching?${value}` : "/professor/coaching";
}

export default async function ProfessorCoachingPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    coach?: string;
    cohort?: string;
    status?: string;
    period?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    canOpenSessionWorkspace,
    coachLoads,
    coachOptions,
    cohortLoads,
    cohortOptions,
    filters,
    focus,
    metrics,
    periodOptions,
    priorityActions,
    sessions,
    statusBreakdown
  } = await getProfessorCoachingOpsPageData({
    query: params.query,
    coachId: params.coach,
    cohortId: params.cohort,
    status: params.status,
    period: params.period
  });

  const resolveSessionHref = (href: string) =>
    href.startsWith("/coach/sessions") ? (canOpenSessionWorkspace ? href : "/agenda") : href;

  return (
    <div className="page-shell">
      <PlatformTopbar
        actions={
          <>
            <Link className="button button-secondary" href="/professor">
              Insights professor
            </Link>
            <Link className="button" href="/agenda">
              Agenda
            </Link>
          </>
        }
        title="Pilotage coaching"
        description="Command center professor pour lire les séances, la couverture des notes, les coachs mobilisés et les cohortes qui demandent une décision."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight coaching-ops-hero">
        <div className="coaching-ops-copy">
          <span className="eyebrow">Coaching ops</span>
          <h3>Une vue de pilotage pour transformer les rendez-vous coach en suivi exploitable.</h3>
          <p>
            {focus.nextSession
              ? `${focus.nextSession.learnerName} est le prochain créneau visible. ${focus.nextSession.dayLabel} · ${focus.nextSession.timeLabel}.`
              : "Aucune séance à venir dans le périmètre courant. La vue reste utile pour relire l'historique et repérer les notes manquantes."}
          </p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            <Badge tone={focus.noteCoverage >= 75 ? "success" : focus.noteCoverage >= 45 ? "accent" : "warning"}>
              {focus.noteCoverage}% notes
            </Badge>
            {focus.needsNoteCount ? <Badge tone="warning">{focus.needsNoteCount} à documenter</Badge> : null}
          </div>

          <div className="coaching-ops-actions">
            <Link className="button" href="#coaching-ops-board">
              Lire les séances
            </Link>
            <Link className="button button-secondary" href="/professor">
              Radar pédagogique
            </Link>
          </div>
        </div>

        <div className="coaching-ops-meter">
          <EngagementMeter
            band={focus.meterBand}
            bandLabel={
              focus.noteCoverage >= 75
                ? "Mémoire solide"
                : focus.noteCoverage >= 45
                  ? "Suivi à consolider"
                  : "Notes à reprendre"
            }
            caption={`${focus.upcomingCount} à venir · ${focus.staleCount} statut(s) à clarifier`}
            score={focus.noteCoverage}
            trend={focus.staleCount > 0 || focus.needsNoteCount > 0 ? "down" : "steady"}
            trendLabel={
              focus.staleCount > 0
                ? "statuts passés à vérifier"
                : focus.needsNoteCount > 0
                  ? "notes manquantes à traiter"
                  : "couverture stable"
            }
          />

          <div className="coaching-ops-status-grid">
            {statusBreakdown.map((status) => (
              <Link
                className={cn("coaching-ops-status-card", status.isActive && "is-active")}
                href={buildCoachingOpsHref({
                  query: filters.query,
                  coachId: filters.coachId,
                  cohortId: filters.cohortId,
                  period: filters.period,
                  status: filters.status === status.id ? "all" : status.id
                })}
                key={status.id}
              >
                <Badge tone={status.tone}>{status.label}</Badge>
                <strong>{status.count}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="coaching-ops-layout">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Filtrer les séances</span>
              <h3>Coach, cohorte, statut, période et recherche</h3>
              <p>La recherche interroge les profils, cohortes, liens visio et notes de séance côté data.</p>
            </div>

            <Link className="button button-secondary" href="/professor/coaching">
              Réinitialiser
            </Link>
          </div>

          <form className="coaching-ops-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input defaultValue={filters.query} name="query" placeholder="Coaché, coach, cohorte, note" type="search" />
            </label>

            <label className="conversation-composer-field">
              <span>Coach</span>
              <select defaultValue={filters.coachId} name="coach">
                <option value="">Tous les coachs</option>
                {coachOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Cohorte</span>
              <select defaultValue={filters.cohortId} name="cohort">
                <option value="">Toutes les cohortes</option>
                {cohortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Statut</span>
              <select defaultValue={filters.status} name="status">
                <option value="all">Tous les statuts</option>
                <option value="planned">Planifiées</option>
                <option value="completed">Réalisées</option>
                <option value="cancelled">Annulées</option>
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Période</span>
              <select defaultValue={filters.period} name="period">
                {periodOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="coaching-ops-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>
        </section>

        <aside className="coaching-ops-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Priorités coaching</h3>
              <p>Les décisions utiles qui émergent des séances filtrées.</p>
            </div>

            <div className="coaching-ops-priority-list">
              {priorityActions.map((action) => (
                <article className="coaching-ops-priority-card" key={action.id}>
                  <Badge tone={action.tone}>{action.eyebrow}</Badge>
                  <strong>{action.title}</strong>
                  <p>{action.description}</p>
                  <Link className="button button-secondary button-small" href={resolveSessionHref(action.href)}>
                    {canOpenSessionWorkspace || !action.href.startsWith("/coach/sessions") ? action.cta : "Agenda"}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="content-grid" id="coaching-ops-board">
        <section className="panel">
          <div className="panel-header-rich">
            <div>
              <h3>Séances visibles</h3>
              <p>Lecture opérationnelle des créneaux, statuts, coachés, cohortes et notes associées.</p>
            </div>
            <div className="messaging-inline-stats">
              <article>
                <strong>{sessions.length}</strong>
                <span>séance(s)</span>
              </article>
              <article>
                <strong>{focus.needsNoteCount}</strong>
                <span>note(s) à reprendre</span>
              </article>
            </div>
          </div>

          {sessions.length ? (
            <div className="coaching-ops-session-list">
              {sessions.map((session) => (
                <article className={cn("coaching-ops-session-card", session.needsNote && "needs-note")} key={session.id}>
                  <div className="coaching-ops-session-head">
                    <div>
                      <span className="eyebrow">{session.dayLabel}</span>
                      <strong>{session.learnerName}</strong>
                      <p>
                        {session.coachName} · {session.cohortName ?? "Sans cohorte"} · {session.timeLabel}
                      </p>
                    </div>
                    <Badge tone={session.statusTone}>{session.statusLabel}</Badge>
                  </div>

                  <div className="coaching-ops-session-meta">
                    <span>{session.date}</span>
                    <span>{session.noteCount} note(s)</span>
                    <span>{session.hasVideo ? "Visio prête" : "Sans visio"}</span>
                    <span>{session.learnerStatus}</span>
                  </div>

                  {session.latestNoteSummary ? (
                    <p className="coaching-ops-note-preview">{session.latestNoteSummary}</p>
                  ) : (
                    <p className="coaching-ops-note-preview muted">
                      {session.needsNote ? "Séance passée sans note exploitable." : "Aucune note enregistrée sur cette séance."}
                    </p>
                  )}

                  <div className="coaching-ops-session-actions">
                    {session.needsNote ? <Badge tone="warning">mémoire à compléter</Badge> : null}
                    {session.latestNoteAt ? <Badge tone="neutral">{session.latestNoteAt}</Badge> : null}
                    <Link className="button button-secondary button-small" href={resolveSessionHref(session.href)}>
                      {canOpenSessionWorkspace ? "Ouvrir" : "Agenda"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune séance ne correspond aux filtres.</strong>
              <p>Élargis la période ou retire un filtre pour retrouver le flux coaching.</p>
            </div>
          )}
        </section>

        <aside className="coaching-ops-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Charge coachs</h3>
              <p>Répartition des séances visibles et des traces à compléter.</p>
            </div>

            {coachLoads.length ? (
              <div className="coaching-ops-load-list">
                {coachLoads.map((coach) => (
                  <article className={cn("coaching-ops-load-card", coach.isActive && "is-active")} key={coach.id}>
                    <div>
                      <strong>{coach.name}</strong>
                      <p>{coach.learnerNames.length ? coach.learnerNames.join(", ") : "Aucun coaché dans cette vue"}</p>
                    </div>
                    <div className="coaching-ops-load-metrics">
                      <span>{coach.sessionCount} séance(s)</span>
                      <span>{coach.plannedCount} planifiée(s)</span>
                      <span>{coach.completedCount} réalisée(s)</span>
                      <span>{coach.needsNoteCount} note(s)</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune charge coach visible.</strong>
                <p>La répartition apparaîtra avec les prochaines séances.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Cohortes concernées</h3>
              <p>Groupes à surveiller selon le volume et la mémoire de séance.</p>
            </div>

            {cohortLoads.length ? (
              <div className="coaching-ops-load-list">
                {cohortLoads.map((cohort) => (
                  <article className={cn("coaching-ops-load-card", cohort.isActive && "is-active")} key={cohort.id}>
                    <div>
                      <strong>{cohort.name}</strong>
                      <p>{cohort.sessionCount} séance(s) dans la vue courante.</p>
                    </div>
                    <div className="coaching-ops-load-metrics">
                      <span>{cohort.upcomingCount} à venir</span>
                      <span>{cohort.completedCount} réalisée(s)</span>
                      <span>{cohort.needsNoteCount} note(s)</span>
                    </div>
                    <Link className="button button-secondary button-small" href={`/professor/cohorts/${cohort.id}`}>
                      Détail cohorte
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune cohorte visible.</strong>
                <p>Les séances sans cohorte restent visibles dans la liste principale.</p>
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
