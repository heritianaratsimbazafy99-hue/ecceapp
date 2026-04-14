import {
  AssignCoacheeToCohortForm,
  AssignCoachForm
} from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { Badge } from "@/components/ui/badge";
import { getAdminLearnerOpsPageData } from "@/lib/platform-data";

export default async function AdminLearnersPage() {
  const {
    analyticsOverview,
    attentionLearners,
    coacheeOptions,
    cohortOptions,
    coachOptions,
    coacheeCohorts,
    coachAssignments,
    coachPortfolios
  } = await getAdminLearnerOpsPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Parcours coachés"
        description="Vue dédiée aux cohortes, relances et portefeuilles coach pour une lecture pédagogique plus nette."
      />

      <section className="content-grid">
        <div className="panel panel-highlight">
          <div className="panel-header">
            <h3>Signal d&apos;engagement global</h3>
            <p>Lecture agrégée de la dynamique des coachés avant de répartir les efforts de suivi.</p>
          </div>

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
                ? "Cohorte saine"
                : analyticsOverview.averageScore >= 45
                  ? "Surveillance utile"
                  : "Relance prioritaire"
            }
            caption={`${analyticsOverview.totalAssignments} assignations actives · ${analyticsOverview.totalPublishedContents} contenus publiés`}
            score={analyticsOverview.averageScore}
            trend={analyticsOverview.atRiskCount > 0 ? "down" : "steady"}
            trendLabel={
              analyticsOverview.atRiskCount > 0
                ? `${analyticsOverview.atRiskCount} coaché(s) demandent une relance`
                : "dynamique globale stable"
            }
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Coachés à relancer</h3>
            <p>Ceux qui combinent retard, faible activité récente ou faible complétion.</p>
          </div>

          {attentionLearners.length ? (
            <div className="stack-list">
              {attentionLearners.map((learner) => (
                <article className="list-row list-row-stretch" key={learner.id}>
                  <div>
                    <strong>{learner.name}</strong>
                    <p>
                      {learner.lastActivityLabel} · {learner.nextFocus}
                    </p>
                  </div>
                  <div className="list-row-meta">
                    <Badge tone={learner.band === "risk" ? "warning" : "accent"}>{learner.bandLabel}</Badge>
                    <strong>{learner.score}%</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune alerte majeure.</strong>
              <p>Les signaux d&apos;engagement restent sains à ce stade.</p>
            </div>
          )}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Affecter un coaché à une cohorte</h3>
            <p>Prépare les parcours groupés et la planification par cohortes.</p>
          </div>
          <AssignCoacheeToCohortForm coacheeOptions={coacheeOptions} cohortOptions={cohortOptions} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Attribuer un coach</h3>
            <p>Définis qui suit quel coaché ou quelle cohorte. Le cockpit coach se filtrera ensuite automatiquement.</p>
          </div>
          <AssignCoachForm coachOptions={coachOptions} coacheeOptions={coacheeOptions} cohortOptions={cohortOptions} />
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Coachés par cohorte</h3>
            <p>Vue rapide des rattachements actuels avant les assignations et les séances.</p>
          </div>

          {coacheeCohorts.length ? (
            <div className="stack-list">
              {coacheeCohorts.map((learner) => (
                <article className="list-row list-row-stretch" key={learner.id}>
                  <div>
                    <strong>{learner.name}</strong>
                    <p>{learner.status}</p>
                  </div>
                  <div className="tag-row">
                    {learner.cohorts.length ? (
                      learner.cohorts.map((cohort) => (
                        <Badge key={`${learner.id}-${cohort}`} tone="accent">
                          {cohort}
                        </Badge>
                      ))
                    ) : (
                      <Badge tone="neutral">Sans cohorte</Badge>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun coaché à rattacher pour l&apos;instant.</strong>
              <p>Crée un utilisateur avec le rôle `coachee`, puis rattache-le à une cohorte ici.</p>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Portefeuilles coach</h3>
            <p>Résumé des coachés et cohortes visibles dans le cockpit de chaque coach.</p>
          </div>

          {coachPortfolios.length ? (
            <div className="stack-list">
              {coachPortfolios.map((coach) => (
                <article className="list-row list-row-stretch" key={coach.id}>
                  <div>
                    <strong>{coach.name}</strong>
                    <p>
                      {coach.directCount} coaché(s) direct(s) · {coach.cohortCount} cohorte(s)
                    </p>
                    {coach.directCoachees.length ? <p>{coach.directCoachees.join(", ")}</p> : null}
                    {coach.cohorts.length ? <p>{coach.cohorts.join(", ")}</p> : null}
                  </div>
                  <Badge tone={coach.directCount + coach.cohortCount > 0 ? "success" : "neutral"}>
                    {coach.directCount + coach.cohortCount > 0 ? "actif" : "à configurer"}
                  </Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun coach disponible.</strong>
              <p>Ajoute d&apos;abord des profils avec le rôle `coach`.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Historique des affectations coach</h3>
          <p>Trace utile pour comprendre qui voit quoi dans le cockpit et la messagerie.</p>
        </div>

        {coachAssignments.length ? (
          <div className="stack-list">
            {coachAssignments.map((assignment) => (
              <article className="list-row list-row-stretch" key={assignment.id}>
                <div>
                  <strong>{assignment.coach}</strong>
                  <p>
                    {assignment.targetType} · {assignment.target}
                  </p>
                  <p>{assignment.createdAt}</p>
                </div>
                <Badge tone={assignment.targetType === "cohorte" ? "warning" : "accent"}>
                  {assignment.targetType}
                </Badge>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune affectation coach.</strong>
            <p>Attribue un coach à un coaché ou à une cohorte pour activer les filtres métier.</p>
          </div>
        )}
      </section>
    </div>
  );
}
