import Link from "next/link";

import { AssignmentCommandBoard } from "@/components/assignments/assignment-command-board";
import { CoachPortfolioBoard } from "@/components/coach/coach-portfolio-board";
import { ScheduleCoachingSessionForm } from "@/app/(platform)/coach/forms";
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
  const overdueFollowUps = internalFollowUps.filter((item) => item.urgency === "overdue").length;
  const reviewCount = textReviewQueue.length + reviewQueue.filter((submission) => submission.status !== "reviewed").length;
  const firstAttentionLearner = attentionLearners[0] ?? null;
  const nextSession = sessions[0] ?? null;
  const nextTextReview = textReviewQueue[0] ?? null;
  const nextSubmissionReview = reviewQueue.find((submission) => submission.status !== "reviewed") ?? reviewQueue[0] ?? null;

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Cockpit coach"
        description="Une vue de pilotage légère : priorités, relances et accès rapide aux traitements dédiés."
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

      <section className="panel panel-highlight coach-command-center">
        <div className="coach-command-copy">
          <span className="eyebrow">Focus coach</span>
          <h3>Commencer par la prochaine action utile</h3>
          <p>
            Le cockpit ne porte plus tous les formulaires : il signale quoi traiter, puis renvoie vers l’espace adapté.
          </p>
        </div>

        <div className="coach-command-grid">
          <article className="coach-command-card">
            <div className="coach-command-card-head">
              <Badge tone={firstAttentionLearner ? "warning" : "success"}>
                {firstAttentionLearner ? "priorité" : "stable"}
              </Badge>
              <strong>{firstAttentionLearner ? firstAttentionLearner.name : "Portefeuille stable"}</strong>
            </div>
            <p>
              {firstAttentionLearner
                ? firstAttentionLearner.nextFocus
                : "Aucun signal critique immédiat sur les coachés visibles."}
            </p>
            <Link
              className="button button-secondary button-small"
              href={firstAttentionLearner ? `/coach/learners/${firstAttentionLearner.id}` : "/coach"}
            >
              Voir le suivi
            </Link>
          </article>

          <article className="coach-command-card">
            <div className="coach-command-card-head">
              <Badge tone={reviewCount ? "warning" : "success"}>{reviewCount} à traiter</Badge>
              <strong>Corrections</strong>
            </div>
            <p>
              {nextTextReview
                ? `${nextTextReview.learner} attend une correction quiz.`
                : nextSubmissionReview
                  ? `${nextSubmissionReview.learner} a un rendu à relire.`
                  : "Aucune correction urgente dans la file coach."}
            </p>
            <Link className="button button-secondary button-small" href="/coach/reviews">
              Ouvrir la file
            </Link>
          </article>

          <article className="coach-command-card">
            <div className="coach-command-card-head">
              <Badge tone={overdueFollowUps ? "warning" : "accent"}>{internalFollowUps.length} relance(s)</Badge>
              <strong>Relances</strong>
            </div>
            <p>
              {internalFollowUps[0]
                ? `${internalFollowUps[0].learnerName} · ${internalFollowUps[0].dueLabel}`
                : "Les notes privées de messagerie alimenteront cette file."}
            </p>
            <Link className="button button-secondary button-small" href="/messages">
              Préparer un message
            </Link>
          </article>

          <article className="coach-command-card">
            <div className="coach-command-card-head">
              <Badge tone={nextSession ? "accent" : "neutral"}>{sessions.length} séance(s)</Badge>
              <strong>Agenda</strong>
            </div>
            <p>{nextSession ? `${nextSession.name} · ${nextSession.date}` : "Aucune séance planifiée sur la vue actuelle."}</p>
            <Link className="button button-secondary button-small" href="/agenda">
              Voir l’agenda
            </Link>
          </article>
        </div>
      </section>

      <CoachPortfolioBoard attentionLearners={attentionLearners} roster={roster} />

      <section className="panel coach-follow-up-panel">
        <div className="panel-header-rich">
          <div>
            <span className="eyebrow">Relances internes</span>
            <h3>File courte à traiter</h3>
            <p>Les rappels issus des notes privées restent visibles sans transformer le cockpit en inbox complète.</p>
          </div>

          <div className="messaging-inline-stats">
            <article>
              <strong>{internalFollowUps.length}</strong>
              <span>relance(s)</span>
            </article>
            <article>
              <strong>{overdueFollowUps}</strong>
              <span>en retard</span>
            </article>
          </div>
        </div>

        {internalFollowUps.length ? (
          <div className="coach-follow-up-list">
            {internalFollowUps.slice(0, 4).map((item) => (
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
            {internalFollowUps.length > 4 ? (
              <div className="coach-inline-more">
                <span>{internalFollowUps.length - 4} relance(s) masquée(s) pour garder la vue respirante.</span>
                <Link className="button button-ghost button-small" href="/messages">
                  Ouvrir la messagerie
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune relance interne planifiée.</strong>
            <p>Depuis une conversation, ajoute une note privée avec une prochaine relance pour alimenter cette file.</p>
          </div>
        )}
      </section>

      <details className="ux-disclosure coach-session-disclosure">
        <summary>
          <span>Planifier une séance</span>
          <small>Créer un créneau individuel ou de cohorte uniquement quand tu en as besoin.</small>
        </summary>

        <div className="ux-disclosure-body">
          <ScheduleCoachingSessionForm
            allowCoachSelection={context.role === "admin"}
            coachOptions={coachOptions}
            cohortOptions={cohortOptions}
            coacheeOptions={coacheeOptions}
          />
        </div>
      </details>

      <section className="content-grid coach-compact-grid">
        <div className="panel panel-accent coach-ops-panel">
          <div className="panel-header">
            <h3>Sessions à venir</h3>
            <p>Un aperçu court du planning, sans répéter toute la page agenda.</p>
          </div>

          {sessions.length ? (
            <div className="coach-ops-list">
              {sessions.slice(0, 4).map((session) => (
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
              <p>Déplie le panneau de planification pour créer le prochain créneau.</p>
            </div>
          )}
        </div>
        <div className="panel coach-ops-panel">
          <div className="panel-header">
            <h3>Résultats quiz récents</h3>
            <p>Lecture rapide des derniers scores avant d’ouvrir le centre de corrections.</p>
          </div>

          {recentQuizResults.length ? (
            <div className="coach-ops-list">
              {recentQuizResults.slice(0, 4).map((result) => (
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

      <details className="ux-disclosure">
        <summary>
          <span>Deadlines à surveiller</span>
          <small>{deadlines.length ? `${deadlines.length} échéance(s) active(s)` : "Aucune deadline active"}</small>
        </summary>

        <div className="ux-disclosure-body">
          <AssignmentCommandBoard
            description="Les deadlines créées dans l’admin remontent ici pour aider le coach à arbitrer ses relances."
            emptyBody="Crée une assignation avec échéance depuis l’admin pour l’afficher ici."
            emptyTitle="Aucune deadline active."
            items={deadlines}
            mode="admin"
            title="Deadlines à surveiller"
          />
        </div>
      </details>

      <section className="panel coach-review-shortcuts">
        <div className="panel-header-rich">
          <div>
            <h3>Corrections et feedbacks</h3>
            <p>Le cockpit affiche la charge ; les formulaires restent dans le centre de corrections pour éviter la surcharge.</p>
          </div>

          <Link className="button button-secondary button-small" href="/coach/reviews">
            Ouvrir le centre
          </Link>
        </div>

        <div className="coach-review-shortcut-grid">
          <article>
            <Badge tone={textReviewQueue.length ? "warning" : "success"}>{textReviewQueue.length} copie(s)</Badge>
            <strong>Quiz avec réponses ouvertes</strong>
            <p>
              {nextTextReview
                ? `${nextTextReview.learner} · ${nextTextReview.quizTitle}`
                : "Aucune réponse textuelle en attente."}
            </p>
            <Link className="button button-secondary button-small" href="/coach/reviews?lane=quiz">
              Traiter les quiz
            </Link>
          </article>

          <article>
            <Badge tone={reviewQueue.length ? "accent" : "success"}>{reviewQueue.length} rendu(s)</Badge>
            <strong>Soumissions et fichiers</strong>
            <p>
              {nextSubmissionReview
                ? `${nextSubmissionReview.learner} · ${nextSubmissionReview.title}`
                : "Aucune soumission à relire."}
            </p>
            <Link className="button button-secondary button-small" href="/coach/reviews?lane=submissions">
              Relire les rendus
            </Link>
          </article>
        </div>
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
    </div>
  );
}
