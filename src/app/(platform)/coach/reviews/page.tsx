import Link from "next/link";

import {
  GradeQuizTextAttemptForm,
  ReviewSubmissionForm
} from "@/app/(platform)/coach/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getCoachReviewQueueData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function getSubmissionStatusTone(status: string) {
  switch (status) {
    case "reviewed":
      return "success";
    case "submitted":
      return "warning";
    default:
      return "neutral";
  }
}

function getSubmissionStatusLabel(status: string) {
  switch (status) {
    case "reviewed":
      return "feedback envoyé";
    case "submitted":
      return "à relire";
    default:
      return status;
  }
}

function buildReviewsHref({
  lane,
  query
}: {
  lane?: string;
  query?: string;
}) {
  const searchParams = new URLSearchParams();

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  if (query) {
    searchParams.set("query", query);
  }

  const value = searchParams.toString();
  return value ? `/coach/reviews?${value}` : "/coach/reviews";
}

export default async function CoachReviewsPage({
  searchParams
}: {
  searchParams: Promise<{
    lane?: string;
    query?: string;
  }>;
}) {
  const params = await searchParams;
  const { filters, recentQuizResults, reviewQueue, textReviewQueue } = await getCoachReviewQueueData({
    lane: params.lane,
    query: params.query
  });
  const lane = filters.lane;
  const query = filters.query;

  const pendingSubmissions = reviewQueue.filter((submission) => submission.status !== "reviewed");
  const reviewedSubmissions = reviewQueue.filter((submission) => submission.status === "reviewed" || submission.review);
  const visibleTextQueue = lane === "submissions" || lane === "reviewed" ? [] : textReviewQueue;
  const visibleSubmissionQueue =
    lane === "quiz"
      ? []
      : lane === "reviewed"
        ? reviewQueue.filter((submission) => submission.status === "reviewed" || submission.review)
        : lane === "submissions"
          ? reviewQueue.filter((submission) => submission.status !== "reviewed")
          : reviewQueue;
  const priorityTextAttempt = textReviewQueue[0] ?? null;
  const prioritySubmission = pendingSubmissions[0] ?? reviewQueue[0] ?? null;
  const laneCards = [
    {
      id: "all",
      label: "Tout",
      count: textReviewQueue.length + reviewQueue.length
    },
    {
      id: "quiz",
      label: "Quiz texte",
      count: textReviewQueue.length
    },
    {
      id: "submissions",
      label: "Soumissions",
      count: pendingSubmissions.length
    },
    {
      id: "reviewed",
      label: "Feedbacks",
      count: reviewedSubmissions.length
    }
  ];

  return (
    <div className="page-shell">
      <PlatformTopbar
        actions={
          <>
            <Link className="button button-secondary" href="/coach">
              Cockpit coach
            </Link>
            <Link className="button" href="/agenda">
              Agenda
            </Link>
          </>
        }
        title="Corrections coach"
        description="Un command center dédié aux relectures, corrections texte et feedbacks, pour garder le cockpit coach plus léger."
      />

      <section className="metric-grid metric-grid-compact">
        <MetricCard
          delta="réponses ouvertes en attente"
          label="Quiz à corriger"
          value={textReviewQueue.length.toString()}
        />
        <MetricCard
          delta="soumissions non finalisées"
          label="Rendus à relire"
          value={pendingSubmissions.length.toString()}
        />
        <MetricCard
          delta="feedbacks visibles dans le flux"
          label="Feedbacks envoyés"
          value={reviewedSubmissions.length.toString()}
        />
        <MetricCard
          delta="dernières tentatives visibles"
          label="Copies quiz"
          value={recentQuizResults.length.toString()}
        />
      </section>

      <section className="panel panel-highlight review-command-hero">
        <div className="review-command-copy">
          <span className="eyebrow">Review Command Center</span>
          <h3>Corriger vite, mais avec assez de contexte pour envoyer un feedback réellement utile.</h3>
          <p>
            Les réponses ouvertes et les rendus coachés sont maintenant regroupés dans une surface dédiée,
            avec filtres, priorisation et accès direct aux formulaires de correction existants.
          </p>

          <div className="review-command-actions">
            <Link className="button" href={buildReviewsHref({ lane: "quiz", query })}>
              Corriger les quiz
            </Link>
            <Link className="button button-secondary" href={buildReviewsHref({ lane: "submissions", query })}>
              Relire les rendus
            </Link>
          </div>
        </div>

        <div className="review-command-priority">
          <article>
            <span className="eyebrow">Priorité quiz</span>
            {priorityTextAttempt ? (
              <>
                <strong>{priorityTextAttempt.learner}</strong>
                <p>
                  {priorityTextAttempt.quizTitle} · {priorityTextAttempt.submittedAt}
                </p>
                <Badge tone="warning">{priorityTextAttempt.answers.length} réponse(s) ouverte(s)</Badge>
                <Link className="button button-secondary button-small" href={`/coach/learners/${priorityTextAttempt.learnerId}`}>
                  Fiche coaché
                </Link>
              </>
            ) : (
              <>
                <strong>Aucune copie texte en attente</strong>
                <p>Les prochains quiz à correction manuelle remonteront ici.</p>
                <Badge tone="success">file claire</Badge>
              </>
            )}
          </article>

          <article>
            <span className="eyebrow">Priorité rendu</span>
            {prioritySubmission ? (
              <>
                <strong>{prioritySubmission.learner}</strong>
                <p>
                  {prioritySubmission.title} · {prioritySubmission.submittedAt}
                </p>
                <Badge tone={getSubmissionStatusTone(prioritySubmission.status)}>
                  {getSubmissionStatusLabel(prioritySubmission.status)}
                </Badge>
                <Link className="button button-secondary button-small" href={`/coach/learners/${prioritySubmission.learnerId}`}>
                  Fiche coaché
                </Link>
              </>
            ) : (
              <>
                <strong>Aucun rendu à relire</strong>
                <p>Les soumissions coachés arriveront ici dès leur dépôt.</p>
                <Badge tone="success">file claire</Badge>
              </>
            )}
          </article>
        </div>
      </section>

      <section className="panel library-search-panel">
        <div className="library-search-head">
          <div>
            <span className="eyebrow">Piloter la file</span>
            <h3>Lane active et recherche</h3>
            <p>Filtre par type de correction ou par coaché avant d’ouvrir les formulaires de feedback.</p>
          </div>

          <Link className="button button-secondary" href="/coach/reviews">
            Réinitialiser
          </Link>
        </div>

        <form className="review-filter-form" method="get">
          <label className="conversation-search">
            <span>Recherche</span>
            <input defaultValue={query} name="query" placeholder="Coaché, quiz, rendu ou contenu" type="search" />
          </label>

          <label className="conversation-composer-field">
            <span>Lane</span>
            <select defaultValue={lane} name="lane">
              <option value="all">Tout afficher</option>
              <option value="quiz">Quiz texte</option>
              <option value="submissions">Soumissions à relire</option>
              <option value="reviewed">Feedbacks déjà envoyés</option>
            </select>
          </label>

          <div className="review-filter-actions">
            <button className="button" type="submit">
              Appliquer
            </button>
          </div>
        </form>

        <div className="review-lane-grid">
          {laneCards.map((item) => (
            <Link
              className={cn("review-lane-card", lane === item.id && "is-active")}
              href={buildReviewsHref({ lane: item.id, query })}
              key={item.id}
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="review-command-layout">
        <div className="review-command-main">
          {visibleTextQueue.length ? (
            <section className="panel">
              <div className="panel-header-rich">
                <div>
                  <h3>Réponses textuelles à corriger</h3>
                  <p>Les tentatives avec réponses ouvertes restent notables manuellement avant score final.</p>
                </div>
                <Badge tone="warning">{visibleTextQueue.length} copie(s)</Badge>
              </div>

              <div className="review-queue-grid">
                {visibleTextQueue.map((attempt) => (
                  <article className="panel panel-subtle coach-review-card" key={attempt.id}>
                    <div className="panel-header">
                      <h3>{attempt.learner}</h3>
                      <p>
                        {attempt.quizTitle} · {attempt.attemptLabel} · {attempt.submittedAt}
                      </p>
                    </div>

                    <div className="tag-row">
                      <Badge tone="warning">correction requise</Badge>
                      <Badge tone="neutral">score auto actuel {attempt.score}</Badge>
                      <Link className="button button-secondary button-small" href={`/coach/learners/${attempt.learnerId}`}>
                        Fiche coaché
                      </Link>
                    </div>

                    <details className="ux-disclosure review-form-disclosure">
                      <summary>
                        <span>Ouvrir la correction</span>
                        <small>{attempt.answers.length} réponse(s) ouverte(s)</small>
                      </summary>

                      <div className="ux-disclosure-body">
                        <GradeQuizTextAttemptForm answers={attempt.answers} attemptId={attempt.id} />
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          ) : lane === "quiz" || lane === "all" ? (
            <section className="panel">
              <div className="empty-state">
                <strong>Aucune réponse texte à corriger.</strong>
                <p>La file quiz se remplira dès qu’un coaché soumettra une réponse ouverte.</p>
              </div>
            </section>
          ) : null}

          {visibleSubmissionQueue.length ? (
            <section className="panel">
              <div className="panel-header-rich">
                <div>
                  <h3>Soumissions à relire</h3>
                  <p>Rendus, fichiers et feedbacks restent regroupés avec la dernière trace de revue.</p>
                </div>
                <Badge tone="accent">{visibleSubmissionQueue.length} rendu(s)</Badge>
              </div>

              <div className="review-queue-grid">
                {visibleSubmissionQueue.map((submission) => (
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
                          <Badge tone={getSubmissionStatusTone(submission.status)}>
                            {getSubmissionStatusLabel(submission.status)}
                          </Badge>
                          <Link className="button button-secondary button-small" href={`/coach/learners/${submission.learnerId}`}>
                            Fiche coaché
                          </Link>
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

                      <details className="ux-disclosure review-form-disclosure">
                        <summary>
                          <span>{submission.review ? "Modifier le feedback" : "Envoyer un feedback"}</span>
                          <small>{getSubmissionStatusLabel(submission.status)}</small>
                        </summary>

                        <div className="ux-disclosure-body">
                          <ReviewSubmissionForm submissionId={submission.id} />
                        </div>
                      </details>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : lane === "submissions" || lane === "reviewed" || lane === "all" ? (
            <section className="panel">
              <div className="empty-state">
                <strong>Aucune soumission ne correspond aux filtres.</strong>
                <p>Réinitialise la lane ou attends le prochain rendu coaché.</p>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="review-command-side">
          <section className="panel">
            <div className="panel-header">
              <h3>Copies récentes</h3>
              <p>Repère court des derniers quiz pour garder le contexte pendant la correction.</p>
            </div>

            {recentQuizResults.length ? (
              <div className="stack-list">
                {recentQuizResults.slice(0, 6).map((result) => (
                  <article className="list-row list-row-stretch" key={result.id}>
                    <div>
                      <strong>{result.learner}</strong>
                      <p>
                        {result.attempt} · {result.submittedAt}
                      </p>
                    </div>
                    <div className="table-actions">
                      <Badge tone={result.status === "submitted" ? "neutral" : "success"}>
                        {result.score}
                      </Badge>
                      <Link className="button button-secondary button-small" href={`/coach/learners/${result.learnerId}`}>
                        Fiche
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune tentative récente.</strong>
                <p>Les quiz soumis apparaîtront ici avec leur état de correction.</p>
              </div>
            )}
          </section>

          <section className="panel panel-accent">
            <div className="panel-header">
              <h3>Règle d’usage</h3>
              <p>Cette page devient l’espace de traitement, le cockpit coach reste l’espace de pilotage.</p>
            </div>

            <div className="stack-list">
              <article className="list-row list-row-stretch">
                <div>
                  <strong>Quiz ouverts</strong>
                  <p>Noter chaque réponse texte déclenche le recalcul de la tentative.</p>
                </div>
                <Badge tone="warning">manuel</Badge>
              </article>
              <article className="list-row list-row-stretch">
                <div>
                  <strong>Rendus</strong>
                  <p>Un feedback transforme la soumission en trace relisible par le coaché.</p>
                </div>
                <Badge tone="accent">feedback</Badge>
              </article>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
