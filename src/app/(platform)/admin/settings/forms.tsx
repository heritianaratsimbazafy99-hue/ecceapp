"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type OrganizationSettingsActionState,
  updateOrganizationBrandingAction,
  updateOrganizationPlatformSettingsAction
} from "@/app/(platform)/admin/settings/actions";
import type { OrganizationBranding } from "@/lib/organization";

const initialState: OrganizationSettingsActionState = {};

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

function ActionFeedback({ state }: { state: OrganizationSettingsActionState }) {
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

export function OrganizationBrandingForm({ branding }: { branding: OrganizationBranding }) {
  const [state, formAction] = useActionState(updateOrganizationBrandingAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid">
        <label>
          Nom légal
          <input defaultValue={branding.legalName} name="name" placeholder="ECCE" required type="text" />
        </label>

        <label>
          Slug organisation
          <input defaultValue={branding.slug} name="slug" placeholder="ecce" required type="text" />
        </label>

        <label>
          Nom affiché
          <input defaultValue={branding.displayName} name="display_name" placeholder="ECCE" type="text" />
        </label>

        <label>
          Marque courte
          <input defaultValue={branding.shortName} maxLength={18} name="short_name" placeholder="ECCE" type="text" />
        </label>

        <label className="form-grid-span">
          Baseline plateforme
          <input
            defaultValue={branding.platformTagline}
            name="platform_tagline"
            placeholder="parcours, évaluation, accompagnement"
            type="text"
          />
        </label>

        <label>
          Site web
          <input
            defaultValue={branding.websiteUrl ?? ""}
            name="website_url"
            placeholder="https://ecceapp.vercel.app"
            type="url"
          />
        </label>

        <label>
          Support email
          <input
            defaultValue={branding.supportEmail ?? ""}
            name="support_email"
            placeholder="support@ecce.school"
            type="email"
          />
        </label>

        <label>
          Support téléphone
          <input
            defaultValue={branding.supportPhone ?? ""}
            name="support_phone"
            placeholder="+261 34 00 000 00"
            type="text"
          />
        </label>

        <label className="form-grid-span">
          Headline marketing
          <textarea
            defaultValue={branding.marketingHeadline}
            name="marketing_headline"
            placeholder="Une proposition de valeur claire pour la page publique et la connexion."
            rows={3}
          />
        </label>

        <label className="form-grid-span">
          Sous-texte marketing
          <textarea
            defaultValue={branding.marketingSubheadline}
            name="marketing_subheadline"
            placeholder="Précise ce que la plateforme apporte à l'équipe, aux coachs et aux coachés."
            rows={4}
          />
        </label>
      </div>

      <p className="form-helper">
        Ces champs alimentent déjà la page publique, l&apos;écran de connexion et la signature
        du workspace.
      </p>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Enregistrer le branding" pendingLabel="Enregistrement..." />
    </form>
  );
}

export function OrganizationPlatformSettingsForm({ branding }: { branding: OrganizationBranding }) {
  const [state, formAction] = useActionState(updateOrganizationPlatformSettingsAction, initialState);
  const timezoneOptions = getTimezoneOptions(branding.defaultTimezone);

  return (
    <form action={formAction} className="admin-form">
      <div className="form-grid">
        <label>
          Fuseau par défaut
          <select defaultValue={branding.defaultTimezone} name="default_timezone">
            {timezoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Locale par défaut
          <select defaultValue={branding.defaultLocale} name="default_locale">
            <option value="fr">fr</option>
            <option value="fr-FR">fr-FR</option>
            <option value="en">en</option>
            <option value="en-US">en-US</option>
          </select>
        </label>

        <label className="form-grid-span organization-settings-checkbox">
          <span className="checkbox-row">
            <input defaultChecked={branding.allowCoachSelfSchedule} name="allow_coach_self_schedule" type="checkbox" />
            <span>Autoriser les coachs à planifier depuis l&apos;agenda</span>
          </span>
          <small className="form-helper">
            Désactivé, la planification rapide reste visible uniquement pour l&apos;admin dans
            <strong> /agenda</strong>.
          </small>
        </label>
      </div>

      <p className="form-helper">
        Le fuseau par défaut préremplit les nouveaux comptes créés depuis le hub admin.
      </p>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Enregistrer les paramètres" pendingLabel="Enregistrement..." />
    </form>
  );
}
