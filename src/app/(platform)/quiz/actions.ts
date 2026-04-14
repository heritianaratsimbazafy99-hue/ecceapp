"use server";

import { revalidatePath } from "next/cache";

import {
  awardQuizBadge,
  createNotifications,
  getOrganizationStaffIds
} from "@/lib/platform-events";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type QuizActionState = {
  error?: string;
  success?: string;
  score?: string;
  badgeTitle?: string;
  pendingManualReview?: boolean;
};

export async function submitQuizAttemptAction(
  _prevState: QuizActionState,
  formData: FormData
): Promise<QuizActionState> {
  const context = await requireRole(["admin", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const quizId = String(formData.get("quiz_id") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();

  if (!quizId) {
    return { error: "Quiz introuvable." };
  }

  const { data: quiz } = await admin
    .from("quizzes")
    .select(
      `
        id,
        title,
        status,
        attempts_allowed,
        passing_score,
        quiz_questions (
          id,
          prompt,
          question_type,
          points,
          quiz_question_choices (
            id,
            label,
            is_correct,
            position
          )
        )
      `
    )
    .eq("organization_id", organizationId)
    .eq("id", quizId)
    .maybeSingle<{
      id: string;
      title: string;
      status: string;
      attempts_allowed: number;
      passing_score: number | null;
      quiz_questions: Array<{
        id: string;
        prompt: string;
        question_type: string;
        points: number;
        quiz_question_choices?: Array<{
          id: string;
          label: string;
          is_correct: boolean;
          position: number;
        }>;
      }>;
    }>();

  if (!quiz) {
    return { error: "Quiz introuvable dans cette organisation." };
  }

  if (quiz.status !== "published" && context.role !== "admin") {
    return { error: "Ce quiz n'est pas encore publié." };
  }

  const { data: existingAttempts } = await admin
    .from("quiz_attempts")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("user_id", context.user.id);

  const attemptNumber = (existingAttempts?.length ?? 0) + 1;

  if (attemptNumber > (quiz.attempts_allowed || 1)) {
    return { error: "Le nombre maximal de tentatives a déjà été utilisé." };
  }

  const { data: attempt, error: attemptError } = await admin
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: context.user.id,
      assignment_id: assignmentId || null,
      attempt_number: attemptNumber,
      status: "submitted",
      started_at: new Date().toISOString(),
      submitted_at: new Date().toISOString()
    })
    .select("id")
    .single<{ id: string }>();

  if (attemptError || !attempt) {
    return { error: attemptError?.message ?? "Impossible d'enregistrer la tentative." };
  }

  const answerRows = [];
  let totalPoints = 0;
  let awardedPoints = 0;
  let requiresManualReview = false;

  for (const question of quiz.quiz_questions ?? []) {
    totalPoints += question.points ?? 0;

    if (question.question_type === "single_choice") {
      const selectedChoiceId = String(formData.get(`question_${question.id}`) ?? "").trim();
      const correctChoice = (question.quiz_question_choices ?? []).find((choice) => choice.is_correct);
      const isCorrect = Boolean(selectedChoiceId && correctChoice?.id === selectedChoiceId);
      const pointsAwarded = isCorrect ? question.points ?? 0 : 0;
      awardedPoints += pointsAwarded;

      answerRows.push({
        attempt_id: attempt.id,
        question_id: question.id,
        choice_id: selectedChoiceId || null,
        answer_text: null,
        is_correct: isCorrect,
        points_awarded: pointsAwarded
      });
    } else {
      requiresManualReview = true;
      const answerText = String(formData.get(`question_${question.id}`) ?? "").trim();
      answerRows.push({
        attempt_id: attempt.id,
        question_id: question.id,
        choice_id: null,
        answer_text: answerText || null,
        is_correct: null,
        points_awarded: 0
      });
    }
  }

  if (answerRows.length) {
    const { error: answersError } = await admin.from("quiz_attempt_answers").insert(answerRows);

    if (answersError) {
      return { error: answersError.message };
    }
  }

  const score = totalPoints > 0 ? Number(((awardedPoints / totalPoints) * 100).toFixed(2)) : 0;
  const attemptStatus = requiresManualReview ? "submitted" : "graded";

  const { error: updateError } = await admin
    .from("quiz_attempts")
    .update({
      score,
      status: attemptStatus,
      graded_at: requiresManualReview ? null : new Date().toISOString()
    })
    .eq("id", attempt.id);

  if (updateError) {
    return { error: updateError.message };
  }

  const staffIds = await getOrganizationStaffIds(organizationId);
  await createNotifications([
    {
      organizationId,
      recipientId: context.user.id,
      actorId: context.user.id,
      title: requiresManualReview ? "Quiz envoyé pour correction" : "Quiz complété",
      body: requiresManualReview
        ? `Tes réponses pour "${quiz.title}" ont été envoyées. La correction coach est en attente.`
        : `Ton score pour "${quiz.title}" est de ${score}%.`,
      deeplink: `/quiz/${quizId}`
    },
    ...staffIds
      .filter((recipientId) => recipientId !== context.user.id)
      .map((recipientId) => ({
        organizationId,
        recipientId,
        actorId: context.user.id,
        title: requiresManualReview ? "Quiz à corriger" : "Nouveau résultat quiz",
        body: requiresManualReview
          ? `${quiz.title} vient d'être soumis avec des réponses textuelles à corriger.`
          : `${quiz.title} vient d'être soumis avec un score de ${score}%.`,
        deeplink: "/coach"
      }))
  ]);

  const badgeTitle = requiresManualReview
    ? null
    : await awardQuizBadge({
        organizationId,
        userId: context.user.id,
        quizAttemptId: attempt.id,
        score,
        passingScore: quiz.passing_score
      });

  if (badgeTitle) {
    await createNotifications([
      {
        organizationId,
        recipientId: context.user.id,
        actorId: context.user.id,
        title: "Nouveau badge débloqué",
        body: `Tu viens d'obtenir le badge "${badgeTitle}".`,
        deeplink: "/dashboard"
      }
    ]);
  }

  revalidatePath(`/quiz/${quizId}`);
  revalidatePath("/dashboard");
  revalidatePath("/coach");

  return {
    success: requiresManualReview
      ? `Quiz "${quiz.title}" envoyé pour correction.`
      : `Quiz "${quiz.title}" soumis avec succès.`,
    score: `${score}%`,
    badgeTitle: badgeTitle ?? undefined,
    pendingManualReview: requiresManualReview
  };
}
