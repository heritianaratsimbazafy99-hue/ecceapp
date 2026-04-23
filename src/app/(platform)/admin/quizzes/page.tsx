import Link from "next/link";

import {
  AddQuizQuestionForm,
  DeleteQuizQuestionButton
} from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { QuizStudioComposer } from "@/components/quizzes/quiz-studio-composer";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminQuizStudioPageData } from "@/lib/platform-data";

export default async function AdminQuizzesPage() {
  const { metrics, contentOptions, moduleOptions, quizzes } = await getAdminQuizStudioPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Studio quiz"
        description="Refonte complète du flux de création : cadrage, storyboard, preview live et catalogue de quiz jouables."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <QuizStudioComposer contentOptions={contentOptions} moduleOptions={moduleOptions} />

      <section className="panel">
        <div className="panel-header">
          <h3>Catalogue live des quiz</h3>
          <p>Chaque carte agit comme un cockpit léger : aperçu, métriques rapides et ajout instantané de questions.</p>
        </div>

        {quizzes.length ? (
          <div className="quiz-catalog-grid">
            {quizzes.map((quiz) => (
              <article className="panel quiz-catalog-card" key={quiz.id}>
                <div className="quiz-catalog-card-head">
                  <div>
                    <h3>{quiz.title}</h3>
                    <p>
                      {quiz.kind} · {quiz.attempts_allowed ?? 1} tentative(s)
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
                  <Badge tone={quiz.status === "published" ? "success" : "neutral"}>
                    {quiz.status ?? "draft"}
                  </Badge>
                  <Badge tone="accent">{quiz.quiz_questions?.length ?? 0} question(s)</Badge>
                  <Badge tone="neutral">
                    {quiz.quiz_questions?.reduce((total, question) => total + question.points, 0) ?? 0} pt(s)
                  </Badge>
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
            <strong>Aucun quiz créé.</strong>
            <p>Le studio quiz est prêt pour accueillir le premier questionnaire ECCE.</p>
          </div>
        )}
      </section>
    </div>
  );
}
