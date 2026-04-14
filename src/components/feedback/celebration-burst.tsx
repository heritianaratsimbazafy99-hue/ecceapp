"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

type CelebrationBurstProps = {
  active: boolean;
  triggerKey?: string;
  title: string;
  body?: string;
  tone?: "success" | "badge";
};

export function CelebrationBurst({
  active,
  triggerKey,
  title,
  body,
  tone = "success"
}: CelebrationBurstProps) {
  const [visible, setVisible] = useState(false);
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        left: `${(index * 17) % 100}%`,
        delay: `${(index % 6) * 70}ms`,
        drift: `${(index % 2 === 0 ? -1 : 1) * (18 + (index % 5) * 10)}px`
      })),
    []
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 4200);

    return () => window.clearTimeout(timeout);
  }, [active, triggerKey, title, body]);

  if (!visible) {
    return null;
  }

  return (
    <div className={cn("celebration-burst", tone === "badge" && "is-badge")} role="status">
      <div className="celebration-copy">
        <strong>{title}</strong>
        {body ? <p>{body}</p> : null}
      </div>

      <div className="celebration-confetti" aria-hidden="true">
        {pieces.map((piece) => (
          <span
            className="celebration-piece"
            key={piece.id}
            style={
              {
                left: piece.left,
                animationDelay: piece.delay,
                "--piece-drift": piece.drift
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
