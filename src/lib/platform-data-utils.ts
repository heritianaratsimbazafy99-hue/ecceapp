export type DataTone = "neutral" | "accent" | "warning" | "success";

export function formatDate(dateString: string | null) {
  if (!dateString) {
    return "Aucune échéance";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateString));
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 Mo";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} Mo`;
  }

  return `${Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10} Go`;
}

export function formatDateCompact(dateString: string | null) {
  if (!dateString) {
    return "Date non définie";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long"
  }).format(new Date(dateString));
}

export function formatTimeOnly(dateString: string | null) {
  if (!dateString) {
    return "Heure libre";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    timeStyle: "short"
  }).format(new Date(dateString));
}

export function getDateValue(dateString: string | null | undefined) {
  if (!dateString) {
    return null;
  }

  const value = new Date(dateString).getTime();
  return Number.isNaN(value) ? null : value;
}

export function getRelativeDayLabel(dateString: string | null, now = Date.now()) {
  if (!dateString) {
    return "À planifier";
  }

  const targetDate = new Date(dateString);
  const today = new Date(now);
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).getTime();
  const diffDays = Math.round((targetStart - dayStart) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return "Aujourd'hui";
  }

  if (diffDays === 1) {
    return "Demain";
  }

  if (diffDays === -1) {
    return "Hier";
  }

  return formatDateCompact(dateString);
}

export function getDeadlineState(dateString: string | null | undefined, completed = false, now = Date.now()) {
  if (completed) {
    return "done" as const;
  }

  const value = getDateValue(dateString);

  if (value === null) {
    return "open" as const;
  }

  if (value < now) {
    return "overdue" as const;
  }

  if (value <= now + 7 * 24 * 60 * 60 * 1000) {
    return "soon" as const;
  }

  return "planned" as const;
}

export function getDeadlineStateLabel(state: ReturnType<typeof getDeadlineState>) {
  switch (state) {
    case "done":
      return "terminé";
    case "overdue":
      return "en retard";
    case "soon":
      return "à venir";
    case "planned":
      return "planifié";
    default:
      return "sans deadline";
  }
}

export function getDeadlineStateTone(state: ReturnType<typeof getDeadlineState>): DataTone {
  switch (state) {
    case "done":
      return "success";
    case "overdue":
      return "warning";
    case "soon":
      return "accent";
    case "planned":
      return "neutral";
    default:
      return "neutral";
  }
}

export function getCoachFollowUpSuggestionAt(state: ReturnType<typeof getDeadlineState>, now = Date.now()) {
  const delayDays = state === "overdue" ? 1 : state === "soon" ? 2 : 5;
  return new Date(now + delayDays * 24 * 60 * 60 * 1000).toISOString();
}

export function buildCoachMessageDraftHref({
  conversationId,
  recipientId,
  draftLines,
  noteLines,
  followUpAt
}: {
  conversationId?: string | null;
  recipientId: string;
  draftLines: string[];
  noteLines?: string[];
  followUpAt?: string | null;
}) {
  const searchParams = new URLSearchParams({
    recipient: recipientId,
    draft: draftLines.join("\n\n")
  });

  if (conversationId) {
    searchParams.set("conversation", conversationId);
  }

  if (noteLines?.length) {
    searchParams.set("note", noteLines.join("\n"));
  }

  if (followUpAt) {
    searchParams.set("followUp", followUpAt);
  }

  return `/messages?${searchParams.toString()}#messages-hub`;
}

export function normalizeDataSearchQuery(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/[^\p{L}\p{N}\s@._-]/gu, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function matchesDataSearch(values: Array<string | null | undefined>, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  const haystack = values.join(" ").toLowerCase();
  return haystack.includes(normalizedQuery.toLowerCase());
}

export function getDataPage(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export function paginateDataItems<T>(items: T[], pageValue: string | number | null | undefined, pageSize: number) {
  const totalItems = items.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const requestedPage = getDataPage(pageValue);
  const page = Math.min(requestedPage, totalPages);
  const startIndex = (page - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: pageItems,
    pageInfo: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      from: totalItems ? startIndex + 1 : 0,
      to: totalItems ? startIndex + pageItems.length : 0
    }
  };
}

export function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundMetric(value: number) {
  return Math.round(value);
}

export function isWithinDays(dateString: string | null | undefined, days: number, now = Date.now()) {
  const value = getDateValue(dateString);

  if (value === null) {
    return false;
  }

  return value <= now && value >= now - days * 24 * 60 * 60 * 1000;
}

export function getDaysSince(dateString: string | null | undefined, now = Date.now()) {
  const value = getDateValue(dateString);

  if (value === null) {
    return null;
  }

  return Math.floor((now - value) / (24 * 60 * 60 * 1000));
}

export function formatLastActivity(dateString: string | null | undefined) {
  const daysSince = getDaysSince(dateString);

  if (daysSince === null) {
    return "Aucune activité détectée";
  }

  if (daysSince <= 0) {
    return "Actif aujourd'hui";
  }

  if (daysSince === 1) {
    return "Actif hier";
  }

  if (daysSince < 7) {
    return `Actif il y a ${daysSince} jours`;
  }

  return `Dernière activité ${formatDate(dateString ?? null)}`;
}
