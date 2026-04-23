"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AccountActionState = {
  error?: string;
  success?: string;
};

function ok(success: string): AccountActionState {
  return { success };
}

function fail(error: string): AccountActionState {
  return { error };
}

function revalidateAccountSurfaces() {
  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  revalidatePath("/admin");
  revalidatePath("/agenda");
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/programs");
  revalidatePath("/professor");
}

export async function updateAccountProfileAction(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const context = await requireAuthenticatedUser();
  const admin = createSupabaseAdminClient();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!firstName || !lastName || !timezone) {
    return fail("Prénom, nom et fuseau horaire sont obligatoires.");
  }

  const profileUpdate = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      timezone,
      bio: bio || null
    })
    .eq("id", context.user.id)
    .eq("organization_id", context.profile.organization_id);

  if (profileUpdate.error) {
    return fail(profileUpdate.error.message);
  }

  revalidateAccountSurfaces();

  return ok("Profil mis à jour.");
}

export async function updateNotificationPreferencesAction(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const context = await requireAuthenticatedUser();
  const admin = createSupabaseAdminClient();

  const preferenceUpdate = await admin.from("user_notification_preferences").upsert(
    {
      user_id: context.user.id,
      organization_id: context.profile.organization_id,
      allow_learning_notifications: formData.get("allow_learning_notifications") === "on",
      allow_message_notifications: formData.get("allow_message_notifications") === "on",
      allow_review_notifications: formData.get("allow_review_notifications") === "on",
      allow_reward_notifications: formData.get("allow_reward_notifications") === "on",
      allow_session_notifications: formData.get("allow_session_notifications") === "on"
    },
    {
      onConflict: "user_id"
    }
  );

  if (preferenceUpdate.error) {
    return fail(preferenceUpdate.error.message);
  }

  revalidatePath("/account");

  return ok("Préférences de notifications enregistrées.");
}
