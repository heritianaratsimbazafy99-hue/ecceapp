import type { SupabaseClient } from "@supabase/supabase-js";

import { formatMessagePreview, type AgendaLane, type BadgeTone } from "@/lib/platform-display";
import {
  buildCoachMessageDraftHref,
  formatDate,
  getCoachFollowUpSuggestionAt,
  getDateValue,
  getRelativeDayLabel
} from "@/lib/platform-data-utils";
import type { CoachConversationNoteRow } from "@/lib/platform-messaging";

export type CoachFollowUpConversationRow = {
  id: string;
  coachee_id: string;
};

export type CoachFollowUpUrgency = "overdue" | "today" | "upcoming";

type CoachFollowUpState = "overdue" | "soon" | "planned";

export async function getCoachFollowUpNotesWithConversations({
  admin,
  organizationId,
  coachId,
  limit,
  rangeEndIso
}: {
  admin: SupabaseClient;
  organizationId: string;
  coachId: string;
  limit: number;
  rangeEndIso?: string | null;
}) {
  let followUpNotesQuery = admin
    .from("coach_conversation_notes")
    .select("conversation_id, body, next_follow_up_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("coach_id", coachId)
    .not("next_follow_up_at", "is", null);

  if (rangeEndIso) {
    followUpNotesQuery = followUpNotesQuery.lte("next_follow_up_at", rangeEndIso);
  }

  const followUpNotesResult = await followUpNotesQuery
    .order("next_follow_up_at", { ascending: true })
    .limit(limit);
  const notes = followUpNotesResult.error
    ? []
    : ((followUpNotesResult.data ?? []) as CoachConversationNoteRow[]);
  const conversationIds = notes.map((note) => note.conversation_id);
  const conversationsResult = conversationIds.length
    ? await admin
        .from("coach_conversations")
        .select("id, coachee_id")
        .eq("organization_id", organizationId)
        .eq("coach_id", coachId)
        .in("id", conversationIds)
    : { data: [] as CoachFollowUpConversationRow[] };
  const conversationById = new Map(
    ((conversationsResult.data ?? []) as CoachFollowUpConversationRow[]).map((conversation) => [
      conversation.id,
      conversation
    ])
  );

  return {
    notes,
    conversationById
  };
}

export function getCoachFollowUpDashboardTiming(dateString: string | null, now = Date.now()) {
  const dueValue = getDateValue(dateString);
  const nextDay = now + 24 * 60 * 60 * 1000;
  const urgency: CoachFollowUpUrgency =
    dueValue !== null && dueValue < now
      ? "overdue"
      : dueValue !== null && dueValue <= nextDay
        ? "today"
        : "upcoming";
  const tone: BadgeTone = urgency === "overdue" ? "warning" : urgency === "today" ? "accent" : "neutral";

  return {
    dueValue,
    urgency,
    tone,
    dueLabel: urgency === "overdue" ? "En retard" : getRelativeDayLabel(dateString, now),
    sortValue: dueValue ?? Number.MAX_SAFE_INTEGER
  };
}

export function getCoachFollowUpUrgencyFromAgendaLane(lane: AgendaLane): CoachFollowUpUrgency {
  return lane === "urgent" ? "overdue" : lane === "today" ? "today" : "upcoming";
}

export function buildCoachFollowUpDraft({
  conversationId,
  recipientId,
  learnerName,
  body,
  urgency,
  noteActionLabel,
  now = Date.now()
}: {
  conversationId: string;
  recipientId: string;
  learnerName: string;
  body: string;
  urgency: CoachFollowUpUrgency;
  noteActionLabel: string;
  now?: number;
}) {
  const nextFollowUpAt = getCoachFollowUpSuggestionAt(getCoachFollowUpState(urgency), now);
  const messageHref = buildCoachMessageDraftHref({
    conversationId,
    recipientId,
    draftLines: [
      `Bonjour ${learnerName},`,
      "Je reviens vers toi comme prévu sur notre dernier point de suivi.",
      `Contexte rapide : ${formatMessagePreview(body)}`,
      getCoachFollowUpPrompt(urgency)
    ],
    noteLines: [body, `${noteActionLabel} le ${formatDate(new Date(now).toISOString())}.`],
    followUpAt: nextFollowUpAt
  });

  return {
    messageHref,
    nextFollowUpAt
  };
}

function getCoachFollowUpState(urgency: CoachFollowUpUrgency): CoachFollowUpState {
  return urgency === "overdue" ? "overdue" : urgency === "today" ? "soon" : "planned";
}

function getCoachFollowUpPrompt(urgency: CoachFollowUpUrgency) {
  if (urgency === "overdue") {
    return "La relance prévue est dépassée : dis-moi ce qui bloque et la prochaine action que tu peux poser aujourd'hui.";
  }

  if (urgency === "today") {
    return "Je voulais faire le point aujourd'hui : où en es-tu et quelle action peux-tu confirmer ?";
  }

  return "Je prépare notre prochain point : dis-moi où tu en es pour que je t'aide à garder le rythme.";
}
