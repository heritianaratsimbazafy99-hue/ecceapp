export type NotificationOpsItem = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  deeplink?: string | null;
};

export const NOTIFICATION_OPS_LANES = ["action", "review", "cleared"] as const;

export type NotificationOpsLane = (typeof NOTIFICATION_OPS_LANES)[number];
export type NotificationOpsCategory =
  | "messages"
  | "learning"
  | "programs"
  | "coaching"
  | "rewards"
  | "system";
export type NotificationOpsTone = "neutral" | "accent" | "warning" | "success";
export type NotificationOpsRole = "admin" | "professor" | "coach" | "coachee";

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function getNotificationText(item: Pick<NotificationOpsItem, "title" | "body" | "deeplink">) {
  return [item.title, item.body, item.deeplink].filter(Boolean).join(" ").toLowerCase();
}

export function isNotificationOpsLane(value: string | null | undefined): value is NotificationOpsLane {
  return NOTIFICATION_OPS_LANES.includes(value as NotificationOpsLane);
}

export function getNotificationOpsCategory(item: NotificationOpsItem): NotificationOpsCategory {
  const route = item.deeplink?.split("?")[0] ?? "";
  const text = getNotificationText(item);

  if (
    route.startsWith("/messages") ||
    includesAny(text, ["message", "conversation", "inbox", "fil"])
  ) {
    return "messages";
  }

  if (
    route.startsWith("/quiz") ||
    route.startsWith("/assignments") ||
    includesAny(text, ["quiz", "soumission", "feedback", "deadline", "review", "assignation"])
  ) {
    return "learning";
  }

  if (route.startsWith("/programs") || includesAny(text, ["parcours", "programme", "module"])) {
    return "programs";
  }

  if (
    route.startsWith("/agenda") ||
    route.startsWith("/coach") ||
    includesAny(text, ["seance", "séance", "coaching", "coach", "rendez-vous", "session"])
  ) {
    return "coaching";
  }

  if (includesAny(text, ["badge", "reward", "recompense", "récompense", "jalon"])) {
    return "rewards";
  }

  return "system";
}

export function getNotificationOpsCategoryLabel(category: NotificationOpsCategory) {
  switch (category) {
    case "messages":
      return "Messagerie";
    case "learning":
      return "Learning ops";
    case "programs":
      return "Parcours";
    case "coaching":
      return "Coaching";
    case "rewards":
      return "Récompense";
    default:
      return "Signal ECCE";
  }
}

export function getNotificationOpsLane(item: NotificationOpsItem, now = Date.now()): NotificationOpsLane {
  const createdAt = new Date(item.created_at).getTime();
  const ageHours = Number.isNaN(createdAt) ? 999 : Math.max(0, (now - createdAt) / (60 * 60 * 1000));
  const isUnread = !item.read_at;
  const isActionable = Boolean(item.deeplink);

  if (isUnread && isActionable) {
    return "action";
  }

  if (isUnread || (isActionable && ageHours <= 72) || ageHours <= 24) {
    return "review";
  }

  return "cleared";
}

export function getNotificationOpsLaneLabel(lane: NotificationOpsLane) {
  switch (lane) {
    case "action":
      return "Action immediate";
    case "review":
      return "A suivre";
    default:
      return "Archive utile";
  }
}

export function getNotificationOpsNavigation(
  category: NotificationOpsCategory,
  role: NotificationOpsRole
) {
  switch (category) {
    case "messages":
      return {
        href: "/messages",
        label: "Ouvrir messages"
      };
    case "learning":
      return {
        href: role === "admin" || role === "professor" ? "/admin/assignments" : "/dashboard",
        label: role === "admin" || role === "professor" ? "Ouvrir le cockpit" : "Ouvrir le dashboard"
      };
    case "programs":
      return {
        href: role === "admin" || role === "professor" ? "/admin/programs" : "/programs",
        label: role === "admin" || role === "professor" ? "Ouvrir les parcours" : "Voir mes parcours"
      };
    case "coaching":
      return {
        href: "/agenda",
        label: "Ouvrir l'agenda"
      };
    case "rewards":
      return {
        href: "/dashboard",
        label: "Voir le dashboard"
      };
    default:
      return {
        href: "/account",
        label: "Voir mes preferences"
      };
  }
}

export function summarizeNotificationOps(item: NotificationOpsItem, now = Date.now()) {
  const category = getNotificationOpsCategory(item);
  const lane = getNotificationOpsLane(item, now);
  const isUnread = !item.read_at;
  const isActionable = Boolean(item.deeplink);
  const createdAt = new Date(item.created_at).getTime();
  const ageHours = Number.isNaN(createdAt) ? 999 : Math.max(0, (now - createdAt) / (60 * 60 * 1000));

  const tone: NotificationOpsTone =
    lane === "action"
      ? category === "rewards"
        ? "success"
        : "warning"
      : lane === "review"
        ? isActionable
          ? "accent"
          : "neutral"
        : "success";

  const nextAction = (() => {
    if (!isActionable) {
      return isUnread
        ? "Lire l'alerte et decider si un suivi manuel est utile."
        : "Conserver ce signal comme repere, sans action immediate.";
    }

    switch (category) {
      case "messages":
        return "Ouvrir le fil et repondre si un point reste bloque.";
      case "learning":
        return "Ouvrir l'assignation, le quiz ou la review rattachee.";
      case "programs":
        return "Reprendre le parcours ou le module signale.";
      case "coaching":
        return "Verifier la seance ou le contexte coach associe.";
      case "rewards":
        return "Constater le jalon debloque puis relancer le prochain elan.";
      default:
        return "Ouvrir le point associe dans ECCE pour garder le contexte.";
    }
  })();

  const categoryPriority =
    category === "messages"
      ? 0
      : category === "learning"
        ? 1
        : category === "coaching"
          ? 2
          : category === "programs"
            ? 3
            : category === "rewards"
              ? 4
              : 5;
  const lanePriority = lane === "action" ? 0 : lane === "review" ? 1 : 2;
  const priorityRank =
    lanePriority * 1000 +
    categoryPriority * 100 +
    (isUnread ? 0 : 20) +
    (isActionable ? 0 : 10) +
    Math.min(Math.round(ageHours), 99);

  return {
    category,
    categoryLabel: getNotificationOpsCategoryLabel(category),
    lane,
    laneLabel: getNotificationOpsLaneLabel(lane),
    tone,
    isUnread,
    isActionable,
    ageHours,
    nextAction,
    priorityRank
  };
}
