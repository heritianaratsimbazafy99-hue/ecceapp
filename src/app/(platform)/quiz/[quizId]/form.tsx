"use client";

import { useActionState } from "react";

import { CelebrationBurst } from "@/components/feedback/celebration-burst";
import {
  submitQuizAttemptAction,
  type QuizActionState
} from "@/app/(platform)/quiz/actions";

type QuizFormProps = {
  quizId: string;
  questions: Array<{
    id: string;
    prompt: string;
    helper_text: string | null;
    question_type: string;
    points: number;
    quiz_question_choices?: Array<{
      id: string;
      label: string;
      position: number;
    }>;
  }>;
};

const initialState: QuizActionState = {};

export function QuizTakeForm({
  quizId,
  assignmentId,
  questions
}: QuizFormProps & {
  assignmentId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitQuizAttemptAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      <input name="quiz_id" type="hidden" value={quizId} />
      {assignmentId ? <input name="assignment_id" type="hidden" value={assignmentId} /> : null}

      <CelebrationBurst
        active={Boolean(state.success)}
        triggerKey={`${state.success ?? ""}-${state.score ?? ""}-${state.badgeTitle ?? ""}-${state.pendingManualReview ?? false}`}
        body={
          state.pendingManualReview
            ? "Tes réponses ouvertes ont été envoyées au coach pour correction."
            : state.badgeTitle
            ? `Badge débloqué: ${state.badgeTitle}.`
            : "Ton résultat vient d'être enregistré dans ECCE."
        }
        title={
          state.pendingManualReview
            ? "Quiz envoyé"
            : state.badgeTitle
              ? "Bravo, nouveau badge !"
              : "Quiz validé"
        }
        tone={state.badgeTitle ? "badge" : "success"}
      />

      <div className="stack-list">
        {questions.map((question, index) => (
          <article className="panel panel-subtle" key={question.id}>
            <div className="panel-header">
              <h3>
                Question {index + 1} · {question.points} pt
                {question.points > 1 ? "s" : ""}
              </h3>
              <p>{question.prompt}</p>
              {question.helper_text ? <p>{question.helper_text}</p> : null}
            </div>

            {question.question_type === "single_choice" ? (
              <div className="stack-list">
                {[...(question.quiz_question_choices ?? [])]
                  .sort((left, right) => left.position - right.position)
                  .map((choice) => (
                    <label className="choice-row" key={choice.id}>
                      <input name={`question_${question.id}`} required type="radio" value={choice.id} />
                      <span>{choice.label}</span>
                    </label>
                  ))}
              </div>
            ) : (
              <textarea
                className="quiz-textarea"
                name={`question_${question.id}`}
                placeholder="Ta réponse"
                rows={5}
              />
            )}
          </article>
        ))}
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? (
        <p className="form-success">
          {state.success} {state.score ? `Score actuel: ${state.score}` : ""}
        </p>
      ) : null}

      <button className="button" disabled={pending} type="submit">
        {pending ? "Soumission..." : "Soumettre le quiz"}
      </button>
    </form>
  );
}
