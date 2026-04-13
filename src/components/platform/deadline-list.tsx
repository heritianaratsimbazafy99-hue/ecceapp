import { Badge } from "@/components/ui/badge";

type DeadlineItem = {
  title: string;
  due: string;
  tone: "default" | "warning" | "success";
};

type DeadlineListProps = {
  items: DeadlineItem[];
};

const toneMap = {
  default: "neutral",
  warning: "warning",
  success: "success"
} as const;

export function DeadlineList({ items }: DeadlineListProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Deadlines à surveiller</h3>
        <p>Les rappels automatiques partiront par notification in-app et email.</p>
      </div>

      <div className="stack-list">
        {items.map((item) => (
          <article className="list-row" key={item.title}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.due}</p>
            </div>

            <Badge tone={toneMap[item.tone]}>{item.tone}</Badge>
          </article>
        ))}
      </div>
    </div>
  );
}
