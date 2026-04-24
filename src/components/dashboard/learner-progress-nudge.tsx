"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type EngagementBand = "strong" | "watch" | "risk";

type LearnerProgressNudgeProps = {
  engagement: {
    band: EngagementBand;
    bandLabel: string;
    score: number;
  };
  latestBadge: {
    id: string;
    title: string;
    awardedAtIso: string | null;
  } | null;
};

type NudgeState = {
  kind: "badge" | "engagement";
  title: string;
  body: string;
};

const BADGE_STORAGE_KEY = "ecce-dashboard-latest-badge-id";
const BAND_STORAGE_KEY = "ecce-dashboard-engagement-band";
const SCORE_STORAGE_KEY = "ecce-dashboard-engagement-score";

function getBandRank(band: EngagementBand) {
  switch (band) {
    case "strong":
      return 3;
    case "watch":
      return 2;
    case "risk":
      return 1;
    default:
      return 0;
  }
}

function isFreshBadge(dateString: string | null) {
  if (!dateString) {
    return false;
  }

  const value = new Date(dateString).getTime();

  if (Number.isNaN(value)) {
    return false;
  }

  return Date.now() - value <= 6 * 60 * 60 * 1000;
}

export function LearnerProgressNudge({ engagement, latestBadge }: LearnerProgressNudgeProps) {
  const [nudge, setNudge] = useState<NudgeState | null>(null);

  useEffect(() => {
    const previousBadgeId = window.localStorage.getItem(BADGE_STORAGE_KEY);
    const previousBand = window.localStorage.getItem(BAND_STORAGE_KEY) as EngagementBand | null;
    const previousScore = Number(window.localStorage.getItem(SCORE_STORAGE_KEY) ?? "0");
    const hasNewBadge = latestBadge && latestBadge.id !== previousBadgeId;
    const hasFreshBadge = latestBadge ? isFreshBadge(latestBadge.awardedAtIso) : false;
    const hasBandUpgrade =
      previousBand &&
      previousBand !== engagement.band &&
      getBandRank(engagement.band) > getBandRank(previousBand);

    if (hasNewBadge && (previousBadgeId || hasFreshBadge)) {
      setNudge({
        kind: "badge",
        title: "Badge ajouté",
        body: `${latestBadge.title} vient d'être ajouté à ta progression.`
      });
    } else if (hasBandUpgrade) {
      setNudge({
        kind: "engagement",
        title: "Nouveau palier",
        body: `${engagement.bandLabel} · ${engagement.score}% d'engagement${previousScore ? `, +${Math.max(0, engagement.score - previousScore)} pt(s)` : ""}.`
      });
    }

    if (latestBadge) {
      window.localStorage.setItem(BADGE_STORAGE_KEY, latestBadge.id);
    }

    window.localStorage.setItem(BAND_STORAGE_KEY, engagement.band);
    window.localStorage.setItem(SCORE_STORAGE_KEY, String(engagement.score));
  }, [engagement.band, engagement.bandLabel, engagement.score, latestBadge]);

  useEffect(() => {
    if (!nudge) {
      return;
    }

    const timeout = window.setTimeout(() => setNudge(null), 5200);

    return () => window.clearTimeout(timeout);
  }, [nudge]);

  if (!nudge) {
    return null;
  }

  return (
    <aside
      aria-live="polite"
      className={cn("learner-progress-nudge", nudge.kind === "engagement" && "is-engagement")}
      role="status"
    >
      <div className="learner-progress-sparkles" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <span className="eyebrow">{nudge.kind === "badge" ? "Progression" : "Engagement"}</span>
        <strong>{nudge.title}</strong>
        <p>{nudge.body}</p>
      </div>
      <button aria-label="Fermer la célébration" className="learner-progress-close" onClick={() => setNudge(null)} type="button">
        x
      </button>
    </aside>
  );
}
