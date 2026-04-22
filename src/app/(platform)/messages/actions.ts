"use server";

import { revalidatePath } from "next/cache";

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
  success?: string;
  conversationId?: string;
  recipientId?: string;
};

const initialError = "La messagerie ECCE est réservée aux échanges entre coach et coaché.";

function ok(payload: Omit<MessageActionState, "error">): MessageActionState {
  return payload;
}

function fail(error: string): MessageActionState {
  return { error };
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

  const messageResult = await admin.from("coach_messages").insert({
    conversation_id: conversationId,
    organization_id: organizationId,
    sender_id: context.user.id,
    recipient_id: recipientId,
    body
  });

  if (messageResult.error) {
    return fail(messageResult.error.message);
  }

  await createNotifications([
    {
      organizationId,
      recipientId,
      actorId: context.user.id,
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
    recipientId
  });
}
