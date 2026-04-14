import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type NotificationInput = {
  organizationId: string;
  recipientId: string;
  actorId?: string | null;
  title: string;
  body?: string | null;
  deeplink?: string | null;
  channel?: "in_app" | "email";
};

const FIRST_SUCCESS_BADGE = {
  slug: "premier-quiz-valide",
  title: "Premier quiz valide",
  description: "Attribué lors de la première réussite à un quiz ECCE.",
  icon: "spark"
};

export async function createNotifications(notifications: NotificationInput[]) {
  if (!notifications.length) {
    return;
  }

  const admin = createSupabaseAdminClient();

  await admin.from("notifications").insert(
    notifications.map((notification) => ({
      organization_id: notification.organizationId,
      recipient_id: notification.recipientId,
      actor_id: notification.actorId ?? null,
      title: notification.title,
      body: notification.body ?? null,
      deeplink: notification.deeplink ?? null,
      channel: notification.channel ?? "in_app"
    }))
  );
}

export async function getAssignmentRecipientIds(
  organizationId: string,
  assignment: {
    assigned_user_id?: string | null;
    cohort_id?: string | null;
  }
) {
  const admin = createSupabaseAdminClient();
  const recipients = new Set<string>();

  if (assignment.assigned_user_id) {
    recipients.add(assignment.assigned_user_id);
  }

  if (assignment.cohort_id) {
    const { data } = await admin
      .from("cohort_members")
      .select("user_id")
      .eq("cohort_id", assignment.cohort_id);

    for (const member of data ?? []) {
      recipients.add(member.user_id);
    }
  }

  const memberIds = Array.from(recipients);

  if (!memberIds.length) {
    return [];
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", memberIds);

  return (profiles ?? []).map((profile) => profile.id);
}

export async function getOrganizationStaffIds(organizationId: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("user_roles")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .in("role", ["admin", "coach", "professor"]);

  return Array.from(new Set((data ?? []).map((item) => item.user_id)));
}

export async function awardQuizBadge(input: {
  organizationId: string;
  userId: string;
  quizAttemptId: string;
  score: number;
  passingScore: number | null;
}) {
  if (input.passingScore !== null && input.score < input.passingScore) {
    return null;
  }

  const admin = createSupabaseAdminClient();

  const badgeUpsert = await admin
    .from("badges")
    .upsert(
      {
        organization_id: input.organizationId,
        slug: FIRST_SUCCESS_BADGE.slug,
        title: FIRST_SUCCESS_BADGE.title,
        description: FIRST_SUCCESS_BADGE.description,
        icon: FIRST_SUCCESS_BADGE.icon
      },
      {
        onConflict: "organization_id,slug",
        ignoreDuplicates: false
      }
    )
    .select("id, title")
    .maybeSingle<{ id: string; title: string }>();

  if (badgeUpsert.error || !badgeUpsert.data) {
    return null;
  }

  const badgeInsert = await admin
    .from("user_badges")
    .insert({
      badge_id: badgeUpsert.data.id,
      user_id: input.userId,
      source_quiz_attempt_id: input.quizAttemptId
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (badgeInsert.error || !badgeInsert.data) {
    return null;
  }

  return badgeUpsert.data.title;
}
