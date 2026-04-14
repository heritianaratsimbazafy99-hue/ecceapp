import {
  AddQuizQuestionForm,
  CreateQuizForm,
  DeleteQuizQuestionButton
} from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminQuizStudioPageData } from "@/lib/platform-data";

export default async function AdminQuizzesPage() {
  const { metrics, contentOptions, quizzes } = await getAdminQuizStudioPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Studio quiz"
        description="Créer, publier et enrichir les quiz dans un espace plus lisible et plus intuitif."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel panel-highlight">
          <div className="panel-header">
            <h3>Nouveau quiz</h3>
            <p>Crée le squelette du quiz ici, puis enrichis les questions juste en dessous dans le catalogue.</p>
          </div>
          <CreateQuizForm contentOptions={contentOptions} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Workflow conseillé</h3>
            <p>Le studio te guide pour aller vite sans perdre la logique pédagogique.</p>
          </div>

          <div className="stack-list">
            <article className="panel panel-subtle">
              <strong>1. Créer le cadre</strong>
              <p>Définis le titre, le type, le score cible et la ressource liée si le quiz prolonge un contenu.</p>
            </article>
            <article className="panel panel-subtle">
              <strong>2. Ajouter les questions</strong>
              <p>Utilise ensuite les blocs du catalogue pour enrichir les quiz existants sans revenir au hub admin.</p>
            </article>
            <article className="panel panel-subtle">
              <strong>3. Publier au bon moment</strong>
              <p>Le quiz rejoint la bibliothèque dès qu&apos;il passe en `published`.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Catalogue des quiz</h3>
          <p>Builder rapide pour compléter les quiz déjà créés, question par question.</p>
        </div>

        {quizzes.length ? (
          <div className="stack-list">
            {quizzes.map((quiz) => (
              <article className="panel panel-subtle" key={quiz.id}>
                <div className="panel-header">
                  <h3>{quiz.title}</h3>
                  <p>
                    {quiz.kind} · {quiz.attempts_allowed ?? 1} tentative(s)
                    {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : ""}
                  </p>
                </div>

                <div className="table-actions">
                  <Badge tone={quiz.status === "published" ? "success" : "neutral"}>
                    {quiz.status ?? "draft"}
                  </Badge>
                  <Badge tone="accent">{quiz.quiz_questions?.length ?? 0} question(s)</Badge>
                </div>

                {quiz.quiz_questions?.length ? (
                  <div className="stack-list section-spacer">
                    {quiz.quiz_questions.map((question) => (
                      <article className="list-row list-row-stretch" key={question.id}>
                        <div>
                          <strong>
                            Q{question.position + 1} · {question.question_type}
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

                <div className="section-spacer">
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
