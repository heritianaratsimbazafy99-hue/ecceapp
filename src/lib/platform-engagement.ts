import { formatUserName } from "@/lib/platform-display";
import {
  clamp,
  formatLastActivity,
  getDateValue,
  getDaysSince,
  isWithinDays,
  roundMetric,
  uniqueById
} from "@/lib/platform-data-utils";

export type EngagementTrend = "up" | "steady" | "down";
export type EngagementBand = "strong" | "watch" | "risk";
export type EngagementProfileStatus = "invited" | "active" | "suspended";

type EngagementProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  status: EngagementProfileStatus;
};

type EngagementAssignmentRow = {
  id: string;
  due_at: string | null;
  assigned_user_id?: string | null;
  cohort_id?: string | null;
  content_item_id: string | null;
  quiz_id: string | null;
};

type EngagementQuizAttemptRow = {
  id: string;
  quiz_id: string;
  user_id: string;
  assignment_id?: string | null;
  score: number | null;
  status: string;
  attempt_number: number;
  submitted_at: string | null;
};

type EngagementSubmissionRow = {
  assignment_id: string | null;
  content_item_id: string | null;
  user_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at?: string | null;
  created_at?: string;
};

type EngagementContentProgressRow = {
  user_id: string;
  content_item_id: string;
  assignment_id: string | null;
  completed_at: string;
};

type EngagementSessionRow = {
  coachee_id: string;
  starts_at: string;
  status: string;
};

type EngagementNotificationRow = {
  recipient_id: string;
  created_at: string;
  read_at: string | null;
};

type EngagementBadgeRow = {
  user_id: string;
  awarded_at: string;
};

export type LearnerEngagementSignal = {
  id: string;
  name: string;
  status: EngagementProfileStatus;
  cohorts: string[];
  score: number;
  band: EngagementBand;
  bandLabel: string;
  trend: EngagementTrend;
  trendLabel: string;
  assignmentCount: number;
  completedCount: number;
  completionRate: number | null;
  onTimeRate: number | null;
  averageQuizScore: number | null;
  overdueCount: number;
  dueSoonCount: number;
  unreadNotifications: number;
  badgeCount: number;
  recentActivityCount: number;
  lastActivityAt: string | null;
  lastActivityLabel: string;
  nextFocus: string;
};

export type EngagementOverview = {
  averageScore: number;
  atRiskCount: number;
  watchCount: number;
  strongCount: number;
  completionRate: number | null;
  onTimeRate: number | null;
  averageQuizScore: number | null;
  recentlyActiveCount: number;
};

export function getTrendLabel(trend: EngagementTrend) {
  switch (trend) {
    case "up":
      return "dynamique en hausse";
    case "down":
      return "dynamique à relancer";
    default:
      return "rythme stable";
  }
}

export function getEngagementBandLabel(band: EngagementBand) {
  switch (band) {
    case "strong":
      return "Très engagé";
    case "risk":
      return "A relancer";
    default:
      return "A surveiller";
  }
}

export function buildAssignmentTargets<TAssignment extends EngagementAssignmentRow>(
  assignments: TAssignment[],
  cohortMembers: Array<{ user_id: string; cohort_id: string }>
) {
  return assignments.map((assignment) => {
    const cohortTargets = assignment.cohort_id
      ? cohortMembers
          .filter((member) => member.cohort_id === assignment.cohort_id)
          .map((member) => member.user_id)
      : [];

    return {
      ...assignment,
      targetIds: uniqueById(
        [
          ...(assignment.assigned_user_id ? [{ id: assignment.assigned_user_id }] : []),
          ...cohortTargets.map((id) => ({ id }))
        ]
      ).map((item) => item.id)
    };
  });
}

export function buildLatestContentProgressMaps(progressRows: EngagementContentProgressRow[]) {
  const latestProgressByAssignmentKey = new Map<string, EngagementContentProgressRow>();
  const latestProgressByContentKey = new Map<string, EngagementContentProgressRow>();

  for (const progress of progressRows) {
    if (progress.assignment_id) {
      const assignmentKey = `${progress.user_id}:${progress.assignment_id}`;

      if (!latestProgressByAssignmentKey.has(assignmentKey)) {
        latestProgressByAssignmentKey.set(assignmentKey, progress);
      }
    }

    const contentKey = `${progress.user_id}:${progress.content_item_id}`;

    if (!latestProgressByContentKey.has(contentKey)) {
      latestProgressByContentKey.set(contentKey, progress);
    }
  }

  return {
    latestProgressByAssignmentKey,
    latestProgressByContentKey
  };
}

export function getContentProgressForAssignment(
  maps: ReturnType<typeof buildLatestContentProgressMaps>,
  userId: string,
  assignment: Pick<EngagementAssignmentRow, "id" | "content_item_id">
) {
  return (
    maps.latestProgressByAssignmentKey.get(`${userId}:${assignment.id}`) ??
    (assignment.content_item_id
      ? maps.latestProgressByContentKey.get(`${userId}:${assignment.content_item_id}`)
      : undefined)
  );
}

export function isContentCompleted(
  submission?: EngagementSubmissionRow | null,
  progress?: EngagementContentProgressRow | null
) {
  return Boolean(
    progress?.completed_at ||
      (submission && ["submitted", "reviewed", "late"].includes(submission.status))
  );
}

export function getContentCompletedAt(
  submission?: EngagementSubmissionRow | null,
  progress?: EngagementContentProgressRow | null
) {
  return (
    progress?.completed_at ??
    submission?.reviewed_at ??
    submission?.submitted_at ??
    submission?.created_at ??
    null
  );
}

export function buildEngagementSignals(params: {
  learnerIds: string[];
  profiles: EngagementProfileRow[];
  cohortNamesByUserId: Map<string, string[]>;
  assignments: EngagementAssignmentRow[];
  cohortMembers: Array<{ user_id: string; cohort_id: string }>;
  attempts: EngagementQuizAttemptRow[];
  submissions: EngagementSubmissionRow[];
  contentProgress?: EngagementContentProgressRow[];
  sessions: EngagementSessionRow[];
  notifications: EngagementNotificationRow[];
  badges: EngagementBadgeRow[];
}) {
  const now = Date.now();
  const contentProgress = params.contentProgress ?? [];
  const contentProgressMaps = buildLatestContentProgressMaps(contentProgress);
  const expandedAssignments = buildAssignmentTargets(params.assignments, params.cohortMembers);
  const assignmentsByLearnerId = expandedAssignments.reduce((map, assignment) => {
    for (const targetId of assignment.targetIds) {
      const current = map.get(targetId) ?? [];
      current.push(assignment);
      map.set(targetId, current);
    }

    return map;
  }, new Map<string, Array<EngagementAssignmentRow & { targetIds: string[] }>>());

  const attemptsByLearnerId = params.attempts.reduce((map, attempt) => {
    const current = map.get(attempt.user_id) ?? [];
    current.push(attempt);
    map.set(attempt.user_id, current);
    return map;
  }, new Map<string, EngagementQuizAttemptRow[]>());

  const submissionsByLearnerId = params.submissions.reduce((map, submission) => {
    const current = map.get(submission.user_id) ?? [];
    current.push(submission);
    map.set(submission.user_id, current);
    return map;
  }, new Map<string, EngagementSubmissionRow[]>());

  const progressByLearnerId = contentProgress.reduce((map, progress) => {
    const current = map.get(progress.user_id) ?? [];
    current.push(progress);
    map.set(progress.user_id, current);
    return map;
  }, new Map<string, EngagementContentProgressRow[]>());

  const sessionsByLearnerId = params.sessions.reduce((map, session) => {
    const current = map.get(session.coachee_id) ?? [];
    current.push(session);
    map.set(session.coachee_id, current);
    return map;
  }, new Map<string, EngagementSessionRow[]>());

  const notificationsByLearnerId = params.notifications.reduce((map, notification) => {
    const current = map.get(notification.recipient_id) ?? [];
    current.push(notification);
    map.set(notification.recipient_id, current);
    return map;
  }, new Map<string, EngagementNotificationRow[]>());

  const badgesByLearnerId = params.badges.reduce((map, badge) => {
    const current = map.get(badge.user_id) ?? [];
    current.push(badge);
    map.set(badge.user_id, current);
    return map;
  }, new Map<string, EngagementBadgeRow[]>());

  const latestAttemptByAssignmentKey = new Map<string, EngagementQuizAttemptRow>();
  const latestAttemptByQuizKey = new Map<string, EngagementQuizAttemptRow>();

  for (const attempt of params.attempts) {
    if (attempt.assignment_id) {
      const assignmentKey = `${attempt.user_id}:${attempt.assignment_id}`;
      if (!latestAttemptByAssignmentKey.has(assignmentKey)) {
        latestAttemptByAssignmentKey.set(assignmentKey, attempt);
      }
    }

    const quizKey = `${attempt.user_id}:${attempt.quiz_id}`;
    if (!latestAttemptByQuizKey.has(quizKey)) {
      latestAttemptByQuizKey.set(quizKey, attempt);
    }
  }

  const latestSubmissionByAssignmentKey = new Map<string, EngagementSubmissionRow>();
  for (const submission of params.submissions) {
    if (!submission.assignment_id) {
      continue;
    }

    const submissionKey = `${submission.user_id}:${submission.assignment_id}`;
    if (!latestSubmissionByAssignmentKey.has(submissionKey)) {
      latestSubmissionByAssignmentKey.set(submissionKey, submission);
    }
  }

  return params.learnerIds
    .map((learnerId) => {
      const profile = params.profiles.find((item) => item.id === learnerId);
      if (!profile) {
        return null;
      }

      const learnerAssignments = assignmentsByLearnerId.get(learnerId) ?? [];
      const learnerAttempts = attemptsByLearnerId.get(learnerId) ?? [];
      const learnerSubmissions = submissionsByLearnerId.get(learnerId) ?? [];
      const learnerContentProgress = progressByLearnerId.get(learnerId) ?? [];
      const learnerSessions = sessionsByLearnerId.get(learnerId) ?? [];
      const learnerNotifications = notificationsByLearnerId.get(learnerId) ?? [];
      const learnerBadges = badgesByLearnerId.get(learnerId) ?? [];

      let completedCount = 0;
      let overdueCount = 0;
      let dueSoonCount = 0;
      let onTimeCount = 0;
      let dueResolvedCount = 0;

      for (const assignment of learnerAssignments) {
        const dueAt = getDateValue(assignment.due_at);
        const attempt =
          latestAttemptByAssignmentKey.get(`${learnerId}:${assignment.id}`) ??
          (assignment.quiz_id ? latestAttemptByQuizKey.get(`${learnerId}:${assignment.quiz_id}`) : undefined);
        const submission = latestSubmissionByAssignmentKey.get(`${learnerId}:${assignment.id}`);
        const contentProgressItem = getContentProgressForAssignment(contentProgressMaps, learnerId, assignment);

        const completedItem = assignment.content_item_id
          ? isContentCompleted(submission, contentProgressItem)
          : Boolean(attempt && attempt.status !== "in_progress" && attempt.status !== "expired");
        const completedAt = assignment.content_item_id
          ? getContentCompletedAt(submission, contentProgressItem)
          : attempt?.submitted_at ?? null;
        const completedAtValue = getDateValue(completedAt);

        if (completedItem) {
          completedCount += 1;
        }

        if (dueAt !== null) {
          if (!completedItem && dueAt < now) {
            overdueCount += 1;
          }

          if (dueAt >= now && dueAt <= now + 7 * 24 * 60 * 60 * 1000) {
            dueSoonCount += 1;
          }

          if (completedItem && completedAtValue !== null) {
            dueResolvedCount += 1;
            if (completedAtValue <= dueAt) {
              onTimeCount += 1;
            }
          } else if (!completedItem && dueAt < now) {
            dueResolvedCount += 1;
          }
        }
      }

      const gradedAttempts = learnerAttempts.filter(
        (attempt) => attempt.status === "graded" && attempt.score !== null
      );
      const averageQuizScore = gradedAttempts.length
        ? roundMetric(
            gradedAttempts.reduce((total, attempt) => total + (attempt.score ?? 0), 0) /
              gradedAttempts.length
          )
        : null;

      const recentActivityCount =
        learnerAttempts.filter((attempt) => isWithinDays(attempt.submitted_at, 14, now)).length +
        learnerSubmissions.filter((submission) => isWithinDays(submission.submitted_at ?? submission.created_at, 14, now)).length +
        learnerContentProgress.filter((progress) => isWithinDays(progress.completed_at, 14, now)).length +
        learnerSessions.filter(
          (session) => session.status !== "cancelled" && isWithinDays(session.starts_at, 21, now)
        ).length +
        learnerBadges.filter((badge) => isWithinDays(badge.awarded_at, 30, now)).length;

      const previousActivityCount =
        learnerAttempts.filter((attempt) => {
          const value = getDateValue(attempt.submitted_at);
          return value !== null && value < now - 7 * 24 * 60 * 60 * 1000 && value >= now - 14 * 24 * 60 * 60 * 1000;
        }).length +
        learnerContentProgress.filter((progress) => {
          const value = getDateValue(progress.completed_at);
          return value !== null && value < now - 7 * 24 * 60 * 60 * 1000 && value >= now - 14 * 24 * 60 * 60 * 1000;
        }).length +
        learnerSubmissions.filter((submission) => {
          const value = getDateValue(submission.submitted_at ?? submission.created_at);
          return value !== null && value < now - 7 * 24 * 60 * 60 * 1000 && value >= now - 14 * 24 * 60 * 60 * 1000;
        }).length;

      const trend: EngagementTrend =
        recentActivityCount > previousActivityCount + 1
          ? "up"
          : previousActivityCount > recentActivityCount + 1
            ? "down"
            : "steady";

      const completionRate = learnerAssignments.length
        ? roundMetric((completedCount / learnerAssignments.length) * 100)
        : null;
      const onTimeRate = dueResolvedCount ? roundMetric((onTimeCount / dueResolvedCount) * 100) : null;

      const scoreComponents: Array<{ weight: number; value: number }> = [];
      if (learnerAssignments.length) {
        scoreComponents.push({
          weight: 40,
          value: completedCount / learnerAssignments.length
        });
      }

      if (dueResolvedCount) {
        scoreComponents.push({
          weight: 25,
          value: onTimeCount / dueResolvedCount
        });
      }

      if (
        learnerAssignments.length ||
        recentActivityCount > 0 ||
        learnerAttempts.length ||
        learnerSubmissions.length ||
        learnerContentProgress.length
      ) {
        scoreComponents.push({
          weight: 20,
          value: clamp(recentActivityCount / 4, 0, 1)
        });
      }

      if (averageQuizScore !== null) {
        scoreComponents.push({
          weight: 15,
          value: averageQuizScore / 100
        });
      }

      const score = scoreComponents.length
        ? roundMetric(
            (scoreComponents.reduce((total, component) => total + component.value * component.weight, 0) /
              scoreComponents.reduce((total, component) => total + component.weight, 0)) *
              100
          )
        : 0;

      const unreadNotifications = learnerNotifications.filter((item) => !item.read_at).length;
      const lastActivityAt = [
        ...learnerAttempts.map((attempt) => attempt.submitted_at),
        ...learnerSubmissions.map((submission) => submission.submitted_at ?? submission.created_at ?? null),
        ...learnerContentProgress.map((progress) => progress.completed_at),
        ...learnerSessions.map((session) => session.starts_at),
        ...learnerBadges.map((badge) => badge.awarded_at)
      ]
        .filter(Boolean)
        .sort((left, right) => (getDateValue(right) ?? 0) - (getDateValue(left) ?? 0))[0] ?? null;

      const daysSinceActivity = getDaysSince(lastActivityAt, now);
      const band: EngagementBand =
        overdueCount >= 2 || (daysSinceActivity !== null && daysSinceActivity > 14) || score < 45
          ? "risk"
          : overdueCount >= 1 || (daysSinceActivity !== null && daysSinceActivity > 7) || score < 70
            ? "watch"
            : "strong";

      const nextFocus =
        overdueCount > 0
          ? `${overdueCount} échéance(s) à relancer`
          : dueSoonCount > 0
            ? `${dueSoonCount} deadline(s) cette semaine`
            : averageQuizScore !== null && averageQuizScore < 60
              ? "Reprendre le dernier quiz pour consolider"
              : learnerAssignments.length && completedCount < learnerAssignments.length
                ? "Terminer les assignations en cours"
                : unreadNotifications >= 3
                  ? `${unreadNotifications} notification(s) à ouvrir`
                  : "Rythme solide à maintenir";

      return {
        id: learnerId,
        name: formatUserName(profile),
        status: profile.status,
        cohorts: params.cohortNamesByUserId.get(learnerId) ?? [],
        score,
        band,
        bandLabel: getEngagementBandLabel(band),
        trend,
        trendLabel: getTrendLabel(trend),
        assignmentCount: learnerAssignments.length,
        completedCount,
        completionRate,
        onTimeRate,
        averageQuizScore,
        overdueCount,
        dueSoonCount,
        unreadNotifications,
        badgeCount: learnerBadges.length,
        recentActivityCount,
        lastActivityAt,
        lastActivityLabel: formatLastActivity(lastActivityAt),
        nextFocus
      } satisfies LearnerEngagementSignal;
    })
    .filter(Boolean) as LearnerEngagementSignal[];
}

export function buildEngagementOverview(signals: LearnerEngagementSignal[]): EngagementOverview {
  const completionSignals = signals.filter((signal) => signal.completionRate !== null);
  const punctualSignals = signals.filter((signal) => signal.onTimeRate !== null);
  const quizSignals = signals.filter((signal) => signal.averageQuizScore !== null);

  return {
    averageScore: signals.length
      ? roundMetric(signals.reduce((total, signal) => total + signal.score, 0) / signals.length)
      : 0,
    atRiskCount: signals.filter((signal) => signal.band === "risk").length,
    watchCount: signals.filter((signal) => signal.band === "watch").length,
    strongCount: signals.filter((signal) => signal.band === "strong").length,
    completionRate: completionSignals.length
      ? roundMetric(
          completionSignals.reduce((total, signal) => total + (signal.completionRate ?? 0), 0) /
            completionSignals.length
        )
      : null,
    onTimeRate: punctualSignals.length
      ? roundMetric(
          punctualSignals.reduce((total, signal) => total + (signal.onTimeRate ?? 0), 0) /
            punctualSignals.length
        )
      : null,
    averageQuizScore: quizSignals.length
      ? roundMetric(
          quizSignals.reduce((total, signal) => total + (signal.averageQuizScore ?? 0), 0) /
            quizSignals.length
        )
      : null,
    recentlyActiveCount: signals.filter((signal) => {
      const daysSince = getDaysSince(signal.lastActivityAt);
      return daysSince !== null && daysSince <= 7;
    }).length
  };
}
