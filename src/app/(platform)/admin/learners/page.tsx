import Link from "next/link";

import {
  AssignCoacheeToCohortForm,
  AssignCoachForm
} from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminLearnerOpsPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildLearnerOpsHref({
  query,
  cohortId,
  coachId,
  lane
}: {
  query?: string;
  cohortId?: string;
  coachId?: string;
  lane?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (cohortId) {
    searchParams.set("cohort", cohortId);
  }

  if (coachId) {
    searchParams.set("coach", coachId);
  }

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  const value = searchParams.toString();
  return value ? `/admin/learners?${value}` : "/admin/learners";
}

function getBandTone(band: "risk" | "watch" | "strong") {
  switch (band) {
    case "risk":
      return "warning";
    case "watch":
      return "accent";
    default:
      return "success";
  }
}

export default async function AdminLearnersPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    cohort?: string;
    coach?: string;
    lane?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    analyticsOverview,
    coachAssignments,
    coachOptions,
    coachPortfolios,
    coacheeOptions,
    cohortOptions,
    cohortRadar,
    filters,
    focusCohort,
    laneBreakdown,
    learnerOperations,
    metrics,
    priorityActions
  } = await getAdminLearnerOpsPageData({
    query: params.query,
    cohortId: params.cohort,
    coachId: params.coach,
    lane: params.lane
  });

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Parcours coachés"
        description="Cockpit admin premium pour structurer les coachés, arbitrer la couverture coach et piloter les cohortes sans alourdir le hub principal."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight admin-learners-hero">
        <div className="admin-learners-hero-copy">
          <span className="eyebrow">Learner ops</span>
          <h3>Une vraie lecture d&apos;exploitation pour couvrir les coachés, équilibrer les cohortes et éviter les angles morts.</h3>
          <p>
            {focusCohort
              ? `${focusCohort.name} remonte comme cohorte prioritaire. ${focusCohort.nextNeed}.`
              : "Le cockpit se remplira dès que des coachés, cohortes et affectations seront visibles côté admin."}
          </p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {focusCohort ? <Badge tone={focusCohort.tone}>{focusCohort.name}</Badge> : null}
            <Badge tone="accent">{analyticsOverview.totalAssignments} assignation(s)</Badge>
          </div>

          <div className="admin-learners-hero-actions">
            <Link className="button" href="#admin-learners-studio">
              Structurer la population
            </Link>
            <Link className="button button-secondary" href="/agenda">
              Ouvrir l&apos;agenda
            </Link>
            <Link className="button button-secondary" href="/admin/users">
              Gérer les utilisateurs
            </Link>
          </div>
        </div>

        <div className="admin-learners-hero-side">
          <EngagementMeter
            band={
              analyticsOverview.averageScore >= 75
                ? "strong"
                : analyticsOverview.averageScore >= 45
                  ? "watch"
                  : "risk"
            }
            bandLabel={
              analyticsOverview.averageScore >= 75
                ? "Population structurée"
                : analyticsOverview.averageScore >= 45
                  ? "Équilibre à surveiller"
                  : "Organisation à renforcer"
            }
            caption={`${analyticsOverview.totalPublishedContents} ressources publiées · ${analyticsOverview.totalCoaches} coach(s) disponibles`}
            score={analyticsOverview.averageScore}
            trend={analyticsOverview.atRiskCount > 0 ? "down" : "steady"}
            trendLabel={
              analyticsOverview.atRiskCount > 0
                ? `${analyticsOverview.atRiskCount} coaché(s) encore sous tension`
                : "rythme global stable sur la vue active"
            }
          />

          <div className="admin-learners-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("admin-learners-lane-card", lane.isActive && "is-active")}
                href={buildLearnerOpsHref({
                  query: filters.query,
                  coachId: filters.coachId,
                  cohortId: filters.cohortId,
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

      <section className="admin-learners-layout">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Filtrer le cockpit</span>
              <h3>Recherche, cohorte, coach et lane</h3>
              <p>Réduis le périmètre avant de piloter les opérations de couverture, de cohorte et de portefeuille.</p>
            </div>

            <Link className="button button-secondary" href="/admin/learners">
              Réinitialiser
            </Link>
          </div>

          <form className="admin-learners-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input defaultValue={filters.query} name="query" placeholder="Coaché, coach, cohorte, signal" type="search" />
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
              <span>Lane</span>
              <select defaultValue={filters.lane} name="lane">
                <option value="all">Toutes les lanes</option>
                <option value="uncovered">à structurer</option>
                <option value="alert">sous tension</option>
                <option value="aligned">bien alignés</option>
              </select>
            </label>

            <div className="admin-learners-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>
        </section>

        <aside className="admin-learners-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Cohorte focus</h3>
              <p>Le groupe à traiter maintenant, soit par sélection directe soit par tension structurelle.</p>
            </div>

            {focusCohort ? (
              <>
                <div className="admin-learners-focus-metrics">
                  <article>
                    <strong>{focusCohort.averageScore}%</strong>
                    <span>engagement moyen</span>
                  </article>
                  <article>
                    <strong>{focusCohort.memberCount}</strong>
                    <span>coaché(s) visibles</span>
                  </article>
                  <article>
                    <strong>{focusCohort.uncoveredCount}</strong>
                    <span>sans coach</span>
                  </article>
                  <article>
                    <strong>{focusCohort.completionRate ?? 0}%</strong>
                    <span>complétion</span>
                  </article>
                </div>

                <div className="tag-row">
                  {focusCohort.leadCoaches.length ? (
                    focusCohort.leadCoaches.map((coach) => (
                      <Badge key={`${focusCohort.id}-${coach}`} tone="accent">
                        {coach}
                      </Badge>
                    ))
                  ) : (
                    <Badge tone="neutral">Aucun coach affecté</Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>Aucune cohorte visible.</strong>
                <p>La cohorte focus s&apos;affichera dès qu&apos;un groupe entrera dans la vue active.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Priorités ops</h3>
              <p>Les actions les plus structurantes à déclencher maintenant sur la population visible.</p>
            </div>

            <div className="admin-learners-priority-list">
              {priorityActions.map((action) => (
                <article className="admin-learners-priority-card" key={action.id}>
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
      </section>

      <section className="panel">
        <div className="panel-header-rich">
          <div>
            <h3>Coachés à structurer</h3>
            <p>Les cartes combinent couverture coach, cohorte, rythme d&apos;activité et prochaine action utile.</p>
          </div>

          <div className="messaging-inline-stats">
            <article>
              <strong>{learnerOperations.length}</strong>
              <span>cartes visibles</span>
            </article>
            <article>
              <strong>{laneBreakdown.find((lane) => lane.id === "uncovered")?.count ?? 0}</strong>
              <span>à structurer</span>
            </article>
            <article>
              <strong>{laneBreakdown.find((lane) => lane.id === "alert")?.count ?? 0}</strong>
              <span>sous tension</span>
            </article>
          </div>
        </div>

        {learnerOperations.length ? (
          <div className="admin-learners-grid">
            {learnerOperations.map((learner) => (
              <article className="admin-learner-card" key={learner.id}>
                <div className="admin-learner-card-head">
                  <div>
                    <strong>{learner.name}</strong>
                    <p>{learner.cohorts.length ? learner.cohorts.join(", ") : "Sans cohorte"}</p>
                  </div>
                  <Badge tone={getBandTone(learner.band)}>{learner.bandLabel}</Badge>
                </div>

                <p className="admin-learner-card-copy">{learner.nextFocus}</p>

                <div className="admin-learner-meta">
                  <span>{learner.score}% score</span>
                  <span>{learner.assignmentCount} assignation(s)</span>
                  <span>{learner.completionRate ?? 0}% complétion</span>
                  <span>{learner.onTimeRate ?? 0}% ponctualité</span>
                </div>

                <div className="tag-row">
                  <Badge tone={learner.coverageTone}>{learner.coverageLabel}</Badge>
                  {learner.overdueCount ? <Badge tone="warning">{learner.overdueCount} retard(s)</Badge> : null}
                  {learner.dueSoonCount ? <Badge tone="accent">{learner.dueSoonCount} à venir</Badge> : null}
                </div>

                {learner.coachNames.length ? (
                  <p className="admin-learner-card-foot">Coach(s) : {learner.coachNames.join(", ")}</p>
                ) : (
                  <p className="admin-learner-card-foot">Aucun coach affecté pour l&apos;instant.</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun coaché ne correspond aux filtres.</strong>
            <p>Élargis la cohorte, le coach ou la lane pour rouvrir le radar ops.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Radar cohortes</h3>
          <p>Lecture groupée de la couverture coach, de la tension apprenante et de la prochaine intervention utile.</p>
        </div>

        {cohortRadar.length ? (
          <div className="admin-learners-cohort-grid">
            {cohortRadar.map((cohort) => (
              <Link
                className={cn("collection-card admin-learners-cohort-card", cohort.isActive && "is-active")}
                href={buildLearnerOpsHref({
                  query: filters.query,
                  coachId: filters.coachId,
                  lane: filters.lane,
                  cohortId: filters.cohortId === cohort.id ? "" : cohort.id
                })}
                key={cohort.id}
              >
                <div className="tag-row">
                  <Badge tone={cohort.tone}>{cohort.averageScore}%</Badge>
                  <Badge tone="neutral">{cohort.memberCount} coaché(s)</Badge>
                </div>
                <strong>{cohort.name}</strong>
                <p>{cohort.nextNeed}</p>
                <div className="admin-learners-cohort-kpis">
                  <div>
                    <strong>{cohort.uncoveredCount}</strong>
                    <span>sans coach</span>
                  </div>
                  <div>
                    <strong>{cohort.atRiskCount}</strong>
                    <span>à risque</span>
                  </div>
                  <div>
                    <strong>{cohort.watchCount}</strong>
                    <span>à surveiller</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune cohorte exploitable.</strong>
            <p>Le radar cohortes se remplira dès qu&apos;une population cohorte sera visible dans le filtre courant.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Capacité coach</h3>
          <p>Lis rapidement quels portefeuilles sont opérationnels, sous tension ou encore vides.</p>
        </div>

        {coachPortfolios.length ? (
          <div className="admin-learners-coach-grid">
            {coachPortfolios.map((coach) => (
              <article className={cn("admin-learners-coach-card", coach.isActive && "is-active")} key={coach.id}>
                <div className="admin-learners-coach-head">
                  <div>
                    <strong>{coach.name}</strong>
                    <p>{coach.email || "email indisponible"}</p>
                  </div>
                  <Badge tone={coach.statusTone}>{coach.statusLabel}</Badge>
                </div>

                <div className="admin-learners-coach-meta">
                  <span>{coach.learnerCoverageCount} coaché(s) couverts</span>
                  <span>{coach.directCount} direct(s)</span>
                  <span>{coach.cohortCount} cohorte(s)</span>
                  <span>{coach.riskCount} sous tension</span>
                </div>

                {coach.sampleLearners.length ? (
                  <p className="admin-learners-coach-copy">Learners focus : {coach.sampleLearners.join(", ")}</p>
                ) : (
                  <p className="admin-learners-coach-copy">Aucun coaché visible dans ce portefeuille pour l&apos;instant.</p>
                )}

                <div className="tag-row">
                  {coach.directCoachees.map((learner) => (
                    <Badge key={`${coach.id}-${learner}`} tone="accent">
                      {learner}
                    </Badge>
                  ))}
                  {coach.cohorts.map((cohort) => (
                    <Badge key={`${coach.id}-${cohort}`} tone="neutral">
                      {cohort}
                    </Badge>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun portefeuille coach visible.</strong>
            <p>Ajoute des coachs ou élargis le filtre courant pour réouvrir la vue capacité.</p>
          </div>
        )}
      </section>

      <section className="content-grid" id="admin-learners-studio">
        <section className="panel">
          <div className="panel-header">
            <h3>Rattacher un coaché à une cohorte</h3>
            <p>La bonne cohorte améliore la lecture agenda, les parcours groupés et la priorisation professor.</p>
          </div>
          <AssignCoacheeToCohortForm coacheeOptions={coacheeOptions} cohortOptions={cohortOptions} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Affecter un coach</h3>
            <p>Définis qui suit qui, en direct ou via cohorte, pour ouvrir proprement le cockpit coach et la messagerie.</p>
          </div>
          <AssignCoachForm coachOptions={coachOptions} coacheeOptions={coacheeOptions} cohortOptions={cohortOptions} />
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Historique des affectations</h3>
          <p>Trace utile pour comprendre comment la visibilité coach a été structurée sur la population visible.</p>
        </div>

        {coachAssignments.length ? (
          <div className="stack-list">
            {coachAssignments.map((assignment) => (
              <article className="list-row list-row-stretch" key={assignment.id}>
                <div>
                  <strong>{assignment.coachName}</strong>
                  <p>
                    {assignment.targetType} · {assignment.target}
                  </p>
                  <p>
                    {assignment.scopeLabel} · {assignment.createdAt}
                  </p>
                </div>
                <div className="list-row-meta">
                  <Badge tone={assignment.tone}>{assignment.targetType}</Badge>
                  <span>{assignment.createdAtCompact}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune affectation visible.</strong>
            <p>Le journal d&apos;affectation se remplira dès qu&apos;une couverture coach sera créée.</p>
          </div>
        )}
      </section>
    </div>
  );
}
