"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import type { AppRole } from "@/lib/auth";

const ROUTES_BY_ROLE: Record<AppRole, string[]> = {
  admin: [
    "/admin",
    "/dashboard",
    "/library",
    "/admin/content",
    "/admin/quizzes",
    "/admin/assignments",
    "/agenda",
    "/notifications"
  ],
  professor: ["/professor", "/library", "/admin/content", "/admin/quizzes", "/admin/assignments", "/notifications"],
  coach: ["/coach", "/agenda", "/messages", "/library", "/admin/content", "/admin/quizzes", "/coach/reviews", "/notifications"],
  coachee: ["/dashboard", "/library", "/programs", "/progress", "/agenda", "/messages", "/notifications"]
};

type PlatformRoutePrefetcherProps = {
  roles: AppRole[];
};

export function PlatformRoutePrefetcher({ roles }: PlatformRoutePrefetcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routes = useMemo(() => {
    const preferredRoutes = roles.flatMap((role) => ROUTES_BY_ROLE[role] ?? []);
    return Array.from(new Set(preferredRoutes)).filter((route) => route !== pathname).slice(0, 10);
  }, [pathname, roles]);

  useEffect(() => {
    if (!routes.length) {
      return;
    }

    const prefetchRoutes = () => {
      for (const route of routes) {
        router.prefetch(route);
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(prefetchRoutes, { timeout: 1600 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(prefetchRoutes, 500);
    return () => globalThis.clearTimeout(timeoutId);
  }, [router, routes]);

  return null;
}
