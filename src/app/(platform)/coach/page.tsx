import Link from "next/link";

import { AssignmentCommandBoard } from "@/components/assignments/assignment-command-board";
import { CoachPortfolioBoard } from "@/components/coach/coach-portfolio-board";
import {
  GradeQuizTextAttemptForm,
  ReviewSubmissionForm,
  ScheduleCoachingSessionForm
} from "@/app/(platform)/coach/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MessagingPreviewPanel } from "@/components/messages/messaging-preview-panel";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getCoachPageData } from "@/lib/platform-data";

export default async function CoachPage() {
  const {
    context,
    metrics,
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
    internalFollowUps,
    messagingWorkspace
  } = await getCoachPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Cockpit coach"
        description="Portefeuille coach, relances, sessions, corrections et échanges dans une interface de pilotage plus premium."
        actions={
          <>
            <Link className="button button-secondary" href="/coach/reviews">
              Corrections
            </Link>
            <Link className="button" href="/agenda">
              Agenda
            </Link>
          </>
        }
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <CoachPortfolioBoard attentionLearners={attentionLearners} roster={roster} />

      <section className="panel coach-follow-up-panel">
        <div className="panel-header-rich">
          <div>
            <span className="eyebrow">Relances internes</span>
            <h3>File priorisée par urgence</h3>
            <p>Les rappels créés dans les notes privées de messagerie remontent ici dans l&apos;ordre d&apos;action.</p>
          </div>

          <div className="messaging-inline-stats">
            <article>
              <strong>{internalFollowUps.length}</strong>
              <span>relance(s)</span>
            </article>
            <article>
              <strong>{internalFollowUps.filter((item) => item.urgency === "overdue").length}</strong>
              <span>en retard</span>
            </article>
          </div>
        </div>

        {internalFollowUps.length ? (
          <div className="coach-follow-up-list">
            {internalFollowUps.map((item) => (
              <article className="coach-follow-up-card" key={item.id}>
                <div className="coach-follow-up-copy">
                  <div className="coach-follow-up-topline">
                    <strong>{item.learnerName}</strong>
                    <Badge tone={item.tone}>{item.dueLabel}</Badge>
                  </div>
                  <p>{item.bodyPreview}</p>
                </div>

                <div className="coach-follow-up-meta">
                  <span>{item.dueAt}</span>
                  <small>note mise à jour {item.updatedAt}</small>
                  <small>prochaine relance proposée {item.nextFollowUpAt}</small>
                </div>

                <div className="coach-follow-up-actions">
                  <Link className="button button-small" href={item.messageHref}>
                    Préparer la relance
                  </Link>
                  <Link className="button button-secondary button-small" href={item.href}>
                    Ouvrir le fil
                  </Link>
                  {item.learnerHref ? (
                    <Link className="button button-ghost button-small" href={item.learnerHref}>
                      Fiche coaché
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune relance interne planifiée.</strong>
            <p>Depuis une conversation, ajoute une note privée avec une prochaine relance pour alimenter cette file.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Planifier une séance</h3>
          <p>Prépare un créneau individuel ou de cohorte et notifie automatiquement les coachés concernés.</p>
        </div>

        <ScheduleCoachingSessionForm
          allowCoachSelection={context.role === "admin"}
          coachOptions={coachOptions}
          cohortOptions={cohortOptions}
          coacheeOptions={coacheeOptions}
        />
      </section>

      <section className="content-grid">
        <div className="panel panel-accent coach-ops-panel">
          <div className="panel-header">
            <h3>Sessions à venir</h3>
            <p>Les créneaux remontent ici pour garder un fil clair du planning coach.</p>
          </div>

          {sessions.length ? (
            <div className="coach-ops-list">
              {sessions.map((session) => (
                <article className="coach-ops-card" key={session.id}>
                  <div>
                    <strong>{session.name}</strong>
                    <p>
                      {session.date}
                      {session.cohort ? ` · ${session.cohort}` : ""}
                    </p>
                  </div>
                  <Link className="button button-secondary button-small" href={`/coach/sessions/${session.id}`}>
                    Ouvrir
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune session planifiée.</strong>
              <p>Planifie une séance depuis le formulaire ci-dessus : elle remontera ici avec son contexte coaché.</p>
            </div>
          )}
        </div>
        <div className="panel coach-ops-panel">
          <div className="panel-header">
            <h3>Résultats quiz récents</h3>
            <p>Une lecture plus rapide des scores et des copies encore en correction.</p>
          </div>

          {recentQuizResults.length ? (
            <div className="coach-ops-list">
              {recentQuizResults.map((result) => (
                <article className="coach-ops-card" key={result.id}>
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
        </div>
      </section>

      <AssignmentCommandBoard
        description="Les deadlines créées dans l’admin remontent ici pour aider le coach à arbitrer ses relances."
        emptyBody="Crée une assignation avec échéance depuis l’admin pour l’afficher ici."
        emptyTitle="Aucune deadline active."
        items={deadlines}
        mode="admin"
        title="Deadlines à surveiller"
      />

      <section className="panel">
        <div className="panel-header-rich">
          <div>
            <h3>Réponses textuelles à corriger</h3>
            <p>Les tentatives avec réponses ouvertes arrivent ici pour correction manuelle et calcul du score final.</p>
          </div>

          <Link className="button button-secondary button-small" href="/coach/reviews?lane=quiz">
            Centre de corrections
          </Link>
        </div>

        {textReviewQueue.length ? (
          <div className="coach-review-grid">
            {textReviewQueue.map((attempt) => (
              <article className="panel panel-subtle coach-review-card" key={attempt.id}>
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
        <MessagingPreviewPanel
          conversations={messagingWorkspace.conversations}
          contactsCount={messagingWorkspace.contacts.length}
          description="Le cockpit garde maintenant un aperçu léger, et l’inbox complète est accessible dans une page dédiée pour accélérer l’ouverture."
          emptyBody="Dès qu’un échange existe avec un coaché de ton portefeuille, il apparaîtra ici."
          emptyTitle="Aucune conversation lancée."
          title="Aperçu de la messagerie coach"
        />
      ) : null}

      <section className="panel">
        <div className="panel-header-rich">
          <div>
            <h3>Soumissions à relire</h3>
            <p>Le coach peut relire, noter et envoyer un feedback sans quitter ce cockpit.</p>
          </div>

          <Link className="button button-secondary button-small" href="/coach/reviews?lane=submissions">
            Ouvrir la file dédiée
          </Link>
        </div>

        {reviewQueue.length ? (
          <div className="coach-review-grid">
            {reviewQueue.map((submission) => (
              <article className="panel panel-subtle coach-review-card" key={submission.id}>
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
