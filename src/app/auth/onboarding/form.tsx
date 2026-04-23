"use client";

import { useActionState } from "react";

import { completeOnboardingAction } from "@/app/auth/actions";

const initialState = {
  error: ""
};

const TIMEZONE_OPTIONS = [
  { value: "Indian/Antananarivo", label: "Madagascar · Indian/Antananarivo" },
  { value: "Europe/Paris", label: "France · Europe/Paris" },
  { value: "Africa/Casablanca", label: "Maroc · Africa/Casablanca" },
  { value: "Africa/Nairobi", label: "Afrique de l'Est · Africa/Nairobi" },
  { value: "UTC", label: "UTC" }
];

type OnboardingFormProps = {
  brandName: string;
  defaultValues: {
    bio: string;
    firstName: string;
    lastName: string;
    timezone: string;
  };
};

export function OnboardingForm({ brandName, defaultValues }: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(completeOnboardingAction, initialState);
  const timezoneOptions = TIMEZONE_OPTIONS.some((option) => option.value === defaultValues.timezone)
    ? TIMEZONE_OPTIONS
    : [{ value: defaultValues.timezone, label: `Personnalisé · ${defaultValues.timezone}` }, ...TIMEZONE_OPTIONS];

  return (
    <form action={formAction} className="auth-form auth-form-shell">
      <div className="auth-form-grid auth-form-grid-halves">
        <label>
          Prénom
          <input defaultValue={defaultValues.firstName} name="first_name" placeholder="Heritiana" />
        </label>

        <label>
          Nom
          <input defaultValue={defaultValues.lastName} name="last_name" placeholder="Ratsimbazafy" />
        </label>
      </div>

      <label>
        Fuseau horaire
        <select defaultValue={defaultValues.timezone} name="timezone">
          {timezoneOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small className="auth-field-note">
          Ce fuseau sert à afficher correctement les deadlines, quiz et séances.
        </small>
      </label>

      <label>
        Signature de profil
        <textarea
          defaultValue={defaultValues.bio}
          name="bio"
          placeholder="Présente ton contexte, ton objectif ou ta spécialité en quelques lignes."
          rows={5}
        />
        <small className="auth-field-note">
          Une bio courte rend l&apos;espace plus humain pour le coach, le professor et les échanges.
        </small>
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <div className="auth-form-footer">
        <p>
          En validant, ton profil passe de <strong>invited</strong> à <strong>active</strong> et
          l&apos;espace {brandName} se débloque automatiquement.
        </p>

        <button className="button button-block" disabled={pending} type="submit">
          {pending ? "Activation en cours..." : `Activer mon espace ${brandName}`}
        </button>
      </div>
    </form>
  );
}
