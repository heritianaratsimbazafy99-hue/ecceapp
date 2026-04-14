import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AccountChip } from "@/components/layout/account-chip";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { getCurrentUserContext } from "@/lib/auth";

export default async function PlatformLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const { user, profile, role, roles } = await getCurrentUserContext();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user.email ?? "Utilisateur ECCE";

  return (
    <main className="platform-layout">
      <PlatformSidebar role={role} roles={roles} userName={displayName} />
      <section className="platform-content">
        <AccountChip
          email={user.email ?? "email inconnu"}
          name={displayName}
          role={role ?? "sans rôle"}
        />
        {children}
      </section>
    </main>
  );
}
