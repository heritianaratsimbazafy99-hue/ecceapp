"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  assignRoleAction,
  type AdminActionState,
  updateUserProfileAction,
  updateUserStatusAction
} from "@/app/(platform)/admin/actions";
import type { AppRole, MembershipStatus } from "@/lib/auth";

const initialState: AdminActionState = {};

const DEFAULT_TIMEZONE_OPTIONS = [
  { value: "Indian/Antananarivo", label: "Madagascar · Indian/Antananarivo" },
  { value: "Europe/Paris", label: "France · Europe/Paris" },
  { value: "Africa/Casablanca", label: "Maroc · Africa/Casablanca" },
  { value: "Africa/Nairobi", label: "Afrique de l'Est · Africa/Nairobi" },
  { value: "UTC", label: "UTC" }
];

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

function getTimezoneOptions(timezone: string) {
  return DEFAULT_TIMEZONE_OPTIONS.some((option) => option.value === timezone)
    ? DEFAULT_TIMEZONE_OPTIONS
    : [{ value: timezone, label: `Personnalisé · ${timezone}` }, ...DEFAULT_TIMEZONE_OPTIONS];
}

export function AdminUserProfileForm({
  defaultValues
}: {
  defaultValues: {
    userId: string;
    firstName: string;
    lastName: string;
    timezone: string;
    bio: string;
  };
}) {
  const [state, formAction] = useActionState(updateUserProfileAction, initialState);
  const timezoneOptions = getTimezoneOptions(defaultValues.timezone);

  return (
    <form action={formAction} className="admin-form">
      <input name="user_id" type="hidden" value={defaultValues.userId} />

      <div className="form-grid">
        <label>
          Prénom
          <input defaultValue={defaultValues.firstName} name="first_name" required type="text" />
        </label>

        <label>
          Nom
          <input defaultValue={defaultValues.lastName} name="last_name" required type="text" />
        </label>

        <label className="form-grid-span">
          Fuseau horaire
          <select defaultValue={defaultValues.timezone} name="timezone">
            {timezoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-grid-span">
          Bio / signature de profil
          <textarea
            defaultValue={defaultValues.bio}
            name="bio"
            placeholder="Présente le rôle, le contexte ou la spécialité de ce compte."
            rows={5}
          />
        </label>
      </div>

      <p className="form-helper">
        Cette fiche alimente le cockpit, la messagerie, l&apos;agenda et les surfaces où le nom doit rester cohérent.
      </p>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Mettre à jour le profil" pendingLabel="Mise à jour..." />
    </form>
  );
}

export function AdminUserStatusForm({
  userId,
  currentStatus,
  isCurrentUser,
  isLastActiveAdmin
}: {
  userId: string;
  currentStatus: MembershipStatus;
  isCurrentUser: boolean;
  isLastActiveAdmin: boolean;
}) {
  const [state, formAction] = useActionState(updateUserStatusAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      <input name="user_id" type="hidden" value={userId} />

      <label>
        Statut du compte
        <select defaultValue={currentStatus} name="status">
          <option value="invited">invited</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>
      </label>

      <div className="admin-user-status-notes">
        <article>
          <strong>Statut invited</strong>
          <p>Le compte repassera par l&apos;onboarding ECCE à la prochaine connexion.</p>
        </article>
        <article>
          <strong>Statut suspended</strong>
          <p>L&apos;accès produit est coupé sans supprimer l&apos;historique pédagogique ni les messages.</p>
        </article>
      </div>

      {isCurrentUser ? (
        <p className="form-helper">
          Ce profil correspond à ton compte courant. Le garde-fou empêche toute auto-suspension depuis cette page.
        </p>
      ) : null}

      {isLastActiveAdmin ? (
        <p className="form-helper">
          Ce compte est actuellement le dernier admin actif. Il doit rester actif tant qu&apos;un autre admin n&apos;est pas disponible.
        </p>
      ) : null}

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Mettre à jour le statut" pendingLabel="Application..." />
    </form>
  );
}

export function AdminUserRoleForm({
  userId,
  availableRoles
}: {
  userId: string;
  availableRoles: AppRole[];
}) {
  const [state, formAction] = useActionState(assignRoleAction, initialState);

  if (!availableRoles.length) {
    return (
      <div className="empty-state">
        <strong>Tous les rôles sont déjà présents.</strong>
        <p>Ce compte cumule déjà tous les accès disponibles dans ECCE.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="admin-form">
      <input name="user_id" type="hidden" value={userId} />

      <label>
        Rôle supplémentaire
        <select defaultValue={availableRoles[0]} name="role">
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      <p className="form-helper">
        Les doublons sont ignorés. Utilise cette action pour étendre les permissions sans recréer le compte.
      </p>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Ajouter le rôle" pendingLabel="Ajout..." />
    </form>
  );
}
