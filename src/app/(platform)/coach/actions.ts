"use server";

import { revalidatePath } from "next/cache";

import { createNotifications } from "@/lib/platform-events";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CoachActionState = {
  error?: string;
  success?: string;
};

function ok(success: string): CoachActionState {
  return { success };
}

function fail(error: string): CoachActionState {
  return { error };
}

export async function scheduleCoachingSessionAction(
  _prevState: CoachActionState,
  formData: FormData
): Promise<CoachActionState> {
  const context = await requireRole(["admin", "coach"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const coacheeId = String(formData.get("coachee_id") ?? "").trim();
  const startsAtInput = String(formData.get("starts_at") ?? "").trim();
  const endsAtInput = String(formData.get("ends_at") ?? "").trim();
  const videoLink = String(formData.get("video_link") ?? "").trim();
  const coachIdInput = String(formData.get("coach_id") ?? "").trim();

  if (!coacheeId || !startsAtInput) {
    return fail("Le coaché et la date de session sont obligatoires.");
  }

  const coachId = context.role === "admin" && coachIdInput ? coachIdInput : context.user.id;
  const startsAt = new Date(startsAtInput).toISOString();
  const endsAt = endsAtInput ? new Date(endsAtInput).toISOString() : null;

  if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return fail("La fin de session doit etre posterieure au debut.");
  }

  const sessionInsert = await admin
    .from("coaching_sessions")
    .insert({
      organization_id: organizationId,
      coach_id: coachId,
      coachee_id: coacheeId,
      starts_at: startsAt,
      ends_at: endsAt,
      video_link: videoLink || null
    })
    .select("id")
    .single<{ id: string }>();

  if (sessionInsert.error || !sessionInsert.data) {
    return fail(sessionInsert.error?.message ?? "Impossible de planifier la session.");
  }

  await createNotifications([
    {
      organizationId,
      recipientId: coacheeId,
      actorId: context.user.id,
      title: "Nouvelle séance de coaching",
      body: `Une séance a été planifiée pour le ${new Date(startsAt).toLocaleString("fr-FR")}.`,
      deeplink: "/dashboard"
    }
  ]);

  revalidatePath("/coach");
  revalidatePath("/dashboard");

  return ok("Séance de coaching planifiée.");
}

export async function reviewSubmissionAction(
  _prevState: CoachActionState,
  formData: FormData
): Promise<CoachActionState> {
  const context = await requireRole(["admin", "coach"]);
  const admin = createSupabaseAdminClient();

  const submissionId = String(formData.get("submission_id") ?? "").trim();
  const feedback = String(formData.get("feedback") ?? "").trim();
  const gradeInput = String(formData.get("grade") ?? "").trim();
  const grade = gradeInput ? Number(gradeInput) : null;

  if (!submissionId || !feedback) {
    return fail("La soumission et le feedback sont obligatoires.");
  }

  if (gradeInput && (Number.isNaN(grade) || grade === null || grade < 0 || grade > 100)) {
    return fail("La note doit etre comprise entre 0 et 100.");
  }

  const submissionResult = await admin
    .from("submissions")
    .select("id, assignment_id, user_id, title")
    .eq("id", submissionId)
    .single<{
      id: string;
      assignment_id: string | null;
      user_id: string;
      title: string;
    }>();

  if (submissionResult.error || !submissionResult.data) {
    return fail(submissionResult.error?.message ?? "Soumission introuvable.");
  }

  const { error: reviewError } = await admin.from("submission_reviews").insert({
    submission_id: submissionId,
    reviewer_id: context.user.id,
    grade,
    feedback
  });

  if (reviewError) {
    return fail(reviewError.message);
  }

  const { error: submissionError } = await admin
    .from("submissions")
    .update({
      status: "reviewed",
      reviewed_at: new Date().toISOString()
    })
    .eq("id", submissionId);

  if (submissionError) {
    return fail(submissionError.message);
  }

  await createNotifications([
    {
      organizationId: context.profile.organization_id,
      recipientId: submissionResult.data.user_id,
      actorId: context.user.id,
      title: "Ta soumission a été relue",
      body: grade !== null
        ? `${submissionResult.data.title} a reçu la note ${grade}/100.`
        : `${submissionResult.data.title} a reçu un nouveau feedback coach.`,
      deeplink: submissionResult.data.assignment_id
        ? `/assignments/${submissionResult.data.assignment_id}`
        : "/dashboard"
    }
  ]);

  revalidatePath("/coach");
  revalidatePath("/dashboard");

  if (submissionResult.data.assignment_id) {
    revalidatePath(`/assignments/${submissionResult.data.assignment_id}`);
  }

  return ok("Feedback envoyé au coaché.");
}
