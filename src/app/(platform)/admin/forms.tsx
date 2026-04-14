"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  addQuizQuestionAction,
  assignRoleAction,
  createAssignmentAction,
  createContentAction,
  createQuizAction,
  createUserAction,
  deleteQuizQuestionAction,
  type AdminActionState
} from "@/app/(platform)/admin/actions";

type UserOption = {
  id: string;
  label: string;
};

type CohortOption = {
  id: string;
  label: string;
};

type ContentOption = {
  id: string;
  label: string;
};

type QuizOption = {
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

export function CreateQuizForm({
  contentOptions
}: {
  contentOptions: ContentOption[];
}) {
  const [state, formAction] = useActionState(createQuizAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid">
        <label>
          Titre du quiz
          <input name="title" placeholder="Quiz - Cadre de séance" required type="text" />
        </label>
        <label>
          Type
          <select defaultValue="quiz" name="kind">
            <option value="qcm">qcm</option>
            <option value="quiz">quiz</option>
            <option value="assessment">assessment</option>
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
          Tentatives autorisées
          <input defaultValue="1" min="1" name="attempts_allowed" type="number" />
        </label>
        <label>
          Temps limite (minutes)
          <input min="0" name="time_limit_minutes" placeholder="15" type="number" />
        </label>
        <label>
          Score minimal
          <input min="0" name="passing_score" placeholder="70" step="0.01" type="number" />
        </label>
        <label className="form-grid-span">
          Description
          <textarea name="description" placeholder="Objectif pédagogique du quiz." rows={3} />
        </label>
        <label className="form-grid-span">
          Contenu lié
          <select defaultValue="" name="content_item_id">
            <option value="">Aucun contenu rattaché</option>
            {contentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="panel panel-subtle">
        <div className="panel-header">
          <h3>Première question optionnelle</h3>
          <p>Pratique pour créer immédiatement un premier quiz utilisable.</p>
        </div>

        <div className="form-grid">
          <label className="form-grid-span">
            Question
            <textarea name="question_prompt" placeholder="Quelle est la première étape d'une séance de coaching ?" rows={3} />
          </label>
          <label>
            Type de question
            <select defaultValue="single_choice" name="first_question_type">
              <option value="single_choice">single_choice</option>
              <option value="text">text</option>
            </select>
          </label>
          <label className="form-grid-span">
            Aide / consigne
            <input name="helper_text" placeholder="Choisis la meilleure réponse." type="text" />
          </label>
          <label className="form-grid-span">
            Choix de réponses, un par ligne
            <textarea
              name="choices_text"
              placeholder={"Accueillir et cadrer la séance\nVendre une offre\nParler du prix\nEnvoyer un devis"}
              rows={5}
            />
          </label>
          <label>
            Numéro de la bonne réponse
            <input min="1" name="correct_choice_index" placeholder="1" type="number" />
          </label>
          <label>
            Points
            <input defaultValue="1" min="1" name="points" type="number" />
          </label>
        </div>
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Créer le quiz" pendingLabel="Création..." />
    </form>
  );
}

export function AddQuizQuestionForm({
  quizId
}: {
  quizId: string;
}) {
  const [state, formAction] = useActionState(addQuizQuestionAction, initialState);

  return (
    <form action={formAction} className="admin-form admin-form-compact">
      <input name="quiz_id" type="hidden" value={quizId} />

      <div className="form-grid">
        <label className="form-grid-span">
          Intitulé
          <textarea name="prompt" placeholder="Ajoute une nouvelle question à ce quiz." required rows={3} />
        </label>
        <label>
          Type
          <select defaultValue="single_choice" name="question_type">
            <option value="single_choice">single_choice</option>
            <option value="text">text</option>
          </select>
        </label>
        <label>
          Position
          <input min="0" name="position" placeholder="auto" type="number" />
        </label>
        <label>
          Points
          <input defaultValue="1" min="1" name="points" type="number" />
        </label>
        <label className="form-grid-span">
          Aide / consigne
          <input name="helper_text" placeholder="Précise la consigne si besoin." type="text" />
        </label>
        <label className="form-grid-span">
          Choix de réponses, un par ligne
          <textarea
            name="choices_text"
            placeholder={"Réponse A\nRéponse B\nRéponse C"}
            rows={4}
          />
        </label>
        <label>
          Numéro de la bonne réponse
          <input min="1" name="correct_choice_index" placeholder="1" type="number" />
        </label>
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Ajouter la question" pendingLabel="Ajout..." />
    </form>
  );
}

export function DeleteQuizQuestionButton({
  quizId,
  questionId
}: {
  quizId: string;
  questionId: string;
}) {
  const [state, formAction] = useActionState(deleteQuizQuestionAction, initialState);

  return (
    <form action={formAction} className="inline-form">
      <input name="quiz_id" type="hidden" value={quizId} />
      <input name="question_id" type="hidden" value={questionId} />
      <button className="inline-link button-reset" type="submit">
        Supprimer
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function CreateAssignmentForm({
  userOptions,
  cohortOptions,
  contentOptions,
  quizOptions
}: {
  userOptions: UserOption[];
  cohortOptions: CohortOption[];
  contentOptions: ContentOption[];
  quizOptions: QuizOption[];
}) {
  const [state, formAction] = useActionState(createAssignmentAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid">
        <label className="form-grid-span">
          Titre de l&apos;assignation
          <input name="title" placeholder="Quiz semaine 1 - Promo avril" required type="text" />
        </label>
        <label>
          Utilisateur ciblé
          <select defaultValue="" name="assigned_user_id">
            <option value="">Aucun utilisateur direct</option>
            {userOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cohorte ciblée
          <select defaultValue="" name="cohort_id">
            <option value="">Aucune cohorte</option>
            {cohortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Contenu à assigner
          <select defaultValue="" name="content_item_id">
            <option value="">Aucun contenu</option>
            {contentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quiz à assigner
          <select defaultValue="" name="quiz_id">
            <option value="">Aucun quiz</option>
            {quizOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Deadline
          <input name="due_at" type="datetime-local" />
        </label>
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Créer l'assignation" pendingLabel="Création..." />
    </form>
  );
}
