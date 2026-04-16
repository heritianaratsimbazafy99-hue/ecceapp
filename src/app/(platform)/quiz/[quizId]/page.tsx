import { notFound } from "next/navigation";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { QuizPlayerExperience } from "@/components/quizzes/quiz-player-experience";
import { Badge } from "@/components/ui/badge";
import { getQuizPageData } from "@/lib/platform-data";

export default async function QuizPage({
  params,
  searchParams
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ assignment?: string }>;
}) {
  const { quizId } = await params;
  const { assignment } = await searchParams;
  const { context, quiz, attempts } = await getQuizPageData(quizId);
  const canTakeQuiz = context.roles.includes("coachee") || context.roles.includes("admin");

  if (!quiz) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PlatformTopbar
        title={quiz.title}
        description={quiz.description || "Une expérience de quiz plus immersive, rythmée et lisible, pensée pour le passage comme pour la relecture."}
      />

      <section className="content-grid">
        <div className="panel panel-highlight">
          <div className="panel-header">
            <h3>Mode de jeu</h3>
            <p>
              {quiz.kind} · {quiz.attempts_allowed ?? 1} tentative(s)
              {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : ""}
              {quiz.passing_score ? ` · score cible ${quiz.passing_score}%` : ""}
            </p>
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
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>{canTakeQuiz ? "Historique de tes tentatives" : "Lecture du quiz"}</h3>
            <p>
              {canTakeQuiz
                ? "Les résultats de passage sont enregistrés dans la base Supabase."
                : "Cette vue te permet de relire la structure du quiz sans le soumettre."}
            </p>
          </div>

          {canTakeQuiz && attempts.length ? (
            <div className="stack-list">
              {attempts.map((attempt) => (
                <article className="list-row" key={attempt.id}>
                  <div>
                    <strong>Tentative {attempt.attempt_number}</strong>
                    <p>{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString("fr-FR") : "En cours"}</p>
                  </div>
                  <Badge
                    tone={
                      attempt.status === "submitted"
                        ? "neutral"
                        : attempt.score !== null && attempt.score >= (quiz.passing_score ?? 0)
                          ? "success"
                          : "warning"
                    }
                  >
                    {attempt.status === "submitted"
                      ? "En correction"
                      : attempt.score !== null
                        ? `${attempt.score}%`
                        : "Non noté"}
                  </Badge>
                </article>
              ))}
            </div>
          ) : canTakeQuiz ? (
            <div className="empty-state">
              <strong>Aucune tentative pour le moment.</strong>
              <p>Soumets le quiz ci-dessous pour générer ton premier résultat.</p>
            </div>
          ) : (
            <div className="empty-state">
              <strong>Prévisualisation seule.</strong>
              <p>Le passage du quiz reste réservé aux coachés et aux administrateurs testeurs.</p>
            </div>
          )}
        </div>
      </section>

      {canTakeQuiz ? (
        <QuizPlayerExperience
          assignmentId={assignment ?? null}
          attemptsAllowed={quiz.attempts_allowed ?? 1}
          initialAttemptCount={attempts.length}
          passingScore={quiz.passing_score}
          quizId={quiz.id}
          randomizeQuestions={quiz.randomize_questions ?? false}
          questions={(quiz.quiz_questions ?? []).map((question) => ({
            id: question.id,
            prompt: question.prompt,
            helper_text: question.helper_text,
            question_type: question.question_type,
              points: question.points,
              quiz_question_choices: (question.quiz_question_choices ?? []).map((choice) => ({
                id: choice.id,
                label: choice.label,
                position: choice.position
              }))
            }))}
          timeLimitMinutes={quiz.time_limit_minutes}
          title={quiz.title}
        />
      ) : null}
    </div>
  );
}
