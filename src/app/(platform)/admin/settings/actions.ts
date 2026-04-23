"use server";

import { revalidatePath } from "next/cache";

import { createAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

export type OrganizationSettingsActionState = {
  error?: string;
  success?: string;
};

function ok(success: string): OrganizationSettingsActionState {
  return { success };
}

function fail(error: string): OrganizationSettingsActionState {
  return { error };
}

function trimOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value : null;
}

function normalizeWebsiteUrl(value: string | null) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function isValidEmail(value: string | null) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value: string | null) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function revalidateOrganizationSurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/auth/sign-in");
  revalidatePath("/auth/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/audit");
  revalidatePath("/agenda");
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/programs");
}

export async function updateOrganizationBrandingAction(
  _prevState: OrganizationSettingsActionState,
  formData: FormData
): Promise<OrganizationSettingsActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const name = String(formData.get("name") ?? "").trim();
  const providedSlug = String(formData.get("slug") ?? "").trim();
  const slug = slugify(providedSlug || name);
  const displayName = trimOptionalText(formData, "display_name");
  const shortName = trimOptionalText(formData, "short_name");
  const platformTagline = trimOptionalText(formData, "platform_tagline");
  const marketingHeadline = trimOptionalText(formData, "marketing_headline");
  const marketingSubheadline = trimOptionalText(formData, "marketing_subheadline");
  const supportEmail = trimOptionalText(formData, "support_email")?.toLowerCase() ?? null;
  const supportPhone = trimOptionalText(formData, "support_phone");
  const websiteUrl = normalizeWebsiteUrl(trimOptionalText(formData, "website_url"));

  if (!name) {
    return fail("Le nom de l'organisation est obligatoire.");
  }

  if (!slug) {
    return fail("Le slug organisation n'est pas valide.");
  }

  if (shortName && shortName.length > 18) {
    return fail("La marque courte doit rester concise pour le workspace.");
  }

  if (!isValidEmail(supportEmail)) {
    return fail("L'email de support n'est pas valide.");
  }

  if (!isValidUrl(websiteUrl)) {
    return fail("Le site web doit être une URL http(s) valide.");
  }

  const organizationUpdate = await admin
    .from("organizations")
    .update({
      name,
      slug
    })
    .eq("id", organizationId);

  if (organizationUpdate.error) {
    return fail(organizationUpdate.error.message);
  }

  const settingsUpdate = await admin.from("organization_settings").upsert(
    {
      organization_id: organizationId,
      display_name: displayName,
      short_name: shortName,
      platform_tagline: platformTagline,
      marketing_headline: marketingHeadline,
      marketing_subheadline: marketingSubheadline,
      support_email: supportEmail,
      support_phone: supportPhone,
      website_url: websiteUrl
    },
    {
      onConflict: "organization_id"
    }
  );

  if (settingsUpdate.error) {
    return fail(settingsUpdate.error.message);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "organization",
    action: "organization.branding_updated",
    summary: "Branding organisationnel mis à jour.",
    targetType: "organization",
    targetId: organizationId,
    targetLabel: displayName ?? name,
    highlights: [shortName ?? "marque longue", supportEmail ?? "sans email support", websiteUrl ?? "sans site web"]
  });

  revalidateOrganizationSurfaces();

  return ok("Branding organisationnel enregistré.");
}

export async function updateOrganizationPlatformSettingsAction(
  _prevState: OrganizationSettingsActionState,
  formData: FormData
): Promise<OrganizationSettingsActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const defaultTimezone = String(formData.get("default_timezone") ?? "").trim();
  const defaultLocale = String(formData.get("default_locale") ?? "").trim();
  const allowCoachSelfSchedule = formData.get("allow_coach_self_schedule") === "on";

  if (!defaultTimezone) {
    return fail("Le fuseau horaire par défaut est obligatoire.");
  }

  if (!defaultLocale) {
    return fail("La locale par défaut est obligatoire.");
  }

  const settingsUpdate = await admin.from("organization_settings").upsert(
    {
      organization_id: organizationId,
      default_timezone: defaultTimezone,
      default_locale: defaultLocale,
      allow_coach_self_schedule: allowCoachSelfSchedule
    },
    {
      onConflict: "organization_id"
    }
  );

  if (settingsUpdate.error) {
    return fail(settingsUpdate.error.message);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "organization",
    action: "organization.platform_settings_updated",
    summary: "Paramètres plateforme mis à jour.",
    targetType: "organization",
    targetId: organizationId,
    targetLabel: "ECCE",
    highlights: [
      defaultTimezone,
      defaultLocale,
      allowCoachSelfSchedule ? "planner coach ouvert" : "planner coach verrouillé"
    ]
  });

  revalidateOrganizationSurfaces();

  return ok("Paramètres plateforme enregistrés.");
}
