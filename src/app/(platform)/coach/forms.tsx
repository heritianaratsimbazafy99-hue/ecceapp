"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  gradeQuizTextAttemptAction,
  reviewSubmissionAction,
  scheduleCoachingSessionAction,
  type CoachActionState
} from "@/app/(platform)/coach/actions";

const initialState: CoachActionState = {};

function SubmitButton({
  idleLabel,
  pendingLabel
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function ActionFeedback({ state }: { state: CoachActionState }) {
  if (state.error) {
    return <p className="form-error">{state.error}</p>;
  }

  if (state.success) {
    return <p className="form-success">{state.success}</p>;
  }

  return null;
}

export function ScheduleCoachingSessionForm({
  coacheeOptions,
  cohortOptions,
  coachOptions,
  allowCoachSelection
}: {
  coacheeOptions: Array<{ id: string; label: string; cohortIds: string[]; cohortLabels: string[] }>;
  cohortOptions: Array<{ id: string; label: string; memberCount: number }>;
  coachOptions: Array<{ id: string; label: string }>;
  allowCoachSelection: boolean;
}) {
  const [state, formAction] = useActionState(scheduleCoachingSessionAction, initialState);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [selectedCoacheeId, setSelectedCoacheeId] = useState("");

  const filteredCoacheeOptions = selectedCohortId
    ? coacheeOptions.filter((option) => option.cohortIds.includes(selectedCohortId))
    : coacheeOptions;
  const selectedCohort = cohortOptions.find((option) => option.id === selectedCohortId) ?? null;

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid">
        {allowCoachSelection ? (
          <label>
            Coach
            <select defaultValue="" name="coach_id" required>
              <option disabled value="">
                Choisir un coach
              </option>
              {coachOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          Cohorte
          <select
            name="cohort_id"
            onChange={(event) => {
              const nextCohortId = event.target.value;
              setSelectedCohortId(nextCohortId);

              if (selectedCoacheeId && nextCohortId) {
                const belongsToCohort = coacheeOptions.some(
                  (option) => option.id === selectedCoacheeId && option.cohortIds.includes(nextCohortId)
                );

                if (!belongsToCohort) {
                  setSelectedCoacheeId("");
                }
              }
            }}
            value={selectedCohortId}
          >
            <option value="">Aucune cohorte spécifique</option>
            {cohortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {option.memberCount} coaché(s)
              </option>
            ))}
          </select>
        </label>
        <label>
          Coaché
          <select
            name="coachee_id"
            onChange={(event) => setSelectedCoacheeId(event.target.value)}
            required={!selectedCohortId}
            value={selectedCoacheeId}
          >
            <option value="">
              {selectedCohortId ? "Toute la cohorte sélectionnée" : "Choisir un coaché"}
            </option>
            {filteredCoacheeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Début
          <input name="starts_at" required type="datetime-local" />
        </label>
        <label>
          Fin
          <input name="ends_at" type="datetime-local" />
        </label>
        <label className="form-grid-span">
          Lien visio
          <input name="video_link" placeholder="https://meet.google.com/..." type="url" />
        </label>
      </div>

      <p className="form-hint">
        {selectedCohort
          ? filteredCoacheeOptions.length
            ? `Cohorte active : ${selectedCohort.label}. Laisse le coaché vide pour créer une séance pour chaque membre de cette cohorte.`
            : `La cohorte ${selectedCohort.label} ne contient encore aucun coaché.`
          : "Tu peux planifier pour un coaché précis ou choisir une cohorte pour générer les séances du groupe."}
      </p>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Planifier la séance" pendingLabel="Planification..." />
    </form>
  );
}

export function ReviewSubmissionForm({
  submissionId
}: {
  submissionId: string;
}) {
  const [state, formAction] = useActionState(reviewSubmissionAction, initialState);

  return (
    <form action={formAction} className="admin-form admin-form-compact">
      <input name="submission_id" type="hidden" value={submissionId} />

      <div className="form-grid form-grid-compact">
        <label>
          Note /100
          <input max="100" min="0" name="grade" placeholder="88" step="0.01" type="number" />
        </label>
        <label className="form-grid-span">
          Feedback
          <textarea
            name="feedback"
            placeholder="Points forts, axes d'amélioration, prochaine action recommandée."
            required
            rows={4}
          />
        </label>
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Envoyer le feedback" pendingLabel="Envoi..." />
    </form>
  );
}

export function GradeQuizTextAttemptForm({
  attemptId,
  answers
}: {
  attemptId: string;
  answers: Array<{
    questionId: string;
    prompt: string;
    answerText: string;
    maxPoints: number;
  }>;
}) {
  const [state, formAction] = useActionState(gradeQuizTextAttemptAction, initialState);

  return (
    <form action={formAction} className="admin-form admin-form-compact">
      <input name="attempt_id" type="hidden" value={attemptId} />

      <div className="stack-list">
        {answers.map((answer) => (
          <article className="panel panel-subtle" key={answer.questionId}>
            <div className="panel-header">
              <h3>{answer.prompt}</h3>
              <p>Réponse du coaché</p>
            </div>

            <div className="stack-list">
              <p>{answer.answerText}</p>
              <label>
                Points sur {answer.maxPoints}
                <input
                  max={answer.maxPoints}
                  min="0"
                  name={`answer_${answer.questionId}_points`}
                  required
                  step="0.01"
                  type="number"
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Valider la correction" pendingLabel="Correction..." />
    </form>
  );
}
