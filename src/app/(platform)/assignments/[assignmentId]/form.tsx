"use client";

import { useActionState } from "react";

import { CelebrationBurst } from "@/components/feedback/celebration-burst";
import {
  submitAssignmentAction,
  type AssignmentActionState
} from "@/app/(platform)/assignments/actions";

const initialState: AssignmentActionState = {};

export function AssignmentSubmissionForm({
  assignmentId
}: {
  assignmentId: string;
}) {
  const [state, formAction, pending] = useActionState(submitAssignmentAction, initialState);

  return (
    <form action={formAction} className="admin-form" encType="multipart/form-data">
      <input name="assignment_id" type="hidden" value={assignmentId} />

      <CelebrationBurst
        active={Boolean(state.success)}
        triggerKey={state.success ?? ""}
        body="Ton rendu a bien été enregistré dans ECCE."
        title="Soumission envoyée"
      />

      <div className="form-grid">
        <label className="form-grid-span">
          Notes pour le coach
          <textarea
            name="notes"
            placeholder="Ajoute ici le contexte, les difficultés rencontrées ou les points à faire relire."
            rows={5}
          />
        </label>
        <label className="form-grid-span">
          Fichier
          <input accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" name="attachment" type="file" />
        </label>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}

      <button className="button" disabled={pending} type="submit">
        {pending ? "Envoi..." : "Envoyer ma soumission"}
      </button>
    </form>
  );
}
