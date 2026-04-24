import Link from "next/link";

import { Badge } from "@/components/ui/badge";

type AgendaEvent = {
  id: string;
  type: "session" | "deadline" | "followup";
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
  lane: "urgent" | "today" | "upcoming" | "recent";
  laneLabel: string;
  tone: "neutral" | "accent" | "warning" | "success";
  nextAction: string;
  contextLabel: string;
};

function getAgendaEventTypeLabel(type: AgendaEvent["type"]) {
  switch (type) {
    case "session":
      return "séance";
    case "deadline":
      return "deadline";
    default:
      return "relance";
  }
}

export function AgendaCommandCenter({ events }: { events: AgendaEvent[] }) {
  const groupedEvents = events.reduce(
    (map, event) => {
      const key = `${event.dayLabel}-${event.dateLabel}`;
      const current = map.get(key) ?? {
        label: `${event.dayLabel} · ${event.dateLabel}`,
        items: [] as AgendaEvent[]
      };

      current.items.push(event);
      map.set(key, current);
      return map;
    },
    new Map<string, { label: string; items: AgendaEvent[] }>()
  );

  if (!groupedEvents.size) {
    return (
      <div className="empty-state">
        <strong>Aucun événement pour cette vue.</strong>
        <p>Change les filtres pour retrouver l&apos;ensemble du planning ECCE.</p>
      </div>
    );
  }

  return (
    <div className="agenda-day-stack">
      {Array.from(groupedEvents.values()).map((group) => (
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
                        {getAgendaEventTypeLabel(event.type)}
                      </Badge>
                      <Badge tone={event.tone}>{event.laneLabel}</Badge>
                      {event.isOverdue ? <Badge tone="warning">retard</Badge> : null}
                    </div>
                    <small>
                      {event.timeLabel} · {event.audienceLabel}
                    </small>
                  </div>

                  <div className="agenda-event-copy">
                    <strong>{event.title}</strong>
                    <p>{event.subtitle}</p>
                    <small>{event.nextAction}</small>
                  </div>
                </div>

                <div className="agenda-event-actions">
                  <small>{event.contextLabel}</small>
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
  );
}
