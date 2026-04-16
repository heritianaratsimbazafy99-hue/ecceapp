"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);
  const pieces = useMemo(
    () =>
      Array.from({ length: 54 }, (_, index) => ({
        id: index,
        left: `${((index * 13) % 100) + ((index % 4) - 1.5) * 1.4}%`,
        delay: `${(index % 9) * 70}ms`,
        drift: `${(index % 2 === 0 ? -1 : 1) * (30 + (index % 6) * 14)}px`,
        rotate: `${(index % 2 === 0 ? -1 : 1) * (100 + (index % 5) * 44)}deg`,
        duration: `${1700 + (index % 5) * 180}ms`,
        scale: `${0.72 + (index % 4) * 0.18}`,
        top: `${-8 - (index % 5) * 7}%`
      })),
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 3600);

    return () => window.clearTimeout(timeout);
  }, [active, triggerKey, title, body]);

  if (!mounted || !visible) {
    return null;
  }

  return createPortal(
    <div className={cn("celebration-burst", tone === "badge" && "is-badge")} role="status">
      <div className="celebration-backdrop" />

      <div className="celebration-copy">
        <span className="eyebrow">{tone === "badge" ? "Nouveau palier" : "Mission accomplie"}</span>
        <strong>{title}</strong>
        {body ? <p>{body}</p> : null}
        <small>Le parcours ECCE enregistre déjà cette progression.</small>
      </div>

      <div className="celebration-confetti" aria-hidden="true">
        {pieces.map((piece) => (
          <span
            className="celebration-piece"
            key={piece.id}
            style={
              {
                left: piece.left,
                top: piece.top,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                "--piece-drift": piece.drift,
                "--piece-rotate": piece.rotate,
                "--piece-scale": piece.scale
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="celebration-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>,
    document.body
  );
}
