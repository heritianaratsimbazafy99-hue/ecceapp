"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "DB", match: "exact", roles: ["admin", "coachee"] },
  { href: "/library", label: "Bibliothèque", shortLabel: "BI", match: "exact", roles: ["admin", "professor", "coach", "coachee"] },
  { href: "/coach", label: "Espace coach", shortLabel: "CO", match: "exact", roles: ["admin", "coach"] },
  { href: "/admin", label: "Hub admin", shortLabel: "AD", match: "exact", roles: ["admin"] },
  { href: "/admin/learners", label: "Parcours coachés", shortLabel: "PC", match: "prefix", roles: ["admin"] },
  { href: "/admin/content", label: "Studio contenus", shortLabel: "SC", match: "prefix", roles: ["admin"] },
  { href: "/admin/quizzes", label: "Studio quiz", shortLabel: "SQ", match: "prefix", roles: ["admin"] },
  { href: "/admin/assignments", label: "Assignations", shortLabel: "AS", match: "prefix", roles: ["admin"] }
] as Array<{ href: string; label: string; shortLabel: string; match: "exact" | "prefix"; roles: AppRole[] }>;

type PlatformSidebarProps = {
  role?: string | null;
  userName?: string | null;
  roles?: AppRole[];
};

const SIDEBAR_STORAGE_KEY = "ecce-platform-sidebar-collapsed";

export function PlatformSidebar({
  role = "coach",
  userName = "Utilisateur ECCE",
  roles = []
}: PlatformSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setCollapsed(storedValue === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    document.documentElement.dataset.platformSidebar = collapsed ? "collapsed" : "expanded";

    return () => {
      delete document.documentElement.dataset.platformSidebar;
    };
  }, [collapsed]);

  return (
    <aside className="platform-sidebar">
      <div className="platform-sidebar-top">
        <Link className="brand brand-inverse" href="/">
          <span className="brand-mark">ECCE</span>
          <span className="brand-copy">
            <strong>Workspace</strong>
            <small>école de coaching</small>
          </span>
        </Link>

        <button
          aria-label={collapsed ? "Déplier la sidebar" : "Replier la sidebar"}
          className="platform-sidebar-toggle"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="platform-nav" aria-label="Navigation plateforme">
        {navigation
          .filter((item) => item.roles.some((allowedRole) => roles.includes(allowedRole)))
          .map((item) => {
          const isActive =
            item.match === "exact"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              className={cn("platform-nav-link", isActive && "is-active")}
              href={item.href}
            >
              <span className="platform-nav-link-mark" aria-hidden="true">
                {item.shortLabel}
              </span>
              <span className="platform-nav-link-label">{item.label}</span>
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
