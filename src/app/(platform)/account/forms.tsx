"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type AccountActionState,
  updateAccountProfileAction,
  updateNotificationPreferencesAction
} from "@/app/(platform)/account/actions";
import type { AccountNotificationPreferences } from "@/lib/account";

const initialState: AccountActionState = {};

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

function ActionFeedback({ state }: { state: AccountActionState }) {
  if (state.error) {
    return <p className="form-error">{state.error}</p>;
  }

  if (state.success) {
    return <p className="form-success">{state.success}</p>;
  }

  return null;
}

function getTimezoneOptions(defaultTimezone: string) {
  return DEFAULT_TIMEZONE_OPTIONS.some((option) => option.value === defaultTimezone)
    ? DEFAULT_TIMEZONE_OPTIONS
    : [{ value: defaultTimezone, label: `Personnalisé · ${defaultTimezone}` }, ...DEFAULT_TIMEZONE_OPTIONS];
}

export function AccountProfileForm({
  defaultValues
}: {
  defaultValues: {
    firstName: string;
    lastName: string;
    timezone: string;
    bio: string;
  };
}) {
  const [state, formAction] = useActionState(updateAccountProfileAction, initialState);
  const timezoneOptions = getTimezoneOptions(defaultValues.timezone);

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid">
        <label>
          Prénom
          <input defaultValue={defaultValues.firstName} name="first_name" placeholder="Heritiana" required type="text" />
        </label>

        <label>
          Nom
          <input defaultValue={defaultValues.lastName} name="last_name" placeholder="Ratsimbazafy" required type="text" />
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
          Signature de profil
          <textarea
            defaultValue={defaultValues.bio}
            name="bio"
            placeholder="Présente ton contexte, ton objectif ou ta spécialité en quelques lignes."
            rows={5}
          />
        </label>
      </div>

      <p className="form-helper">
        Cette fiche alimente le workspace, la messagerie et les surfaces où ton identité doit rester claire.
      </p>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Mettre à jour mon profil" pendingLabel="Mise à jour..." />
    </form>
  );
}

type NotificationPreferenceDefinition = {
  field: keyof AccountNotificationPreferences;
  label: string;
  description: string;
};

const NOTIFICATION_PREFERENCE_DEFINITIONS: NotificationPreferenceDefinition[] = [
  {
    field: "allowMessageNotifications",
    label: "Messages",
    description: "Nouveaux messages coach / coaché et ouverture de conversation."
  },
  {
    field: "allowLearningNotifications",
    label: "Parcours & assignations",
    description: "Nouveaux parcours, nouvelles assignations, cohorte et changements de suivi."
  },
  {
    field: "allowSessionNotifications",
    label: "Séances",
    description: "Planification de séances et changements liés au coaching live."
  },
  {
    field: "allowReviewNotifications",
    label: "Relectures & corrections",
    description: "Soumissions à relire, feedback coach et quiz corrigés."
  },
  {
    field: "allowRewardNotifications",
    label: "Badges & récompenses",
    description: "Déblocage des badges et signaux de progression valorisés."
  }
];

const FORM_FIELD_NAME_BY_PREFERENCE: Record<keyof AccountNotificationPreferences, string> = {
  allowLearningNotifications: "allow_learning_notifications",
  allowMessageNotifications: "allow_message_notifications",
  allowReviewNotifications: "allow_review_notifications",
  allowRewardNotifications: "allow_reward_notifications",
  allowSessionNotifications: "allow_session_notifications"
};

export function AccountNotificationPreferencesForm({
  preferences
}: {
  preferences: AccountNotificationPreferences;
}) {
  const [state, formAction] = useActionState(updateNotificationPreferencesAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      <div className="account-preference-grid">
        {NOTIFICATION_PREFERENCE_DEFINITIONS.map((preference) => (
          <label className="account-preference-card" key={preference.field}>
            <span className="checkbox-row">
              <input
                defaultChecked={preferences[preference.field]}
                name={FORM_FIELD_NAME_BY_PREFERENCE[preference.field]}
                type="checkbox"
              />
              <span>{preference.label}</span>
            </span>
            <small>{preference.description}</small>
          </label>
        ))}
      </div>

      <p className="form-helper">
        Les nouvelles notifications respectent ces choix au moment de leur création.
      </p>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Enregistrer mes préférences" pendingLabel="Enregistrement..." />
    </form>
  );
}
