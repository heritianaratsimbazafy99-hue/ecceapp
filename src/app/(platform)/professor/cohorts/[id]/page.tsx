import Link from "next/link";
import { notFound } from "next/navigation";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getProfessorCohortDetailPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

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

function getCohortBand(score: number): "risk" | "watch" | "strong" {
  if (score >= 75) {
    return "strong";
  }

  if (score >= 45) {
    return "watch";
  }

  return "risk";
}

export default async function ProfessorCohortDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProfessorCohortDetailPageData(id);

  if (!data) {
    notFound();
  }

  const {
    canOpenSessionWorkspace,
    championLearners,
    cohort,
    coachingFocus,
    fragileQuizzes,
    learnerSpotlights,
    metrics,
    pivotContents,
    priorities,
    recommendation,
    responsibleCoaches,
    sessions
  } = data;
  const cohortBand = getCohortBand(cohort.averageScore);
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
            <Link className="button button-secondary" href={`/professor/coaching?cohort=${cohort.id}&period=all`}>
              Séances cohorte
            </Link>
            <Link className="button" href="/agenda">
              Agenda
            </Link>
          </>
        }
        title={cohort.name}
        description="Vue décisionnelle professor pour relier engagement pédagogique, séances, quiz fragiles, contenus pivots et coachs responsables."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight cohort-detail-hero">
        <div className="cohort-detail-copy">
          <span className="eyebrow">Cohorte professor</span>
          <h3>{recommendation}</h3>
          <p>
            {cohort.statusLabel}. Focus actuel : {cohort.topFocus}
          </p>

          <div className="tag-row">
            <Badge tone={cohort.tone}>{cohort.averageScore}% engagement</Badge>
            <Badge tone="neutral">{cohort.memberCount} coaché(s)</Badge>
            <Badge tone={cohort.atRiskCount > 0 ? "warning" : "success"}>{cohort.atRiskCount} à risque</Badge>
            <Badge tone="accent">{cohort.shareOfPopulation}% du portefeuille</Badge>
          </div>

          <div className="cohort-detail-actions">
            <Link className="button" href="#cohort-detail-learners">
              Lire les coachés
            </Link>
            <Link className="button button-secondary" href={`/professor/coaching?cohort=${cohort.id}&period=all`}>
              Pilotage coaching
            </Link>
          </div>
        </div>

        <div className="cohort-detail-meter">
          <EngagementMeter
            band={cohortBand}
            bandLabel={
              cohortBand === "strong"
                ? "Cohorte solide"
                : cohortBand === "watch"
                  ? "Cohorte à surveiller"
                  : "Cohorte prioritaire"
            }
            caption={`${cohort.completionRate ?? 0}% complétion · ${coachingFocus.noteCoverage}% notes couvertes`}
            score={cohort.averageScore}
            trend={cohort.atRiskCount > 0 ? "down" : cohort.watchCount > 0 ? "steady" : "up"}
            trendLabel={
              cohort.atRiskCount > 0
                ? "relance prioritaire"
                : cohort.watchCount > 0
                  ? "stabilisation utile"
                  : "dynamique à préserver"
            }
          />

          <div className="cohort-detail-pulse-grid">
            <article>
              <strong>{cohort.strongCount}</strong>
              <span>solides</span>
            </article>
            <article>
              <strong>{cohort.watchCount}</strong>
              <span>à surveiller</span>
            </article>
            <article>
              <strong>{cohort.atRiskCount}</strong>
              <span>à risque</span>
            </article>
          </div>
        </div>
      </section>

      <section className="content-grid" id="cohort-detail-learners">
        <section className="panel">
          <div className="panel-header-rich">
            <div>
              <h3>Coachés à décider</h3>
              <p>Les profils qui concentrent la décision pédagogique immédiate pour cette cohorte.</p>
            </div>
            <div className="messaging-inline-stats">
              <article>
                <strong>{learnerSpotlights.length}</strong>
                <span>profils visibles</span>
              </article>
              <article>
                <strong>{cohort.atRiskCount + cohort.watchCount}</strong>
                <span>signaux ouverts</span>
              </article>
            </div>
          </div>

          {learnerSpotlights.length ? (
            <div className="cohort-detail-learner-grid">
              {learnerSpotlights.map((learner) => (
                <article className="cohort-detail-learner-card" key={learner.id}>
                  <div className="cohort-detail-learner-head">
                    <div>
                      <strong>{learner.name}</strong>
                      <p>{learner.nextFocus}</p>
                    </div>
                    <Badge tone={getBandTone(learner.band)}>{learner.bandLabel}</Badge>
                  </div>

                  <div className="cohort-detail-learner-meta">
                    <span>{learner.score}% score</span>
                    <span>{learner.completionRate !== null ? `${learner.completionRate}% complétion` : "Complétion à construire"}</span>
                    <span>{learner.averageQuizScore !== null ? `${learner.averageQuizScore}% quiz` : "Quiz non notés"}</span>
                    <span>{learner.lastActivityLabel}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun coaché visible.</strong>
              <p>La vue se remplira dès que des membres seront rattachés à cette cohorte.</p>
            </div>
          )}
        </section>

        <aside className="cohort-detail-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Coachs responsables</h3>
              <p>Couverture réelle issue des affectations directes et de portefeuille cohorte.</p>
            </div>

            {responsibleCoaches.length ? (
              <div className="cohort-detail-coach-list">
                {responsibleCoaches.map((coach) => (
                  <article className="cohort-detail-coach-card" key={coach.id}>
                    <div>
                      <strong>{coach.name}</strong>
                      <p>{coach.scopeLabel}</p>
                    </div>
                    <div className="cohort-detail-coach-meta">
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
                <strong>Aucun coach assigné.</strong>
                <p>Cette cohorte mérite une affectation coach depuis l&apos;admin learners ops.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Dynamique positive</h3>
              <p>Profils qui peuvent servir de repère dans la cohorte.</p>
            </div>

            {championLearners.length ? (
              <div className="stack-list">
                {championLearners.map((learner) => (
                  <article className="list-row list-row-stretch" key={learner.id}>
                    <div>
                      <strong>{learner.name}</strong>
                      <p>
                        {learner.trendLabel} · {learner.nextFocus}
                      </p>
                    </div>
                    <Badge tone={getBandTone(learner.band)}>{learner.score}%</Badge>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun benchmark encore fiable.</strong>
                <p>Les dynamiques positives apparaîtront avec les prochaines activités.</p>
              </div>
            )}
          </section>
        </aside>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header-rich">
            <div>
              <h3>Séances et mémoire coach</h3>
              <p>Les rendez-vous liés à la cohorte, avec le niveau de documentation exploitable.</p>
            </div>
            <Badge tone={coachingFocus.noteCoverage >= 75 ? "success" : coachingFocus.noteCoverage >= 45 ? "accent" : "warning"}>
              {coachingFocus.noteCoverage}% notes
            </Badge>
          </div>

          {sessions.length ? (
            <div className="cohort-detail-session-list">
              {sessions.map((session) => (
                <article className={cn("cohort-detail-session-card", session.needsNote && "needs-note")} key={session.id}>
                  <div>
                    <span className="eyebrow">{session.dayLabel}</span>
                    <strong>{session.learnerName}</strong>
                    <p>
                      {session.coachName} · {session.timeLabel}
                    </p>
                  </div>
                  <div className="cohort-detail-session-side">
                    <Badge tone={session.statusTone}>{session.statusLabel}</Badge>
                    <span>{session.noteCount} note(s)</span>
                    <Link className="button button-secondary button-small" href={resolveSessionHref(session.href)}>
                      {canOpenSessionWorkspace ? "Ouvrir" : "Agenda"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune séance visible.</strong>
              <p>Planifie ou élargis le pilotage coaching pour installer une cadence de suivi.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Quiz fragiles</h3>
            <p>Les évaluations à recalibrer selon les résultats de cette cohorte.</p>
          </div>

          {fragileQuizzes.length ? (
            <div className="cohort-detail-quiz-list">
              {fragileQuizzes.map((quiz) => (
                <article className="cohort-detail-quiz-card" key={quiz.id}>
                  <div className="tag-row">
                    <Badge tone={quiz.signalTone}>{quiz.signalLabel}</Badge>
                    <Badge tone="neutral">{quiz.questionCount} question(s)</Badge>
                  </div>
                  <strong>{quiz.title}</strong>
                  <p>{quiz.insight}</p>
                  <Link className="button button-secondary button-small" href={`/professor/quizzes/${quiz.id}`}>
                    Analyser
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun quiz fragile.</strong>
              <p>Les signaux de recalibrage apparaîtront dès que les tentatives remontent.</p>
            </div>
          )}
        </section>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Contenus pivots</h3>
            <p>Ressources qui structurent le plus l&apos;activité de la cohorte.</p>
          </div>

          {pivotContents.length ? (
            <div className="cohort-detail-content-grid">
              {pivotContents.map((content) => (
                <article className="collection-card cohort-detail-content-card" key={content.id}>
                  <div className="tag-row">
                    <Badge tone="success">{content.contentType}</Badge>
                    <Badge tone="neutral">{content.category}</Badge>
                  </div>
                  <strong>{content.title}</strong>
                  <p>{content.summary}</p>
                  <div className="cohort-detail-content-meta">
                    <span>{content.assignmentCount} assignation(s)</span>
                    <span>{content.linkedQuizCount} quiz lié(s)</span>
                    <span>{content.estimatedMinutes ? `${content.estimatedMinutes} min` : "Durée libre"}</span>
                  </div>
                  <Link className="button button-secondary button-small" href={`/library/${content.slug}`}>
                    Voir
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun contenu pivot.</strong>
              <p>Les contenus apparaîtront dès qu&apos;ils seront assignés ou reliés aux quiz de la cohorte.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Décisions recommandées</h3>
            <p>Actions transverses issues du cockpit professor et du pilotage coaching.</p>
          </div>

          <div className="cohort-detail-priority-list">
            {priorities.map((priority) => (
              <article className="cohort-detail-priority-card" key={priority.id}>
                <Badge tone={priority.tone}>{priority.eyebrow}</Badge>
                <strong>{priority.title}</strong>
                <p>{priority.description}</p>
                <Link className="button button-secondary button-small" href={resolveSessionHref(priority.href)}>
                  {priority.href.startsWith("/coach/sessions") && !canOpenSessionWorkspace ? "Agenda" : priority.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
