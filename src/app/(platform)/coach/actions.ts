"use server";

import { revalidatePath } from "next/cache";

import { awardQuizBadge, createNotifications } from "@/lib/platform-events";
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

export async function gradeQuizTextAttemptAction(
  _prevState: CoachActionState,
  formData: FormData
): Promise<CoachActionState> {
  const context = await requireRole(["admin", "coach"]);
  const admin = createSupabaseAdminClient();

  const attemptId = String(formData.get("attempt_id") ?? "").trim();

  if (!attemptId) {
    return fail("Tentative introuvable.");
  }

  const attemptResult = await admin
    .from("quiz_attempts")
    .select("id, quiz_id, user_id")
    .eq("id", attemptId)
    .single<{ id: string; quiz_id: string; user_id: string }>();

  if (attemptResult.error || !attemptResult.data) {
    return fail("Tentative introuvable.");
  }

  const quizResult = await admin
    .from("quizzes")
    .select("id, title, organization_id, passing_score")
    .eq("id", attemptResult.data.quiz_id)
    .single<{
      id: string;
      title: string;
      organization_id: string;
      passing_score: number | null;
    }>();

  if (quizResult.error || !quizResult.data) {
    return fail("Quiz introuvable.");
  }

  const answersResult = await admin
    .from("quiz_attempt_answers")
    .select("attempt_id, question_id, answer_text, points_awarded")
    .eq("attempt_id", attemptId)
    .not("answer_text", "is", null);

  const textAnswers = (answersResult.data ?? []) as Array<{
    attempt_id: string;
    question_id: string;
    answer_text: string | null;
    points_awarded: number | null;
  }>;

  if (!textAnswers.length) {
    return fail("Cette tentative ne contient pas de réponse textuelle à corriger.");
  }

  const questionIds = textAnswers.map((answer) => answer.question_id);
  const questionsResult = await admin
    .from("quiz_questions")
    .select("id, points")
    .in("id", questionIds);

  const questionPointsById = new Map(
    ((questionsResult.data ?? []) as Array<{ id: string; points: number }>).map((question) => [
      question.id,
      question.points
    ])
  );

  const updates: Array<{ questionId: string; points: number; isCorrect: boolean | null }> = [];

  for (const answer of textAnswers) {
    const input = String(formData.get(`answer_${answer.question_id}_points`) ?? "").trim();
    const maxPoints = questionPointsById.get(answer.question_id) ?? 0;
    const parsed = input ? Number(input) : 0;

    if (Number.isNaN(parsed) || parsed < 0 || parsed > maxPoints) {
      return fail(`La note de la question doit être comprise entre 0 et ${maxPoints}.`);
    }

    updates.push({
      questionId: answer.question_id,
      points: parsed,
      isCorrect: parsed === maxPoints ? true : parsed === 0 ? false : null
    });
  }

  for (const update of updates) {
    const { error } = await admin
      .from("quiz_attempt_answers")
      .update({
        points_awarded: update.points,
        is_correct: update.isCorrect
      })
      .eq("attempt_id", attemptId)
      .eq("question_id", update.questionId);

    if (error) {
      return fail(error.message);
    }
  }

  const allAnswersResult = await admin
    .from("quiz_attempt_answers")
    .select("question_id, points_awarded")
    .eq("attempt_id", attemptId);

  const allQuestionIds = Array.from(
    new Set(((allAnswersResult.data ?? []) as Array<{ question_id: string; points_awarded: number | null }>).map((item) => item.question_id))
  );
  const allQuestionsResult = allQuestionIds.length
    ? await admin.from("quiz_questions").select("id, points").in("id", allQuestionIds)
    : { data: [] as Array<{ id: string; points: number }> };

  const totalPossible = ((allQuestionsResult.data ?? []) as Array<{ id: string; points: number }>).reduce(
    (sum, question) => sum + (question.points ?? 0),
    0
  );
  const totalAwarded = ((allAnswersResult.data ?? []) as Array<{ question_id: string; points_awarded: number | null }>).reduce(
    (sum, answer) => sum + (answer.points_awarded ?? 0),
    0
  );
  const score = totalPossible > 0 ? Number(((totalAwarded / totalPossible) * 100).toFixed(2)) : 0;

  const { error: updateAttemptError } = await admin
    .from("quiz_attempts")
    .update({
      score,
      status: "graded",
      graded_at: new Date().toISOString()
    })
    .eq("id", attemptId);

  if (updateAttemptError) {
    return fail(updateAttemptError.message);
  }

  const badgeTitle = await awardQuizBadge({
    organizationId: quizResult.data.organization_id,
    userId: attemptResult.data.user_id,
    quizAttemptId: attemptId,
    score,
    passingScore: quizResult.data.passing_score
  });

  await createNotifications([
    {
      organizationId: quizResult.data.organization_id,
      recipientId: attemptResult.data.user_id,
      actorId: context.user.id,
      title: "Quiz corrigé",
      body: badgeTitle
        ? `${quizResult.data.title} a été corrigé avec un score de ${score}%. Badge obtenu: ${badgeTitle}.`
        : `${quizResult.data.title} a été corrigé avec un score final de ${score}%.`,
      deeplink: `/quiz/${quizResult.data.id}`
    }
  ]);

  revalidatePath("/coach");
  revalidatePath("/dashboard");
  revalidatePath(`/quiz/${quizResult.data.id}`);

  return ok("Réponses textuelles corrigées.");
}
