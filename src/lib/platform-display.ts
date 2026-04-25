import type { AppRole } from "@/lib/auth";
import { getDaysSince } from "@/lib/platform-data-utils";

export type BadgeTone = "neutral" | "accent" | "warning" | "success";
export type MessageInboxLane = "reply" | "watch" | "aligned";
export type AdminProgramLane = "priority" | "scaffold" | "draft" | "active";
export type AgendaLane = "urgent" | "today" | "upcoming" | "recent";
export type AgendaScope = "sessions" | "deadlines" | "followups";
export type LearnerProgramLane = "urgent" | "momentum" | "launch" | "completed";
export type LearnerProgressLane = "badge" | "quiz" | "content" | "program" | "coaching";

type ProfileName = {
  first_name: string;
  last_name: string;
};

export function getSubmissionStatusLabel(status: string) {
  switch (status) {
    case "reviewed":
      return "corrigé";
    case "submitted":
      return "envoyé";
    case "draft":
      return "brouillon";
    default:
      return status;
  }
}

export function getSubmissionStatusTone(status: string): BadgeTone {
  switch (status) {
    case "reviewed":
      return "success";
    case "submitted":
      return "accent";
    case "draft":
      return "neutral";
    default:
      return "warning";
  }
}

export function formatUserName(user: ProfileName) {
  return `${user.first_name} ${user.last_name}`.trim();
}

export function getAppRoleLabel(role: AppRole) {
  switch (role) {
    case "admin":
      return "Admin";
    case "professor":
      return "Professor";
    case "coach":
      return "Coach";
    case "coachee":
      return "Coaché";
    default:
      return role;
  }
}

export function getCommunityRoleTone(roles: AppRole[]): BadgeTone {
  if (roles.includes("admin")) {
    return "warning";
  }

  if (roles.includes("professor")) {
    return "accent";
  }

  if (roles.includes("coach")) {
    return "success";
  }

  return "neutral";
}

export function getProgramProgressTone(progress: number): BadgeTone {
  if (progress >= 100) {
    return "success";
  }

  if (progress >= 60) {
    return "accent";
  }

  if (progress > 0) {
    return "warning";
  }

  return "neutral";
}

export function isAdminProgramLane(value: string | null | undefined): value is AdminProgramLane {
  return ["priority", "scaffold", "draft", "active"].includes(value ?? "");
}

export function getAdminProgramLaneLabel(lane: AdminProgramLane) {
  switch (lane) {
    case "priority":
      return "A activer";
    case "scaffold":
      return "A brancher";
    case "draft":
      return "A finaliser";
    default:
      return "Deja deploye";
  }
}

export function getAdminProgramLaneTone(lane: AdminProgramLane): BadgeTone {
  switch (lane) {
    case "priority":
      return "warning";
    case "scaffold":
      return "accent";
    case "draft":
      return "neutral";
    default:
      return "success";
  }
}

export function getProgramStatusTone(status: string): BadgeTone {
  switch (status) {
    case "published":
      return "success";
    case "scheduled":
      return "accent";
    case "draft":
      return "warning";
    default:
      return "neutral";
  }
}

export function isLearnerProgramLane(value: string | null | undefined): value is LearnerProgramLane {
  return ["urgent", "momentum", "launch", "completed"].includes(value ?? "");
}

export function getLearnerProgramLaneLabel(lane: LearnerProgramLane) {
  switch (lane) {
    case "urgent":
      return "A securiser";
    case "momentum":
      return "En cours";
    case "launch":
      return "A lancer";
    default:
      return "Complete";
  }
}

export function getLearnerProgramLaneTone(lane: LearnerProgramLane): BadgeTone {
  switch (lane) {
    case "urgent":
      return "warning";
    case "momentum":
      return "accent";
    case "launch":
      return "neutral";
    default:
      return "success";
  }
}

export function isLearnerProgressLane(value: string | null | undefined): value is LearnerProgressLane {
  return ["badge", "quiz", "content", "program", "coaching"].includes(value ?? "");
}

export function getLearnerProgressLaneLabel(lane: LearnerProgressLane) {
  switch (lane) {
    case "badge":
      return "Badges";
    case "quiz":
      return "Quiz";
    case "content":
      return "Contenus";
    case "program":
      return "Parcours";
    default:
      return "Coaching";
  }
}

export function getLearnerProgressLaneTone(lane: LearnerProgressLane): BadgeTone {
  switch (lane) {
    case "badge":
      return "success";
    case "quiz":
      return "accent";
    case "content":
      return "neutral";
    case "program":
      return "warning";
    default:
      return "accent";
  }
}

export function isAgendaLane(value: string | null | undefined): value is AgendaLane {
  return ["urgent", "today", "upcoming", "recent"].includes(value ?? "");
}

export function isAgendaScope(value: string | null | undefined): value is AgendaScope {
  return ["sessions", "deadlines", "followups"].includes(value ?? "");
}

export function getAgendaLaneLabel(lane: AgendaLane) {
  switch (lane) {
    case "urgent":
      return "A securiser";
    case "today":
      return "Aujourd'hui";
    case "upcoming":
      return "A venir";
    default:
      return "Recent";
  }
}

export function getAgendaLaneTone(lane: AgendaLane): BadgeTone {
  switch (lane) {
    case "urgent":
      return "warning";
    case "today":
      return "accent";
    case "upcoming":
      return "neutral";
    default:
      return "success";
  }
}

export function formatMessagePreview(value: string | null) {
  if (!value) {
    return "Aucun message pour l'instant.";
  }

  return value.length > 96 ? `${value.slice(0, 93)}...` : value;
}

export function getMessageLaneMeta(params: {
  unreadCount: number;
  lastMessageAt: string | null;
}): {
  lane: MessageInboxLane;
  laneLabel: string;
  tone: BadgeTone;
  nextAction: string;
  priorityRank: number;
} {
  const daysSinceLastMessage = getDaysSince(params.lastMessageAt);

  if (params.unreadCount > 0) {
    return {
      lane: "reply",
      laneLabel: "Réponse attendue",
      tone: "warning",
      nextAction: "Une réponse t'attend déjà ici, mieux vaut reprendre ce fil avant qu'il se refroidisse.",
      priorityRank: 0
    };
  }

  if (daysSinceLastMessage !== null && daysSinceLastMessage > 5) {
    return {
      lane: "watch",
      laneLabel: "A relancer",
      tone: "accent",
      nextAction: "Le fil s'est calmé depuis plusieurs jours, une relance courte peut recréer le rythme.",
      priorityRank: 1
    };
  }

  return {
    lane: "aligned",
    laneLabel: "Cadencé",
    tone: "success",
    nextAction: "Le fil reste vivant et maîtrisé, garde ce tempo avec des messages courts et contextualisés.",
    priorityRank: 2
  };
}

export function getAuditHighlights(metadata: Record<string, unknown> | null | undefined) {
  const highlights = metadata?.highlights;

  if (!Array.isArray(highlights)) {
    return [];
  }

  return highlights
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 4);
}
