"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";

type AssignmentBoardItem = {
  id: string;
  title: string;
  summary?: string | null;
  due: string;
  dueState: "overdue" | "soon" | "planned" | "open" | "done";
  statusLabel: string;
  statusTone: "neutral" | "accent" | "warning" | "success";
  kind: "quiz" | "contenu";
  meta: string;
  assetLabel?: string;
  targetLabel?: string;
  audienceLabel?: string;
  href?: string | null;
  ctaLabel?: string | null;
  messageHref?: string | null;
};

function matchesFilter(item: AssignmentBoardItem, filter: string) {
  switch (filter) {
    case "urgent":
      return item.dueState === "overdue" || item.dueState === "soon";
    case "quiz":
      return item.kind === "quiz";
    case "contenu":
      return item.kind === "contenu";
    case "termine":
      return item.dueState === "done";
    case "cohorte":
      return item.audienceLabel?.toLowerCase().includes("cohorte") ?? false;
    default:
      return true;
  }
}

export function AssignmentCommandBoard({
  items,
  mode,
  title,
  description,
  emptyTitle,
  emptyBody
}: {
  items: AssignmentBoardItem[];
  mode: "admin" | "learner";
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filterChips = [
    { id: "all", label: "Tout" },
    { id: "urgent", label: "Urgent" },
    { id: "quiz", label: "Quiz" },
    { id: "contenu", label: "Contenus" }
  ];

  if (mode === "learner" && items.some((item) => item.dueState === "done")) {
    filterChips.push({ id: "termine", label: "Terminés" });
  }

  if (mode === "admin" && items.some((item) => item.audienceLabel?.toLowerCase().includes("cohorte"))) {
    filterChips.push({ id: "cohorte", label: "Cohortes" });
  }

  const visibleItems = items.filter((item) => matchesFilter(item, activeFilter));
  const urgentCount = items.filter((item) => item.dueState === "overdue" || item.dueState === "soon").length;
  const completedCount = items.filter((item) => item.dueState === "done").length;

  return (
    <section className="panel assignment-board">
      <div className="assignment-board-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <div className="assignment-board-stats">
          <article>
            <strong>{items.length}</strong>
            <span>mission(s)</span>
          </article>
          <article>
            <strong>{urgentCount}</strong>
            <span>à surveiller</span>
          </article>
          <article>
            <strong>{completedCount}</strong>
            <span>terminée(s)</span>
          </article>
        </div>
      </div>

      <div className="tag-row">
        {filterChips.map((chip) => (
          <button
            className={`assignment-filter-chip${activeFilter === chip.id ? " is-active" : ""}`}
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            type="button"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {visibleItems.length ? (
        <div className="assignment-board-grid">
          {visibleItems.map((item) => (
            <article className="collection-card assignment-card" key={item.id}>
              <div className="tag-row">
                <Badge tone={item.kind === "quiz" ? "warning" : "accent"}>{item.kind}</Badge>
                <Badge tone={item.statusTone}>{item.statusLabel}</Badge>
              </div>

              <div className="assignment-card-copy">
                <strong>{item.title}</strong>
                {item.summary ? <p>{item.summary}</p> : null}
              </div>

              <div className="assignment-card-meta">
                <span>{item.due}</span>
                <span>{item.meta}</span>
                {item.targetLabel ? <span>{item.targetLabel}</span> : null}
              </div>

              {item.audienceLabel || item.assetLabel ? (
                <div className="assignment-card-submeta">
                  {item.audienceLabel ? <small>{item.audienceLabel}</small> : null}
                  {item.assetLabel ? <small>{item.assetLabel}</small> : null}
                </div>
              ) : null}

              <div className="assignment-card-footer">
                {item.href && item.ctaLabel ? (
                  <Link className="button button-secondary button-small" href={item.href}>
                    {item.ctaLabel}
                  </Link>
                ) : (
                  <span className="form-hint">Suivi centralisé dans le studio ECCE.</span>
                )}
                {item.messageHref ? (
                  <Link className="button button-secondary button-small" href={item.messageHref}>
                    Relancer
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>{emptyTitle}</strong>
          <p>{emptyBody}</p>
        </div>
      )}
    </section>
  );
}
