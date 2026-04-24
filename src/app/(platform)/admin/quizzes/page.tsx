import Link from "next/link";

import {
  AddQuizQuestionForm,
  DeleteQuizQuestionButton
} from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { QuizStudioComposer } from "@/components/quizzes/quiz-studio-composer";
import { Badge } from "@/components/ui/badge";
import { getAdminQuizStudioPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildAdminQuizzesHref({
  query,
  kind,
  status,
  lane
}: {
  query?: string;
  kind?: string;
  status?: string;
  lane?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (kind) {
    searchParams.set("kind", kind);
  }

  if (status && status !== "all") {
    searchParams.set("status", status);
  }

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  const value = searchParams.toString();
  return value ? `/admin/quizzes?${value}` : "/admin/quizzes";
}

export default async function AdminQuizzesPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    kind?: string;
    status?: string;
    lane?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    calibrationPulse,
    contentBridgeRadar,
    contentOptions,
    context,
    filters,
    focusQuiz,
    hero,
    kinds,
    laneBreakdown,
    metrics,
    moduleOptions,
    priorityActions,
    quizWatchlist,
    recentAttemptsFeed
  } = await getAdminQuizStudioPageData({
    query: params.query,
    kind: params.kind,
    status: params.status,
    lane: params.lane
  });
  const canOpenAssignmentStudio = context.roles.includes("admin");

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Studio quiz"
        description="Cockpit pédagogique premium pour piloter la calibration, la diffusion et la maintenance des quiz ECCE sans repasser par un simple catalogue."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight admin-quizzes-hero">
        <div className="admin-quizzes-copy">
          <span className="eyebrow">Assessment ops</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {focusQuiz ? <Badge tone={focusQuiz.tone}>{focusQuiz.laneLabel}</Badge> : null}
            <Badge tone={calibrationPulse.band === "strong" ? "success" : calibrationPulse.band === "watch" ? "accent" : "warning"}>
              calibration {calibrationPulse.score}%
            </Badge>
          </div>

          <div className="admin-quizzes-actions">
            <Link className="button" href="#quiz-studio">
              Créer un quiz
            </Link>
            <Link className="button button-secondary" href="#quiz-watchlist">
              Ouvrir la watchlist
            </Link>
            {canOpenAssignmentStudio ? (
              <Link className="button button-secondary" href="/admin/assignments">
                Ouvrir les assignations
              </Link>
            ) : null}
          </div>
        </div>

        <div className="admin-quizzes-side">
          <EngagementMeter
            band={calibrationPulse.band}
            bandLabel={calibrationPulse.bandLabel}
            caption={calibrationPulse.caption}
            score={calibrationPulse.score}
            trend={calibrationPulse.trend}
            trendLabel={calibrationPulse.trendLabel}
          />

          <div className="admin-quizzes-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("admin-quizzes-lane-card", lane.isActive && "is-active")}
                href={buildAdminQuizzesHref({
                  query: filters.query,
                  kind: filters.kind,
                  status: filters.status,
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

      <section className="admin-quizzes-layout">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Filtrer le studio</span>
              <h3>Recherche, type, statut et lane de calibration</h3>
              <p>Réduis la vue avant de décider quoi publier, quoi recalibrer et quoi diffuser davantage dans ECCE.</p>
            </div>

            <Link className="button button-secondary" href="/admin/quizzes">
              Réinitialiser
            </Link>
          </div>

          <form className="admin-quizzes-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input defaultValue={filters.query} name="query" placeholder="Titre, description, contenu lié, module" type="search" />
            </label>

            <label className="conversation-composer-field">
              <span>Type</span>
              <select defaultValue={filters.kind} name="kind">
                <option value="">Tous les types</option>
                {kinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Statut</span>
              <select defaultValue={filters.status} name="status">
                <option value="all">Tous les statuts</option>
                <option value="published">published</option>
                <option value="draft">draft</option>
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Lane</span>
              <select defaultValue={filters.lane} name="lane">
                <option value="all">Toutes les lanes</option>
                <option value="fragile">Fragiles</option>
                <option value="active">Actifs</option>
                <option value="draft">Brouillons</option>
                <option value="ready">Prêts</option>
              </select>
            </label>

            <div className="admin-quizzes-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>

          <div className="admin-quizzes-summary">
            <article>
              <strong>{metrics[0]?.value ?? "0"}</strong>
              <span>{metrics[0]?.label ?? "quiz visibles"}</span>
            </article>
            <article>
              <strong>{metrics[1]?.value ?? "0%"}</strong>
              <span>{metrics[1]?.label ?? "calibration"}</span>
            </article>
            <article>
              <strong>{metrics[2]?.value ?? "0"}</strong>
              <span>{metrics[2]?.label ?? "questions"}</span>
            </article>
            <article>
              <strong>{metrics[3]?.value ?? "0"}</strong>
              <span>{metrics[3]?.label ?? "diffusion réelle"}</span>
            </article>
          </div>
        </section>

        <aside className="admin-quizzes-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Quiz focus</h3>
              <p>Le quiz qui mérite le plus ton attention de calibration ou de diffusion maintenant.</p>
            </div>

            {focusQuiz ? (
              <>
                <div className="tag-row">
                  <Badge tone={focusQuiz.tone}>{focusQuiz.laneLabel}</Badge>
                  <Badge tone={focusQuiz.statusTone}>{focusQuiz.status}</Badge>
                  <Badge tone="accent">{focusQuiz.kind ?? "quiz"}</Badge>
                </div>

                <div className="admin-quizzes-focus-metrics">
                  <article>
                    <strong>{focusQuiz.questionCount}</strong>
                    <span>question(s)</span>
                  </article>
                  <article>
                    <strong>{focusQuiz.attemptCount}</strong>
                    <span>tentative(s)</span>
                  </article>
                  <article>
                    <strong>{focusQuiz.averageScore ?? "n/a"}</strong>
                    <span>score moyen</span>
                  </article>
                  <article>
                    <strong>{focusQuiz.assignmentCount}</strong>
                    <span>assignation(s)</span>
                  </article>
                </div>

                <div className="admin-quizzes-focus-copy">
                  <strong>{focusQuiz.title}</strong>
                  <p>{focusQuiz.nextNeed}</p>
                </div>

                <div className="admin-quizzes-card-meta">
                  <span>{focusQuiz.linkedContentLabel ?? "Sans contenu lié"}</span>
                  <span>{focusQuiz.moduleLabel}</span>
                  <span>{focusQuiz.totalPoints} pt(s)</span>
                </div>

                <Link className="button button-secondary button-small" href={focusQuiz.previewHref}>
                  Prévisualiser
                </Link>
              </>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun quiz focus.</strong>
                <p>Crée un quiz ou élargis les filtres pour faire remonter un quiz utile à piloter.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Priorités quiz</h3>
              <p>Les arbitrages les plus utiles sur la vue active du studio.</p>
            </div>

            <div className="admin-quizzes-priority-list">
              {priorityActions.map((action) => (
                <article className="admin-quizzes-priority-card" key={action.id}>
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

      <section className="panel" id="quiz-watchlist">
        <div className="panel-header-rich">
          <div>
            <h3>Watchlist quiz</h3>
            <p>Les quiz les plus utiles à relire maintenant, triés par fragilité, diffusion et densité pédagogique.</p>
          </div>

          <div className="messaging-inline-stats">
            <article>
              <strong>{quizWatchlist.length}</strong>
              <span>quiz en watchlist</span>
            </article>
            <article>
              <strong>{laneBreakdown.find((lane) => lane.id === "fragile")?.count ?? 0}</strong>
              <span>fragiles</span>
            </article>
            <article>
              <strong>{laneBreakdown.find((lane) => lane.id === "active")?.count ?? 0}</strong>
              <span>actifs</span>
            </article>
            <article>
              <strong>{laneBreakdown.find((lane) => lane.id === "draft")?.count ?? 0}</strong>
              <span>brouillons</span>
            </article>
          </div>
        </div>

        {quizWatchlist.length ? (
          <div className="admin-quizzes-watchlist">
            {quizWatchlist.map((quiz) => (
              <article className="panel admin-quizzes-card" key={quiz.id}>
                <div className="quiz-catalog-card-head">
                  <div>
                    <h3>{quiz.title}</h3>
                    <p>
                      {quiz.kind ?? "quiz"} · {quiz.attempts_allowed ?? 1} tentative(s)
                      {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : ""}
                      {quiz.passing_score ? ` · cible ${quiz.passing_score}%` : ""}
                    </p>
                  </div>

                  <div className="tag-row">
                    <Link className="button button-secondary button-small" href={`/quiz/${quiz.id}`}>
                      Prévisualiser
                    </Link>
                  </div>
                </div>

                <div className="tag-row">
                  <Badge tone={quiz.tone}>{quiz.laneLabel}</Badge>
                  <Badge tone={quiz.statusTone}>{quiz.status}</Badge>
                  <Badge tone="accent">{quiz.questionCount} question(s)</Badge>
                  <Badge tone="neutral">{quiz.totalPoints} pt(s)</Badge>
                </div>

                <div className="admin-quizzes-card-meta">
                  <span>{quiz.linkedContentLabel ?? "Sans contenu lié"}</span>
                  <span>{quiz.moduleLabel}</span>
                  <span>{quiz.attemptCount} tentative(s)</span>
                </div>

                <div className="admin-quizzes-card-progress">
                  <div>
                    <strong>{quiz.averageScore ?? "n/a"}</strong>
                    <span>score moyen</span>
                  </div>
                  <div>
                    <strong>{quiz.assignmentCount}</strong>
                    <span>assignation(s)</span>
                  </div>
                  <div>
                    <strong>{quiz.overdueCount}</strong>
                    <span>deadline(s) en retard</span>
                  </div>
                </div>

                {quiz.quiz_questions?.length ? (
                  <div className="quiz-question-summary-list section-spacer">
                    {quiz.quiz_questions.map((question) => (
                      <article className="quiz-question-summary" key={question.id}>
                        <div>
                          <strong>
                            Q{question.position + 1} · {question.question_type === "single_choice" ? "Choix unique" : "Réponse ouverte"}
                          </strong>
                          <p>{question.prompt}</p>
                          {question.helper_text ? <p>{question.helper_text}</p> : null}
                          {question.quiz_question_choices?.length ? (
                            <p>
                              {question.quiz_question_choices
                                .sort((left, right) => left.position - right.position)
                                .map((choice) => `${choice.is_correct ? "✓" : "•"} ${choice.label}`)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>

                        <div className="list-row-meta">
                          <Badge tone="neutral">{question.points} pt(s)</Badge>
                          <DeleteQuizQuestionButton questionId={question.id} quizId={quiz.id} />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state empty-state-compact">
                    <strong>Aucune question pour ce quiz.</strong>
                    <p>Ajoute les premières questions ci-dessous pour le rendre exploitable.</p>
                  </div>
                )}

                <div className="section-spacer quiz-catalog-card-footer">
                  <AddQuizQuestionForm quizId={quiz.id} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun quiz dans la watchlist.</strong>
            <p>La vue active n’a pas encore assez de quiz visibles, ou les filtres sont trop restrictifs.</p>
          </div>
        )}
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Radar de liaison</h3>
            <p>Les ponts les plus visibles entre quiz, contenus et diffusion réelle dans ECCE.</p>
          </div>

          {contentBridgeRadar.length ? (
            <div className="admin-quizzes-bridge-grid">
              {contentBridgeRadar.map((bridge) => (
                <article className="admin-quizzes-bridge-card" key={bridge.id}>
                  <div className="tag-row">
                    <Badge tone={bridge.tone}>{bridge.label}</Badge>
                  </div>
                  <p>
                    {bridge.count} quiz · {bridge.assignmentLoad} assignation(s) · {bridge.attemptLoad} tentative(s)
                  </p>
                  <div className="admin-quizzes-card-progress">
                    <div>
                      <strong>{bridge.fragileCount}</strong>
                      <span>fragiles</span>
                    </div>
                    <div>
                      <strong>{bridge.assignmentLoad}</strong>
                      <span>diffusions</span>
                    </div>
                    <div>
                      <strong>{bridge.attemptLoad}</strong>
                      <span>tentatives</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun pont visible.</strong>
              <p>Les liaisons remonteront dès que les quiz seront branchés à des contenus ou réellement utilisés.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Tentatives récentes</h3>
            <p>Lecture courte des dernières copies visibles, utile pour sentir immédiatement la calibration réelle du studio.</p>
          </div>

          {recentAttemptsFeed.length ? (
            <div className="stack-list">
              {recentAttemptsFeed.map((attempt) => (
                <article className="list-row list-row-stretch" key={attempt.id}>
                  <div>
                    <strong>{attempt.learnerName}</strong>
                    <p>
                      {attempt.quizTitle} · {attempt.attemptLabel}
                    </p>
                    <p>{attempt.submittedAt}</p>
                  </div>
                  <div className="list-row-meta">
                    <Badge tone={attempt.tone}>{attempt.scoreLabel}</Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune tentative récente.</strong>
              <p>Les prochaines copies visibles apparaîtront ici automatiquement.</p>
            </div>
          )}
        </section>
      </section>

      <div id="quiz-studio">
        <QuizStudioComposer contentOptions={contentOptions} moduleOptions={moduleOptions} />
      </div>
    </div>
  );
}
