import Link from "next/link";

import {
  GradeQuizTextAttemptForm,
  ReviewSubmissionForm,
  ScheduleCoachingSessionForm
} from "@/app/(platform)/coach/forms";
import { RealtimeConversationHub } from "@/components/messages/realtime-conversation-hub";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getCoachPageData } from "@/lib/platform-data";

export default async function CoachPage() {
  const {
    context,
    metrics,
    engagementOverview,
    roster,
    attentionLearners,
    sessions,
    deadlines,
    recentQuizResults,
    textReviewQueue,
    reviewQueue,
    coachOptions,
    cohortOptions,
    coacheeOptions,
    messagingWorkspace
  } = await getCoachPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Cockpit coach"
        description="Pilotage réel des coachés, avec visibilité sur l'engagement, les deadlines, les corrections et les échanges."
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel panel-accent">
          <div className="panel-header">
            <h3>Signal d&apos;engagement global</h3>
            <p>Lecture pédagogique du groupe que tu suis : activité récente, complétion et ponctualité.</p>
          </div>

          <EngagementMeter
            band={
              engagementOverview.averageScore >= 75
                ? "strong"
                : engagementOverview.averageScore >= 45
                  ? "watch"
                  : "risk"
            }
            bandLabel={
              engagementOverview.averageScore >= 75
                ? "Dynamique saine"
                : engagementOverview.averageScore >= 45
                  ? "Surveillance utile"
                  : "Relance prioritaire"
            }
            caption={`${engagementOverview.atRiskCount} coaché(s) à relancer, ${engagementOverview.recentlyActiveCount} actifs cette semaine`}
            score={engagementOverview.averageScore}
            trend={engagementOverview.atRiskCount > 0 ? "down" : "steady"}
            trendLabel={
              engagementOverview.atRiskCount > 0
                ? "certaines dynamiques demandent une relance"
                : "rythme global maîtrisé"
            }
          />

          <div className="analytics-list section-spacer">
            <article className="analytics-item">
              <span>Complétion groupe</span>
              <strong>{engagementOverview.completionRate !== null ? `${engagementOverview.completionRate}%` : "n/a"}</strong>
              <small>{engagementOverview.strongCount} coaché(s) très engagés</small>
            </article>
            <article className="analytics-item">
              <span>Ponctualité</span>
              <strong>{engagementOverview.onTimeRate !== null ? `${engagementOverview.onTimeRate}%` : "n/a"}</strong>
              <small>{engagementOverview.watchCount} à surveiller</small>
            </article>
            <article className="analytics-item">
              <span>Quiz moyen</span>
              <strong>{engagementOverview.averageQuizScore !== null ? `${engagementOverview.averageQuizScore}%` : "n/a"}</strong>
              <small>sur les quiz déjà corrigés</small>
            </article>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Alertes d&apos;engagement</h3>
            <p>Les coachés qui méritent une relance humaine maintenant.</p>
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
              <strong>Aucune alerte critique.</strong>
              <p>Le groupe est plutôt bien engagé pour le moment.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Planifier une séance</h3>
          <p>Crée un créneau de coaching et notifie automatiquement le coaché concerné.</p>
        </div>

        <ScheduleCoachingSessionForm
          allowCoachSelection={context.role === "admin"}
          coachOptions={coachOptions}
          cohortOptions={cohortOptions}
          coacheeOptions={coacheeOptions}
        />
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Coachés visibles</h3>
            <p>Les profils affichés ici viennent maintenant de la base ECCE.</p>
          </div>

          {roster.length ? (
            <div className="stack-list">
              {roster.map((item) => (
                <article className="list-row list-row-stretch" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.cohorts.length ? item.cohorts.join(", ") : "Sans cohorte"} · {item.status}
                    </p>
                    {item.engagement ? (
                      <p>
                        engagement {item.engagement.score}% · {item.engagement.nextFocus}
                      </p>
                    ) : null}
                  </div>

                  <div className="table-actions">
                    <Badge tone={item.status === "active" ? "success" : "warning"}>
                      {item.status}
                    </Badge>
                    {item.engagement ? (
                      <Badge tone={item.engagement.band === "strong" ? "success" : item.engagement.band === "risk" ? "warning" : "accent"}>
                        {item.engagement.bandLabel}
                      </Badge>
                    ) : null}
                    {item.upcomingSession ? (
                      <Badge tone="accent">{item.upcomingSession}</Badge>
                    ) : (
                      <Badge tone="neutral">aucune session</Badge>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun coaché détecté pour l&apos;instant.</strong>
              <p>Ajoute un utilisateur avec le rôle `coachee` depuis l&apos;admin pour le voir ici.</p>
            </div>
          )}
        </div>

        <div className="panel panel-accent">
          <div className="panel-header">
            <h3>Sessions à venir</h3>
            <p>Ces créneaux proviennent de la table `coaching_sessions`.</p>
          </div>

          {sessions.length ? (
            <div className="stack-list">
              {sessions.map((session) => (
                <article className="list-row" key={session.id}>
                  <div>
                    <strong>{session.name}</strong>
                    <p>
                      {session.date}
                      {session.cohort ? ` · ${session.cohort}` : ""}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune session planifiée.</strong>
              <p>La table de séances est prête, il restera à ajouter l&apos;interface de planification.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Deadlines à surveiller</h3>
          <p>Les deadlines créées dans l&apos;admin remontent ici pour donner de la visibilité au coach.</p>
        </div>

        {deadlines.length ? (
          <div className="stack-list">
            {deadlines.map((deadline) => (
              <article className="list-row list-row-stretch" key={deadline.id}>
                <div>
                  <strong>{deadline.title}</strong>
                  <p>{deadline.due}</p>
                </div>
                <Badge tone="warning">{deadline.targetCount} cible(s)</Badge>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune deadline active.</strong>
            <p>Crée une assignation avec échéance depuis l&apos;admin pour l&apos;afficher ici.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Résultats quiz récents</h3>
          <p>Les tentatives soumises par les coachés remontent ici pour le suivi pédagogique.</p>
        </div>

        {recentQuizResults.length ? (
          <div className="stack-list">
            {recentQuizResults.map((result) => (
                <article className="list-row list-row-stretch" key={result.id}>
                  <div>
                    <strong>{result.learner}</strong>
                    <p>
                      {result.attempt} · {result.submittedAt}
                    </p>
                  </div>
                <Badge tone={result.status === "submitted" ? "neutral" : "success"}>{result.score}</Badge>
                </article>
              ))}
            </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun résultat quiz remonté pour le moment.</strong>
            <p>Dès qu&apos;un coaché soumettra un quiz, tu verras ici son score.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Réponses textuelles à corriger</h3>
          <p>Les tentatives avec réponses ouvertes arrivent ici pour correction manuelle et calcul du score final.</p>
        </div>

        {textReviewQueue.length ? (
          <div className="stack-list">
            {textReviewQueue.map((attempt) => (
              <article className="panel panel-subtle" key={attempt.id}>
                <div className="panel-header">
                  <h3>{attempt.learner}</h3>
                  <p>
                    {attempt.quizTitle} · {attempt.attemptLabel} · {attempt.submittedAt}
                  </p>
                </div>

                <div className="table-actions">
                  <Badge tone="warning">correction requise</Badge>
                  <Badge tone="neutral">score auto actuel {attempt.score}</Badge>
                </div>

                <div className="section-spacer">
                  <GradeQuizTextAttemptForm answers={attempt.answers} attemptId={attempt.id} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune réponse textuelle en attente.</strong>
            <p>Dès qu&apos;un coaché soumettra un quiz avec question ouverte, tu pourras le corriger ici.</p>
          </div>
        )}
      </section>

      {messagingWorkspace ? (
        <RealtimeConversationHub
          composerPlaceholder="Partage un retour, une relance ou une consigne actionnable."
          contacts={messagingWorkspace.contacts}
          conversations={messagingWorkspace.conversations}
          description="Messagerie coach/coachee branchée sur Supabase Realtime pour accompagner sans friction."
          emptyBody="Choisis un coaché puis envoie ton premier message pour démarrer un suivi direct."
          emptyTitle="Aucune conversation lancée."
          initialConversationId={messagingWorkspace.initialConversationId}
          initialMessages={messagingWorkspace.initialMessages}
          title="Messagerie coach"
          userId={context.user.id}
        />
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <h3>Soumissions a relire</h3>
          <p>Le coach peut relire, noter et envoyer un feedback sans quitter ce cockpit.</p>
        </div>

        {reviewQueue.length ? (
          <div className="stack-list">
            {reviewQueue.map((submission) => (
              <article className="panel panel-subtle" key={submission.id}>
                <div className="panel-header">
                  <h3>{submission.learner}</h3>
                  <p>
                    {submission.contentTitle} · {submission.submittedAt}
                  </p>
                </div>

                <div className="stack-list">
                  <div className="list-row list-row-stretch">
                    <div>
                      <strong>{submission.title}</strong>
                      {submission.notes ? <p>{submission.notes}</p> : null}
                    </div>
                    <div className="table-actions">
                      <Badge tone={submission.status === "reviewed" ? "success" : "warning"}>
                        {submission.status}
                      </Badge>
                      {submission.fileUrl ? (
                        <Link className="button button-secondary button-small" href={submission.fileUrl} target="_blank">
                          Télécharger
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {submission.review ? (
                    <div className="coach-review-summary">
                      <strong>Dernier feedback</strong>
                      <p>
                        {submission.review.feedback}
                        {submission.review.grade !== null ? ` · note ${submission.review.grade}/100` : ""}
                      </p>
                    </div>
                  ) : null}

                  <ReviewSubmissionForm submissionId={submission.id} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune soumission en attente.</strong>
            <p>Dès qu&apos;un coaché déposera un rendu, tu pourras le corriger ici.</p>
          </div>
        )}
      </section>
    </div>
  );
}
