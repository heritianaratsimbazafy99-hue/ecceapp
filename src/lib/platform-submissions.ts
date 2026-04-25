import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SUBMISSION_BUCKET = "submission-files";

type SubmissionReviewKeyRow = {
  submission_id: string;
};

type AssignmentSubmissionKeyRow = {
  assignment_id: string | null;
};

type ContentSubmissionKeyRow = {
  content_item_id: string | null;
};

export async function getSignedSubmissionUrl(storagePath: string | null, admin = createSupabaseAdminClient()) {
  if (!storagePath) {
    return null;
  }

  const { data } = await admin.storage.from(SUBMISSION_BUCKET).createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl ?? null;
}

export function buildLatestReviewBySubmissionId<TReview extends SubmissionReviewKeyRow>(reviews: TReview[]) {
  const latestReviewBySubmissionId = new Map<string, TReview>();

  for (const review of reviews) {
    if (!latestReviewBySubmissionId.has(review.submission_id)) {
      latestReviewBySubmissionId.set(review.submission_id, review);
    }
  }

  return latestReviewBySubmissionId;
}

export function buildLatestSubmissionByAssignmentId<TSubmission extends AssignmentSubmissionKeyRow>(
  submissions: TSubmission[]
) {
  const latestSubmissionByAssignmentId = new Map<string, TSubmission>();

  for (const submission of submissions) {
    if (submission.assignment_id && !latestSubmissionByAssignmentId.has(submission.assignment_id)) {
      latestSubmissionByAssignmentId.set(submission.assignment_id, submission);
    }
  }

  return latestSubmissionByAssignmentId;
}

export function buildLatestSubmissionByContentId<TSubmission extends ContentSubmissionKeyRow>(
  submissions: TSubmission[]
) {
  const latestSubmissionByContentId = new Map<string, TSubmission>();

  for (const submission of submissions) {
    if (submission.content_item_id && !latestSubmissionByContentId.has(submission.content_item_id)) {
      latestSubmissionByContentId.set(submission.content_item_id, submission);
    }
  }

  return latestSubmissionByContentId;
}
