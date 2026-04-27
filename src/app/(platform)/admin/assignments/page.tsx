import Link from "next/link";

import { AssignmentCommandBoard } from "@/components/assignments/assignment-command-board";
import { AssignmentStudioComposer } from "@/components/assignments/assignment-studio-composer";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminAssignmentStudioPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildAdminAssignmentsHref({
  query,
  target,
  kind,
  lane
}: {
  query?: string;
  target?: string;
  kind?: string;
  lane?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (target && target !== "all") {
    searchParams.set("target", target);
  }

  if (kind && kind !== "all") {
    searchParams.set("kind", kind);
  }

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  const value = searchParams.toString();
  return value ? `/admin/assignments?${value}` : "/admin/assignments";
}

export default async function AdminAssignmentsPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    target?: string;
    kind?: string;
    lane?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    assetRadar,
    assignments,
    completionPulse,
    contentOptions,
    cohortOptions,
    executionFeed,
    filters,
    focusAssignment,
    hero,
    laneBreakdown,
    metrics,
    priorityActions,
    quizOptions,
    userOptions,
    assignmentWatchlist
  } = await getAdminAssignmentStudioPageData({
    query: params.query,
    target: params.target,
    kind: params.kind,
    lane: params.lane
  });

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Assignations et deadlines"
        description="Cockpit pédagogique premium pour piloter l’exécution, lire la tension des missions et programmer les prochaines actions sans naviguer à l’aveugle."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight admin-assignments-hero">
        <div className="admin-assignments-copy">
          <span className="eyebrow">Execution studio</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {focusAssignment ? <Badge tone={focusAssignment.tone}>{focusAssignment.laneLabel}</Badge> : null}
            <Badge tone={completionPulse.band === "strong" ? "success" : completionPulse.band === "watch" ? "accent" : "warning"}>
              complétion {completionPulse.score}%
            </Badge>
          </div>

          <div className="admin-assignments-actions">
            <Link className="button" href="#assignment-studio">
              Créer une assignation
            </Link>
            <Link className="button button-secondary" href="#assignment-board">
              Relire le board
            </Link>
            <Link className="button button-secondary" href="/agenda">
              Ouvrir l&apos;agenda
            </Link>
          </div>
        </div>

        <div className="admin-assignments-side">
          <EngagementMeter
            band={completionPulse.band}
            bandLabel={completionPulse.bandLabel}
            caption={completionPulse.caption}
            score={completionPulse.score}
            trend={completionPulse.trend}
            trendLabel={completionPulse.trendLabel}
          />

          <div className="admin-assignments-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("admin-assignments-lane-card", lane.isActive && "is-active")}
                href={buildAdminAssignmentsHref({
                  query: filters.query,
                  target: filters.target,
                  kind: filters.kind,
                  lane: filters.lane === lane.id ? "all" : lane.id
                })}
                key={lane.id}
              >
                <span>{lane.label}</span>
                <strong>{lane.count}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-assignments-layout">
        <section className="panel library-search-panel admin-assignments-filter-panel">
          <div className="library-search-head admin-assignments-filter-head">
            <div>
              <span className="eyebrow">Filtrer le studio</span>
              <h3>Recherche, cible, type d&apos;asset et lane d&apos;exécution</h3>
              <p>Réduis la vue à la bonne tension opérationnelle avant de décider quoi relancer, reprogrammer ou amplifier.</p>
            </div>

            <div className="admin-assignments-filter-head-actions">
              <Link className="button" href="#assignment-studio">
                Créer une assignation
              </Link>
              <Link className="button button-secondary" href="/admin/assignments">
                Réinitialiser
              </Link>
            </div>
          </div>

          <form className="admin-assignments-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input defaultValue={filters.query} name="query" placeholder="Mission, cible, asset, cohorte" type="search" />
            </label>

            <label className="conversation-composer-field">
              <span>Cible</span>
              <select defaultValue={filters.target} name="target">
                <option value="all">Toutes les cibles</option>
                <option value="individual">Individuelles</option>
                <option value="cohort">Cohortes</option>
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Asset</span>
              <select defaultValue={filters.kind} name="kind">
                <option value="all">Tous les assets</option>
                <option value="quiz">Quiz</option>
                <option value="contenu">Contenus</option>
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Lane</span>
              <select defaultValue={filters.lane} name="lane">
                <option value="all">Toutes les lanes</option>
                <option value="critical">Critiques</option>
                <option value="watch">À surveiller</option>
                <option value="evergreen">Sans deadline</option>
                <option value="aligned">Alignées</option>
              </select>
            </label>

            <div className="admin-assignments-filter-actions">
              <button className="button" type="submit">
                Filtrer
              </button>
            </div>
          </form>

          <div className="admin-assignments-summary">
            <article>
              <strong>{metrics[0]?.value ?? "0"}</strong>
              <span>{metrics[0]?.label ?? "missions visibles"}</span>
            </article>
            <article>
              <strong>{metrics[1]?.value ?? "0%"}</strong>
              <span>{metrics[1]?.label ?? "complétion moyenne"}</span>
            </article>
            <article>
              <strong>{metrics[2]?.value ?? "0/0"}</strong>
              <span>{metrics[2]?.label ?? "coachés touchés"}</span>
            </article>
            <article>
              <strong>{metrics[3]?.value ?? "0"}</strong>
              <span>{metrics[3]?.label ?? "cadence ouverte"}</span>
            </article>
          </div>
        </section>

        <aside className="admin-assignments-side-stack">
          <section className="panel admin-assignments-focus-panel">
            <div className="panel-header">
              <h3>Mission focus</h3>
              <p>La mission qui concentre le plus de tension utile à lire maintenant.</p>
            </div>

            {focusAssignment ? (
              <>
                <div className="tag-row">
                  <Badge tone={focusAssignment.tone}>{focusAssignment.laneLabel}</Badge>
                  <Badge tone={focusAssignment.statusTone}>{focusAssignment.statusLabel}</Badge>
                </div>

                <div className="admin-assignments-focus-metrics">
                  <article>
                    <strong>{focusAssignment.completionRate}%</strong>
                    <span>complétion visible</span>
                  </article>
                  <article>
                    <strong>{focusAssignment.completedCount}/{focusAssignment.targetCount}</strong>
                    <span>coaché(s) déjà passés</span>
                  </article>
                  <article>
                    <strong>{focusAssignment.overdueTargetCount}</strong>
                    <span>encore en retard</span>
                  </article>
                  <article>
                    <strong>{focusAssignment.onTimeRate ?? 0}%</strong>
                    <span>ponctualité résolue</span>
                  </article>
                </div>

                <div className="admin-assignments-focus-copy">
                  <strong>{focusAssignment.title}</strong>
                  <p>{focusAssignment.nextNeed}</p>
                </div>

                <div className="admin-assignments-card-meta">
                  <span>{focusAssignment.targetLabel}</span>
                  <span>{focusAssignment.assetLabel}</span>
                  <span>{focusAssignment.dueRelativeLabel}</span>
                </div>

                {focusAssignment.href ? (
                  <Link className="button button-secondary button-small" href={focusAssignment.href}>
                    {focusAssignment.ctaLabel}
                  </Link>
                ) : null}
              </>
            ) : (
              <div className="empty-state empty-state-compact admin-assignments-empty-state">
                <strong>Aucune mission focus.</strong>
                <p>Crée une assignation ou élargis les filtres pour faire remonter un point d&apos;attention réel.</p>
                <Link className="button button-secondary button-small" href="#assignment-studio">
                  Créer une assignation
                </Link>
              </div>
            )}
          </section>

          <section className="panel admin-assignments-priority-panel">
            <div className="panel-header">
              <h3>Priorités ops</h3>
              <p>Les arbitrages les plus utiles sur la vue active du studio.</p>
            </div>

            <div className="admin-assignments-priority-list">
              {priorityActions.map((action) => (
                <article className="admin-assignments-priority-card" key={action.id}>
                  <div className="tag-row">
                    <Badge tone={action.tone}>{action.title}</Badge>
                  </div>
                  <p>{action.description}</p>
                  <Link className="button button-secondary button-small" href={action.href}>
                    {action.ctaLabel}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="panel admin-assignments-watch-panel">
          <div className="panel-header-rich">
            <div>
              <h3>Watchlist assignations</h3>
              <p>Les missions les plus utiles à relire maintenant, triées par tension d&apos;exécution et par impact visible.</p>
            </div>

            <div className="messaging-inline-stats">
              <article>
                <strong>{assignmentWatchlist.length}</strong>
                <span>missions en watchlist</span>
              </article>
              <article>
                <strong>{laneBreakdown.find((lane) => lane.id === "critical")?.count ?? 0}</strong>
                <span>critiques</span>
              </article>
              <article>
                <strong>{laneBreakdown.find((lane) => lane.id === "watch")?.count ?? 0}</strong>
                <span>à surveiller</span>
              </article>
              <article>
                <strong>{laneBreakdown.find((lane) => lane.id === "aligned")?.count ?? 0}</strong>
                <span>alignées</span>
              </article>
            </div>
          </div>

          {assignmentWatchlist.length ? (
            <div className="admin-assignments-watchlist">
              {assignmentWatchlist.map((assignment) => (
                <article className="admin-assignments-card" key={assignment.id}>
                  <div className="tag-row">
                    <Badge tone={assignment.tone}>{assignment.laneLabel}</Badge>
                    <Badge tone={assignment.kind === "quiz" ? "warning" : "accent"}>{assignment.kind}</Badge>
                    <Badge tone={assignment.statusTone}>{assignment.statusLabel}</Badge>
                  </div>

                  <div className="admin-assignments-card-copy">
                    <strong>{assignment.title}</strong>
                    <p>{assignment.summary}</p>
                  </div>

                  <div className="admin-assignments-card-meta">
                    <span>{assignment.targetLabel}</span>
                    <span>{assignment.assetLabel}</span>
                    <span>{assignment.dueRelativeLabel}</span>
                  </div>

                  <div className="admin-assignments-card-progress">
                    <div>
                      <strong>{assignment.completionRate}%</strong>
                      <span>complétion</span>
                    </div>
                    <div>
                      <strong>{assignment.completedCount}/{assignment.targetCount}</strong>
                      <span>passés</span>
                    </div>
                    <div>
                      <strong>{assignment.overdueTargetCount}</strong>
                      <span>en retard</span>
                    </div>
                  </div>

                  {assignment.href ? (
                    <Link className="button button-secondary button-small" href={assignment.href}>
                      {assignment.ctaLabel}
                    </Link>
                  ) : null}
                  {assignment.messageHref ? (
                    <Link className="button button-secondary button-small" href={assignment.messageHref}>
                      Relancer
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state-compact admin-assignments-empty-state">
              <strong>Aucune mission dans la watchlist.</strong>
              <p>La vue active n&apos;a pas encore assez de missions visibles, ou les filtres sont trop restrictifs.</p>
            </div>
          )}
        </section>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Radar assets</h3>
            <p>Les contenus et quiz qui concentrent le plus d&apos;exécution, de dette ou d&apos;attention pédagogique.</p>
          </div>

          {assetRadar.length ? (
            <div className="admin-assignments-asset-grid">
              {assetRadar.map((asset) => (
                <article className="admin-assignments-asset-card" key={asset.id}>
                  <div className="tag-row">
                    <Badge tone={asset.tone}>{asset.kind}</Badge>
                  </div>
                  <strong>{asset.title}</strong>
                  <p>
                    {asset.assignmentCount} assignation(s) · {asset.targetCount} coaché(s) concernés
                  </p>
                  <div className="admin-assignments-card-progress">
                    <div>
                      <strong>{asset.averageCompletion}%</strong>
                      <span>complétion moyenne</span>
                    </div>
                    <div>
                      <strong>{asset.criticalCount}</strong>
                      <span>mission(s) critiques</span>
                    </div>
                    <div>
                      <strong>{asset.overdueTargetCount}</strong>
                      <span>retards visibles</span>
                    </div>
                  </div>
                  <Link
                    className="button button-secondary button-small"
                    href={asset.kind === "quiz" ? "/admin/quizzes" : "/admin/content"}
                  >
                    Ouvrir le studio lié
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun asset diffusé.</strong>
              <p>Le radar se remplira dès que des missions utiliseront des quiz ou des contenus dans ECCE.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Feed d&apos;exécution</h3>
            <p>Les derniers mouvements visibles dans le studio, utiles pour relire le tempo sans repasser par l&apos;historique brut.</p>
          </div>

          {executionFeed.length ? (
            <div className="stack-list">
              {executionFeed.map((event) => (
                <article className="list-row list-row-stretch" key={event.id}>
                  <div>
                    <strong>{event.title}</strong>
                    <p>
                      {event.scopeLabel} · {event.targetLabel}
                    </p>
                    <p>{event.createdAt}</p>
                  </div>
                  <div className="list-row-meta">
                    <Badge tone={event.tone}>{event.dueLabel}</Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun mouvement récent.</strong>
              <p>Les nouvelles assignations apparaîtront ici dès leur programmation.</p>
            </div>
          )}
        </section>
      </section>

      <div className="admin-assignments-anchor" id="assignment-studio">
        <AssignmentStudioComposer
          cohortOptions={cohortOptions}
          contentOptions={contentOptions}
          quizOptions={quizOptions}
          userOptions={userOptions}
        />
      </div>

      <div className="admin-assignments-anchor" id="assignment-board">
        <AssignmentCommandBoard
          description="Board d’exécution des missions visibles, avec filtres rapides et lecture directe des deadlines, des cibles et des assets."
          emptyBody="Crée une première assignation pour alimenter le cockpit, les notifications et les dashboards ECCE."
          emptyTitle="Aucune assignation visible."
          items={assignments}
          mode="admin"
          title="Board des missions"
        />
      </div>
    </div>
  );
}
