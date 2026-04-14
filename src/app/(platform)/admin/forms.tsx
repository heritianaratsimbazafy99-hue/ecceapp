"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  assignRoleAction,
  createContentAction,
  createUserAction,
  type AdminActionState
} from "@/app/(platform)/admin/actions";

type UserOption = {
  id: string;
  label: string;
};

const initialState: AdminActionState = {};

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

function ActionFeedback({ state }: { state: AdminActionState }) {
  if (state.error) {
    return <p className="form-error">{state.error}</p>;
  }

  if (state.success) {
    return <p className="form-success">{state.success}</p>;
  }

  return null;
}

export function CreateUserForm() {
  const [state, formAction] = useActionState(createUserAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid">
        <label>
          Prénom
          <input name="first_name" placeholder="Heritiana" required type="text" />
        </label>
        <label>
          Nom
          <input name="last_name" placeholder="Ratsimbazafy" required type="text" />
        </label>
        <label>
          Email
          <input name="email" placeholder="coach@ecce.school" required type="email" />
        </label>
        <label>
          Mot de passe temporaire
          <input name="password" placeholder="Minimum 6 caractères" required type="text" />
        </label>
        <label>
          Rôle initial
          <select defaultValue="coachee" name="role">
            <option value="admin">admin</option>
            <option value="professor">professor</option>
            <option value="coach">coach</option>
            <option value="coachee">coachee</option>
          </select>
        </label>
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Créer l'utilisateur" pendingLabel="Création..." />
    </form>
  );
}

export function AssignRoleForm({ userOptions }: { userOptions: UserOption[] }) {
  const [state, formAction] = useActionState(assignRoleAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid form-grid-compact">
        <label>
          Utilisateur
          <select defaultValue="" name="user_id" required>
            <option disabled value="">
              Choisir un utilisateur
            </option>
            {userOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nouveau rôle
          <select defaultValue="coach" name="role">
            <option value="admin">admin</option>
            <option value="professor">professor</option>
            <option value="coach">coach</option>
            <option value="coachee">coachee</option>
          </select>
        </label>
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Attribuer le rôle" pendingLabel="Attribution..." />
    </form>
  );
}

export function CreateContentForm() {
  const [state, formAction] = useActionState(createContentAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid">
        <label>
          Titre
          <input name="title" placeholder="Module 1 - Introduction au coaching" required type="text" />
        </label>
        <label>
          Catégorie
          <input name="category" placeholder="Fondamentaux" type="text" />
        </label>
        <label>
          Sous-catégorie
          <input name="subcategory" placeholder="Cadre de séance" type="text" />
        </label>
        <label>
          Type
          <select defaultValue="document" name="content_type">
            <option value="document">document</option>
            <option value="video">video</option>
            <option value="youtube">youtube</option>
            <option value="audio">audio</option>
            <option value="link">link</option>
            <option value="replay">replay</option>
            <option value="template">template</option>
          </select>
        </label>
        <label>
          Statut
          <select defaultValue="published" name="status">
            <option value="draft">draft</option>
            <option value="scheduled">scheduled</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label>
          Durée estimée (minutes)
          <input min="0" name="estimated_minutes" placeholder="30" type="number" />
        </label>
        <label className="form-grid-span">
          Résumé
          <textarea name="summary" placeholder="Décris en quelques lignes la valeur pédagogique du contenu." rows={4} />
        </label>
        <label className="form-grid-span">
          Tags
          <input name="tags" placeholder="coaching, posture, business" type="text" />
        </label>
        <label className="form-grid-span">
          Lien externe
          <input name="external_url" placeholder="https://..." type="url" />
        </label>
        <label className="form-grid-span">
          Lien YouTube
          <input name="youtube_url" placeholder="https://youtube.com/..." type="url" />
        </label>
      </div>

      <label className="checkbox-row">
        <input name="is_required" type="checkbox" />
        <span>Contenu obligatoire dans le parcours</span>
      </label>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Créer le contenu" pendingLabel="Création..." />
    </form>
  );
}
