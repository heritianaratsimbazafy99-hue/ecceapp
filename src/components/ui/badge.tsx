import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "accent" | "warning" | "success";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={cn("badge", `badge-${tone}`)}>{children}</span>;
}
