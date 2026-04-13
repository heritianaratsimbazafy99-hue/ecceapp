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

export function PlatformSidebar() {
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
        <strong>Coach</strong>
        <p>Le système final permettra de basculer entre les vues selon les permissions.</p>
      </div>
    </aside>
  );
}
