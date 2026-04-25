import { getAgendaLaneLabel, getAgendaLaneTone, type AgendaLane } from "@/lib/platform-display";
import { getDateValue, getRelativeDayLabel } from "@/lib/platform-data-utils";

export function getAgendaTiming(
  dateString: string | null,
  now = Date.now(),
  options?: {
    isOverdue?: boolean;
  }
) {
  const timestamp = getDateValue(dateString) ?? now;
  const relativeDay = getRelativeDayLabel(dateString, now);
  const isToday = relativeDay === "Aujourd'hui";
  const isOverdue = options?.isOverdue ?? timestamp < now;
  const lane: AgendaLane = isOverdue ? "urgent" : isToday ? "today" : timestamp >= now ? "upcoming" : "recent";

  return {
    timestamp,
    relativeDay,
    isToday,
    isOverdue,
    lane,
    laneLabel: getAgendaLaneLabel(lane),
    tone: getAgendaLaneTone(lane)
  };
}
