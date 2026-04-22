"use client";

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
          <span className="eyebrow">Coach Portfolio</span>
          <h3>Un cockpit plus lisible pour piloter relances, progression et séances sans se noyer</h3>
          <p>Filtre rapidement ton portefeuille, identifie les signaux faibles et garde la prochaine action visible.</p>
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

      <section className="panel coach-alert-strip">
        <div className="panel-header">
          <h3>Alertes immédiates</h3>
          <p>Les signaux qui méritent une intervention coach sans attendre.</p>
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
            <p>Une lecture plus opérationnelle du suivi individuel : rythme, sessions et prochaine action.</p>
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
              <article className="collection-card coach-roster-card" key={item.id}>
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

                <div className="coach-roster-copy">
                  <strong>{item.name}</strong>
                  <p>{item.cohorts.length ? item.cohorts.join(", ") : "Sans cohorte active"}</p>
                </div>

                <div className="coach-roster-meta">
                  <span>{item.engagementScore !== null ? `${item.engagementScore}% d'engagement` : "signal indisponible"}</span>
                  <span>{item.upcomingSession ? `Séance ${item.upcomingSession}` : "Aucune séance planifiée"}</span>
                </div>

                <div className="coach-roster-kpis">
                  <div>
                    <strong>{item.completedCount}</strong>
                    <span>actions traitées</span>
                  </div>
                  <div>
                    <strong>{item.dueSoonCount}</strong>
                    <span>deadline(s) proches</span>
                  </div>
                  <div>
                    <strong>{item.overdueCount}</strong>
                    <span>en retard</span>
                  </div>
                </div>

                <div className="coach-roster-next">
                  <small>Prochaine action</small>
                  <p>{item.nextFocus ?? "Aucune action spécifique remontée pour l’instant."}</p>
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
