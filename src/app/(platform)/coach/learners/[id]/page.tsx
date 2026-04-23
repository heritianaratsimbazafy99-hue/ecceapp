import Link from "next/link";
import { notFound } from "next/navigation";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getCoachLearnerDetailPageData } from "@/lib/platform-data";

function getAttemptTone(status: string) {
  switch (status) {
    case "graded":
      return "success";
    case "submitted":
      return "accent";
    default:
      return "neutral";
  }
}

export default async function CoachLearnerDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCoachLearnerDetailPageData(id);

  if (!data.learner) {
    notFound();
  }

  const { activityFeed, assignmentCards, badges, engagement, learner, metrics, notifications, recentAttempts, sessions, submissionCards } =
    data;

  return (
    <div className="page-shell">
      <PlatformTopbar
        actions={
          <>
            <Link className="button button-secondary" href="/coach">
              Cockpit coach
            </Link>
            <Link className="button" href="/coach/reviews">
              Corrections
            </Link>
          </>
        }
        title={learner.name}
        description="Fiche coaché dédiée pour relier progression, deadlines, quiz, rendus et séances sans ouvrir plusieurs cockpits."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight coach-learner-hero">
        <div className="coach-learner-hero-copy">
          <span className="eyebrow">Fiche coaché</span>
          <h3>Une lecture individuelle pour décider de la prochaine intervention utile.</h3>
          <p>
            {learner.bio ??
              "Cette fiche consolide les signaux pédagogiques, les deadlines et les traces de correction disponibles pour ce coaché."}
          </p>

          <div className="tag-row">
            <Badge tone={learner.status === "active" ? "success" : learner.status === "invited" ? "accent" : "warning"}>
              {learner.status}
            </Badge>
            <Badge tone="neutral">{learner.timezone}</Badge>
            {learner.cohorts.length ? (
              learner.cohorts.map((cohort) => (
                <Badge key={cohort} tone="accent">
                  {cohort}
                </Badge>
              ))
            ) : (
              <Badge tone="warning">sans cohorte</Badge>
            )}
          </div>
        </div>

        <div className="coach-learner-hero-side">
          {engagement ? (
            <EngagementMeter
              band={engagement.band}
              bandLabel={engagement.bandLabel}
              caption={`${engagement.assignmentCount} assignation(s) · ${engagement.recentActivityCount} activité(s) récentes`}
              score={engagement.score}
              trend={engagement.trend}
              trendLabel={engagement.trendLabel}
            />
          ) : (
            <div className="empty-state empty-state-compact">
              <strong>Signal en construction.</strong>
              <p>Le score d’engagement apparaîtra dès que le coaché aura de l’activité.</p>
            </div>
          )}

          <div className="coach-learner-reference-grid">
            <article>
              <strong>{learner.coaches.length || "—"}</strong>
              <span>coach(s) assignés</span>
            </article>
            <article>
              <strong>{learner.createdAt}</strong>
              <span>entrée plateforme</span>
            </article>
          </div>
        </div>
      </section>

      <section className="coach-learner-layout">
        <div className="coach-learner-main">
          <section className="panel">
            <div className="panel-header-rich">
              <div>
                <h3>Plan d’action pédagogique</h3>
                <p>Les assignations visibles pour ce coaché, avec état, support et prochaine action.</p>
              </div>
              <Link className="button button-secondary button-small" href="/admin/assignments">
                Gérer les assignations
              </Link>
            </div>

            {assignmentCards.length ? (
              <div className="coach-learner-assignment-grid">
                {assignmentCards.map((assignment) => (
                  <article className="collection-card coach-learner-assignment-card" key={assignment.id}>
                    <div className="tag-row">
                      <Badge tone={assignment.statusTone}>{assignment.statusLabel}</Badge>
                      <Badge tone="neutral">{assignment.kind}</Badge>
                    </div>

                    <strong>{assignment.title}</strong>
                    <p>{assignment.assetTitle}</p>

                    <div className="coach-learner-card-meta">
                      <span>{assignment.due}</span>
                      <span>{assignment.audienceLabel}</span>
                      <span>{assignment.latestResult}</span>
                    </div>

                    <Link className="button button-secondary button-small" href={assignment.href}>
                      Ouvrir
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>Aucune assignation visible.</strong>
                <p>Crée une mission individuelle ou rattache le coaché à une cohorte pour remplir ce plan.</p>
              </div>
            )}
          </section>

          <section className="content-grid coach-learner-results-grid">
            <section className="panel">
              <div className="panel-header">
                <h3>Derniers quiz</h3>
                <p>Résultats et copies en correction côté coach.</p>
              </div>

              {recentAttempts.length ? (
                <div className="stack-list">
                  {recentAttempts.map((attempt) => (
                    <article className="list-row list-row-stretch" key={attempt.id}>
                      <div>
                        <strong>{attempt.title}</strong>
                        <p>{attempt.meta}</p>
                      </div>
                      <Badge tone={getAttemptTone(attempt.status)}>{attempt.score}</Badge>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state empty-state-compact">
                  <strong>Aucune tentative.</strong>
                  <p>Les résultats s’afficheront ici après le premier quiz soumis.</p>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3>Rendus et feedbacks</h3>
                <p>Soumissions récentes, fichiers joints et dernier retour coach.</p>
              </div>

              {submissionCards.length ? (
                <div className="stack-list">
                  {submissionCards.map((submission) => (
                    <article className="coach-learner-submission-card" key={submission.id}>
                      <div className="tag-row">
                        <Badge tone={submission.statusTone}>{submission.statusLabel}</Badge>
                        {submission.fileUrl ? (
                          <Link className="button button-secondary button-small" href={submission.fileUrl} target="_blank">
                            Télécharger
                          </Link>
                        ) : null}
                      </div>
                      <strong>{submission.title}</strong>
                      <p>{submission.contentTitle} · {submission.submittedAt}</p>
                      {submission.review ? (
                        <div className="coach-review-summary">
                          <strong>Dernier feedback</strong>
                          <p>
                            {submission.review.feedback}
                            {submission.review.grade !== null ? ` · note ${submission.review.grade}/100` : ""}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state empty-state-compact">
                  <strong>Aucun rendu.</strong>
                  <p>Les soumissions apparaîtront ici avec leurs feedbacks.</p>
                </div>
              )}
            </section>
          </section>
        </div>

        <aside className="coach-learner-side">
          <section className="panel">
            <div className="panel-header">
              <h3>Coach référents</h3>
              <p>Couverture humaine visible pour ce coaché.</p>
            </div>

            {learner.coaches.length ? (
              <div className="stack-list">
                {learner.coaches.map((coach) => (
                  <article className="list-row" key={coach.id}>
                    <div>
                      <strong>{coach.name}</strong>
                      <p>coach assigné</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun coach assigné.</strong>
                <p>Ajoute une affectation pour sécuriser le suivi.</p>
              </div>
            )}
          </section>

          <section className="panel panel-accent">
            <div className="panel-header">
              <h3>Séances</h3>
              <p>Historique court et prochaines sessions planifiées.</p>
            </div>

            {sessions.length ? (
              <div className="stack-list">
                {sessions.map((session) => (
                  <article className="coach-learner-session-card" key={session.id}>
                    <div className="tag-row">
                      <Badge tone={session.status === "planned" ? "accent" : "neutral"}>{session.status}</Badge>
                      {session.videoLink ? <Badge tone="success">lien prêt</Badge> : null}
                    </div>
                    <strong>{session.date}</strong>
                    <p>{session.cohort ? `Cohorte ${session.cohort}` : session.end}</p>
                    {session.videoLink ? (
                      <Link className="button button-secondary button-small" href={session.videoLink} target="_blank">
                        Rejoindre
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune séance.</strong>
                <p>Planifie une session depuis le cockpit coach ou l’agenda.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Activité récente</h3>
              <p>Flux consolidé des signaux pédagogiques récents.</p>
            </div>

            {activityFeed.length ? (
              <div className="coach-learner-activity-feed">
                {activityFeed.map((item) => (
                  <article className="coach-learner-activity-item" key={item.id}>
                    <Badge tone={item.tone}>{item.date}</Badge>
                    <strong>{item.title}</strong>
                    <p>{item.meta}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune activité récente.</strong>
                <p>Les actions du coaché remonteront ici progressivement.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Badges & notifications</h3>
              <p>Récompenses et signaux non lus pour contextualiser la relation.</p>
            </div>

            <div className="coach-learner-mini-grid">
              <article>
                <strong>{badges.length}</strong>
                <span>badge(s)</span>
              </article>
              <article>
                <strong>{notifications.filter((notification) => !notification.read).length}</strong>
                <span>notification(s) non lues</span>
              </article>
            </div>

            {badges.length ? (
              <div className="stack-list">
                {badges.slice(0, 3).map((badge) => (
                  <article className="list-row" key={badge.id}>
                    <div>
                      <strong>{badge.title}</strong>
                      <p>{badge.awardedAt}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </div>
  );
}
