import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AccountChip } from "@/components/layout/account-chip";
import { PlatformRoutePrefetcher } from "@/components/layout/platform-route-prefetcher";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { getCurrentUserContext, isSuspendedStatus, requiresOnboarding } from "@/lib/auth";
import { getOrganizationBrandingById } from "@/lib/organization";

export default async function PlatformLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const { user, profile, role, roles } = await getCurrentUserContext();

  if (!user) {
    redirect("/auth/sign-in");
  }

  if (!profile) {
    redirect("/auth/sign-in");
  }

  if (profile && isSuspendedStatus(profile.status)) {
    redirect("/auth/sign-in");
  }

  if (profile && requiresOnboarding(profile.status)) {
    redirect("/auth/onboarding");
  }

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user.email ?? "Utilisateur ECCE";
  const branding = await getOrganizationBrandingById(profile.organization_id);

  return (
    <main className="platform-layout">
      <PlatformSidebar
        brandMark={branding.brandMark}
        brandName={branding.displayName}
        platformTagline={branding.platformTagline}
        role={role}
        roles={roles}
        userName={displayName}
      />
      <section className="platform-content">
        <AccountChip
          email={user.email ?? "email inconnu"}
          name={displayName}
          role={role ?? "sans rôle"}
          userId={user.id}
        />
        <PlatformRoutePrefetcher roles={roles} />
        {children}
      </section>
    </main>
  );
}
