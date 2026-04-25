import { type BadgeTone } from "@/lib/platform-display";
import { formatTimeOnly } from "@/lib/platform-data-utils";

export type CoachingSessionStatus = "planned" | "completed" | "cancelled";

export function getCoachingSessionStatusLabel(status: CoachingSessionStatus) {
  switch (status) {
    case "completed":
      return "réalisée";
    case "cancelled":
      return "annulée";
    default:
      return "planifiée";
  }
}

export function getCoachingSessionStatusTone(status: string): BadgeTone {
  if (status === "completed") {
    return "success";
  }

  if (status === "cancelled") {
    return "warning";
  }

  return "accent";
}

export function getCoachingSessionTimeLabel(startsAt: string | null, endsAt?: string | null) {
  return `${formatTimeOnly(startsAt)}${endsAt ? ` → ${formatTimeOnly(endsAt)}` : ""}`;
}

export function getCoachingSessionHref(sessionId: string) {
  return `/coach/sessions/${sessionId}`;
}

export function getCoachingSessionNeedsNote({
  status,
  timestamp,
  noteCount,
  now = Date.now()
}: {
  status: string;
  timestamp: number;
  noteCount: number;
  now?: number;
}) {
  return status !== "cancelled" && timestamp < now && noteCount === 0;
}

export function getAgendaSessionNextAction({
  videoLink,
  timestamp,
  status,
  now = Date.now()
}: {
  videoLink: string | null;
  timestamp: number;
  status: string;
  now?: number;
}) {
  if (videoLink && timestamp >= now) {
    return "Le lien de séance est prêt: tu peux rejoindre ou préparer ce rendez-vous depuis l'agenda.";
  }

  if (videoLink) {
    return "La séance est passée mais le lien reste utile pour reprendre le contexte.";
  }

  if (status === "planned") {
    return "La séance est planifiée mais le lien n'est pas encore renseigné.";
  }

  if (status === "completed") {
    return "La séance est terminée: tu peux relire le contexte avant la suite.";
  }

  return "Vérifie le statut de cette séance avant de relancer le fil pédagogique.";
}
