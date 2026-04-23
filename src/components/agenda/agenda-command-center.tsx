"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";

type AgendaEvent = {
  id: string;
  type: "session" | "deadline";
  timestamp: number;
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: "neutral" | "accent" | "warning" | "success";
  audienceLabel: string;
  href: string | null;
  ctaLabel: string | null;
  isOverdue: boolean;
  isToday: boolean;
};

function matchesFilter(event: AgendaEvent, filter: string) {
  switch (filter) {
    case "today":
      return event.isToday;
    case "sessions":
      return event.type === "session";
    case "deadlines":
      return event.type === "deadline";
    case "overdue":
      return event.isOverdue;
    default:
      return true;
  }
}

export function AgendaCommandCenter({
  events,
  roleLabel
}: {
  events: AgendaEvent[];
  roleLabel: string;
}) {
  const [activeFilter, setActiveFilter] = useState("all");

  const visibleEvents = useMemo(
    () => events.filter((event) => matchesFilter(event, activeFilter)),
    [activeFilter, events]
  );

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, { label: string; items: AgendaEvent[] }>();

    for (const event of visibleEvents) {
      const key = `${event.dayLabel}-${event.dateLabel}`;
      const current = groups.get(key) ?? {
        label: `${event.dayLabel} · ${event.dateLabel}`,
        items: []
      };

      current.items.push(event);
      groups.set(key, current);
    }

    return Array.from(groups.values());
  }, [visibleEvents]);

  const todayCount = events.filter((event) => event.isToday).length;
  const overdueCount = events.filter((event) => event.isOverdue).length;
  const sessionCount = events.filter((event) => event.type === "session").length;

  return (
    <section className="agenda-shell">
      <div className="panel panel-highlight agenda-hero">
        <div className="agenda-hero-copy">
          <span className="eyebrow">Agenda ECCE</span>
          <h3>Une timeline vraiment utile pour arbitrer les séances, les deadlines et le prochain mouvement.</h3>
          <p>
            Vue pensée pour le rôle <strong>{roleLabel}</strong>, avec filtres rapides et accès direct à l&apos;action sans fouiller plusieurs pages.
          </p>
        </div>

        <div className="agenda-hero-metrics">
          <article>
            <strong>{events.length}</strong>
            <span>événements visibles</span>
          </article>
          <article>
            <strong>{todayCount}</strong>
            <span>aujourd&apos;hui</span>
          </article>
          <article>
            <strong>{sessionCount}</strong>
            <span>séances</span>
          </article>
          <article>
            <strong>{overdueCount}</strong>
            <span>retards</span>
          </article>
        </div>
      </div>

      <section className="panel">
        <div className="agenda-head">
          <div>
            <h3>Filtrer l&apos;agenda</h3>
            <p>Garde seulement les temps forts du jour, les séances, les deadlines ou les urgences.</p>
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
              className={`assignment-filter-chip${activeFilter === "today" ? " is-active" : ""}`}
              onClick={() => setActiveFilter("today")}
              type="button"
            >
              Aujourd&apos;hui
            </button>
            <button
              className={`assignment-filter-chip${activeFilter === "sessions" ? " is-active" : ""}`}
              onClick={() => setActiveFilter("sessions")}
              type="button"
            >
              Séances
            </button>
            <button
              className={`assignment-filter-chip${activeFilter === "deadlines" ? " is-active" : ""}`}
              onClick={() => setActiveFilter("deadlines")}
              type="button"
            >
              Deadlines
            </button>
            <button
              className={`assignment-filter-chip${activeFilter === "overdue" ? " is-active" : ""}`}
              onClick={() => setActiveFilter("overdue")}
              type="button"
            >
              En retard
            </button>
          </div>
        </div>

        {groupedEvents.length ? (
          <div className="agenda-day-stack">
            {groupedEvents.map((group) => (
              <section className="agenda-day-group" key={group.label}>
                <div className="agenda-day-heading">
                  <span className="eyebrow">Timeline</span>
                  <strong>{group.label}</strong>
                </div>

                <div className="agenda-event-list">
                  {group.items.map((event) => (
                    <article className="agenda-event-card" key={event.id}>
                      <div className="agenda-event-rail">
                        <span className={`agenda-event-dot is-${event.type}`} aria-hidden="true" />
                      </div>

                      <div className="agenda-event-main">
                        <div className="agenda-event-meta">
                          <div className="tag-row">
                            <Badge tone={event.statusTone}>{event.statusLabel}</Badge>
                            <Badge tone={event.type === "session" ? "accent" : "neutral"}>
                              {event.type === "session" ? "séance" : "deadline"}
                            </Badge>
                            {event.isOverdue ? <Badge tone="warning">retard</Badge> : null}
                          </div>
                          <small>
                            {event.timeLabel} · {event.audienceLabel}
                          </small>
                        </div>

                        <div className="agenda-event-copy">
                          <strong>{event.title}</strong>
                          <p>{event.subtitle}</p>
                        </div>
                      </div>

                      <div className="agenda-event-actions">
                        {event.href && event.ctaLabel ? (
                          <Link
                            className="button button-secondary button-small"
                            href={event.href}
                            target={event.href.startsWith("http") ? "_blank" : undefined}
                          >
                            {event.ctaLabel}
                          </Link>
                        ) : (
                          <span className="form-hint">Pas d&apos;action directe</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun événement pour ce filtre.</strong>
            <p>Change le filtre pour retrouver l&apos;ensemble du planning ECCE.</p>
          </div>
        )}
      </section>
    </section>
  );
}
