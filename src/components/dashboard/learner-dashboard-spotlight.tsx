import Link from "next/link";

import { EngagementMeter } from "@/components/platform/engagement-meter";
import { Badge } from "@/components/ui/badge";

export function LearnerDashboardSpotlight({
  profileName,
  cohortLabels,
  coachCount,
  publishedContentCount,
  publishedQuizCount,
  engagement,
  nextSession,
  focusAssignment
}: {
  profileName: string;
  cohortLabels: string[];
  coachCount: number;
  publishedContentCount: number;
  publishedQuizCount: number;
  engagement: {
    band: "strong" | "watch" | "risk";
    bandLabel: string;
    score: number;
    trend: "up" | "down" | "steady";
    trendLabel: string;
    nextFocus: string;
    completionRate: number | null;
    onTimeRate: number | null;
    averageQuizScore: number | null;
    unreadNotifications: number;
  };
  nextSession: {
    date: string;
    videoLink: string | null;
    emphasis: string;
  } | null;
  focusAssignment: {
    title: string;
    href?: string | null;
    ctaLabel?: string | null;
    due: string;
    statusLabel: string;
  } | null;
}) {
  return (
    <section className="learner-spotlight-shell">
      <div className="panel panel-accent learner-spotlight-hero">
        <div className="learner-spotlight-copy">
          <span className="eyebrow">Learner Hub</span>
          <h3>{profileName}, voilà ton espace de progression du moment</h3>
          <p>
            {engagement.nextFocus}
            {cohortLabels.length ? ` · Parcours ${cohortLabels.join(", ")}` : ""}
          </p>

          <div className="tag-row">
            <Badge tone={engagement.band === "strong" ? "success" : engagement.band === "risk" ? "warning" : "accent"}>
              {engagement.bandLabel}
            </Badge>
            <Badge tone="neutral">{coachCount} coach{coachCount > 1 ? "s" : ""} attribué{coachCount > 1 ? "s" : ""}</Badge>
          </div>

          <div className="learner-spotlight-actions">
            {focusAssignment?.href && focusAssignment.ctaLabel ? (
              <Link className="button" href={focusAssignment.href}>
                {focusAssignment.ctaLabel}
              </Link>
            ) : null}
            <Link className="button button-secondary" href="/library">
              Explorer la bibliothèque
            </Link>
            {nextSession?.videoLink ? (
              <Link className="button button-secondary" href={nextSession.videoLink} target="_blank">
                Rejoindre la prochaine séance
              </Link>
            ) : null}
          </div>
        </div>

        <div className="learner-spotlight-meter">
          <EngagementMeter
            band={engagement.band}
            bandLabel={engagement.bandLabel}
            caption={engagement.nextFocus}
            score={engagement.score}
            trend={engagement.trend}
            trendLabel={engagement.trendLabel}
          />
        </div>
      </div>

      <div className="learner-spotlight-grid">
        <article className="learner-spotlight-card">
          <strong>Mission du moment</strong>
          <p>{focusAssignment ? focusAssignment.title : "Aucune mission urgente pour l’instant."}</p>
          <small>{focusAssignment ? `${focusAssignment.statusLabel} · ${focusAssignment.due}` : "Le studio ECCE te signalera ici la prochaine priorité."}</small>
        </article>

        <article className="learner-spotlight-card">
          <strong>Prochaine séance</strong>
          <p>{nextSession ? nextSession.date : "Aucune séance planifiée"}</p>
          <small>{nextSession ? `${nextSession.emphasis} séance visible dans ton parcours.` : "Quand ton coach planifiera un créneau, il apparaîtra ici."}</small>
        </article>

        <article className="learner-spotlight-card">
          <strong>Ressources disponibles</strong>
          <p>
            {publishedContentCount} contenu{publishedContentCount > 1 ? "s" : ""} · {publishedQuizCount} quiz
          </p>
          <small>La bibliothèque ECCE est prête à être parcourue sans quitter ton dashboard.</small>
        </article>

        <article className="learner-spotlight-card">
          <strong>Signal de progression</strong>
          <p>
            {engagement.completionRate !== null ? `${engagement.completionRate}% de complétion` : "Complétion en cours"} ·{" "}
            {engagement.averageQuizScore !== null ? `${engagement.averageQuizScore}% de quiz moyen` : "quiz à venir"}
          </p>
          <small>{engagement.unreadNotifications} notification(s) attendent encore ton attention.</small>
        </article>
      </div>
    </section>
  );
}
