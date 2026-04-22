"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "DB", match: "exact", roles: ["admin", "coachee"] },
  { href: "/library", label: "Bibliothèque", shortLabel: "BI", match: "exact", roles: ["admin", "professor", "coach", "coachee"] },
  { href: "/messages", label: "Messages", shortLabel: "MS", match: "exact", roles: ["coach", "coachee"] },
  { href: "/notifications", label: "Notifications", shortLabel: "NT", match: "exact", roles: ["admin", "professor", "coach", "coachee"] },
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

const SIDEBAR_PINNED_STORAGE_KEY = "ecce-platform-sidebar-pinned";
const DESKTOP_MEDIA_QUERY = "(min-width: 1081px)";

export function PlatformSidebar({
  role = "coach",
  userName = "Utilisateur ECCE",
  roles = []
}: PlatformSidebarProps) {
  const pathname = usePathname();
  const hideTimeoutRef = useRef<number | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const showSidebar = () => {
    clearHideTimeout();
    setIsVisible(true);
  };

  const hideSidebar = () => {
    clearHideTimeout();

    if (isPinned || !isDesktop) {
      return;
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 180);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const storedPinnedValue = window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY);
    const handleMediaQueryChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const desktop = event.matches;
      setIsDesktop(desktop);

      if (!desktop) {
        setIsVisible(true);
        return;
      }

      setIsVisible((currentVisible) =>
        window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY) === "true" ? true : currentVisible
      );
    };

    setIsPinned(storedPinnedValue === "true");
    handleMediaQueryChange(mediaQuery);
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, String(isPinned));

    if (isPinned) {
      setIsVisible(true);
    } else if (isDesktop) {
      setIsVisible(false);
    }
  }, [isDesktop, isPinned]);

  useEffect(() => {
    document.documentElement.dataset.platformSidebarState = isPinned ? "pinned" : isVisible ? "visible" : "hidden";

    return () => {
      delete document.documentElement.dataset.platformSidebarState;
    };
  }, [isPinned, isVisible]);

  useEffect(() => {
    if (!isPinned && isDesktop) {
      setIsVisible(false);
    }
  }, [isDesktop, isPinned, pathname]);

  useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, []);

  return (
    <>
      <button
        aria-label="Afficher la navigation"
        aria-hidden={isPinned}
        className={cn("platform-sidebar-rail", isPinned && "is-hidden")}
        onFocus={showSidebar}
        onMouseEnter={showSidebar}
        tabIndex={isPinned ? -1 : 0}
        type="button"
      >
        <span className="platform-sidebar-rail-line" aria-hidden="true" />
        <span className="platform-sidebar-rail-copy">Menu ECCE</span>
      </button>

      <aside
        className={cn("platform-sidebar", (isVisible || isPinned) && "is-visible")}
        onFocusCapture={showSidebar}
        onMouseEnter={showSidebar}
        onMouseLeave={hideSidebar}
      >
        <div className="platform-sidebar-glow" aria-hidden="true" />

        <div className="platform-sidebar-top">
          <Link className="brand brand-inverse" href="/">
            <span className="brand-mark">ECCE</span>
            <span className="brand-copy">
              <strong>Workspace</strong>
              <small>école de coaching</small>
            </span>
          </Link>

          <div className="platform-sidebar-actions">
            <button
              aria-label={isPinned ? "Activer le mode flottant" : "Épingler la sidebar"}
              aria-pressed={isPinned}
              className={cn("platform-sidebar-toggle", isPinned && "is-active")}
              onClick={() => setIsPinned((value) => !value)}
              type="button"
            >
              {isPinned ? "Fixée" : "Libre"}
            </button>
          </div>
        </div>

        <div className="platform-sidebar-status">
          <span className="platform-sidebar-status-dot" aria-hidden="true" />
          <p>{isPinned ? "Navigation épinglée et toujours visible." : "Passez la souris à gauche pour la faire revenir."}</p>
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
                  <span className="platform-nav-link-content">
                    <span className="platform-nav-link-label">{item.label}</span>
                    <small>{isActive ? "Ouvert actuellement" : "Accès rapide"}</small>
                  </span>
                </Link>
              );
            })}
        </nav>

        <div className="sidebar-footnote">
          <span className="eyebrow">Rôle actif</span>
          <strong>{role}</strong>
          <p>
            Connecté en tant que {userName}. La navigation se personnalise déjà selon vos
            permissions et votre contexte.
          </p>
        </div>
      </aside>
    </>
  );
}
