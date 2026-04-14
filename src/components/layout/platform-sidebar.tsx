"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "coachee"] },
  { href: "/library", label: "Bibliothèque", roles: ["admin", "professor", "coach", "coachee"] },
  { href: "/coach", label: "Espace coach", roles: ["admin", "coach"] },
  { href: "/admin", label: "Pilotage admin", roles: ["admin"] }
] as Array<{ href: string; label: string; roles: AppRole[] }>;

type PlatformSidebarProps = {
  role?: string | null;
  userName?: string | null;
  roles?: AppRole[];
};

export function PlatformSidebar({
  role = "coach",
  userName = "Utilisateur ECCE",
  roles = []
}: PlatformSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="platform-sidebar">
      <Link className="brand brand-inverse" href="/">
        <span className="brand-mark">ECCE</span>
        <span className="brand-copy">
          <strong>Workspace</strong>
          <small>école de coaching</small>
        </span>
      </Link>

      <nav className="platform-nav" aria-label="Navigation plateforme">
        {navigation
          .filter((item) => item.roles.some((allowedRole) => roles.includes(allowedRole)))
          .map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              className={cn("platform-nav-link", isActive && "is-active")}
              href={item.href}
            >
              {item.label}
            </Link>
          );
          })}
      </nav>

      <div className="sidebar-footnote">
        <span className="eyebrow">Rôle actif</span>
        <strong>{role}</strong>
        <p>
          Connecté en tant que {userName}. Le système bascule déjà vers une vue adaptée
          au rôle lorsqu&apos;il est connu.
        </p>
      </div>
    </aside>
  );
}
