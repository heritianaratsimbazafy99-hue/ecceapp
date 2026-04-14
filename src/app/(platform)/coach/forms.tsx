"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
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
  coachOptions,
  allowCoachSelection
}: {
  coacheeOptions: Array<{ id: string; label: string }>;
  coachOptions: Array<{ id: string; label: string }>;
  allowCoachSelection: boolean;
}) {
  const [state, formAction] = useActionState(scheduleCoachingSessionAction, initialState);

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
          Coaché
          <select defaultValue="" name="coachee_id" required>
            <option disabled value="">
              Choisir un coaché
            </option>
            {coacheeOptions.map((option) => (
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
