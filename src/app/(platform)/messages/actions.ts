"use server";

import { revalidatePath } from "next/cache";

import { createAuditEvent } from "@/lib/audit";
import { coachCanAccessCoachee, getAssignedCoachIdsForCoachee } from "@/lib/coach-assignments";
import { requireRole, type AppRole } from "@/lib/auth";
import { createNotifications } from "@/lib/platform-events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProfileWithRoles = {
  id: string;
  first_name: string;
  last_name: string;
  user_roles?: Array<{ role: AppRole }>;
};

export type MessageActionState = {
  error?: string;
  message?: {
    id: string;
    conversationId: string;
    senderId: string;
    recipientId: string;
    body: string;
    createdAt: string;
    readAt: string | null;
  };
  success?: string;
  conversationId?: string;
  recipientId?: string;
};

export type CoachConversationNoteActionState = {
  conversationId?: string;
  error?: string;
  note?: {
    body: string;
    nextFollowUpAt: string | null;
    updatedAt: string;
  } | null;
  success?: string;
};

const initialError = "La messagerie ECCE est réservée aux échanges entre coach et coaché.";

function ok(payload: Omit<MessageActionState, "error">): MessageActionState {
  return payload;
}

function fail(error: string): MessageActionState {
  return { error };
}

function okNote(payload: Omit<CoachConversationNoteActionState, "error">): CoachConversationNoteActionState {
  return payload;
}

function failNote(error: string): CoachConversationNoteActionState {
  return { error };
}

function parseFollowUpDate(value: string) {
  if (!value) {
    return { value: null };
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return {
      value: null,
      error: "La date de relance interne est invalide."
    };
  }

  return { value: parsed.toISOString() };
}

export async function updateCoachConversationNoteAction(
  _prevState: CoachConversationNoteActionState,
  formData: FormData
): Promise<CoachConversationNoteActionState> {
  const context = await requireRole(["coach"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const conversationId = String(formData.get("conversation_id") ?? "").trim();
  const body = String(formData.get("note_body") ?? "").trim();
  const followUpInput = String(formData.get("next_follow_up_at") ?? "").trim();
  const shouldDelete = String(formData.get("delete_note") ?? "").trim() === "true";

  if (!conversationId) {
    return failNote("La conversation à annoter est introuvable.");
  }

  const conversationResult = await admin
    .from("coach_conversations")
    .select("id, coach_id, coachee_id, organization_id")
    .eq("organization_id", organizationId)
    .eq("coach_id", context.user.id)
    .eq("id", conversationId)
    .maybeSingle<{
      id: string;
      coach_id: string;
      coachee_id: string;
      organization_id: string;
    }>();

  if (conversationResult.error || !conversationResult.data) {
    return failNote("Cette conversation n'est pas dans ton portefeuille coach.");
  }

  if (shouldDelete || !body) {
    const deleteResult = await admin
      .from("coach_conversation_notes")
      .delete()
      .eq("organization_id", organizationId)
      .eq("conversation_id", conversationId)
      .eq("coach_id", context.user.id);

    if (deleteResult.error) {
      return failNote(deleteResult.error.message);
    }

    await createAuditEvent({
      organizationId,
      actorId: context.user.id,
      category: "delivery",
      action: "messaging.internal_note.deleted",
      summary: "Note interne de conversation retirée.",
      targetType: "coach_conversation",
      targetId: conversationId,
      targetUserId: conversationResult.data.coachee_id,
      highlights: ["note interne", "coach uniquement"]
    });

    revalidatePath("/messages");
    revalidatePath("/coach");

    return okNote({
      conversationId,
      note: null,
      success: "Note interne retirée."
    });
  }

  const followUp = parseFollowUpDate(followUpInput);

  if (followUp.error) {
    return failNote(followUp.error);
  }

  const noteResult = await admin
    .from("coach_conversation_notes")
    .upsert(
      {
        organization_id: organizationId,
        conversation_id: conversationId,
        coach_id: context.user.id,
        body,
        next_follow_up_at: followUp.value
      },
      {
        onConflict: "conversation_id,coach_id"
      }
    )
    .select("body, next_follow_up_at, updated_at")
    .single<{
      body: string;
      next_follow_up_at: string | null;
      updated_at: string;
    }>();

  if (noteResult.error || !noteResult.data) {
    return failNote(noteResult.error?.message ?? "Impossible d'enregistrer la note interne.");
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "delivery",
    action: "messaging.internal_note.updated",
    summary: "Note interne de conversation mise à jour.",
    targetType: "coach_conversation",
    targetId: conversationId,
    targetUserId: conversationResult.data.coachee_id,
    highlights: [
      followUp.value ? "relance planifiée" : "sans relance",
      `${body.length} caractère(s)`
    ]
  });

  revalidatePath("/messages");
  revalidatePath("/coach");

  return okNote({
    conversationId,
    note: {
      body: noteResult.data.body,
      nextFollowUpAt: noteResult.data.next_follow_up_at,
      updatedAt: noteResult.data.updated_at
    },
    success: "Note interne enregistrée."
  });
}

export async function sendConversationMessageAction(
  _prevState: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const context = await requireRole(["coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const recipientId = String(formData.get("recipient_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!recipientId || !body) {
    return fail("Choisis un destinataire et saisis un message.");
  }

  if (recipientId === context.user.id) {
    return fail("Tu ne peux pas t'envoyer un message à toi-même.");
  }

  const recipientResult = await admin
    .from("profiles")
    .select("id, first_name, last_name, user_roles(role)")
    .eq("organization_id", organizationId)
    .eq("id", recipientId)
    .maybeSingle<ProfileWithRoles>();

  if (recipientResult.error || !recipientResult.data) {
    return fail("Destinataire introuvable dans l'organisation ECCE.");
  }

  const recipientRoles = new Set((recipientResult.data.user_roles ?? []).map((item) => item.role));
  const senderIsCoach = context.roles.includes("coach");
  const senderIsCoachee = context.roles.includes("coachee");

  let coachId: string | null = null;
  let coacheeId: string | null = null;
  let recipientRoute = "/messages";

  if (senderIsCoach && recipientRoles.has("coachee")) {
    const canAccess = await coachCanAccessCoachee({
      organizationId,
      coachId: context.user.id,
      coacheeId: recipientId
    });

    if (!canAccess) {
      return fail("Ce coaché n'est pas dans ton portefeuille.");
    }

    coachId = context.user.id;
    coacheeId = recipientId;
    recipientRoute = "/messages";
  } else if (senderIsCoachee && recipientRoles.has("coach")) {
    const assignedCoachIds = await getAssignedCoachIdsForCoachee({
      organizationId,
      coacheeId: context.user.id
    });

    if (!assignedCoachIds.includes(recipientId)) {
      return fail("Ce coach n'est pas rattaché à ton parcours.");
    }

    coachId = recipientId;
    coacheeId = context.user.id;
    recipientRoute = "/messages";
  } else {
    return fail(initialError);
  }

  const conversationResult = await admin
    .from("coach_conversations")
    .upsert(
      {
        organization_id: organizationId,
        coach_id: coachId,
        coachee_id: coacheeId,
        created_by: context.user.id
      },
      {
        onConflict: "organization_id,coach_id,coachee_id",
        ignoreDuplicates: false
      }
    )
    .select("id")
    .single<{ id: string }>();

  if (conversationResult.error || !conversationResult.data) {
    return fail(conversationResult.error?.message ?? "Impossible d'ouvrir cette conversation.");
  }

  const conversationId = conversationResult.data.id;

  const messageResult = await admin
    .from("coach_messages")
    .insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      sender_id: context.user.id,
      recipient_id: recipientId,
      body
    })
    .select("id, conversation_id, sender_id, recipient_id, body, created_at, read_at")
    .single<{
      id: string;
      conversation_id: string;
      sender_id: string;
      recipient_id: string;
      body: string;
      created_at: string;
      read_at: string | null;
    }>();

  if (messageResult.error || !messageResult.data) {
    return fail(messageResult.error?.message ?? "Impossible d'envoyer le message.");
  }

  await createNotifications([
    {
      organizationId,
      recipientId,
      actorId: context.user.id,
      kind: "message" as const,
      title: "Nouveau message ECCE",
      body: `${context.profile.first_name} ${context.profile.last_name} t'a envoyé un message.`,
      deeplink: `${recipientRoute}?conversation=${conversationId}`
    }
  ]);

  revalidatePath("/coach");
  revalidatePath("/dashboard");
  revalidatePath("/messages");

  return ok({
    success: "Message envoyé.",
    conversationId,
    message: {
      id: messageResult.data.id,
      conversationId: messageResult.data.conversation_id,
      senderId: messageResult.data.sender_id,
      recipientId: messageResult.data.recipient_id,
      body: messageResult.data.body,
      createdAt: messageResult.data.created_at,
      readAt: messageResult.data.read_at
    },
    recipientId
  });
}
