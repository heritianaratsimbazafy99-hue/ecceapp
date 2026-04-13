import { Badge } from "@/components/ui/badge";

type CoachRosterItem = {
  name: string;
  cohort: string;
  progress: string;
  status: string;
  action: string;
};

type CoachRosterProps = {
  items: CoachRosterItem[];
};

export function CoachRoster({ items }: CoachRosterProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Vue coach par cohortes</h3>
        <p>Le cockpit final filtrera cohortes, programmes, coachs référents et urgences.</p>
      </div>

      <div className="stack-list">
        {items.map((item) => (
          <article className="list-row" key={item.name}>
            <div>
              <strong>{item.name}</strong>
              <p>
                {item.cohort} · progression {item.progress}
              </p>
            </div>

            <div className="list-row-meta">
              <Badge tone={item.status === "à relancer" ? "warning" : "accent"}>
                {item.status}
              </Badge>
              <small>{item.action}</small>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
