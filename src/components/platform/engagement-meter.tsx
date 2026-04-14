import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EngagementMeterProps = {
  score: number;
  band: "strong" | "watch" | "risk";
  bandLabel: string;
  trend: "up" | "steady" | "down";
  trendLabel: string;
  caption: string;
  compact?: boolean;
};

function getBadgeTone(band: EngagementMeterProps["band"]) {
  switch (band) {
    case "strong":
      return "success";
    case "risk":
      return "warning";
    default:
      return "accent";
  }
}

function getTrendGlyph(trend: EngagementMeterProps["trend"]) {
  switch (trend) {
    case "up":
      return "↑";
    case "down":
      return "↓";
    default:
      return "→";
  }
}

export function EngagementMeter({
  score,
  band,
  bandLabel,
  trend,
  trendLabel,
  caption,
  compact = false
}: EngagementMeterProps) {
  return (
    <article className={cn("engagement-meter", compact && "is-compact", `is-${band}`)}>
      <div className="engagement-meter-head">
        <div>
          <span>Engagement pédagogique</span>
          <strong>{score}%</strong>
          <small>{caption}</small>
        </div>

        <div className="engagement-meter-meta">
          <Badge tone={getBadgeTone(band)}>{bandLabel}</Badge>
          <span className={cn("engagement-trend", `is-${trend}`)}>
            {getTrendGlyph(trend)} {trendLabel}
          </span>
        </div>
      </div>

      <div className="engagement-bar" aria-hidden="true">
        <span style={{ width: `${score}%` }} />
      </div>
    </article>
  );
}
