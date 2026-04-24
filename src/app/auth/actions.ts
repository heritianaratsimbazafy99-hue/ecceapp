"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getAuthenticatedRedirectTarget,
  getPrimaryRole,
  getRouteForRole,
  isSuspendedStatus,
  requireAuthenticatedUser,
  type AppRole,
  type MembershipStatus
} from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthActionState = {
  error?: string;
};

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return { error: "Renseigne ton email et ton mot de passe." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connexion réussie, mais la session n'a pas pu être récupérée." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
        status,
        user_roles (
          role
        )
      `
    )
    .eq("id", user.id)
    .maybeSingle<{ status: MembershipStatus; user_roles: Array<{ role: AppRole }> }>();

  if (isSuspendedStatus(profile?.status)) {
    await supabase.auth.signOut();

    return {
      error: "Ton accès ECCE est actuellement suspendu. Contacte l'équipe pédagogique pour le réactiver."
    };
  }

  const roles = Array.from(new Set((profile?.user_roles ?? []).map((item) => item.role)));
  const primaryRole = getPrimaryRole(roles);

  redirect(
    getAuthenticatedRedirectTarget({
      role: primaryRole,
      status: profile?.status ?? null
    })
  );
}

export async function completeOnboardingAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const context = await requireAuthenticatedUser({ allowInvited: true });

  if (isSuspendedStatus(context.profile.status)) {
    return {
      error: "Ton profil est suspendu. Contacte l'équipe ECCE pour reprendre l'accès."
    };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!firstName || !lastName || !timezone) {
    return {
      error: "Complète au minimum ton prénom, ton nom et ton fuseau horaire."
    };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      timezone,
      bio: bio || null,
      status: "active"
    })
    .eq("id", context.user.id)
    .eq("organization_id", context.profile.organization_id);

  if (error) {
    return {
      error: error.message
    };
  }

  revalidatePath("/auth/sign-in");
  revalidatePath("/auth/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  revalidatePath("/admin");
  revalidatePath("/professor");

  redirect(getRouteForRole(context.role));
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/sign-in");
}
