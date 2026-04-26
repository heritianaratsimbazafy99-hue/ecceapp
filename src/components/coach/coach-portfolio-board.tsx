"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";

type AttentionLearner = {
  id: string;
  name: string;
  lastActivityLabel: string;
  nextFocus: string;
  band: "strong" | "watch" | "risk";
  bandLabel: string;
  score: number;
};

type CoachRosterItem = {
  id: string;
  name: string;
  status: "invited" | "active" | "suspended";
  cohorts: string[];
  upcomingSession: string | null;
  engagement: {
    band: "strong" | "watch" | "risk";
    bandLabel: string;
  } | null;
  engagementScore: number | null;
  engagementBandLabel: string | null;
  nextFocus: string | null;
  overdueCount: number;
  dueSoonCount: number;
  completedCount: number;
};

function matchesFilter(item: CoachRosterItem, filter: string) {
  switch (filter) {
    case "priority":
      return item.overdueCount > 0 || item.dueSoonCount > 0 || item.engagement?.band === "risk";
    case "sessions":
      return Boolean(item.upcomingSession);
    case "strong":
      return item.engagement?.band === "strong";
    default:
      return true;
  }
}

export function CoachPortfolioBoard({
  roster,
  attentionLearners
}: {
  roster: CoachRosterItem[];
  attentionLearners: AttentionLearner[];
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const visibleRoster = roster.filter((item) => matchesFilter(item, activeFilter));
  const urgentCount = roster.filter((item) => item.overdueCount > 0 || item.engagement?.band === "risk").length;
  const upcomingSessionCount = roster.filter((item) => Boolean(item.upcomingSession)).length;
  const strongCount = roster.filter((item) => item.engagement?.band === "strong").length;

  return (
    <section className="coach-portfolio-shell">
      <div className="panel panel-accent coach-portfolio-hero">
        <div className="coach-portfolio-copy">
          <span className="eyebrow">Portefeuille</span>
          <h3>Une lecture courte des coachés, orientée action</h3>
          <p>Les détails restent disponibles, mais la carte commence par le statut et la prochaine décision coach.</p>
        </div>

        <div className="coach-portfolio-metrics">
          <article>
            <strong>{roster.length}</strong>
            <span>coaché(s) visibles</span>
          </article>
          <article>
            <strong>{urgentCount}</strong>
            <span>à relancer</span>
          </article>
          <article>
            <strong>{upcomingSessionCount}</strong>
            <span>avec séance prévue</span>
          </article>
          <article>
            <strong>{strongCount}</strong>
            <span>dynamique forte</span>
          </article>
        </div>
      </div>

      <section className="panel coach-alert-strip coach-alert-strip-compact">
        <div className="panel-header-rich">
          <div>
            <h3>Alertes immédiates</h3>
            <p>Les signaux qui méritent une intervention coach sans attendre.</p>
          </div>
          <Badge tone={attentionLearners.length ? "warning" : "success"}>
            {attentionLearners.length ? `${attentionLearners.length} à voir` : "clair"}
          </Badge>
        </div>

        {attentionLearners.length ? (
          <div className="coach-alert-grid">
            {attentionLearners.slice(0, 3).map((learner) => (
              <article className="coach-alert-card" key={learner.id}>
                <div className="tag-row">
                  <Badge tone={learner.band === "risk" ? "warning" : "accent"}>{learner.bandLabel}</Badge>
                  <Badge tone="neutral">{learner.score}%</Badge>
                </div>
                <strong>{learner.name}</strong>
                <p>{learner.lastActivityLabel}</p>
                <small>{learner.nextFocus}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state-compact">
            <strong>Aucune alerte critique.</strong>
            <p>Le portefeuille coach est plutôt bien engagé pour le moment.</p>
          </div>
        )}
      </section>

      <section className="panel coach-roster-board">
        <div className="coach-roster-head">
          <div>
            <h3>Portefeuille coachés</h3>
            <p>Une ligne de conduite par coaché ; les métriques avancées se déplient au besoin.</p>
          </div>

          <div className="tag-row">
            <button
              className={`assignment-filter-chip${activeFilter === "all" ? " is-active" : ""}`}
              onClick={() => setActiveFilter("all")}
              type="button"
            >
              Tout
            </button>
            <button
              className={`assignment-filter-chip${activeFilter === "priority" ? " is-active" : ""}`}
              onClick={() => setActiveFilter("priority")}
              type="button"
            >
              Priorité
            </button>
            <button
              className={`assignment-filter-chip${activeFilter === "sessions" ? " is-active" : ""}`}
              onClick={() => setActiveFilter("sessions")}
              type="button"
            >
              Avec séance
            </button>
            <button
              className={`assignment-filter-chip${activeFilter === "strong" ? " is-active" : ""}`}
              onClick={() => setActiveFilter("strong")}
              type="button"
            >
              Très engagés
            </button>
          </div>
        </div>

        {visibleRoster.length ? (
          <div className="coach-roster-grid">
            {visibleRoster.map((item) => (
              <article className="collection-card coach-roster-card coach-roster-card-compact" key={item.id}>
                <div className="coach-roster-card-topline">
                  <div className="tag-row">
                    <Badge tone={item.status === "active" ? "success" : item.status === "invited" ? "accent" : "warning"}>
                      {item.status}
                    </Badge>
                    {item.engagement ? (
                      <Badge tone={item.engagement.band === "strong" ? "success" : item.engagement.band === "risk" ? "warning" : "accent"}>
                        {item.engagement.bandLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <span>{item.engagementScore !== null ? `${item.engagementScore}%` : "n/a"}</span>
                </div>

                <div className="coach-roster-copy">
                  <strong>{item.name}</strong>
                  <p>{item.cohorts.length ? item.cohorts.join(", ") : "Sans cohorte active"}</p>
                </div>

                <div className="coach-roster-next">
                  <small>Prochaine action</small>
                  <p>{item.nextFocus ?? "Aucune action spécifique remontée pour l’instant."}</p>
                </div>

                <details className="coach-roster-details">
                  <summary>Contexte rapide</summary>
                  <div className="coach-roster-meta">
                    <span>{item.upcomingSession ? `Séance ${item.upcomingSession}` : "Aucune séance planifiée"}</span>
                    <span>{item.dueSoonCount} deadline(s) proches</span>
                    <span>{item.overdueCount} en retard</span>
                    <span>{item.completedCount} action(s) traitée(s)</span>
                  </div>
                </details>

                <div className="coach-roster-actions">
                  <Link className="button button-secondary button-small" href={`/coach/learners/${item.id}`}>
                    Ouvrir la fiche
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun coaché ne correspond à ce filtre.</strong>
            <p>Change le filtre pour revoir l’ensemble du portefeuille.</p>
          </div>
        )}
      </section>
    </section>
  );
}
