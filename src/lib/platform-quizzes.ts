import type { BadgeTone } from "@/lib/platform-display";

type QuizAttemptLike = {
  score: number | null;
  status: string;
  attempt_number: number;
};

export function getQuizAttemptLabel(attemptNumber: number) {
  return `Tentative ${attemptNumber}`;
}

export function getQuizAttemptScoreLabel(
  attempt: Pick<QuizAttemptLike, "score" | "status">,
  options?: {
    submittedLabel?: string;
    unscoredLabel?: string;
  }
) {
  if (attempt.status === "submitted") {
    return options?.submittedLabel ?? "En correction";
  }

  if (attempt.score !== null) {
    return `${attempt.score}%`;
  }

  return options?.unscoredLabel ?? "Non noté";
}

export function getQuizAttemptPerformanceTone(
  attempt: Pick<QuizAttemptLike, "score" | "status">,
  passingScore = 60
): BadgeTone {
  if (attempt.status !== "graded") {
    return "accent";
  }

  return attempt.score !== null && attempt.score < passingScore ? "warning" : "success";
}

export function getQuizAttemptStatusTone(status: string): BadgeTone {
  return status === "graded" ? "success" : "accent";
}

export function getDashboardQuizAttemptTone(status: string): "neutral" | "success" {
  return status === "submitted" ? "neutral" : "success";
}

export function getScoredQuizAttempts<T extends { score: number | null }>(attempts: T[]) {
  return attempts.filter((attempt) => attempt.score !== null);
}

export function getAverageQuizScore<T extends { score: number | null }>(attempts: T[]) {
  const scoredAttempts = getScoredQuizAttempts(attempts);

  return scoredAttempts.length
    ? Math.round(scoredAttempts.reduce((total, attempt) => total + Number(attempt.score ?? 0), 0) / scoredAttempts.length)
    : null;
}

export function getBestQuizAttempt<T extends { score: number | null }>(attempts: T[]) {
  return getScoredQuizAttempts(attempts).sort((left, right) => Number(right.score ?? 0) - Number(left.score ?? 0))[0] ?? null;
}
