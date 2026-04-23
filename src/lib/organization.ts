import { cache } from "react";

import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type OrganizationSettingsRow = {
  organization_id: string;
  display_name: string | null;
  short_name: string | null;
  platform_tagline: string | null;
  marketing_headline: string | null;
  marketing_subheadline: string | null;
  support_email: string | null;
  support_phone: string | null;
  website_url: string | null;
  default_timezone: string;
  default_locale: string;
  allow_coach_self_schedule: boolean;
};

export type OrganizationBranding = {
  organizationId: string | null;
  legalName: string;
  displayName: string;
  shortName: string;
  slug: string;
  brandMark: string;
  platformTagline: string;
  marketingHeadline: string;
  marketingSubheadline: string;
  supportEmail: string | null;
  supportPhone: string | null;
  websiteUrl: string | null;
  defaultTimezone: string;
  defaultLocale: string;
  allowCoachSelfSchedule: boolean;
};

const DEFAULT_ORGANIZATION_SLUG = "ecce";

const DEFAULT_ORGANIZATION_BRANDING: OrganizationBranding = {
  organizationId: null,
  legalName: "ECCE",
  displayName: "ECCE",
  shortName: "ECCE",
  slug: DEFAULT_ORGANIZATION_SLUG,
  brandMark: "ECCE",
  platformTagline: "ecole de coaching",
  marketingHeadline: "Une expérience de coaching moderne, conçue pour apprendre, suivre et faire progresser chaque coaché.",
  marketingSubheadline:
    "ECCE réunit parcours pédagogiques, bibliothèque de contenus, quiz, corrections, deadlines et cockpit coach dans un seul produit premium.",
  supportEmail: null,
  supportPhone: null,
  websiteUrl: null,
  defaultTimezone: "Indian/Antananarivo",
  defaultLocale: "fr",
  allowCoachSelfSchedule: true
};

function trimOrNull(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function buildBrandMark(displayName: string, shortName: string) {
  const compactShortName = shortName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  if (compactShortName.length >= 2 && compactShortName.length <= 4) {
    return compactShortName;
  }

  const words = displayName
    .replace(/[^A-Za-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  const compactDisplayName = displayName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return compactDisplayName.slice(0, 4) || DEFAULT_ORGANIZATION_BRANDING.brandMark;
}

function buildOrganizationBranding(
  organization?: OrganizationRow | null,
  settings?: OrganizationSettingsRow | null
): OrganizationBranding {
  if (!organization) {
    return DEFAULT_ORGANIZATION_BRANDING;
  }

  const legalName = trimOrNull(organization.name) ?? DEFAULT_ORGANIZATION_BRANDING.legalName;
  const displayName = trimOrNull(settings?.display_name) ?? legalName;
  const shortName = trimOrNull(settings?.short_name) ?? displayName;
  const platformTagline = trimOrNull(settings?.platform_tagline) ?? DEFAULT_ORGANIZATION_BRANDING.platformTagline;

  return {
    organizationId: organization.id,
    legalName,
    displayName,
    shortName,
    slug: trimOrNull(organization.slug) ?? DEFAULT_ORGANIZATION_BRANDING.slug,
    brandMark: buildBrandMark(displayName, shortName),
    platformTagline,
    marketingHeadline:
      trimOrNull(settings?.marketing_headline) ?? DEFAULT_ORGANIZATION_BRANDING.marketingHeadline,
    marketingSubheadline:
      trimOrNull(settings?.marketing_subheadline) ?? DEFAULT_ORGANIZATION_BRANDING.marketingSubheadline,
    supportEmail: trimOrNull(settings?.support_email),
    supportPhone: trimOrNull(settings?.support_phone),
    websiteUrl: trimOrNull(settings?.website_url),
    defaultTimezone: trimOrNull(settings?.default_timezone) ?? DEFAULT_ORGANIZATION_BRANDING.defaultTimezone,
    defaultLocale: trimOrNull(settings?.default_locale) ?? DEFAULT_ORGANIZATION_BRANDING.defaultLocale,
    allowCoachSelfSchedule: settings?.allow_coach_self_schedule ?? DEFAULT_ORGANIZATION_BRANDING.allowCoachSelfSchedule
  };
}

function isMissingSettingsTableError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /organization_settings/i.test(error.message ?? "")
  );
}

const getOrganizationSettingsRow = cache(async (organizationId: string) => {
  try {
    const admin = createSupabaseAdminClient();
    const settingsResult = await admin
      .from("organization_settings")
      .select(
        "organization_id, display_name, short_name, platform_tagline, marketing_headline, marketing_subheadline, support_email, support_phone, website_url, default_timezone, default_locale, allow_coach_self_schedule"
      )
      .eq("organization_id", organizationId)
      .maybeSingle<OrganizationSettingsRow>();

    if (settingsResult.error) {
      if (isMissingSettingsTableError(settingsResult.error)) {
        return null;
      }

      throw new Error(settingsResult.error.message);
    }

    return settingsResult.data ?? null;
  } catch {
    return null;
  }
});

export const getOrganizationBrandingById = cache(async (organizationId: string) => {
  try {
    const admin = createSupabaseAdminClient();
    const organizationResult = await admin
      .from("organizations")
      .select("id, name, slug, is_active")
      .eq("id", organizationId)
      .maybeSingle<OrganizationRow>();

    if (organizationResult.error || !organizationResult.data) {
      return DEFAULT_ORGANIZATION_BRANDING;
    }

    const settings = await getOrganizationSettingsRow(organizationId);
    return buildOrganizationBranding(organizationResult.data, settings);
  } catch {
    return DEFAULT_ORGANIZATION_BRANDING;
  }
});

export const getDefaultOrganizationBranding = cache(async () => {
  try {
    const admin = createSupabaseAdminClient();
    const preferredOrganizationResult = await admin
      .from("organizations")
      .select("id, name, slug, is_active")
      .eq("slug", DEFAULT_ORGANIZATION_SLUG)
      .maybeSingle<OrganizationRow>();

    let organization = preferredOrganizationResult.data ?? null;

    if (!organization) {
      const fallbackOrganizationResult = await admin
        .from("organizations")
        .select("id, name, slug, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<OrganizationRow>();

      organization = fallbackOrganizationResult.data ?? null;
    }

    if (!organization) {
      return DEFAULT_ORGANIZATION_BRANDING;
    }

    const settings = await getOrganizationSettingsRow(organization.id);
    return buildOrganizationBranding(organization, settings);
  } catch {
    return DEFAULT_ORGANIZATION_BRANDING;
  }
});

export const getAdminOrganizationSettingsPageData = cache(async () => {
  const context = await requireRole(["admin"]);
  const branding = await getOrganizationBrandingById(context.profile.organization_id);

  return {
    branding,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    metrics: [
      {
        label: "Slug workspace",
        value: branding.slug,
        delta: branding.websiteUrl ? "branding public connecté" : "site public interne"
      },
      {
        label: "Fuseau par défaut",
        value: branding.defaultTimezone,
        delta: "préremplit les nouveaux comptes"
      },
      {
        label: "Locale",
        value: branding.defaultLocale,
        delta: "pilotage des surfaces publiques"
      },
      {
        label: "Agenda coach",
        value: branding.allowCoachSelfSchedule ? "ouvert" : "verrouillé",
        delta: branding.allowCoachSelfSchedule ? "planification rapide active" : "réservé à l'admin"
      }
    ]
  };
});

export { DEFAULT_ORGANIZATION_BRANDING };
