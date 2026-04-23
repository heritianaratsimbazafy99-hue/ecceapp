import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "professor" | "coach" | "coachee";

type ProfileRecord = {
  first_name: string;
  last_name: string;
  organization_id: string;
  status: "invited" | "active" | "suspended";
  user_roles: Array<{ role: AppRole }>;
};

type AuthenticatedUserContext = {
  user: User;
  profile: ProfileRecord;
  roles: AppRole[];
  role: AppRole | null;
};

const ROLE_PRIORITY: AppRole[] = ["admin", "coach", "professor", "coachee"];

function getPrimaryRole(roles: AppRole[]) {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

export const getCurrentUserContext = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      roles: [] as AppRole[],
      role: null
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
        first_name,
        last_name,
        organization_id,
        status,
        user_roles (
          role
        )
      `
    )
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  const roles = Array.from(
    new Set((profile?.user_roles ?? []).map((item) => item.role))
  ).sort(
    (left, right) => ROLE_PRIORITY.indexOf(left) - ROLE_PRIORITY.indexOf(right)
  );

  return {
    user,
    profile: profile ?? null,
    roles,
    role: getPrimaryRole(roles)
  };
});

export function getRouteForRole(role: AppRole | string | null) {
  switch (role) {
    case "admin":
      return "/admin";
    case "coach":
      return "/coach";
    case "professor":
      return "/professor";
    case "coachee":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

export async function requireAuthenticatedUser() {
  const context = await getCurrentUserContext();

  if (!context.user || !context.profile) {
    redirect("/auth/sign-in");
  }

  return context as AuthenticatedUserContext;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const context = await requireAuthenticatedUser();

  if (!context.roles.some((role) => allowedRoles.includes(role))) {
    redirect(getRouteForRole(context.role));
  }

  return context;
}
