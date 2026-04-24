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

const CONFETTI_COLORS = [
  "linear-gradient(180deg, #f78a49, #ffd66a)",
  "linear-gradient(180deg, #549f70, #a8e1c3)",
  "linear-gradient(180deg, #356897, #7eabd6)",
  "linear-gradient(180deg, #f25f5c, #ffb199)",
  "linear-gradient(180deg, #fff4bd, #f7a14c)"
];

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
      Array.from({ length: 96 }, (_, index) => {
        const fromLeft = index % 2 === 0;
        const angle = -64 + (index % 16) * 8;
        const distance = 44 + (index % 9) * 8;
        const shape = index % 7 === 0 ? "spark" : index % 5 === 0 ? "dot" : index % 3 === 0 ? "ribbon" : "sheet";

        return {
          id: index,
          color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          delay: `${(index % 12) * 42}ms`,
          duration: `${1900 + (index % 8) * 120}ms`,
          finalRotate: `${(fromLeft ? 1 : -1) * (320 + (index % 8) * 88)}deg`,
          halfRotate: `${(fromLeft ? 1 : -1) * (90 + (index % 8) * 28)}deg`,
          origin: fromLeft ? "left" : "right",
          shape,
          spreadX: `${(fromLeft ? 1 : -1) * distance}vw`,
          spreadY: `${-18 - (index % 10) * 4}vh`,
          fallX: `${(fromLeft ? 1 : -1) * (18 + (index % 12) * 4)}vw`,
          fallY: `${104 + (index % 8) * 7}vh`,
          rotate: `${(fromLeft ? 1 : -1) * (180 + (index % 8) * 55)}deg`,
          scale: `${0.74 + (index % 5) * 0.13}`,
          startX: `${fromLeft ? -8 - (index % 4) * 2 : 108 + (index % 4) * 2}vw`,
          startY: `${72 + (index % 10) * 2}vh`,
          wiggle: `${(fromLeft ? 1 : -1) * (8 + (index % 6) * 6)}px`,
          angle: `${angle}deg`
        };
      }),
    []
  );
  const showers = useMemo(
    () =>
      Array.from({ length: 52 }, (_, index) => ({
        id: index,
        color: CONFETTI_COLORS[(index + 2) % CONFETTI_COLORS.length],
        delay: `${520 + (index % 11) * 54}ms`,
        drift: `${(index % 2 === 0 ? -1 : 1) * (28 + (index % 8) * 13)}px`,
        duration: `${1600 + (index % 6) * 160}ms`,
        left: `${((index * 17) % 100) + ((index % 4) - 1.5) * 1.2}%`,
        rotate: `${(index % 2 === 0 ? -1 : 1) * (120 + (index % 7) * 42)}deg`,
        scale: `${0.66 + (index % 4) * 0.14}`,
        shape: index % 4 === 0 ? "dot" : index % 6 === 0 ? "spark" : "sheet",
        top: `${-8 - (index % 5) * 8}%`
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
    const timeout = window.setTimeout(() => setVisible(false), 4200);

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
            className={cn("celebration-piece", `is-${piece.shape}`, `from-${piece.origin}`)}
            key={piece.id}
            style={
              {
                background: piece.color,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                left: piece.startX,
                top: piece.startY,
                "--piece-angle": piece.angle,
                "--piece-fall-x": piece.fallX,
                "--piece-fall-y": piece.fallY,
                "--piece-final-rotate": piece.finalRotate,
                "--piece-half-rotate": piece.halfRotate,
                "--piece-rotate": piece.rotate,
                "--piece-scale": piece.scale,
                "--piece-spread-x": piece.spreadX,
                "--piece-spread-y": piece.spreadY,
                "--piece-wiggle": piece.wiggle
              } as CSSProperties
            }
          />
        ))}
        {showers.map((piece) => (
          <span
            className={cn("celebration-piece celebration-piece-shower", `is-${piece.shape}`)}
            key={`shower-${piece.id}`}
            style={
              {
                background: piece.color,
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

      <div className="celebration-cannons" aria-hidden="true">
        <span />
        <span />
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
