"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "Bibliothèque" },
  { href: "/coach", label: "Espace coach" },
  { href: "/admin", label: "Pilotage admin" }
];

type PlatformSidebarProps = {
  role?: string | null;
  userName?: string | null;
};

export function PlatformSidebar({
  role = "coach",
  userName = "Utilisateur ECCE"
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
        {navigation.map((item) => {
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
