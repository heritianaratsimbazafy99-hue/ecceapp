import type { BadgeTone } from "@/lib/platform-display";
import {
  getDeadlineState,
  getDeadlineStateLabel,
  getDeadlineStateTone
} from "@/lib/platform-data-utils";

export type LearningAssignmentKind = "quiz" | "contenu";
export type LearningAssignmentKindPriority = "quiz" | "content";
export type LearnerAssignmentCompletionStatus = "reviewed" | "submitted" | "done" | "pending";

type LearningAssignmentLike = {
  id: string;
  quiz_id?: string | null;
  content_item_id?: string | null;
};

export function getLearningAssignmentKind(
  assignment: Pick<LearningAssignmentLike, "quiz_id" | "content_item_id">,
  priority: LearningAssignmentKindPriority = "quiz"
): LearningAssignmentKind {
  if (priority === "content") {
    return assignment.content_item_id ? "contenu" : "quiz";
  }

  return assignment.quiz_id ? "quiz" : "contenu";
}

export function getLearningAssignmentHref(
  assignment: LearningAssignmentLike,
  priority: LearningAssignmentKindPriority = "quiz"
) {
  return getLearningAssignmentKind(assignment, priority) === "quiz"
    ? `/quiz/${assignment.quiz_id}?assignment=${assignment.id}`
    : `/assignments/${assignment.id}`;
}

export function getLearningAssignmentAudienceLabel(
  cohortId: string | null | undefined,
  cohortNameById: Map<string, string>
) {
  return cohortId ? `Cohorte · ${cohortNameById.get(cohortId) ?? "groupe"}` : "Assignation individuelle";
}

export function isLearningAssignmentCompletedForDeadline({
  kind,
  attemptStatus,
  submissionStatus
}: {
  kind: LearningAssignmentKind;
  attemptStatus?: string | null;
  submissionStatus?: string | null;
}) {
  return kind === "quiz"
    ? Boolean(attemptStatus && attemptStatus !== "in_progress" && attemptStatus !== "expired")
    : Boolean(submissionStatus && submissionStatus !== "not_started");
}

export function getLearnerAssignmentCompletionStatus({
  kind,
  submissionStatus,
  hasContentProgress,
  hasQuizAttempt
}: {
  kind: LearningAssignmentKind;
  submissionStatus?: string | null;
  hasContentProgress?: boolean;
  hasQuizAttempt?: boolean;
}): LearnerAssignmentCompletionStatus {
  if (kind === "contenu") {
    if (submissionStatus === "reviewed") {
      return "reviewed";
    }

    if (submissionStatus === "submitted") {
      return "submitted";
    }

    return hasContentProgress ? "done" : "pending";
  }

  return hasQuizAttempt ? "done" : "pending";
}

export function isLearnerAssignmentComplete(status: LearnerAssignmentCompletionStatus) {
  return status === "reviewed" || status === "done";
}

export function getLearnerAssignmentStatusLabel(
  status: LearnerAssignmentCompletionStatus,
  dueState: ReturnType<typeof getDeadlineState>
) {
  if (status === "reviewed") {
    return "corrigé";
  }

  if (status === "submitted") {
    return "en revue";
  }

  if (status === "done") {
    return "terminé";
  }

  return getDeadlineStateLabel(dueState);
}

export function getLearnerAssignmentStatusTone(
  status: LearnerAssignmentCompletionStatus,
  dueState: ReturnType<typeof getDeadlineState>
): BadgeTone {
  if (status === "reviewed" || status === "done") {
    return "success";
  }

  if (status === "submitted") {
    return "accent";
  }

  return getDeadlineStateTone(dueState);
}
