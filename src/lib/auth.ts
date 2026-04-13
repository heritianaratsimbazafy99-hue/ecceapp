import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRecord = {
  first_name: string;
  last_name: string;
  organization_id: string;
  status: "invited" | "active" | "suspended";
  user_roles: Array<{ role: "admin" | "professor" | "coach" | "coachee" }>;
};

export const getCurrentUserContext = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
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

  const role = profile?.user_roles?.[0]?.role ?? null;

  return {
    user,
    profile: profile ?? null,
    role
  };
});

export function getRouteForRole(role: string | null) {
  switch (role) {
    case "admin":
      return "/admin";
    case "coach":
      return "/coach";
    case "professor":
      return "/library";
    case "coachee":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}
