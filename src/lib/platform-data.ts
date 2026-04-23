import { getAssignedCoachIdsForCoachee, getCoachAssignmentScope } from "@/lib/coach-assignments";
import { requireRole, type AppRole } from "@/lib/auth";
import { getOrganizationBrandingById } from "@/lib/organization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  bio?: string | null;
  first_name: string;
  last_name: string;
  status: "invited" | "active" | "suspended";
  created_at?: string;
  timezone?: string | null;
  user_roles?: Array<{ role: AppRole }>;
};

type ContentRow = {
  id: string;
  module_id?: string | null;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[] | null;
  content_type: string;
  status: string;
  estimated_minutes: number | null;
  external_url: string | null;
  youtube_url: string | null;
  is_required: boolean;
  created_at: string;
};

type ProgramRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  created_at: string;
};

type ProgramModuleRow = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  position: number;
  status: string;
  available_at?: string | null;
};

type ProgramEnrollmentRow = {
  program_id: string;
  user_id: string;
  cohort_id: string | null;
  enrolled_at: string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  deeplink?: string | null;
};

type AssignmentRow = {
  id: string;
  title: string;
  due_at: string | null;
  organization_id?: string;
  assigned_user_id?: string | null;
  cohort_id?: string | null;
  content_item_id: string | null;
  quiz_id: string | null;
  published_at?: string | null;
};

type QuizRow = {
  id: string;
  module_id?: string | null;
  title: string;
  description?: string | null;
  kind?: string;
  status?: string;
  attempts_allowed?: number;
  time_limit_minutes?: number | null;
  passing_score?: number | null;
  randomize_questions?: boolean;
  content_item_id?: string | null;
  quiz_questions?: QuizQuestionRow[];
};

type QuizQuestionRow = {
  id: string;
  prompt: string;
  helper_text: string | null;
  question_type: string;
  points: number;
  position: number;
  quiz_question_choices?: Array<{
    id: string;
    label: string;
    is_correct: boolean;
    position: number;
  }>;
};

type QuizAttemptResultRow = {
  id: string;
  quiz_id: string;
  user_id: string;
  assignment_id?: string | null;
  score: number | null;
  status: string;
  attempt_number: number;
  submitted_at: string | null;
  profiles?:
    | Array<{
        first_name: string;
        last_name: string;
      }>
    | {
        first_name: string;
        last_name: string;
      }
    | null;
};

type SubmissionRow = {
  id: string;
  assignment_id: string | null;
  content_item_id: string | null;
  user_id: string;
  title: string;
  notes: string | null;
  storage_path: string | null;
  status: string;
  submitted_at: string | null;
  reviewed_at?: string | null;
  created_at?: string;
};

type SubmissionReviewRow = {
  id: string;
  submission_id: string;
  reviewer_id?: string;
  grade: number | null;
  feedback: string;
  created_at: string;
};

type UserBadgeRow = {
  id: string;
  user_id?: string;
  awarded_at: string;
  badges?:
    | {
        title: string;
        description: string | null;
        icon: string | null;
      }
    | Array<{
        title: string;
        description: string | null;
        icon: string | null;
      }>
    | null;
};

type ConversationRow = {
  id: string;
  coach_id: string;
  coachee_id: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type NotificationAnalyticsRow = {
  recipient_id: string;
  created_at: string;
  read_at: string | null;
};

type BadgeAwardAnalyticsRow = {
  user_id: string;
  awarded_at: string;
};

type SessionAnalyticsRow = {
  coachee_id: string;
  starts_at: string;
  status: string;
};

const VALID_ROLES: AppRole[] = ["admin", "professor", "coach", "coachee"];
const VALID_MEMBERSHIP_STATUSES: ProfileRow["status"][] = ["invited", "active", "suspended"];

type EngagementTrend = "up" | "steady" | "down";
type EngagementBand = "strong" | "watch" | "risk";

type LearnerEngagementSignal = {
  id: string;
  name: string;
  status: ProfileRow["status"];
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

type EngagementOverview = {
  averageScore: number;
  atRiskCount: number;
  watchCount: number;
  strongCount: number;
  completionRate: number | null;
  onTimeRate: number | null;
  averageQuizScore: number | null;
  recentlyActiveCount: number;
};

const SUBMISSION_BUCKET = "submission-files";

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "Aucune échéance";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateString));
}

function formatDateCompact(dateString: string | null) {
  if (!dateString) {
    return "Date non définie";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long"
  }).format(new Date(dateString));
}

function formatTimeOnly(dateString: string | null) {
  if (!dateString) {
    return "Heure libre";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    timeStyle: "short"
  }).format(new Date(dateString));
}

function getRelativeDayLabel(dateString: string | null, now = Date.now()) {
  if (!dateString) {
    return "À planifier";
  }

  const targetDate = new Date(dateString);
  const today = new Date(now);
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).getTime();
  const diffDays = Math.round((targetStart - dayStart) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return "Aujourd'hui";
  }

  if (diffDays === 1) {
    return "Demain";
  }

  if (diffDays === -1) {
    return "Hier";
  }

  return formatDateCompact(dateString);
}

function getDeadlineState(dateString: string | null | undefined, completed = false, now = Date.now()) {
  if (completed) {
    return "done" as const;
  }

  const value = getDateValue(dateString);

  if (value === null) {
    return "open" as const;
  }

  if (value < now) {
    return "overdue" as const;
  }

  if (value <= now + 7 * 24 * 60 * 60 * 1000) {
    return "soon" as const;
  }

  return "planned" as const;
}

function getDeadlineStateLabel(state: ReturnType<typeof getDeadlineState>) {
  switch (state) {
    case "done":
      return "terminé";
    case "overdue":
      return "en retard";
    case "soon":
      return "à venir";
    case "planned":
      return "planifié";
    default:
      return "sans deadline";
  }
}

function getDeadlineStateTone(
  state: ReturnType<typeof getDeadlineState>
): "neutral" | "accent" | "warning" | "success" {
  switch (state) {
    case "done":
      return "success";
    case "overdue":
      return "warning";
    case "soon":
      return "accent";
    case "planned":
      return "neutral";
    default:
      return "neutral";
  }
}

function getSubmissionStatusLabel(status: string) {
  switch (status) {
    case "reviewed":
      return "corrigé";
    case "submitted":
      return "envoyé";
    case "draft":
      return "brouillon";
    default:
      return status;
  }
}

function getSubmissionStatusTone(status: string): "neutral" | "accent" | "warning" | "success" {
  switch (status) {
    case "reviewed":
      return "success";
    case "submitted":
      return "accent";
    case "draft":
      return "neutral";
    default:
      return "warning";
  }
}

function formatUserName(user: ProfileRow) {
  return `${user.first_name} ${user.last_name}`.trim();
}

function buildProgramModuleOptions(programs: ProgramRow[], modules: ProgramModuleRow[]) {
  const programTitleById = new Map(programs.map((program) => [program.id, program.title]));

  return modules
    .slice()
    .sort((left, right) =>
      left.program_id === right.program_id
        ? left.position - right.position
        : (programTitleById.get(left.program_id) ?? "").localeCompare(programTitleById.get(right.program_id) ?? "")
    )
    .map((module) => ({
      id: module.id,
      label: `${programTitleById.get(module.program_id) ?? "Parcours"} · Module ${module.position + 1} · ${module.title}`
    }));
}

function getProgramProgressTone(progress: number): "neutral" | "accent" | "warning" | "success" {
  if (progress >= 100) {
    return "success";
  }

  if (progress >= 60) {
    return "accent";
  }

  if (progress > 0) {
    return "warning";
  }

  return "neutral";
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function formatMessagePreview(value: string | null) {
  if (!value) {
    return "Aucun message pour l'instant.";
  }

  return value.length > 96 ? `${value.slice(0, 93)}...` : value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value: number) {
  return Math.round(value);
}

function getDateValue(dateString: string | null | undefined) {
  if (!dateString) {
    return null;
  }

  const value = new Date(dateString).getTime();
  return Number.isNaN(value) ? null : value;
}

function isWithinDays(dateString: string | null | undefined, days: number, now = Date.now()) {
  const value = getDateValue(dateString);

  if (value === null) {
    return false;
  }

  return value <= now && value >= now - days * 24 * 60 * 60 * 1000;
}

function getDaysSince(dateString: string | null | undefined, now = Date.now()) {
  const value = getDateValue(dateString);

  if (value === null) {
    return null;
  }

  return Math.floor((now - value) / (24 * 60 * 60 * 1000));
}

function formatLastActivity(dateString: string | null | undefined) {
  const daysSince = getDaysSince(dateString);

  if (daysSince === null) {
    return "Aucune activité détectée";
  }

  if (daysSince <= 0) {
    return "Actif aujourd'hui";
  }

  if (daysSince === 1) {
    return "Actif hier";
  }

  if (daysSince < 7) {
    return `Actif il y a ${daysSince} jours`;
  }

  return `Dernière activité ${formatDate(dateString ?? null)}`;
}

function getTrendLabel(trend: EngagementTrend) {
  switch (trend) {
    case "up":
      return "dynamique en hausse";
    case "down":
      return "dynamique à relancer";
    default:
      return "rythme stable";
  }
}

function getEngagementBandLabel(band: EngagementBand) {
  switch (band) {
    case "strong":
      return "Très engagé";
    case "risk":
      return "A relancer";
    default:
      return "A surveiller";
  }
}

function buildAssignmentTargets(
  assignments: AssignmentRow[],
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

function buildEngagementSignals(params: {
  learnerIds: string[];
  profiles: ProfileRow[];
  cohortNamesByUserId: Map<string, string[]>;
  assignments: AssignmentRow[];
  cohortMembers: Array<{ user_id: string; cohort_id: string }>;
  attempts: QuizAttemptResultRow[];
  submissions: SubmissionRow[];
  sessions: SessionAnalyticsRow[];
  notifications: NotificationAnalyticsRow[];
  badges: BadgeAwardAnalyticsRow[];
}) {
  const now = Date.now();
  const expandedAssignments = buildAssignmentTargets(params.assignments, params.cohortMembers);
  const assignmentsByLearnerId = expandedAssignments.reduce((map, assignment) => {
    for (const targetId of assignment.targetIds) {
      const current = map.get(targetId) ?? [];
      current.push(assignment);
      map.set(targetId, current);
    }

    return map;
  }, new Map<string, Array<AssignmentRow & { targetIds: string[] }>>());

  const attemptsByLearnerId = params.attempts.reduce((map, attempt) => {
    const current = map.get(attempt.user_id) ?? [];
    current.push(attempt);
    map.set(attempt.user_id, current);
    return map;
  }, new Map<string, QuizAttemptResultRow[]>());

  const submissionsByLearnerId = params.submissions.reduce((map, submission) => {
    const current = map.get(submission.user_id) ?? [];
    current.push(submission);
    map.set(submission.user_id, current);
    return map;
  }, new Map<string, SubmissionRow[]>());

  const sessionsByLearnerId = params.sessions.reduce((map, session) => {
    const current = map.get(session.coachee_id) ?? [];
    current.push(session);
    map.set(session.coachee_id, current);
    return map;
  }, new Map<string, SessionAnalyticsRow[]>());

  const notificationsByLearnerId = params.notifications.reduce((map, notification) => {
    const current = map.get(notification.recipient_id) ?? [];
    current.push(notification);
    map.set(notification.recipient_id, current);
    return map;
  }, new Map<string, NotificationAnalyticsRow[]>());

  const badgesByLearnerId = params.badges.reduce((map, badge) => {
    const current = map.get(badge.user_id) ?? [];
    current.push(badge);
    map.set(badge.user_id, current);
    return map;
  }, new Map<string, BadgeAwardAnalyticsRow[]>());

  const latestAttemptByAssignmentKey = new Map<string, QuizAttemptResultRow>();
  const latestAttemptByQuizKey = new Map<string, QuizAttemptResultRow>();

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

  const latestSubmissionByAssignmentKey = new Map<string, SubmissionRow>();
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

        const completedItem = assignment.content_item_id
          ? Boolean(submission && submission.status !== "not_started")
          : Boolean(attempt && attempt.status !== "in_progress" && attempt.status !== "expired");
        const completedAt = assignment.content_item_id
          ? submission?.submitted_at ?? submission?.reviewed_at ?? submission?.created_at ?? null
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
        learnerSessions.filter(
          (session) => session.status !== "cancelled" && isWithinDays(session.starts_at, 21, now)
        ).length +
        learnerBadges.filter((badge) => isWithinDays(badge.awarded_at, 30, now)).length;

      const previousActivityCount =
        learnerAttempts.filter((attempt) => {
          const value = getDateValue(attempt.submitted_at);
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

      if (learnerAssignments.length || recentActivityCount > 0 || learnerAttempts.length || learnerSubmissions.length) {
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

function buildEngagementOverview(signals: LearnerEngagementSignal[]): EngagementOverview {
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

async function getSignedSubmissionUrl(storagePath: string | null, admin = createSupabaseAdminClient()) {
  if (!storagePath) {
    return null;
  }

  const { data } = await admin.storage.from(SUBMISSION_BUCKET).createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl ?? null;
}

async function getMessagingWorkspace(params: {
  organizationId: string;
  userId: string;
  viewerRole: "coach" | "coachee";
  contactOptions: Array<{ id: string; label: string }>;
  conversationLimit?: number;
  recentMessageLimit?: number;
  initialMessageLimit?: number;
  includeInitialMessages?: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const conversationLimit = params.conversationLimit ?? 12;
  const recentMessageLimit = params.recentMessageLimit ?? 120;
  const initialMessageLimit = params.initialMessageLimit ?? 60;
  const includeInitialMessages = params.includeInitialMessages ?? true;

  let conversationQuery = admin
    .from("coach_conversations")
    .select("id, coach_id, coachee_id, updated_at")
    .eq("organization_id", params.organizationId)
    .order("updated_at", { ascending: false });

  const contactIds = params.contactOptions.map((contact) => contact.id);

  conversationQuery =
    params.viewerRole === "coach"
      ? conversationQuery.eq("coach_id", params.userId)
      : conversationQuery.eq("coachee_id", params.userId);

  if (contactIds.length) {
    conversationQuery =
      params.viewerRole === "coach"
        ? conversationQuery.in("coachee_id", contactIds)
        : conversationQuery.in("coach_id", contactIds);
  } else {
    return {
      contacts: params.contactOptions,
      conversations: [],
      initialConversationId: null,
      initialMessages: []
    };
  }

  const conversationsResult = await conversationQuery.limit(conversationLimit);
  const conversationRows = (conversationsResult.data ?? []) as ConversationRow[];
  const conversationIds = conversationRows.map((conversation) => conversation.id);

  const messageRows = conversationIds.length
    ? ((await admin
        .from("coach_messages")
        .select("id, conversation_id, sender_id, recipient_id, body, created_at, read_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(recentMessageLimit)).data ?? []) as MessageRow[]
    : [];

  const lastMessageByConversationId = new Map<string, MessageRow>();
  const unreadCountByConversationId = new Map<string, number>();

  for (const message of messageRows) {
    if (!lastMessageByConversationId.has(message.conversation_id)) {
      lastMessageByConversationId.set(message.conversation_id, message);
    }

    if (message.recipient_id === params.userId && !message.read_at) {
      unreadCountByConversationId.set(
        message.conversation_id,
        (unreadCountByConversationId.get(message.conversation_id) ?? 0) + 1
      );
    }
  }

  const contactMap = new Map(params.contactOptions.map((contact) => [contact.id, contact.label]));
  const conversations = conversationRows.map((conversation) => {
    const counterpartId =
      params.viewerRole === "coach" ? conversation.coachee_id : conversation.coach_id;
    const lastMessage = lastMessageByConversationId.get(conversation.id);

    return {
      id: conversation.id,
      counterpartId,
      counterpartName: contactMap.get(counterpartId) ?? "Participant ECCE",
      lastMessagePreview: formatMessagePreview(lastMessage?.body ?? null),
      lastMessageAt: lastMessage?.created_at ?? conversation.updated_at,
      unreadCount: unreadCountByConversationId.get(conversation.id) ?? 0
    };
  });

  const initialConversationId = conversations[0]?.id ?? null;
  const initialMessages = includeInitialMessages && initialConversationId
    ? (
        (
          await admin
            .from("coach_messages")
            .select("id, conversation_id, sender_id, recipient_id, body, created_at, read_at")
            .eq("conversation_id", initialConversationId)
            .order("created_at", { ascending: true })
            .limit(initialMessageLimit)
        ).data ?? []
      ).map((message) => ({
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        recipientId: message.recipient_id,
        body: message.body,
        createdAt: message.created_at,
        readAt: message.read_at,
        mine: message.sender_id === params.userId
      }))
    : [];

  return {
    contacts: params.contactOptions,
    conversations,
    initialConversationId,
    initialMessages
  };
}

export async function getMessagesPageData() {
  const context = await requireRole(["coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const userId = context.user.id;

  let contactOptions: Array<{ id: string; label: string }> = [];

  if (context.roles.includes("coach")) {
    const scope = await getCoachAssignmentScope({
      organizationId,
      coachId: userId
    });

    if (scope.coacheeIds.length) {
      const profilesResult = await admin
        .from("profiles")
        .select("id, first_name, last_name, status")
        .eq("organization_id", organizationId)
        .in("id", scope.coacheeIds)
        .order("first_name", { ascending: true });

      contactOptions = ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => ({
        id: profile.id,
        label: formatUserName(profile)
      }));
    }
  } else {
    const cohortMembersResult = await admin
      .from("cohort_members")
      .select("cohort_id")
      .eq("user_id", userId);

    const cohortIds = (cohortMembersResult.data ?? []).map((item) => item.cohort_id);
    const coachIds = await getAssignedCoachIdsForCoachee({
      organizationId,
      coacheeId: userId,
      cohortIds
    });

    if (coachIds.length) {
      const profilesResult = await admin
        .from("profiles")
        .select("id, first_name, last_name, status")
        .eq("organization_id", organizationId)
        .in("id", coachIds)
        .order("first_name", { ascending: true });

      contactOptions = ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => ({
        id: profile.id,
        label: formatUserName(profile)
      }));
    }
  }

  const messagingWorkspace = await getMessagingWorkspace({
    organizationId,
    userId,
    viewerRole: context.roles.includes("coach") ? "coach" : "coachee",
    contactOptions,
    conversationLimit: 16,
    recentMessageLimit: 160,
    initialMessageLimit: 80,
    includeInitialMessages: true
  });

  const unreadCount = messagingWorkspace.conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );
  const latestConversation = messagingWorkspace.conversations[0] ?? null;

  return {
    context,
    messagingWorkspace,
    metrics: [
      {
        label: "Conversations actives",
        value: messagingWorkspace.conversations.length.toString(),
        delta: latestConversation
          ? `Dernier échange · ${formatDate(latestConversation.lastMessageAt)}`
          : "Aucun échange démarré"
      },
      {
        label: "Contacts disponibles",
        value: messagingWorkspace.contacts.length.toString(),
        delta: context.roles.includes("coach")
          ? "Portefeuille coach visible ici"
          : "Coachs rattachés à ton parcours"
      },
      {
        label: "Messages non lus",
        value: unreadCount.toString(),
        delta: unreadCount ? "Des réponses attendent ton attention" : "Inbox à jour"
      }
    ]
  };
}

export async function getNotificationsPageData() {
  const context = await requireRole(["admin", "professor", "coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const userId = context.user.id;

  const notificationsResult = await admin
    .from("notifications")
    .select("id, title, body, created_at, read_at, deeplink")
    .eq("organization_id", organizationId)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  const notifications = (notificationsResult.data ?? []) as NotificationRow[];
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const actionableCount = notifications.filter((item) => Boolean(item.deeplink)).length;
  const todayCount = notifications.filter((item) => isWithinDays(item.created_at, 1)).length;

  return {
    context,
    notifications,
    metrics: [
      {
        label: "Notifications non lues",
        value: unreadCount.toString(),
        delta: unreadCount ? "Le centre live mérite un passage" : "Tout est à jour"
      },
      {
        label: "Actions directes",
        value: actionableCount.toString(),
        delta: "Notifications avec lien d'ouverture"
      },
      {
        label: "Activité aujourd'hui",
        value: todayCount.toString(),
        delta: notifications[0] ? `Dernière alerte · ${formatDate(notifications[0].created_at)}` : "Aucun événement récent"
      }
    ]
  };
}

export async function getAdminPageData() {
  const context = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const [
    profilesResult,
    contentsResult,
    quizzesResult,
    assignmentsResult,
    cohortsResult,
    cohortMembersResult,
    authUsersResult
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, last_name, status, created_at, user_roles(role)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("content_items")
      .select(
        "id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("quizzes")
      .select(
        `
          id,
          title,
          description,
          kind,
          status,
          attempts_allowed,
          time_limit_minutes,
          passing_score,
          randomize_questions,
          content_item_id,
          quiz_questions (
            id,
            prompt,
            helper_text,
            question_type,
            points,
            position,
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
      .order("created_at", { ascending: false }),
    admin
      .from("learning_assignments")
      .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin.from("cohorts").select("id, name").eq("organization_id", organizationId).order("name"),
    admin.from("cohort_members").select("user_id, cohort_id"),
    admin.auth.admin.listUsers({
      page: 1,
      perPage: 200
    })
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const contents = (contentsResult.data ?? []) as ContentRow[];
  const quizzes = (quizzesResult.data ?? []) as QuizRow[];
  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[];
  const cohorts = (cohortsResult.data ?? []) as Array<{ id: string; name: string }>;
  const cohortMembers = (cohortMembersResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>;
  const authUsers = authUsersResult.data?.users ?? [];
  const emailByUserId = new Map(
    authUsers.map((item) => [item.id, item.email ?? "email indisponible"])
  );
  const userNameById = new Map(
    profiles.map((profile) => [profile.id, formatUserName(profile)])
  );
  const contentTitleById = new Map(contents.map((content) => [content.id, content.title]));
  const quizTitleById = new Map(quizzes.map((quiz) => [quiz.id, quiz.title]));
  const cohortNameById = new Map(cohorts.map((cohort) => [cohort.id, cohort.name]));

  const users = profiles.map((profile) => ({
    id: profile.id,
    name: formatUserName(profile),
    email: emailByUserId.get(profile.id) ?? "email indisponible",
    status: profile.status,
    roles: (profile.user_roles ?? []).map((item) => item.role)
  }));
  const coacheeProfiles = profiles.filter((profile) =>
    (profile.user_roles ?? []).some((item) => item.role === "coachee")
  );
  const coacheeIds = profiles
    .filter((profile) => (profile.user_roles ?? []).some((item) => item.role === "coachee"))
    .map((profile) => profile.id);
  const cohortNamesByUserId = cohortMembers.reduce((map, item) => {
    const current = map.get(item.user_id) ?? [];
    const name = cohortNameById.get(item.cohort_id);
    if (name) {
      current.push(name);
    }
    map.set(item.user_id, current);
    return map;
  }, new Map<string, string[]>());

  const [analyticsAttemptsResult, analyticsSubmissionsResult, analyticsSessionsResult, analyticsNotificationsResult, analyticsBadgesResult] =
    coacheeIds.length
      ? await Promise.all([
          admin
            .from("quiz_attempts")
            .select("id, quiz_id, user_id, assignment_id, score, status, attempt_number, submitted_at")
            .in("user_id", coacheeIds)
            .order("submitted_at", { ascending: false }),
          admin
            .from("submissions")
            .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
            .in("user_id", coacheeIds)
            .order("submitted_at", { ascending: false }),
          admin
            .from("coaching_sessions")
            .select("coachee_id, starts_at, status")
            .eq("organization_id", organizationId)
            .in("coachee_id", coacheeIds)
            .order("starts_at", { ascending: false }),
          admin
            .from("notifications")
            .select("recipient_id, created_at, read_at")
            .eq("organization_id", organizationId)
            .in("recipient_id", coacheeIds)
            .order("created_at", { ascending: false }),
          admin
            .from("user_badges")
            .select("user_id, awarded_at")
            .in("user_id", coacheeIds)
            .order("awarded_at", { ascending: false })
        ])
      : [
          { data: [] as QuizAttemptResultRow[] },
          { data: [] as SubmissionRow[] },
          { data: [] as SessionAnalyticsRow[] },
          { data: [] as NotificationAnalyticsRow[] },
          { data: [] as BadgeAwardAnalyticsRow[] }
        ];

  const engagementSignals = buildEngagementSignals({
    learnerIds: coacheeIds,
    profiles,
    cohortNamesByUserId,
    assignments,
    cohortMembers,
    attempts: (analyticsAttemptsResult.data ?? []) as QuizAttemptResultRow[],
    submissions: (analyticsSubmissionsResult.data ?? []) as SubmissionRow[],
    sessions: (analyticsSessionsResult.data ?? []) as SessionAnalyticsRow[],
    notifications: (analyticsNotificationsResult.data ?? []) as NotificationAnalyticsRow[],
    badges: (analyticsBadgesResult.data ?? []) as BadgeAwardAnalyticsRow[]
  }).sort((left, right) => right.score - left.score || left.overdueCount - right.overdueCount);
  const engagementOverview = buildEngagementOverview(engagementSignals);
  const attentionLearners = [...engagementSignals]
    .filter((signal) => signal.band !== "strong")
    .sort((left, right) => right.overdueCount - left.overdueCount || left.score - right.score)
    .slice(0, 6);

  const roleCount = (role: AppRole) =>
    users.filter((user) => user.roles.includes(role)).length.toString();

  return {
    context,
    metrics: [
      {
        label: "Utilisateurs actifs",
        value: users.filter((user) => user.status === "active").length.toString(),
        delta: `${users.length} comptes au total`
      },
      {
        label: "Engagement moyen",
        value: `${engagementOverview.averageScore}%`,
        delta: `${engagementOverview.recentlyActiveCount} coaché(s) actifs cette semaine`
      },
      {
        label: "Coachés à relancer",
        value: engagementOverview.atRiskCount.toString(),
        delta: `${engagementOverview.watchCount} supplémentaires à surveiller`
      },
      {
        label: "Ponctualité coachés",
        value: `${engagementOverview.onTimeRate ?? 0}%`,
        delta: `${engagementOverview.completionRate ?? 0}% de complétion moyenne`
      }
    ],
    analyticsOverview: {
      ...engagementOverview,
      totalPublishedContents: contents.filter((item) => item.status === "published").length,
      totalQuizzes: quizzes.length,
      totalAssignments: assignments.length,
      totalCoaches: Number(roleCount("coach"))
    },
    engagementSignals,
    attentionLearners,
    users,
    userOptions: users.map((user) => ({
      id: user.id,
      label: `${user.name} · ${user.email}`
    })),
    coachOptions: users
      .filter((user) => user.roles.includes("coach"))
      .map((user) => ({
        id: user.id,
        label: `${user.name} · ${user.email}`
      })),
    coacheeOptions: coacheeProfiles.map((profile) => ({
      id: profile.id,
      label: `${formatUserName(profile)} · ${emailByUserId.get(profile.id) ?? "email indisponible"}`
    })),
    coacheeCohorts: coacheeProfiles.map((profile) => ({
      id: profile.id,
      name: formatUserName(profile),
      status: profile.status,
      cohorts: cohortNamesByUserId.get(profile.id) ?? []
    })),
    cohortOptions: cohorts.map((cohort) => ({
      id: cohort.id,
      label: cohort.name
    })),
    contents,
    contentOptions: contents.map((content) => ({
      id: content.id,
      label: `${content.title} · ${content.status}`
    })),
    quizzes: quizzes.map((quiz) => ({
      ...quiz,
      quiz_questions: [...(quiz.quiz_questions ?? [])].sort((left, right) => left.position - right.position)
    })),
    quizOptions: quizzes.map((quiz) => ({
      id: quiz.id,
      label: `${quiz.title} · ${quiz.status ?? "draft"}`
    })),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      due: formatDate(assignment.due_at),
      target:
        userNameById.get(assignment.assigned_user_id ?? "") ??
        cohortNameById.get(assignment.cohort_id ?? "") ??
        "cible non résolue",
      asset:
        contentTitleById.get(assignment.content_item_id ?? "") ??
        quizTitleById.get(assignment.quiz_id ?? "") ??
        "élément non résolu",
      type: assignment.quiz_id ? "quiz" : "contenu"
    }))
  };
}

export async function getAdminOverviewPageData() {
  const context = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const [profilesResult, authUsersResult, contentsResult, quizzesResult, assignmentsResult, cohortsResult] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, first_name, last_name, status, created_at, user_roles(role)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      admin.auth.admin.listUsers({
        page: 1,
        perPage: 200
      }),
      admin
        .from("content_items")
        .select("id, status", { count: "exact" })
        .eq("organization_id", organizationId),
      admin
        .from("quizzes")
        .select("id, status", { count: "exact" })
        .eq("organization_id", organizationId),
      admin
        .from("learning_assignments")
        .select("id", { count: "exact" })
        .eq("organization_id", organizationId),
      admin
        .from("cohorts")
        .select("id", { count: "exact" })
        .eq("organization_id", organizationId)
    ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const authUsers = authUsersResult.data?.users ?? [];
  const emailByUserId = new Map(authUsers.map((item) => [item.id, item.email ?? "email indisponible"]));
  const users = profiles.map((profile) => ({
    id: profile.id,
    name: formatUserName(profile),
    email: emailByUserId.get(profile.id) ?? "email indisponible",
    status: profile.status,
    roles: (profile.user_roles ?? []).map((item) => item.role)
  }));

  return {
    context,
    metrics: [
      {
        label: "Utilisateurs actifs",
        value: users.filter((user) => user.status === "active").length.toString(),
        delta: `${users.length} profils ECCE`
      },
      {
        label: "Cohortes",
        value: String(cohortsResult.count ?? 0),
        delta: `${users.filter((user) => user.roles.includes("coachee")).length} coaché(s) disponibles`
      },
      {
        label: "Contenus publiés",
        value: String(
          ((contentsResult.data ?? []) as Array<{ status: string }>).filter((item) => item.status === "published").length
        ),
        delta: `${String(contentsResult.count ?? 0)} contenus au total`
      },
      {
        label: "Quiz publiés",
        value: String(
          ((quizzesResult.data ?? []) as Array<{ status: string }>).filter((item) => item.status === "published").length
        ),
        delta: `${String(assignmentsResult.count ?? 0)} assignation(s) créées`
      }
    ],
    users,
    userOptions: users.map((user) => ({
      id: user.id,
      label: `${user.name} · ${user.email}`
    }))
  };
}

export async function getAdminUsersPageData(filters?: {
  search?: string;
  role?: string;
  status?: string;
  userId?: string;
}) {
  const context = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const search = String(filters?.search ?? "").trim();
  const normalizedSearch = search.toLowerCase();
  const roleFilter = VALID_ROLES.includes(String(filters?.role ?? "").trim() as AppRole)
    ? (String(filters?.role ?? "").trim() as AppRole)
    : "all";
  const statusFilter = VALID_MEMBERSHIP_STATUSES.includes(
    String(filters?.status ?? "").trim() as ProfileRow["status"]
  )
    ? (String(filters?.status ?? "").trim() as ProfileRow["status"])
    : "all";
  const requestedUserId = String(filters?.userId ?? "").trim();

  const [
    profilesResult,
    authUsersResult,
    cohortsResult,
    cohortMembersResult,
    coachAssignmentsResult,
    assignmentsResult,
    notificationPreferencesResult
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, last_name, bio, timezone, status, created_at, user_roles(role)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({
      page: 1,
      perPage: 200
    }),
    admin.from("cohorts").select("id, name").eq("organization_id", organizationId).order("name"),
    admin.from("cohort_members").select("user_id, cohort_id"),
    admin
      .from("coach_assignments")
      .select("coach_id, coachee_id, cohort_id")
      .eq("organization_id", organizationId),
    admin
      .from("learning_assignments")
      .select("assigned_user_id, cohort_id")
      .eq("organization_id", organizationId),
    admin
      .from("user_notification_preferences")
      .select(
        `
          user_id,
          allow_learning_notifications,
          allow_message_notifications,
          allow_review_notifications,
          allow_reward_notifications,
          allow_session_notifications
        `
      )
      .eq("organization_id", organizationId)
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const authUsers = authUsersResult.data?.users ?? [];
  const cohorts = (cohortsResult.data ?? []) as Array<{ id: string; name: string }>;
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const cohortNameById = new Map(cohorts.map((cohort) => [cohort.id, cohort.name]));
  const cohortIds = new Set(cohorts.map((cohort) => cohort.id));
  const cohortMembers = ((cohortMembersResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>).filter(
    (item) => profileIds.has(item.user_id) && cohortIds.has(item.cohort_id)
  );
  const coachAssignments = (coachAssignmentsResult.data ?? []) as Array<{
    coach_id: string;
    coachee_id: string | null;
    cohort_id: string | null;
  }>;
  const assignments = (assignmentsResult.data ?? []) as Array<{
    assigned_user_id: string | null;
    cohort_id: string | null;
  }>;
  const notificationPreferences = (notificationPreferencesResult.data ?? []) as Array<{
    user_id: string;
    allow_learning_notifications: boolean;
    allow_message_notifications: boolean;
    allow_review_notifications: boolean;
    allow_reward_notifications: boolean;
    allow_session_notifications: boolean;
  }>;

  const emailByUserId = new Map(authUsers.map((item) => [item.id, item.email ?? "email indisponible"]));
  const cohortNamesByUserId = cohortMembers.reduce((map, item) => {
    const current = map.get(item.user_id) ?? [];
    const cohortName = cohortNameById.get(item.cohort_id);
    if (cohortName) {
      current.push(cohortName);
    }
    map.set(item.user_id, current);
    return map;
  }, new Map<string, string[]>());
  const cohortMemberIdsByCohortId = cohortMembers.reduce((map, item) => {
    const current = map.get(item.cohort_id) ?? [];
    current.push(item.user_id);
    map.set(item.cohort_id, current);
    return map;
  }, new Map<string, string[]>());
  const directAssignmentsCountByUserId = assignments.reduce((map, item) => {
    if (!item.assigned_user_id) {
      return map;
    }

    map.set(item.assigned_user_id, (map.get(item.assigned_user_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const cohortAssignmentsCountByUserId = assignments.reduce((map, item) => {
    if (!item.cohort_id) {
      return map;
    }

    for (const userId of cohortMemberIdsByCohortId.get(item.cohort_id) ?? []) {
      map.set(userId, (map.get(userId) ?? 0) + 1);
    }

    return map;
  }, new Map<string, number>());
  const directCoacheeCountByCoachId = coachAssignments.reduce((map, item) => {
    if (!item.coachee_id) {
      return map;
    }

    map.set(item.coach_id, (map.get(item.coach_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const cohortPortfolioCountByCoachId = coachAssignments.reduce((map, item) => {
    if (!item.cohort_id) {
      return map;
    }

    map.set(item.coach_id, (map.get(item.coach_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const notificationEnabledCountByUserId = new Map(
    notificationPreferences.map(
      (preference) =>
        [
          preference.user_id,
          [
            preference.allow_learning_notifications,
            preference.allow_message_notifications,
            preference.allow_review_notifications,
            preference.allow_reward_notifications,
            preference.allow_session_notifications
          ].filter(Boolean).length
        ] as const
    )
  );

  const users = profiles
    .map((profile) => {
      const roles = (profile.user_roles ?? []).map((item) => item.role);
      const directAssignmentsCount = directAssignmentsCountByUserId.get(profile.id) ?? 0;
      const cohortAssignmentsCount = cohortAssignmentsCountByUserId.get(profile.id) ?? 0;
      const directCoacheeCount = directCoacheeCountByCoachId.get(profile.id) ?? 0;
      const cohortPortfolioCount = cohortPortfolioCountByCoachId.get(profile.id) ?? 0;

      return {
        id: profile.id,
        name: formatUserName(profile),
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: emailByUserId.get(profile.id) ?? "email indisponible",
        bio: profile.bio ?? "",
        timezone: profile.timezone ?? "Indian/Antananarivo",
        status: profile.status,
        roles,
        createdAtLabel: profile.created_at ? formatDate(profile.created_at) : "date indisponible",
        cohorts: cohortNamesByUserId.get(profile.id) ?? [],
        directAssignmentsCount,
        cohortAssignmentsCount,
        assignmentLoad: directAssignmentsCount + cohortAssignmentsCount,
        directCoacheeCount,
        cohortPortfolioCount,
        enabledNotificationCount: notificationEnabledCountByUserId.get(profile.id) ?? 5,
        isCurrentUser: profile.id === context.user.id
      };
    })
    .filter((user) => {
      const matchesRole = roleFilter === "all" ? true : user.roles.includes(roleFilter);
      const matchesStatus = statusFilter === "all" ? true : user.status === statusFilter;
      const matchesSearch = normalizedSearch
        ? `${user.name} ${user.email}`.toLowerCase().includes(normalizedSearch)
        : true;

      return matchesRole && matchesStatus && matchesSearch;
    });

  const activeAdminCount = profiles.filter(
    (profile) => profile.status === "active" && (profile.user_roles ?? []).some((item) => item.role === "admin")
  ).length;
  const selectedUser =
    users.find((user) => user.id === requestedUserId) ??
    users[0] ??
    null;

  return {
    context,
    filters: {
      search,
      role: roleFilter,
      status: statusFilter
    },
    metrics: [
      {
        label: "Profils ECCE",
        value: profiles.length.toString(),
        delta: `${users.length} visible(s) dans la vue actuelle`
      },
      {
        label: "Invitations en attente",
        value: profiles.filter((profile) => profile.status === "invited").length.toString(),
        delta: `${profiles.filter((profile) => profile.status === "active").length} accès actifs`
      },
      {
        label: "Comptes suspendus",
        value: profiles.filter((profile) => profile.status === "suspended").length.toString(),
        delta: "Accès temporairement bloqués"
      },
      {
        label: "Admins actifs",
        value: activeAdminCount.toString(),
        delta: `${profiles.filter((profile) => (profile.user_roles ?? []).some((item) => item.role === "coach")).length} coach(s) configurés`
      }
    ],
    users,
    selectedUser: selectedUser
      ? {
          ...selectedUser,
          availableRoles: VALID_ROLES.filter((role) => !selectedUser.roles.includes(role)),
          isLastActiveAdmin:
            selectedUser.roles.includes("admin") && selectedUser.status === "active" && activeAdminCount === 1
        }
      : null
  };
}

export async function getAdminLearnerOpsPageData() {
  const base = await getAdminPageData();
  const admin = createSupabaseAdminClient();
  const organizationId = base.context.profile.organization_id;

  const coachAssignmentsResult = await admin
    .from("coach_assignments")
    .select("id, coach_id, coachee_id, cohort_id, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const assignments = (coachAssignmentsResult.data ?? []) as Array<{
    id: string;
    coach_id: string;
    coachee_id: string | null;
    cohort_id: string | null;
    created_at: string;
  }>;

  const coachLabelById = new Map(base.coachOptions.map((item) => [item.id, item.label]));
  const coacheeLabelById = new Map(base.coacheeOptions.map((item) => [item.id, item.label]));
  const cohortLabelById = new Map(base.cohortOptions.map((item) => [item.id, item.label]));

  const coachPortfolios = base.coachOptions.map((coach) => {
    const coachRows = assignments.filter((item) => item.coach_id === coach.id);
    const directCoachees = coachRows
      .map((item) => item.coachee_id)
      .filter(Boolean)
      .map((item) => coacheeLabelById.get(item as string) ?? "Coaché")
      .slice(0, 6);
    const cohorts = coachRows
      .map((item) => item.cohort_id)
      .filter(Boolean)
      .map((item) => cohortLabelById.get(item as string) ?? "Cohorte")
      .slice(0, 6);

    return {
      id: coach.id,
      name: coach.label,
      directCount: coachRows.filter((item) => item.coachee_id).length,
      cohortCount: coachRows.filter((item) => item.cohort_id).length,
      directCoachees,
      cohorts
    };
  });

  return {
    ...base,
    coachAssignments: assignments.map((assignment) => ({
      id: assignment.id,
      coach: coachLabelById.get(assignment.coach_id) ?? "Coach inconnu",
      target:
        assignment.coachee_id
          ? coacheeLabelById.get(assignment.coachee_id) ?? "Coaché inconnu"
          : cohortLabelById.get(assignment.cohort_id ?? "") ?? "Cohorte inconnue",
      targetType: assignment.coachee_id ? "coaché" : "cohorte",
      createdAt: formatDate(assignment.created_at)
    })),
    coachPortfolios
  };
}

export async function getProfessorPageData() {
  const context = await requireRole(["admin", "professor"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const [
    coacheeRolesResult,
    profilesResult,
    cohortMembersResult,
    cohortsResult,
    contentsResult,
    quizzesResult,
    assignmentsResult
  ] = await Promise.all([
    admin
      .from("user_roles")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("role", "coachee"),
    admin
      .from("profiles")
      .select("id, first_name, last_name, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin.from("cohort_members").select("user_id, cohort_id"),
    admin.from("cohorts").select("id, name").eq("organization_id", organizationId).order("name"),
    admin
      .from("content_items")
      .select(
        "id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at"
      )
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    admin
      .from("quizzes")
      .select(
        `
          id,
          title,
          description,
          kind,
          status,
          attempts_allowed,
          time_limit_minutes,
          passing_score,
          content_item_id,
          quiz_questions ( id )
        `
      )
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    admin
      .from("learning_assignments")
      .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
  ]);

  const coacheeIds = new Set((coacheeRolesResult.data ?? []).map((item) => item.user_id));
  const profiles = ((profilesResult.data ?? []) as ProfileRow[]).filter((profile) => coacheeIds.has(profile.id));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const cohortMembers = (cohortMembersResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>;
  const cohortRows = (cohortsResult.data ?? []) as Array<{ id: string; name: string }>;
  const cohortNameById = new Map(cohortRows.map((item) => [item.id, item.name]));
  const cohortNamesByUserId = cohortMembers.reduce((map, item) => {
    const current = map.get(item.user_id) ?? [];
    const cohortName = cohortNameById.get(item.cohort_id);
    if (cohortName) {
      current.push(cohortName);
    }
    map.set(item.user_id, current);
    return map;
  }, new Map<string, string[]>());
  const learnerIds = profiles.map((profile) => profile.id);

  const [
    analyticsAttemptsResult,
    analyticsSubmissionsResult,
    analyticsSessionsResult,
    analyticsNotificationsResult,
    analyticsBadgesResult
  ] = learnerIds.length
    ? await Promise.all([
        admin
          .from("quiz_attempts")
          .select("id, quiz_id, user_id, assignment_id, score, status, attempt_number, submitted_at")
          .in("user_id", learnerIds)
          .order("submitted_at", { ascending: false }),
        admin
          .from("submissions")
          .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
          .in("user_id", learnerIds)
          .order("submitted_at", { ascending: false }),
        admin
          .from("coaching_sessions")
          .select("coachee_id, starts_at, status")
          .eq("organization_id", organizationId)
          .in("coachee_id", learnerIds)
          .order("starts_at", { ascending: false }),
        admin
          .from("notifications")
          .select("recipient_id, created_at, read_at")
          .eq("organization_id", organizationId)
          .in("recipient_id", learnerIds)
          .order("created_at", { ascending: false }),
        admin
          .from("user_badges")
          .select("user_id, awarded_at")
          .in("user_id", learnerIds)
          .order("awarded_at", { ascending: false })
      ])
    : [
        { data: [] as QuizAttemptResultRow[] },
        { data: [] as SubmissionRow[] },
        { data: [] as SessionAnalyticsRow[] },
        { data: [] as NotificationAnalyticsRow[] },
        { data: [] as BadgeAwardAnalyticsRow[] }
      ];

  const contents = (contentsResult.data ?? []) as ContentRow[];
  const quizzes = (quizzesResult.data ?? []) as Array<
    QuizRow & {
      content_item_id?: string | null;
      quiz_questions?: Array<{ id: string }>;
    }
  >;
  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[];
  const attempts = (analyticsAttemptsResult.data ?? []) as QuizAttemptResultRow[];
  const submissions = (analyticsSubmissionsResult.data ?? []) as SubmissionRow[];

  const engagementSignals = buildEngagementSignals({
    learnerIds,
    profiles,
    cohortNamesByUserId,
    assignments,
    cohortMembers,
    attempts,
    submissions,
    sessions: (analyticsSessionsResult.data ?? []) as SessionAnalyticsRow[],
    notifications: (analyticsNotificationsResult.data ?? []) as NotificationAnalyticsRow[],
    badges: (analyticsBadgesResult.data ?? []) as BadgeAwardAnalyticsRow[]
  });
  const engagementOverview = buildEngagementOverview(engagementSignals);
  const attentionLearners = [...engagementSignals]
    .filter((signal) => signal.band !== "strong")
    .sort((left, right) => right.overdueCount - left.overdueCount || left.score - right.score)
    .slice(0, 6);
  const engagementSignalById = new Map(engagementSignals.map((signal) => [signal.id, signal]));

  const cohortHealth = cohortRows
    .map((cohort) => {
      const memberIds = cohortMembers
        .filter((member) => member.cohort_id === cohort.id)
        .map((member) => member.user_id)
        .filter((memberId) => coacheeIds.has(memberId));
      const signals = memberIds
        .map((memberId) => engagementSignalById.get(memberId))
        .filter(Boolean) as LearnerEngagementSignal[];
      const averageScore = signals.length
        ? roundMetric(signals.reduce((total, signal) => total + signal.score, 0) / signals.length)
        : 0;
      const completionSignals = signals.filter((signal) => signal.completionRate !== null);
      const completionRate = completionSignals.length
        ? roundMetric(
            completionSignals.reduce((total, signal) => total + (signal.completionRate ?? 0), 0) /
              completionSignals.length
          )
        : null;
      const atRiskCount = signals.filter((signal) => signal.band === "risk").length;
      const watchCount = signals.filter((signal) => signal.band === "watch").length;
      const topFocus = [...signals]
        .sort((left, right) => right.overdueCount - left.overdueCount || left.score - right.score)[0]?.nextFocus ??
        "Aucun signal remonté pour le moment";

      return {
        id: cohort.id,
        name: cohort.name,
        memberCount: memberIds.length,
        averageScore,
        completionRate,
        atRiskCount,
        watchCount,
        strongCount: signals.filter((signal) => signal.band === "strong").length,
        tone: (averageScore >= 75 ? "success" : averageScore >= 45 ? "accent" : "warning") as
          | "success"
          | "accent"
          | "warning",
        topFocus
      };
    })
    .sort((left, right) => right.atRiskCount - left.atRiskCount || left.averageScore - right.averageScore);

  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const attemptCountByQuizId = attempts.reduce((map, attempt) => {
    map.set(attempt.quiz_id, (map.get(attempt.quiz_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const gradedAttemptsByQuizId = attempts.reduce((map, attempt) => {
    if (attempt.status !== "graded" || attempt.score === null) {
      return map;
    }

    const current = map.get(attempt.quiz_id) ?? [];
    current.push(attempt.score);
    map.set(attempt.quiz_id, current);
    return map;
  }, new Map<string, number[]>());
  const quizPulse = quizzes
    .map((quiz) => {
      const grades = gradedAttemptsByQuizId.get(quiz.id) ?? [];
      return {
        id: quiz.id,
        title: quiz.title,
        kind: quiz.kind ?? "quiz",
        questionCount: quiz.quiz_questions?.length ?? 0,
        attemptCount: attemptCountByQuizId.get(quiz.id) ?? 0,
        averageScore: grades.length ? roundMetric(grades.reduce((total, score) => total + score, 0) / grades.length) : null,
        timeLimitMinutes: quiz.time_limit_minutes ?? null
      };
    })
    .sort((left, right) => right.attemptCount - left.attemptCount || (right.averageScore ?? 0) - (left.averageScore ?? 0))
    .slice(0, 6);

  const assignmentCountByContentId = assignments.reduce((map, assignment) => {
    if (!assignment.content_item_id) {
      return map;
    }

    map.set(assignment.content_item_id, (map.get(assignment.content_item_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const linkedQuizCountByContentId = quizzes.reduce((map, quiz) => {
    if (!quiz.content_item_id) {
      return map;
    }

    map.set(quiz.content_item_id, (map.get(quiz.content_item_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const contentSpotlight = [...contents]
    .sort(
      (left, right) =>
        (assignmentCountByContentId.get(right.id) ?? 0) - (assignmentCountByContentId.get(left.id) ?? 0) ||
        (linkedQuizCountByContentId.get(right.id) ?? 0) - (linkedQuizCountByContentId.get(left.id) ?? 0)
    )
    .slice(0, 6)
    .map((content) => ({
      id: content.id,
      title: content.title,
      slug: content.slug,
      summary: content.summary ?? "Ressource publiée dans la bibliothèque ECCE.",
      category: content.category || "Bibliothèque",
      contentType: content.content_type,
      estimatedMinutes: content.estimated_minutes,
      assignmentCount: assignmentCountByContentId.get(content.id) ?? 0,
      linkedQuizCount: linkedQuizCountByContentId.get(content.id) ?? 0
    }));

  const recentQuizResults = attempts
    .slice(0, 8)
    .map((attempt) => {
      const learner = profileById.get(attempt.user_id);
      const quiz = quizById.get(attempt.quiz_id);
      const tone: "success" | "accent" = attempt.status === "graded" ? "success" : "accent";

      return {
        id: attempt.id,
        learner: learner ? formatUserName(learner) : "Coaché inconnu",
        quizTitle: quiz?.title ?? "Quiz",
        submittedAt: formatDate(attempt.submitted_at),
        attemptLabel: `Tentative ${attempt.attempt_number}`,
        score: attempt.status === "submitted" ? "En correction" : attempt.score !== null ? `${attempt.score}%` : "Non noté",
        tone
      };
    });

  const learnersWithoutCohort = profiles.filter((profile) => !(cohortNamesByUserId.get(profile.id) ?? []).length).length;

  return {
    context,
    metrics: [
      {
        label: "Cohortes actives",
        value: cohortRows.length.toString(),
        delta: `${learnersWithoutCohort} coaché(s) sans cohorte`
      },
      {
        label: "Engagement moyen",
        value: `${engagementOverview.averageScore}%`,
        delta: `${engagementOverview.recentlyActiveCount} actifs cette semaine`
      },
      {
        label: "Coachés à surveiller",
        value: engagementOverview.atRiskCount.toString(),
        delta: `${engagementOverview.watchCount} à suivre de près`
      },
      {
        label: "Quiz moyen",
        value: engagementOverview.averageQuizScore !== null ? `${engagementOverview.averageQuizScore}%` : "n/a",
        delta: `${quizzes.length} quiz publiés`
      }
    ],
    analyticsOverview: {
      ...engagementOverview,
      totalPublishedContents: contents.length,
      totalQuizzes: quizzes.length,
      totalAssignments: assignments.length,
      totalLearners: profiles.length
    },
    cohortHealth,
    attentionLearners,
    recentQuizResults,
    quizPulse,
    contentSpotlight
  };
}

export async function getAdminContentStudioPageData() {
  const context = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const programsResult = await admin
    .from("programs")
    .select("id, title, slug, description, status, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  const programs = (programsResult.data ?? []) as ProgramRow[];
  const programIds = programs.map((program) => program.id);

  const [contentsResult, modulesResult] = await Promise.all([
    admin
      .from("content_items")
      .select(
        "id, module_id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    programIds.length
      ? admin
          .from("program_modules")
          .select("id, program_id, title, description, position, status, available_at")
          .in("program_id", programIds)
      : Promise.resolve({ data: [] as ProgramModuleRow[] })
  ]);

  const contents = (contentsResult.data ?? []) as ContentRow[];
  const modules = (modulesResult.data ?? []) as ProgramModuleRow[];
  const moduleOptions = buildProgramModuleOptions(programs, modules);

  return {
    context,
    metrics: [
      {
        label: "Ressources",
        value: contents.length.toString(),
        delta: `${contents.filter((item) => item.status === "published").length} publiées`
      },
      {
        label: "Obligatoires",
        value: contents.filter((item) => item.is_required).length.toString(),
        delta: "parcours guidés"
      }
    ],
    contents,
    moduleOptions
  };
}

export async function getAdminQuizStudioPageData() {
  const context = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const programsResult = await admin
    .from("programs")
    .select("id, title, slug, description, status, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  const programs = (programsResult.data ?? []) as ProgramRow[];
  const programIds = programs.map((program) => program.id);

  const [contentsResult, quizzesResult, modulesResult] = await Promise.all([
    admin
      .from("content_items")
      .select("id, title, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("quizzes")
      .select(
        `
          id,
          title,
          description,
          kind,
          status,
          attempts_allowed,
          time_limit_minutes,
          passing_score,
          content_item_id,
          quiz_questions (
            id,
            prompt,
            helper_text,
            question_type,
            points,
            position,
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
      .order("created_at", { ascending: false }),
    programIds.length
      ? admin
          .from("program_modules")
          .select("id, program_id, title, description, position, status, available_at")
          .in("program_id", programIds)
      : Promise.resolve({ data: [] as ProgramModuleRow[] })
  ]);

  const contents = (contentsResult.data ?? []) as Array<{ id: string; title: string; status: string }>;
  const quizzes = (quizzesResult.data ?? []) as QuizRow[];
  const modules = (modulesResult.data ?? []) as ProgramModuleRow[];

  return {
    context,
    metrics: [
      {
        label: "Quiz",
        value: quizzes.length.toString(),
        delta: `${quizzes.filter((quiz) => quiz.status === "published").length} publiés`
      },
      {
        label: "Questions",
        value: quizzes.reduce((total, quiz) => total + (quiz.quiz_questions?.length ?? 0), 0).toString(),
        delta: "dans le builder"
      }
    ],
    contentOptions: contents.map((content) => ({
      id: content.id,
      label: `${content.title} · ${content.status}`
    })),
    moduleOptions: buildProgramModuleOptions(programs, modules),
    quizzes: quizzes.map((quiz) => ({
      ...quiz,
      quiz_questions: [...(quiz.quiz_questions ?? [])].sort((left, right) => left.position - right.position)
    }))
  };
}

export async function getAdminProgramStudioPageData() {
  const context = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const [
    programsResult,
    modulesResult,
    enrollmentsResult,
    profilesResult,
    authUsersResult,
    cohortsResult,
    cohortMembersResult,
    contentsResult,
    quizzesResult
  ] = await Promise.all([
    admin
      .from("programs")
      .select("id, title, slug, description, status, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("program_modules")
      .select("id, program_id, title, description, position, status, available_at")
      .order("position", { ascending: true }),
    admin
      .from("program_enrollments")
      .select("program_id, user_id, cohort_id, enrolled_at")
      .order("enrolled_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, first_name, last_name, status, user_roles(role)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({
      page: 1,
      perPage: 200
    }),
    admin.from("cohorts").select("id, name").eq("organization_id", organizationId).order("name"),
    admin.from("cohort_members").select("user_id, cohort_id"),
    admin
      .from("content_items")
      .select("id, module_id, title, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("quizzes")
      .select("id, module_id, title, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
  ]);

  const programs = (programsResult.data ?? []) as ProgramRow[];
  const programIds = new Set(programs.map((program) => program.id));
  const modules = ((modulesResult.data ?? []) as ProgramModuleRow[]).filter((module) =>
    programIds.has(module.program_id)
  );
  const enrollments = ((enrollmentsResult.data ?? []) as ProgramEnrollmentRow[]).filter((enrollment) =>
    programIds.has(enrollment.program_id)
  );
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const authUsers = authUsersResult.data?.users ?? [];
  const cohorts = (cohortsResult.data ?? []) as Array<{ id: string; name: string }>;
  const cohortMembers = (cohortMembersResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>;
  const contents = (contentsResult.data ?? []) as Array<{ id: string; module_id?: string | null; title: string; status: string }>;
  const quizzes = (quizzesResult.data ?? []) as Array<{ id: string; module_id?: string | null; title: string; status: string }>;

  const contentCountByModuleId = contents.reduce((map, item) => {
    if (!item.module_id) {
      return map;
    }

    map.set(item.module_id, (map.get(item.module_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const quizCountByModuleId = quizzes.reduce((map, item) => {
    if (!item.module_id) {
      return map;
    }

    map.set(item.module_id, (map.get(item.module_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const programTitleById = new Map(programs.map((program) => [program.id, program.title]));
  const emailByUserId = new Map(authUsers.map((user) => [user.id, user.email ?? "email indisponible"]));
  const cohortIdsByUserId = cohortMembers.reduce((map, item) => {
    const current = map.get(item.user_id) ?? [];
    current.push(item.cohort_id);
    map.set(item.user_id, current);
    return map;
  }, new Map<string, string[]>());
  const cohortNameById = new Map(cohorts.map((cohort) => [cohort.id, cohort.name]));

  const users = profiles.map((profile) => ({
    id: profile.id,
    name: formatUserName(profile),
    email: emailByUserId.get(profile.id) ?? "email indisponible",
    roles: (profile.user_roles ?? []).map((item) => item.role),
    cohortIds: cohortIdsByUserId.get(profile.id) ?? []
  }));

  const coacheeOptions = users
    .filter((user) => user.roles.includes("coachee"))
    .map((user) => ({
      id: user.id,
      label: `${user.name} · ${user.email}`,
      cohortIds: user.cohortIds
    }));

  const cohortOptions = cohorts.map((cohort) => ({
    id: cohort.id,
    label: `${cohort.name} · ${
      cohortMembers.filter((member) => member.cohort_id === cohort.id).length
    } membre(s)`
  }));

  return {
    context,
    metrics: [
      {
        label: "Parcours",
        value: programs.length.toString(),
        delta: `${programs.filter((program) => program.status === "published").length} publiés`
      },
      {
        label: "Modules",
        value: modules.length.toString(),
        delta: `${contents.filter((item) => item.module_id).length} contenus rattachés`
      },
      {
        label: "Activations",
        value: enrollments.length.toString(),
        delta: `${new Set(enrollments.map((enrollment) => enrollment.user_id)).size} coaché(s) concernés`
      }
    ],
    programOptions: programs.map((program) => ({
      id: program.id,
      label: `${program.title} · ${program.status}`
    })),
    coacheeOptions,
    cohortOptions,
    programs: programs.map((program) => {
      const programModules = modules
        .filter((module) => module.program_id === program.id)
        .sort((left, right) => left.position - right.position);
      const programEnrollments = enrollments.filter((enrollment) => enrollment.program_id === program.id);

      return {
        id: program.id,
        title: program.title,
        description: program.description,
        slug: program.slug,
        status: program.status,
        moduleCount: programModules.length,
        enrollmentCount: programEnrollments.length,
        learnerCount: new Set(programEnrollments.map((enrollment) => enrollment.user_id)).size,
        contentCount: programModules.reduce(
          (total, module) => total + (contentCountByModuleId.get(module.id) ?? 0),
          0
        ),
        quizCount: programModules.reduce((total, module) => total + (quizCountByModuleId.get(module.id) ?? 0), 0),
        modules: programModules.map((module) => ({
          id: module.id,
          title: module.title,
          description: module.description,
          position: module.position,
          status: module.status,
          availableLabel: module.available_at ? formatDate(module.available_at) : "Disponible immédiatement",
          contentCount: contentCountByModuleId.get(module.id) ?? 0,
          quizCount: quizCountByModuleId.get(module.id) ?? 0
        })),
        recentEnrollments: programEnrollments.slice(0, 4).map((enrollment) => ({
          id: `${enrollment.program_id}-${enrollment.user_id}`,
          learner:
            users.find((user) => user.id === enrollment.user_id)?.name ?? "Coaché",
          context: enrollment.cohort_id
            ? `via ${cohortNameById.get(enrollment.cohort_id) ?? "cohorte"}`
            : "activation individuelle",
          enrolledAt: formatDate(enrollment.enrolled_at),
          programLabel: programTitleById.get(enrollment.program_id) ?? "Parcours"
        }))
      };
    })
  };
}

export async function getAdminAssignmentStudioPageData() {
  const context = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const [
    profilesResult,
    authUsersResult,
    cohortsResult,
    cohortMembersResult,
    contentsResult,
    quizzesResult,
    assignmentsResult
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, last_name, status, user_roles(role)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({
      page: 1,
      perPage: 200
    }),
    admin.from("cohorts").select("id, name").eq("organization_id", organizationId).order("name"),
    admin.from("cohort_members").select("user_id, cohort_id"),
    admin
      .from("content_items")
      .select("id, title, summary, content_type, status, estimated_minutes")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("quizzes")
      .select("id, title, description, kind, status, time_limit_minutes")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("learning_assignments")
      .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const authUsers = authUsersResult.data?.users ?? [];
  const cohorts = (cohortsResult.data ?? []) as Array<{ id: string; name: string }>;
  const cohortMembers = (cohortMembersResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>;
  const contents = (contentsResult.data ?? []) as Array<{
    id: string;
    title: string;
    summary: string | null;
    content_type: string;
    status: string;
    estimated_minutes: number | null;
  }>;
  const quizzes = (quizzesResult.data ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    kind: string | null;
    status: string;
    time_limit_minutes: number | null;
  }>;
  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[];
  const emailByUserId = new Map(authUsers.map((item) => [item.id, item.email ?? "email indisponible"]));
  const userNameById = new Map(profiles.map((profile) => [profile.id, formatUserName(profile)]));
  const contentById = new Map(contents.map((content) => [content.id, content]));
  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const cohortNameById = new Map(cohorts.map((cohort) => [cohort.id, cohort.name]));
  const cohortSizeById = cohortMembers.reduce((map, item) => {
    map.set(item.cohort_id, (map.get(item.cohort_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const coacheeUsers = profiles
    .filter((profile) => (profile.user_roles ?? []).some((role) => role.role === "coachee"))
    .map((profile) => ({
      id: profile.id,
      name: formatUserName(profile),
      email: emailByUserId.get(profile.id) ?? "email indisponible"
    }));
  const now = Date.now();
  const overdueCount = assignments.filter((assignment) => getDeadlineState(assignment.due_at, false, now) === "overdue").length;
  const dueSoonCount = assignments.filter((assignment) => getDeadlineState(assignment.due_at, false, now) === "soon").length;
  const withoutDeadlineCount = assignments.filter((assignment) => getDeadlineState(assignment.due_at, false, now) === "open").length;

  return {
    context,
    metrics: [
      {
        label: "Assignations",
        value: assignments.length.toString(),
        delta: `${assignments.filter((item) => item.quiz_id).length} quiz`
      },
      {
        label: "Deadlines proches",
        value: dueSoonCount.toString(),
        delta: `${overdueCount} en retard`
      },
      {
        label: "Sans échéance",
        value: withoutDeadlineCount.toString(),
        delta: "parcours evergreen"
      },
      {
        label: "Cibles disponibles",
        value: coacheeUsers.length.toString(),
        delta: `${cohorts.length} cohortes`
      }
    ],
    userOptions: coacheeUsers.map((user) => ({
      id: user.id,
      label: `${user.name} · ${user.email}`,
      meta: "coaché individuel"
    })),
    cohortOptions: cohorts.map((cohort) => ({
      id: cohort.id,
      label: cohort.name,
      meta: `${cohortSizeById.get(cohort.id) ?? 0} coaché(s)`
    })),
    contentOptions: contents.map((content) => ({
      id: content.id,
      label: content.title,
      meta: `${content.content_type} · ${content.estimated_minutes ? `${content.estimated_minutes} min` : "durée libre"} · ${content.status}`,
      summary: content.summary
    })),
    quizOptions: quizzes.map((quiz) => ({
      id: quiz.id,
      label: quiz.title,
      meta: `${quiz.kind ?? "quiz"} · ${quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : "temps libre"} · ${quiz.status}`,
      summary: quiz.description
    })),
    assignments: assignments.map((assignment) => {
      const content = contentById.get(assignment.content_item_id ?? "");
      const quiz = quizById.get(assignment.quiz_id ?? "");
      const dueState = getDeadlineState(assignment.due_at, false, now);
      const targetIsCohort = Boolean(assignment.cohort_id);
      const kind: "quiz" | "contenu" = assignment.quiz_id ? "quiz" : "contenu";

      return {
        id: assignment.id,
        title: assignment.title,
        summary:
          content?.summary ??
          quiz?.description ??
          (assignment.quiz_id ? "Quiz programmé dans le parcours ECCE." : "Ressource programmée dans le parcours ECCE."),
        due: formatDate(assignment.due_at),
        dueState,
        statusLabel: getDeadlineStateLabel(dueState),
        statusTone: getDeadlineStateTone(dueState),
        targetLabel:
          userNameById.get(assignment.assigned_user_id ?? "") ??
          cohortNameById.get(assignment.cohort_id ?? "") ??
          "cible non résolue",
        audienceLabel: targetIsCohort
          ? `Cohorte · ${cohortSizeById.get(assignment.cohort_id ?? "") ?? 0} coaché(s)`
          : "Assignation individuelle",
        assetLabel: content?.title ?? quiz?.title ?? "élément non résolu",
        kind,
        meta: content
          ? `${content.content_type} · ${content.estimated_minutes ? `${content.estimated_minutes} min` : "durée libre"}`
          : `${quiz?.kind ?? "quiz"} · ${quiz?.time_limit_minutes ? `${quiz.time_limit_minutes} min` : "temps libre"}`
      };
    })
  };
}

export async function getLibraryPageData() {
  const context = await requireRole(["admin", "professor", "coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const [contentsResult, quizzesResult] = await Promise.all([
    admin
      .from("content_items")
      .select(
        "id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at"
      )
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("category", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    admin
      .from("quizzes")
      .select(
        "id, title, description, kind, status, attempts_allowed, time_limit_minutes, passing_score, content_item_id, created_at, quiz_questions ( id )"
      )
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
  ]);

  const contents = (contentsResult.data ?? []) as ContentRow[];
  const quizzes = (quizzesResult.data ?? []) as Array<
    QuizRow & {
      created_at?: string;
      content_item_id?: string | null;
    }
  >;
  const linkedContentIds = Array.from(
    new Set(quizzes.map((quiz) => quiz.content_item_id).filter(Boolean))
  ) as string[];
  const linkedContentRows = linkedContentIds.length
    ? (
        await admin
          .from("content_items")
          .select("id, category, subcategory, tags")
          .in("id", linkedContentIds)
      ).data ?? []
    : [];
  const linkedContentById = new Map(
    (linkedContentRows as Array<{
      id: string;
      category: string | null;
      subcategory: string | null;
      tags: string[] | null;
    }>).map((item) => [item.id, item])
  );

  const resources = [
    ...contents.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      category: item.category?.trim() || "Bibliothèque",
      subcategory: item.subcategory,
      tags: item.tags ?? [],
      badge: item.content_type,
      secondaryBadge: item.is_required ? "obligatoire" : null,
      meta: item.estimated_minutes ? `${item.estimated_minutes} min` : "durée libre",
      href: `/library/${item.slug}`,
      hrefLabel: "Explorer la ressource",
      type: "content" as const
    })),
    ...quizzes.map((quiz) => {
      const linkedContent = linkedContentById.get(quiz.content_item_id ?? "");
      const questionCount = quiz.quiz_questions?.length ?? 0;

      return {
        id: quiz.id,
        title: quiz.title,
        summary: quiz.description ?? "Quiz publié dans la bibliothèque ECCE.",
        category: linkedContent?.category?.trim() || "Quiz",
        subcategory: linkedContent?.subcategory ?? quiz.kind ?? "quiz",
        tags: linkedContent?.tags ?? [],
        badge: quiz.kind ?? "quiz",
        secondaryBadge: `${questionCount} question(s)`,
        meta: quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : `${quiz.attempts_allowed ?? 1} tentative(s)`,
        href: `/quiz/${quiz.id}`,
        hrefLabel: "Ouvrir le quiz",
        type: "quiz" as const
      };
    })
  ];

  const groups = Array.from(
    resources.reduce((map, item) => {
      const key = item.category;
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
      return map;
    }, new Map<string, Array<(typeof resources)[number]>>())
  ).map(([category, items]) => ({
    category,
    items
  }));

  const taxonomy = Array.from(
    new Set(
      resources.flatMap((item) =>
        [item.category, item.subcategory, ...item.tags].filter(Boolean) as string[]
      )
    )
  );

  return {
    context,
    resources,
    groups,
    taxonomy
  };
}

export async function getLibraryResourcePageData(slug: string) {
  const context = await requireRole(["admin", "professor", "coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const contentResult = await admin
    .from("content_items")
    .select(
      "id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at"
    )
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<ContentRow>();

  if (contentResult.error || !contentResult.data) {
    return null;
  }

  const content = contentResult.data;
  const [linkedQuizzesResult, relatedResourcesResult] = await Promise.all([
    admin
      .from("quizzes")
      .select(
        "id, title, description, kind, attempts_allowed, time_limit_minutes, passing_score, quiz_questions ( id )"
      )
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .eq("content_item_id", content.id)
      .order("created_at", { ascending: false })
      .limit(3),
    content.category
      ? admin
          .from("content_items")
          .select(
            "id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at"
          )
          .eq("organization_id", organizationId)
          .eq("status", "published")
          .eq("category", content.category)
          .neq("id", content.id)
          .order("created_at", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as ContentRow[] })
  ]);

  const linkedQuizzes = ((linkedQuizzesResult.data ?? []) as Array<
    QuizRow & {
      quiz_questions?: Array<{ id: string }>;
    }
  >).map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? "Quiz lié à cette ressource.",
    kind: quiz.kind ?? "quiz",
    questionCount: quiz.quiz_questions?.length ?? 0,
    timeLimitMinutes: quiz.time_limit_minutes ?? null
  }));

  const relatedResources = ((relatedResourcesResult.data ?? []) as ContentRow[]).map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary ?? "Ressource complémentaire dans la même collection.",
    contentType: item.content_type,
    estimatedMinutes: item.estimated_minutes
  }));

  return {
    context,
    content,
    linkedQuizzes,
    relatedResources
  };
}

export async function getCoachPageData() {
  const context = await requireRole(["admin", "coach"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const coachScope =
    context.role === "coach"
      ? await getCoachAssignmentScope({
          organizationId,
          coachId: context.user.id
        })
      : null;
  const scopedCoacheeIds = coachScope?.coacheeIds ?? [];
  const scopedCohortIds = coachScope?.cohortIds ?? [];

  const [
    coacheeRolesResult,
    coachRolesResult,
    profilesResult,
    cohortsResult,
    sessionsResult,
    assignmentsResult,
    quizAttemptsResult,
    submissionsResult
  ] =
    await Promise.all([
      (() => {
        const query = admin
          .from("user_roles")
          .select("user_id, role")
          .eq("organization_id", organizationId)
          .eq("role", "coachee");

        if (context.role === "coach") {
          return scopedCoacheeIds.length
            ? query.in("user_id", scopedCoacheeIds)
            : Promise.resolve({ data: [] as Array<{ user_id: string; role: AppRole }> });
        }

        return query;
      })(),
      admin
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .eq("role", "coach"),
      (() => {
        const query = admin
          .from("profiles")
          .select("id, first_name, last_name, status")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (context.role === "coach") {
          const profileIds = Array.from(new Set([...scopedCoacheeIds, context.user.id]));

          return profileIds.length
            ? query.in("id", profileIds)
            : Promise.resolve({ data: [] as ProfileRow[] });
        }

        return query;
      })(),
      (() => {
        if (context.role === "coach") {
          const filters: string[] = [];

          if (scopedCoacheeIds.length) {
            filters.push(`user_id.in.(${scopedCoacheeIds.join(",")})`);
          }

          if (scopedCohortIds.length) {
            filters.push(`cohort_id.in.(${scopedCohortIds.join(",")})`);
          }

          return filters.length
            ? admin.from("cohort_members").select("user_id, cohort_id").or(filters.join(","))
            : Promise.resolve({ data: [] as Array<{ user_id: string; cohort_id: string }> });
        }

        return admin.from("cohort_members").select("user_id, cohort_id");
      })(),
      (() => {
        let query = admin
          .from("coaching_sessions")
          .select("id, starts_at, status, coachee_id, cohort_id")
          .eq("organization_id", organizationId)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true });

        if (context.role === "coach") {
          query = query.eq("coach_id", context.user.id);
        }

        return query.limit(6);
      })(),
      (() => {
        if (context.role === "coach") {
          return Promise.all([
            scopedCoacheeIds.length
              ? admin
                  .from("learning_assignments")
                  .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id")
                  .eq("organization_id", organizationId)
                  .in("assigned_user_id", scopedCoacheeIds)
                  .not("due_at", "is", null)
                  .order("due_at", { ascending: true })
                  .limit(20)
              : Promise.resolve({ data: [] as AssignmentRow[] }),
            scopedCohortIds.length
              ? admin
                  .from("learning_assignments")
                  .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id")
                  .eq("organization_id", organizationId)
                  .in("cohort_id", scopedCohortIds)
                  .not("due_at", "is", null)
                  .order("due_at", { ascending: true })
                  .limit(20)
              : Promise.resolve({ data: [] as AssignmentRow[] })
          ]).then(([directAssignments, cohortAssignments]) => ({
            data: Array.from(
              new Map(
                [
                  ...((directAssignments.data ?? []) as AssignmentRow[]),
                  ...((cohortAssignments.data ?? []) as AssignmentRow[])
                ].map((item) => [item.id, item])
              ).values()
            )
          }));
        }

        return admin
          .from("learning_assignments")
          .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id")
          .eq("organization_id", organizationId)
          .not("due_at", "is", null)
          .order("due_at", { ascending: true })
          .limit(20);
      })(),
      (() => {
        const query = admin
          .from("quiz_attempts")
          .select(
            "id, quiz_id, user_id, score, status, attempt_number, submitted_at, profiles:user_id(first_name, last_name)"
          )
          .order("submitted_at", { ascending: false })
          .limit(10);

        if (context.role === "coach") {
          return scopedCoacheeIds.length
            ? query.in("user_id", scopedCoacheeIds)
            : Promise.resolve({ data: [] as QuizAttemptResultRow[] });
        }

        return query;
      })(),
      (() => {
        const query = admin
          .from("submissions")
          .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
          .order("submitted_at", { ascending: false })
          .limit(10);

        if (context.role === "coach") {
          return scopedCoacheeIds.length
            ? query.in("user_id", scopedCoacheeIds)
            : Promise.resolve({ data: [] as SubmissionRow[] });
        }

        return query;
      })()
    ]);

  const coacheeIds = new Set((coacheeRolesResult.data ?? []).map((item) => item.user_id));
  const coachIds = new Set((coachRolesResult.data ?? []).map((item) => item.user_id));
  const allProfiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(allProfiles.map((profile) => [profile.id, profile]));
  const profiles = allProfiles.filter((item) =>
    coacheeIds.has(item.id)
  );
  const cohortMembers = (cohortsResult.data ?? []) as Array<{
    user_id: string;
    cohort_id: string;
  }>;

  const cohortIds = Array.from(new Set([...cohortMembers.map((item) => item.cohort_id), ...scopedCohortIds]));
  const { data: cohortRows } = cohortIds.length
    ? await admin.from("cohorts").select("id, name").in("id", cohortIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const cohortNameById = new Map((cohortRows ?? []).map((item) => [item.id, item.name]));

  const cohortNamesByUserId = cohortMembers.reduce((map, item) => {
    const list = map.get(item.user_id) ?? [];
    const name = cohortNameById.get(item.cohort_id);
    if (name) list.push(name);
    map.set(item.user_id, list);
    return map;
  }, new Map<string, string[]>());
  const coacheeIdList = Array.from(coacheeIds);

  const [analyticsAttemptsResult, analyticsSubmissionsResult, analyticsSessionsResult, analyticsNotificationsResult, analyticsBadgesResult] =
    coacheeIdList.length
      ? await Promise.all([
          admin
            .from("quiz_attempts")
            .select("id, quiz_id, user_id, assignment_id, score, status, attempt_number, submitted_at")
            .in("user_id", coacheeIdList)
            .order("submitted_at", { ascending: false }),
          admin
            .from("submissions")
            .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
            .in("user_id", coacheeIdList)
            .order("submitted_at", { ascending: false }),
          admin
            .from("coaching_sessions")
            .select("coachee_id, starts_at, status")
            .eq("organization_id", organizationId)
            .in("coachee_id", coacheeIdList)
            .order("starts_at", { ascending: false }),
          admin
            .from("notifications")
            .select("recipient_id, created_at, read_at")
            .eq("organization_id", organizationId)
            .in("recipient_id", coacheeIdList)
            .order("created_at", { ascending: false }),
          admin
            .from("user_badges")
            .select("user_id, awarded_at")
            .in("user_id", coacheeIdList)
            .order("awarded_at", { ascending: false })
        ])
      : [
          { data: [] as QuizAttemptResultRow[] },
          { data: [] as SubmissionRow[] },
          { data: [] as SessionAnalyticsRow[] },
          { data: [] as NotificationAnalyticsRow[] },
          { data: [] as BadgeAwardAnalyticsRow[] }
        ];

  const engagementSignals = buildEngagementSignals({
    learnerIds: coacheeIdList,
    profiles,
    cohortNamesByUserId,
    assignments: (assignmentsResult.data ?? []) as AssignmentRow[],
    cohortMembers,
    attempts: (analyticsAttemptsResult.data ?? []) as QuizAttemptResultRow[],
    submissions: (analyticsSubmissionsResult.data ?? []) as SubmissionRow[],
    sessions: (analyticsSessionsResult.data ?? []) as SessionAnalyticsRow[],
    notifications: (analyticsNotificationsResult.data ?? []) as NotificationAnalyticsRow[],
    badges: (analyticsBadgesResult.data ?? []) as BadgeAwardAnalyticsRow[]
  });
  const engagementSignalById = new Map(engagementSignals.map((signal) => [signal.id, signal]));
  const engagementOverview = buildEngagementOverview(engagementSignals);
  const attentionLearners = [...engagementSignals]
    .filter((signal) => signal.band !== "strong")
    .sort((left, right) => right.overdueCount - left.overdueCount || left.score - right.score)
    .slice(0, 6);

  const sessions = (sessionsResult.data ?? []) as Array<{
    id: string;
    starts_at: string;
    status: string;
    coachee_id: string;
    cohort_id: string | null;
  }>;

  const roster = profiles.slice(0, 8).map((profile) => ({
    id: profile.id,
    name: formatUserName(profile),
    status: profile.status,
    cohorts: cohortNamesByUserId.get(profile.id) ?? [],
    upcomingSession: sessions.find((session) => session.coachee_id === profile.id)?.starts_at ?? null,
    engagement: engagementSignalById.get(profile.id) ?? null,
    engagementScore: engagementSignalById.get(profile.id)?.score ?? null,
    engagementBandLabel: engagementSignalById.get(profile.id)?.bandLabel ?? null,
    nextFocus: engagementSignalById.get(profile.id)?.nextFocus ?? null,
    overdueCount: engagementSignalById.get(profile.id)?.overdueCount ?? 0,
    dueSoonCount: engagementSignalById.get(profile.id)?.dueSoonCount ?? 0,
    completedCount: engagementSignalById.get(profile.id)?.completedCount ?? 0
  }));

  const dueAssignments = ((assignmentsResult.data ?? []) as AssignmentRow[])
    .map((assignment) => {
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
    })
    .filter((assignment) => assignment.targetIds.some((id) => coacheeIds.has(id)))
    .slice(0, 8)
    .map((assignment) => {
      const dueState = getDeadlineState(assignment.due_at);
      const kind: "quiz" | "contenu" = assignment.quiz_id ? "quiz" : "contenu";

      return {
        id: assignment.id,
        title: assignment.title,
        due: formatDate(assignment.due_at),
        dueState,
        statusLabel: getDeadlineStateLabel(dueState),
        statusTone: getDeadlineStateTone(dueState),
        targetCount: assignment.targetIds.length,
        meta: `${assignment.targetIds.length} coaché(s) concernés`,
        kind,
        audienceLabel: assignment.cohort_id
          ? `Cohorte · ${cohortNameById.get(assignment.cohort_id) ?? "groupe"}`
          : "Assignation individuelle"
      };
    });

  const recentQuizResults = ((quizAttemptsResult.data ?? []) as QuizAttemptResultRow[])
    .filter((attempt) => coacheeIds.has(attempt.user_id))
    .map((attempt) => ({
      id: attempt.id,
      learner: (() => {
        const profile = Array.isArray(attempt.profiles) ? attempt.profiles[0] : attempt.profiles;
        return profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : "Coaché inconnu";
      })(),
      score: attempt.status === "submitted" ? "En correction" : attempt.score !== null ? `${attempt.score}%` : "Non noté",
      status: attempt.status,
      attempt: `Tentative ${attempt.attempt_number}`,
      submittedAt: formatDate(attempt.submitted_at)
    }));

  const coachVisibleAttempts = ((quizAttemptsResult.data ?? []) as QuizAttemptResultRow[]).filter((attempt) =>
    coacheeIds.has(attempt.user_id)
  );
  const coachVisibleAttemptIds = coachVisibleAttempts.map((attempt) => attempt.id);
  const textAnswersResult = coachVisibleAttemptIds.length
    ? await admin
        .from("quiz_attempt_answers")
        .select("attempt_id, question_id, answer_text, points_awarded")
        .in("attempt_id", coachVisibleAttemptIds)
        .not("answer_text", "is", null)
    : { data: [] as Array<{ attempt_id: string; question_id: string; answer_text: string | null; points_awarded: number | null }> };
  const textAnswerRows = (textAnswersResult.data ?? []) as Array<{
    attempt_id: string;
    question_id: string;
    answer_text: string | null;
    points_awarded: number | null;
  }>;
  const textQuestionIds = Array.from(new Set(textAnswerRows.map((answer) => answer.question_id)));
  const textQuizIds = Array.from(new Set(coachVisibleAttempts.map((attempt) => attempt.quiz_id)));
  const [textQuestionRowsResult, textQuizRowsResult] = await Promise.all([
    textQuestionIds.length
      ? admin.from("quiz_questions").select("id, prompt, points").in("id", textQuestionIds)
      : Promise.resolve({ data: [] as Array<{ id: string; prompt: string; points: number }> }),
    textQuizIds.length
      ? admin.from("quizzes").select("id, title").in("id", textQuizIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> })
  ]);
  const textQuestionById = new Map(
    ((textQuestionRowsResult.data ?? []) as Array<{ id: string; prompt: string; points: number }>).map((question) => [
      question.id,
      question
    ])
  );
  const textQuizTitleById = new Map(
    ((textQuizRowsResult.data ?? []) as Array<{ id: string; title: string }>).map((quiz) => [quiz.id, quiz.title])
  );
  const textAnswersByAttemptId = textAnswerRows.reduce((map, answer) => {
    const list = map.get(answer.attempt_id) ?? [];
    list.push(answer);
    map.set(answer.attempt_id, list);
    return map;
  }, new Map<string, typeof textAnswerRows>());
  const textReviewQueue = coachVisibleAttempts
    .filter((attempt) => textAnswersByAttemptId.has(attempt.id) && attempt.status !== "graded")
    .map((attempt) => {
      const learner = profileById.get(attempt.user_id);
      const answers = (textAnswersByAttemptId.get(attempt.id) ?? []).map((answer) => {
        const question = textQuestionById.get(answer.question_id);

        return {
          questionId: answer.question_id,
          prompt: question?.prompt ?? "Question",
          answerText: answer.answer_text ?? "",
          maxPoints: question?.points ?? 0
        };
      });

      return {
        id: attempt.id,
        learner: learner ? formatUserName(learner) : "Coaché inconnu",
        quizTitle: textQuizTitleById.get(attempt.quiz_id) ?? "Quiz",
        submittedAt: formatDate(attempt.submitted_at),
        attemptLabel: `Tentative ${attempt.attempt_number}`,
        score: attempt.score !== null ? `${attempt.score}%` : "En attente",
        answers
      };
    });

  const submissions = ((submissionsResult.data ?? []) as SubmissionRow[]).filter((item) =>
    coacheeIds.has(item.user_id)
  );
  const reviewIds = submissions.map((item) => item.id);
  const [reviewsResult, contentRowsResult] = await Promise.all([
    reviewIds.length
      ? admin
          .from("submission_reviews")
          .select("id, submission_id, grade, feedback, created_at")
          .in("submission_id", reviewIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as SubmissionReviewRow[] }),
    submissions.some((item) => Boolean(item.content_item_id))
      ? admin
          .from("content_items")
          .select("id, title")
          .in(
            "id",
            Array.from(new Set(submissions.map((item) => item.content_item_id).filter(Boolean))) as string[]
          )
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> })
  ]);

  const latestReviewBySubmissionId = new Map<string, SubmissionReviewRow>();
  for (const review of (reviewsResult.data ?? []) as SubmissionReviewRow[]) {
    if (!latestReviewBySubmissionId.has(review.submission_id)) {
      latestReviewBySubmissionId.set(review.submission_id, review);
    }
  }

  const contentTitleById = new Map((contentRowsResult.data ?? []).map((item) => [item.id, item.title]));
  const reviewQueue = await Promise.all(
    submissions.slice(0, 6).map(async (submission) => {
      const learner = profileById.get(submission.user_id);

      return {
        id: submission.id,
        learner: learner ? formatUserName(learner) : "Coaché inconnu",
        title: submission.title,
        contentTitle: contentTitleById.get(submission.content_item_id ?? "") ?? "Contenu",
        submittedAt: formatDate(submission.submitted_at),
        status: submission.status,
        notes: submission.notes,
        fileUrl: await getSignedSubmissionUrl(submission.storage_path, admin),
        review: latestReviewBySubmissionId.get(submission.id) ?? null
      };
    })
  );

  const coachOptions = uniqueById(
    allProfiles
      .filter((profile) => coachIds.has(profile.id) || profile.id === context.user.id)
      .map((profile) => ({
        id: profile.id,
        label: formatUserName(profile)
      }))
  );

  const cohortCountById = cohortMembers.reduce((map, item) => {
    map.set(item.cohort_id, (map.get(item.cohort_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const cohortOptions = (cohortRows ?? [])
    .map((cohort) => ({
      id: cohort.id,
      label: cohort.name,
      memberCount: cohortCountById.get(cohort.id) ?? 0
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "fr"));

  const coacheeOptions = profiles.map((profile) => ({
    id: profile.id,
    label: formatUserName(profile),
    cohortIds: cohortMembers.filter((item) => item.user_id === profile.id).map((item) => item.cohort_id),
    cohortLabels: cohortNamesByUserId.get(profile.id) ?? []
  }));

  const messagingWorkspace = context.roles.includes("coach")
    ? await getMessagingWorkspace({
        organizationId,
        userId: context.user.id,
        viewerRole: "coach",
        contactOptions: coacheeOptions,
        conversationLimit: 4,
        recentMessageLimit: 40,
        includeInitialMessages: false
      })
    : null;

  return {
    context,
    metrics: [
      {
        label: "Coachés suivis",
        value: profiles.length.toString(),
        delta: `${profiles.filter((profile) => profile.status === "active").length} actifs`
      },
      {
        label: "Engagement moyen",
        value: `${engagementOverview.averageScore}%`,
        delta: `${engagementOverview.recentlyActiveCount} actifs cette semaine`
      },
      {
        label: "Coachés à relancer",
        value: engagementOverview.atRiskCount.toString(),
        delta: `${engagementOverview.watchCount} à surveiller`
      },
      {
        label: "Deadlines actives",
        value: dueAssignments.length.toString(),
        delta: `${engagementOverview.completionRate ?? 0}% de complétion moyenne`
      }
    ],
    engagementOverview,
    engagementSignals: [...engagementSignals].sort(
      (left, right) => right.score - left.score || left.overdueCount - right.overdueCount
    ),
    attentionLearners,
    coachOptions,
    cohortOptions,
    coacheeOptions,
    roster,
    deadlines: dueAssignments,
    recentQuizResults,
    textReviewQueue,
    reviewQueue,
    messagingWorkspace,
    sessions: sessions.map((session) => ({
      id: session.id,
      name: profileById.get(session.coachee_id)
        ? formatUserName(profileById.get(session.coachee_id)!)
        : "Coaché inconnu",
      date: formatDate(session.starts_at),
      cohort: session.cohort_id ? (cohortNameById.get(session.cohort_id) ?? null) : null
    }))
  };
}

export async function getAgendaPageData() {
  const context = await requireRole(["admin", "coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const userId = context.user.id;
  const now = Date.now();
  const rangeStartIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const rangeEndIso = new Date(now + 45 * 24 * 60 * 60 * 1000).toISOString();

  const coachScope =
    context.role === "coach"
      ? await getCoachAssignmentScope({
          organizationId,
          coachId: userId
        })
      : null;
  const branding = await getOrganizationBrandingById(organizationId);

  const directCohortRowsResult = await admin.from("cohort_members").select("user_id, cohort_id");
  const allCohortRows = (directCohortRowsResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>;
  const ownCohortIds =
    context.role === "coachee"
      ? allCohortRows.filter((item) => item.user_id === userId).map((item) => item.cohort_id)
      : [];
  const coachIdsForLearner =
    context.role === "coachee"
      ? await getAssignedCoachIdsForCoachee({
          organizationId,
          coacheeId: userId,
          cohortIds: ownCohortIds
        })
      : [];

  const scopedProfileIds =
    context.role === "coach"
      ? Array.from(new Set([userId, ...(coachScope?.coacheeIds ?? [])]))
      : context.role === "coachee"
        ? Array.from(new Set([userId, ...coachIdsForLearner]))
        : [];

  const [profilesResult, coachRolesResult, coacheeRolesResult, cohortsResult] = await Promise.all([
    (() => {
      const query = admin
        .from("profiles")
        .select("id, first_name, last_name, status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (context.role === "admin") {
        return query;
      }

      return scopedProfileIds.length
        ? query.in("id", scopedProfileIds)
        : Promise.resolve({ data: [] as ProfileRow[] });
    })(),
    (() => {
      const query = admin
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .eq("role", "coach");

      if (context.role === "coach") {
        return query.eq("user_id", userId);
      }

      if (context.role === "coachee") {
        return coachIdsForLearner.length
          ? query.in("user_id", coachIdsForLearner)
          : Promise.resolve({ data: [] as Array<{ user_id: string; role: AppRole }> });
      }

      return query;
    })(),
    (() => {
      const query = admin
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .eq("role", "coachee");

      if (context.role === "admin") {
        return query;
      }

      return coachScope?.coacheeIds?.length
        ? query.in("user_id", coachScope.coacheeIds)
        : context.role === "coachee"
          ? query.eq("user_id", userId)
          : Promise.resolve({ data: [] as Array<{ user_id: string; role: AppRole }> });
    })(),
    admin.from("cohorts").select("id, name").eq("organization_id", organizationId).order("name")
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const coachIds = new Set((coachRolesResult.data ?? []).map((item) => item.user_id));
  const coacheeIds = new Set((coacheeRolesResult.data ?? []).map((item) => item.user_id));
  const cohortRows = (cohortsResult.data ?? []) as Array<{ id: string; name: string }>;
  const cohortNameById = new Map(cohortRows.map((cohort) => [cohort.id, cohort.name]));

  const visibleCohortRows =
    context.role === "admin"
      ? allCohortRows
      : context.role === "coach"
        ? allCohortRows.filter(
            (item) =>
              (coachScope?.coacheeIds ?? []).includes(item.user_id) ||
              (coachScope?.cohortIds ?? []).includes(item.cohort_id)
          )
        : allCohortRows.filter((item) => item.user_id === userId);

  const cohortCountById = visibleCohortRows.reduce((map, item) => {
    map.set(item.cohort_id, (map.get(item.cohort_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const cohortLabelsByUserId = visibleCohortRows.reduce((map, item) => {
    const current = map.get(item.user_id) ?? [];
    const cohortName = cohortNameById.get(item.cohort_id);

    if (cohortName) {
      current.push(cohortName);
    }

    map.set(item.user_id, current);
    return map;
  }, new Map<string, string[]>());

  const [sessionsResult, assignmentsResult] = await Promise.all([
    (() => {
      const query = admin
        .from("coaching_sessions")
        .select("id, coach_id, coachee_id, cohort_id, starts_at, ends_at, status, video_link")
        .eq("organization_id", organizationId)
        .gte("starts_at", rangeStartIso)
        .lte("starts_at", rangeEndIso)
        .order("starts_at", { ascending: true })
        .limit(80);

      if (context.role === "admin") {
        return query;
      }

      if (context.role === "coach") {
        return query.eq("coach_id", userId);
      }

      return query.eq("coachee_id", userId);
    })(),
    (() => {
      const baseQuery = admin
        .from("learning_assignments")
        .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
        .eq("organization_id", organizationId)
        .not("due_at", "is", null)
        .gte("due_at", rangeStartIso)
        .order("due_at", { ascending: true })
        .limit(80);

      if (context.role === "admin") {
        return baseQuery;
      }

      if (context.role === "coach") {
        const scopedCoacheeIds = coachScope?.coacheeIds ?? [];
        const scopedCohortIds = coachScope?.cohortIds ?? [];

        return Promise.all([
          scopedCoacheeIds.length
            ? admin
                .from("learning_assignments")
                .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
                .eq("organization_id", organizationId)
                .in("assigned_user_id", scopedCoacheeIds)
                .not("due_at", "is", null)
                .gte("due_at", rangeStartIso)
                .order("due_at", { ascending: true })
                .limit(80)
            : Promise.resolve({ data: [] as AssignmentRow[] }),
          scopedCohortIds.length
            ? admin
                .from("learning_assignments")
                .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
                .eq("organization_id", organizationId)
                .in("cohort_id", scopedCohortIds)
                .not("due_at", "is", null)
                .gte("due_at", rangeStartIso)
                .order("due_at", { ascending: true })
                .limit(80)
            : Promise.resolve({ data: [] as AssignmentRow[] })
        ]).then(([directRows, cohortRows]) => ({
          data: Array.from(
            new Map(
              [
                ...((directRows.data ?? []) as AssignmentRow[]),
                ...((cohortRows.data ?? []) as AssignmentRow[])
              ].map((item) => [item.id, item])
            ).values()
          )
        }));
      }

      return Promise.all([
        admin
          .from("learning_assignments")
          .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
          .eq("organization_id", organizationId)
          .eq("assigned_user_id", userId)
          .not("due_at", "is", null)
          .gte("due_at", rangeStartIso)
          .order("due_at", { ascending: true })
          .limit(80),
        ownCohortIds.length
          ? admin
              .from("learning_assignments")
              .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
              .eq("organization_id", organizationId)
              .in("cohort_id", ownCohortIds)
              .not("due_at", "is", null)
              .gte("due_at", rangeStartIso)
              .order("due_at", { ascending: true })
              .limit(80)
          : Promise.resolve({ data: [] as AssignmentRow[] })
      ]).then(([directRows, cohortRows]) => ({
        data: Array.from(
          new Map(
            [
              ...((directRows.data ?? []) as AssignmentRow[]),
              ...((cohortRows.data ?? []) as AssignmentRow[])
            ].map((item) => [item.id, item])
          ).values()
        )
      }));
    })()
  ]);

  const sessions = (sessionsResult.data ?? []) as Array<{
    id: string;
    coach_id: string;
    coachee_id: string;
    cohort_id: string | null;
    starts_at: string;
    ends_at: string | null;
    status: string;
    video_link: string | null;
  }>;
  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[];

  const contentIds = Array.from(new Set(assignments.map((assignment) => assignment.content_item_id).filter(Boolean))) as string[];
  const quizIds = Array.from(new Set(assignments.map((assignment) => assignment.quiz_id).filter(Boolean))) as string[];

  const [contentsResult, quizzesResult] = await Promise.all([
    contentIds.length
      ? admin.from("content_items").select("id, title, slug").in("id", contentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; slug: string }> }),
    quizIds.length
      ? admin.from("quizzes").select("id, title").in("id", quizIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> })
  ]);

  const contentById = new Map(((contentsResult.data ?? []) as Array<{ id: string; title: string; slug: string }>).map((item) => [item.id, item]));
  const quizById = new Map(((quizzesResult.data ?? []) as Array<{ id: string; title: string }>).map((item) => [item.id, item]));

  const showPlanner = context.role === "admin" || (context.role === "coach" && branding.allowCoachSelfSchedule);
  const coachOptions = showPlanner
    ? profiles
        .filter((profile) => coachIds.has(profile.id) || (context.role === "coach" && profile.id === userId))
        .map((profile) => ({
          id: profile.id,
          label: formatUserName(profile)
        }))
    : [];
  const coacheeOptions = showPlanner
    ? profiles
        .filter((profile) => coacheeIds.has(profile.id))
        .map((profile) => ({
          id: profile.id,
          label: formatUserName(profile),
          cohortIds: visibleCohortRows.filter((item) => item.user_id === profile.id).map((item) => item.cohort_id),
          cohortLabels: cohortLabelsByUserId.get(profile.id) ?? []
        }))
    : [];
  const cohortOptions = showPlanner
    ? cohortRows
        .filter((cohort) => {
          if (context.role === "admin") {
            return true;
          }

          return (coachScope?.cohortIds ?? []).includes(cohort.id);
        })
        .map((cohort) => ({
          id: cohort.id,
          label: cohort.name,
          memberCount: cohortCountById.get(cohort.id) ?? 0
        }))
    : [];

  const sessionEvents = sessions.map((session) => {
    const coacheeName = profileById.get(session.coachee_id)
      ? formatUserName(profileById.get(session.coachee_id)!)
      : "Coaché inconnu";
    const coachName = profileById.get(session.coach_id)
      ? formatUserName(profileById.get(session.coach_id)!)
      : "Coach inconnu";
    const relativeDay = getRelativeDayLabel(session.starts_at, now);

    return {
      id: `session-${session.id}`,
      type: "session" as const,
      timestamp: new Date(session.starts_at).getTime(),
      dayLabel: relativeDay,
      dateLabel: formatDateCompact(session.starts_at),
      timeLabel: `${formatTimeOnly(session.starts_at)}${session.ends_at ? ` → ${formatTimeOnly(session.ends_at)}` : ""}`,
      title: context.role === "coachee" ? "Séance de coaching" : coacheeName,
      subtitle:
        context.role === "admin"
          ? `Coach · ${coachName}`
          : session.cohort_id
            ? `Cohorte · ${cohortNameById.get(session.cohort_id) ?? "groupe"}`
            : "Séance individuelle",
      statusLabel: session.status,
      statusTone:
        session.status === "completed"
          ? ("success" as const)
          : session.status === "cancelled"
            ? ("warning" as const)
            : ("accent" as const),
      audienceLabel:
        context.role === "coachee"
          ? coachName
          : session.cohort_id
            ? `${cohortNameById.get(session.cohort_id) ?? "Cohorte"}`
            : "1:1",
      href: session.video_link || null,
      ctaLabel: session.video_link ? "Rejoindre" : null,
      isOverdue: new Date(session.starts_at).getTime() < now && session.status === "planned",
      isToday: relativeDay === "Aujourd'hui"
    };
  });

  const deadlineEvents = assignments.map((assignment) => {
    const dueState = getDeadlineState(assignment.due_at, false, now);
    const dueTimestamp = assignment.due_at ? new Date(assignment.due_at).getTime() : now;
    const content = assignment.content_item_id ? contentById.get(assignment.content_item_id) : null;
    const quiz = assignment.quiz_id ? quizById.get(assignment.quiz_id) : null;

    return {
      id: `deadline-${assignment.id}`,
      type: "deadline" as const,
      timestamp: dueTimestamp,
      dayLabel: getRelativeDayLabel(assignment.due_at, now),
      dateLabel: formatDateCompact(assignment.due_at),
      timeLabel: formatTimeOnly(assignment.due_at),
      title: assignment.title,
      subtitle:
        assignment.quiz_id
          ? `Quiz · ${quiz?.title ?? "quiz"}`
          : `Contenu · ${content?.title ?? "ressource"}`,
      statusLabel: getDeadlineStateLabel(dueState),
      statusTone: getDeadlineStateTone(dueState),
      audienceLabel:
        context.role === "coachee"
          ? assignment.cohort_id
            ? `Cohorte · ${cohortNameById.get(assignment.cohort_id) ?? "groupe"}`
            : "Assignation individuelle"
          : assignment.assigned_user_id
            ? profileById.get(assignment.assigned_user_id)
              ? formatUserName(profileById.get(assignment.assigned_user_id)!)
              : "Coaché"
            : `Cohorte · ${cohortNameById.get(assignment.cohort_id ?? "") ?? "groupe"}`,
      href: assignment.quiz_id
        ? `/quiz/${assignment.quiz_id}${context.role === "coachee" ? `?assignment=${assignment.id}` : ""}`
        : context.role === "coachee"
          ? `/assignments/${assignment.id}`
          : content
            ? `/library/${content.slug}`
            : null,
      ctaLabel: assignment.quiz_id ? "Ouvrir le quiz" : context.role === "coachee" ? "Ouvrir l'assignation" : "Ouvrir la ressource",
      isOverdue: dueState === "overdue",
      isToday: getRelativeDayLabel(assignment.due_at, now) === "Aujourd'hui"
    };
  });

  const events = [...sessionEvents, ...deadlineEvents].sort((left, right) => left.timestamp - right.timestamp);
  const upcomingSessions = sessionEvents.filter((event) => event.timestamp >= now && event.statusLabel === "planned").length;
  const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
  const dueThisWeek = deadlineEvents.filter((event) => event.timestamp >= now && event.timestamp <= weekEnd).length;
  const overdueCount = deadlineEvents.filter((event) => event.isOverdue).length;
  const todayCount = events.filter((event) => event.isToday).length;
  const nextEvent = events.find((event) => event.timestamp >= now) ?? events[0] ?? null;

  return {
    context,
    metrics: [
      {
        label: "Événements à venir",
        value: events.filter((event) => event.timestamp >= now).length.toString(),
        delta: nextEvent ? `Prochain temps fort · ${nextEvent.title}` : "Aucun événement planifié"
      },
      {
        label: "Séances prévues",
        value: upcomingSessions.toString(),
        delta: context.role === "coachee" ? "Tes créneaux coach remontent ici" : "Planning de coaching unifié"
      },
      {
        label: "Deadlines 7 jours",
        value: dueThisWeek.toString(),
        delta: overdueCount ? `${overdueCount} en retard` : "Aucun retard détecté"
      },
      {
        label: "Aujourd'hui",
        value: todayCount.toString(),
        delta: todayCount ? "Journée déjà chargée" : "Rien de bloquant aujourd'hui"
      }
    ],
    events,
    planner:
      showPlanner
        ? {
            allowCoachSelection: context.role === "admin",
            coachOptions,
            cohortOptions,
            coacheeOptions
          }
        : null
  };
}

export async function getLearnerProgramsPageData() {
  const context = await requireRole(["admin", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const userId = context.user.id;

  const cohortMembersResult = await admin.from("cohort_members").select("cohort_id").eq("user_id", userId);
  const cohortIds = (cohortMembersResult.data ?? []).map((item) => item.cohort_id);

  const enrollmentsResult = await admin
    .from("program_enrollments")
    .select("program_id, user_id, cohort_id, enrolled_at")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  const enrollments = (enrollmentsResult.data ?? []) as ProgramEnrollmentRow[];
  const programIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.program_id)));

  if (!programIds.length) {
    return {
      context,
      metrics: [
        {
          label: "Parcours actifs",
          value: "0",
          delta: "Aucun programme activé pour ce profil"
        },
        {
          label: "Progression moyenne",
          value: "0%",
          delta: "Dès qu'un parcours sera activé, la progression apparaîtra ici"
        },
        {
          label: "Modules visibles",
          value: "0",
          delta: "Le studio admin peut maintenant structurer les parcours"
        }
      ],
      programs: []
    };
  }

  const [programsResult, modulesResult] = await Promise.all([
    admin
      .from("programs")
      .select("id, title, slug, description, status, created_at")
      .eq("organization_id", organizationId)
      .in("id", programIds)
      .order("created_at", { ascending: false }),
    admin
      .from("program_modules")
      .select("id, program_id, title, description, position, status, available_at")
      .in("program_id", programIds)
      .order("position", { ascending: true })
  ]);

  const programs = (programsResult.data ?? []) as ProgramRow[];
  const modules = (modulesResult.data ?? []) as ProgramModuleRow[];
  const moduleIds = modules.map((module) => module.id);

  const [contentsResult, quizzesResult] = await Promise.all([
    moduleIds.length
      ? admin
          .from("content_items")
          .select(
            "id, module_id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at"
          )
          .eq("organization_id", organizationId)
          .eq("status", "published")
          .in("module_id", moduleIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ContentRow[] }),
    moduleIds.length
      ? admin
          .from("quizzes")
          .select("id, module_id, title, description, kind, status, attempts_allowed, time_limit_minutes, passing_score")
          .eq("organization_id", organizationId)
          .eq("status", "published")
          .in("module_id", moduleIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as QuizRow[] })
  ]);

  const contents = (contentsResult.data ?? []) as ContentRow[];
  const quizzes = (quizzesResult.data ?? []) as QuizRow[];
  const contentIds = contents.map((item) => item.id);
  const quizIds = quizzes.map((item) => item.id);

  const assignmentQuery =
    context.role === "admin"
      ? Promise.resolve({ data: [] as AssignmentRow[] })
      : (() => {
          const filters = [`assigned_user_id.eq.${userId}`, ...cohortIds.map((cohortId) => `cohort_id.eq.${cohortId}`)];

          if (!filters.length) {
            return Promise.resolve({ data: [] as AssignmentRow[] });
          }

          return admin
            .from("learning_assignments")
            .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
            .eq("organization_id", organizationId)
            .or(filters.join(","))
            .order("published_at", { ascending: false });
        })();

  const [assignmentsResult, submissionsResult, attemptsResult] = await Promise.all([
    assignmentQuery,
    contentIds.length
      ? admin
          .from("submissions")
          .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
          .eq("user_id", userId)
          .in("content_item_id", contentIds)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [] as SubmissionRow[] }),
    quizIds.length
      ? admin
          .from("quiz_attempts")
          .select("id, quiz_id, user_id, assignment_id, score, status, attempt_number, submitted_at")
          .eq("user_id", userId)
          .in("quiz_id", quizIds)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [] as QuizAttemptResultRow[] })
  ]);

  const assignments = ((assignmentsResult.data ?? []) as AssignmentRow[]).filter(
    (assignment) =>
      (assignment.content_item_id && contentIds.includes(assignment.content_item_id)) ||
      (assignment.quiz_id && quizIds.includes(assignment.quiz_id))
  );
  const submissions = (submissionsResult.data ?? []) as SubmissionRow[];
  const attempts = (attemptsResult.data ?? []) as QuizAttemptResultRow[];

  const latestSubmissionByContentId = new Map<string, SubmissionRow>();
  for (const submission of submissions) {
    if (submission.content_item_id && !latestSubmissionByContentId.has(submission.content_item_id)) {
      latestSubmissionByContentId.set(submission.content_item_id, submission);
    }
  }

  const latestAttemptByQuizId = new Map<string, QuizAttemptResultRow>();
  for (const attempt of attempts) {
    if (attempt.quiz_id && !latestAttemptByQuizId.has(attempt.quiz_id)) {
      latestAttemptByQuizId.set(attempt.quiz_id, attempt);
    }
  }

  const assignmentByContentId = new Map<string, AssignmentRow>();
  const assignmentByQuizId = new Map<string, AssignmentRow>();
  for (const assignment of assignments) {
    if (assignment.content_item_id && !assignmentByContentId.has(assignment.content_item_id)) {
      assignmentByContentId.set(assignment.content_item_id, assignment);
    }

    if (assignment.quiz_id && !assignmentByQuizId.has(assignment.quiz_id)) {
      assignmentByQuizId.set(assignment.quiz_id, assignment);
    }
  }

  const moduleListByProgramId = modules.reduce((map, module) => {
    const current = map.get(module.program_id) ?? [];
    current.push(module);
    map.set(module.program_id, current);
    return map;
  }, new Map<string, ProgramModuleRow[]>());

  const programCards = programs.map((program) => {
    const programModules = (moduleListByProgramId.get(program.id) ?? []).sort((left, right) => left.position - right.position);

    const moduleCards = programModules.map((module) => {
      const moduleContents = contents.filter((content) => content.module_id === module.id);
      const moduleQuizzes = quizzes.filter((quiz) => quiz.module_id === module.id);

      const items = [
        ...moduleContents.map((content) => {
          const assignment = assignmentByContentId.get(content.id) ?? null;
          const submission = latestSubmissionByContentId.get(content.id) ?? null;
          const completed = Boolean(submission && ["submitted", "reviewed", "late"].includes(submission.status));

          return {
            id: content.id,
            type: "contenu",
            title: content.title,
            description: content.summary || `${content.content_type}${content.estimated_minutes ? ` · ${content.estimated_minutes} min` : ""}`,
            completed,
            href: assignment ? `/assignments/${assignment.id}` : `/library/${content.slug}`,
            dueLabel: assignment?.due_at ? formatDate(assignment.due_at) : "Accessible maintenant",
            tone: completed ? "success" : assignment?.due_at ? getDeadlineStateTone(getDeadlineState(assignment.due_at)) : "neutral"
          };
        }),
        ...moduleQuizzes.map((quiz) => {
          const assignment = assignmentByQuizId.get(quiz.id) ?? null;
          const attempt = latestAttemptByQuizId.get(quiz.id) ?? null;
          const completed = Boolean(attempt && ["submitted", "graded"].includes(attempt.status));

          return {
            id: quiz.id,
            type: "quiz",
            title: quiz.title,
            description:
              quiz.description ||
              `${quiz.kind ?? "quiz"}${quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : ""}`,
            completed,
            href: assignment ? `/quiz/${quiz.id}?assignment=${assignment.id}` : `/quiz/${quiz.id}`,
            dueLabel: assignment?.due_at ? formatDate(assignment.due_at) : "Ouverture libre",
            tone: completed ? "success" : assignment?.due_at ? getDeadlineStateTone(getDeadlineState(assignment.due_at)) : "accent"
          };
        })
      ];

      const completedItems = items.filter((item) => item.completed).length;
      const totalItems = items.length;
      const progress = totalItems ? Math.round((completedItems / totalItems) * 100) : 0;
      const nextItem = items.find((item) => !item.completed) ?? null;

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        position: module.position,
        status: module.status,
        availableLabel: module.available_at ? formatDate(module.available_at) : "Ouvert maintenant",
        progress,
        progressTone: getProgramProgressTone(progress),
        completedItems,
        totalItems,
        nextFocus: nextItem?.title ?? (items.length ? "Module complété" : "Module en préparation"),
        items
      };
    });

    const totalItems = moduleCards.reduce((total, module) => total + module.totalItems, 0);
    const completedItems = moduleCards.reduce((total, module) => total + module.completedItems, 0);
    const progress = totalItems ? Math.round((completedItems / totalItems) * 100) : 0;
    const nextFocus = moduleCards.find((module) => module.completedItems < module.totalItems)?.nextFocus ?? "Parcours complété";
    const enrollment = enrollments.find((item) => item.program_id === program.id);

    return {
      id: program.id,
      title: program.title,
      description: program.description,
      status: program.status,
      enrolledAt: enrollment ? formatDate(enrollment.enrolled_at) : "Activation récente",
      progress,
      progressTone: getProgramProgressTone(progress),
      completedItems,
      totalItems,
      moduleCount: moduleCards.length,
      nextFocus,
      modules: moduleCards
    };
  });

  const averageProgress = programCards.length
    ? Math.round(programCards.reduce((total, program) => total + program.progress, 0) / programCards.length)
    : 0;

  return {
    context,
    metrics: [
      {
        label: "Parcours actifs",
        value: programCards.length.toString(),
        delta: `${enrollments.length} activation(s) enregistrée(s)`
      },
      {
        label: "Progression moyenne",
        value: `${averageProgress}%`,
        delta: programCards[0] ? `Focus · ${programCards[0].nextFocus}` : "Aucun focus pour le moment"
      },
      {
        label: "Modules visibles",
        value: programCards.reduce((total, program) => total + program.moduleCount, 0).toString(),
        delta: `${programCards.reduce((total, program) => total + program.totalItems, 0)} ressources et quiz`
      }
    ],
    programs: programCards
  };
}

export async function getDashboardPageData() {
  const context = await requireRole(["admin", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const userId = context.user.id;

  const [
    cohortMembersResult,
    notificationsResult,
    publishedContentResult,
    quizzesResult,
    quizAttemptsResult,
    sessionsResult,
    badgesResult
  ] =
    await Promise.all([
      admin.from("cohort_members").select("cohort_id").eq("user_id", userId),
      admin
        .from("notifications")
        .select("id, title, body, created_at, read_at, deeplink")
        .eq("organization_id", organizationId)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
      admin
        .from("content_items")
        .select(
          "id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at",
          { count: "exact" }
        )
        .eq("organization_id", organizationId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(4),
      admin
        .from("quizzes")
        .select("id", { count: "exact" })
        .eq("organization_id", organizationId)
        .eq("status", "published"),
      admin
        .from("quiz_attempts")
        .select("id, quiz_id, assignment_id, score, status, attempt_number, submitted_at")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(6),
      admin
        .from("coaching_sessions")
        .select("id, starts_at, video_link")
        .eq("organization_id", organizationId)
        .eq("coachee_id", userId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(4),
      admin
        .from("user_badges")
        .select("id, user_id, awarded_at, badges(title, description, icon)")
        .eq("user_id", userId)
        .order("awarded_at", { ascending: false })
        .limit(6)
    ]);

  const cohortIds = (cohortMembersResult.data ?? []).map((item) => item.cohort_id);
  const { data: cohortRows } = cohortIds.length
    ? await admin.from("cohorts").select("id, name").in("id", cohortIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const cohortNameById = new Map((cohortRows ?? []).map((item) => [item.id, item.name]));
  const cohortLabels = cohortIds.map((id) => cohortNameById.get(id)).filter(Boolean) as string[];

  const [directAssignmentsResult, cohortAssignmentsResult] = await Promise.all([
    admin
      .from("learning_assignments")
      .select("id, title, due_at, content_item_id, quiz_id")
      .eq("organization_id", organizationId)
      .eq("assigned_user_id", userId)
      .order("due_at", { ascending: true }),
    cohortIds.length
      ? admin
          .from("learning_assignments")
          .select("id, title, due_at, content_item_id, quiz_id")
          .eq("organization_id", organizationId)
          .in("cohort_id", cohortIds)
          .order("due_at", { ascending: true })
      : Promise.resolve({ data: [] as AssignmentRow[] })
  ]);

  const assignments = Array.from(
    new Map(
      [...((directAssignmentsResult.data ?? []) as AssignmentRow[]), ...((cohortAssignmentsResult.data ??
        []) as AssignmentRow[])].map((item) => [item.id, item])
    ).values()
  );

  const contentIds = Array.from(
    new Set(assignments.map((item) => item.content_item_id).filter(Boolean))
  ) as string[];
  const attempts = (quizAttemptsResult.data ?? []) as Array<{
    id: string;
    quiz_id: string;
    assignment_id?: string | null;
    score: number | null;
    status: string;
    attempt_number: number;
    submitted_at: string | null;
  }>;
  const attemptByQuizId = new Map<string, {
    id: string;
    quiz_id: string;
    score: number | null;
    status: string;
    attempt_number: number;
    submitted_at: string | null;
  }>();
  for (const attempt of attempts) {
    if (!attemptByQuizId.has(attempt.quiz_id)) {
      attemptByQuizId.set(attempt.quiz_id, attempt);
    }
  }
  const quizIds = Array.from(
    new Set([
      ...assignments.map((item) => item.quiz_id).filter(Boolean),
      ...attempts.map((item) => item.quiz_id).filter(Boolean)
    ])
  ) as string[];

  const [assignmentContentsResult, assignmentQuizzesResult] = await Promise.all([
    contentIds.length
      ? admin
          .from("content_items")
          .select(
            "id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at"
          )
          .in("id", contentIds)
      : Promise.resolve({ data: [] as ContentRow[] }),
    quizIds.length
      ? admin.from("quizzes").select("id, title, description, kind, time_limit_minutes").in("id", quizIds)
      : Promise.resolve({ data: [] as QuizRow[] })
  ]);

  const contentById = new Map(
    ((assignmentContentsResult.data ?? []) as ContentRow[]).map((item) => [item.id, item])
  );
  const quizById = new Map(((assignmentQuizzesResult.data ?? []) as QuizRow[]).map((item) => [item.id, item]));

  const notifications = (notificationsResult.data ?? []) as NotificationRow[];
  const publishedContents = (publishedContentResult.data ?? []) as ContentRow[];
  const submissionsResult = assignments.length
    ? await admin
        .from("submissions")
        .select("id, assignment_id, status, reviewed_at, submitted_at")
        .eq("user_id", userId)
        .in(
          "assignment_id",
          assignments.map((item) => item.id)
        )
        .order("submitted_at", { ascending: false })
    : { data: [] as Array<{ id: string; assignment_id: string | null; status: string; reviewed_at: string | null; submitted_at: string | null }> };
  const submissionByAssignmentId = new Map<string, {
    id: string;
    assignment_id: string | null;
    status: string;
    reviewed_at: string | null;
    submitted_at: string | null;
  }>();
  for (const submission of (submissionsResult.data ?? []) as Array<{
    id: string;
    assignment_id: string | null;
    status: string;
    reviewed_at: string | null;
    submitted_at: string | null;
  }>) {
    if (submission.assignment_id && !submissionByAssignmentId.has(submission.assignment_id)) {
      submissionByAssignmentId.set(submission.assignment_id, submission);
    }
  }
  const badges = ((badgesResult.data ?? []) as UserBadgeRow[]).map((badge) => {
    const badgeInfo = Array.isArray(badge.badges) ? badge.badges[0] : badge.badges;

    return {
      id: badge.id,
      title: badgeInfo?.title ?? "Badge ECCE",
      description: badgeInfo?.description ?? "Nouveau jalon débloqué.",
      icon: badgeInfo?.icon ?? "spark",
      awardedAt: formatDate(badge.awarded_at)
    };
  });
  const upcomingSessions = ((sessionsResult.data ?? []) as Array<{
    id: string;
    starts_at: string;
    video_link: string | null;
  }>).map((session) => ({
    id: session.id,
    date: formatDate(session.starts_at),
    videoLink: session.video_link
  }));
  const engagement = buildEngagementSignals({
    learnerIds: [userId],
    profiles: [
      {
        id: userId,
        first_name: context.profile.first_name,
        last_name: context.profile.last_name,
        status: context.profile.status
      }
    ],
    cohortNamesByUserId: new Map<string, string[]>(),
    assignments,
    cohortMembers: (cohortMembersResult.data ?? []).map((item) => ({
      user_id: userId,
      cohort_id: item.cohort_id
    })),
    attempts: attempts as QuizAttemptResultRow[],
    submissions: (submissionsResult.data ?? []) as SubmissionRow[],
    sessions: ((sessionsResult.data ?? []) as Array<{ id: string; starts_at: string; video_link: string | null }>).map(
      (session) => ({
        coachee_id: userId,
        starts_at: session.starts_at,
        status: "planned"
      })
    ),
    notifications: notifications.map((notification) => ({
      recipient_id: userId,
      created_at: notification.created_at,
      read_at: notification.read_at
    })),
    badges: ((badgesResult.data ?? []) as Array<{ user_id: string; awarded_at: string }>).map((badge) => ({
      user_id: badge.user_id,
      awarded_at: badge.awarded_at
    }))
  })[0] ?? {
    id: userId,
    name: `${context.profile.first_name} ${context.profile.last_name}`.trim(),
    status: context.profile.status,
    cohorts: [],
    score: 0,
    band: "watch" as const,
    bandLabel: "A surveiller",
    trend: "steady" as const,
    trendLabel: "rythme stable",
    assignmentCount: assignments.length,
    completedCount: 0,
    completionRate: null,
    onTimeRate: null,
    averageQuizScore: null,
    overdueCount: 0,
    dueSoonCount: 0,
    unreadNotifications: notifications.filter((item) => !item.read_at).length,
    badgeCount: badges.length,
    recentActivityCount: 0,
    lastActivityAt: null,
    lastActivityLabel: "Aucune activité détectée",
    nextFocus: "Commencer la première action assignée"
  };

  const coachContacts = context.roles.includes("coachee")
    ? await (async () => {
        const coachIds = await getAssignedCoachIdsForCoachee({
          organizationId,
          coacheeId: userId,
          cohortIds
        });

        if (!coachIds.length) {
          return [];
        }

        const coachProfiles = (
          await admin
            .from("profiles")
            .select("id, first_name, last_name")
            .eq("organization_id", organizationId)
            .in("id", coachIds)
            .order("first_name", { ascending: true })
        ).data ?? [];

        return coachProfiles.map((profile) => ({
          id: profile.id,
          label: `${profile.first_name} ${profile.last_name}`.trim()
        }));
      })()
    : [];

  const messagingWorkspace = context.roles.includes("coachee")
    ? await getMessagingWorkspace({
        organizationId,
        userId,
        viewerRole: "coachee",
        contactOptions: coachContacts,
        conversationLimit: 4,
        recentMessageLimit: 40,
        includeInitialMessages: false
      })
    : null;

  return {
    context,
    profileName: `${context.profile.first_name} ${context.profile.last_name}`.trim(),
    cohortLabels,
    metrics: [
      {
        label: "Score d'engagement",
        value: `${engagement.score}%`,
        delta: engagement.bandLabel
      },
      {
        label: "Travaux assignés",
        value: assignments.length.toString(),
        delta: `${engagement.completedCount} déjà traités`
      },
      {
        label: "Quiz moyen",
        value: engagement.averageQuizScore !== null ? `${engagement.averageQuizScore}%` : "n/a",
        delta: `${String(quizzesResult.count ?? 0)} quiz publiés`
      },
      {
        label: "Deadlines proches",
        value: engagement.dueSoonCount.toString(),
        delta: `${engagement.unreadNotifications} notification(s) non lue(s)`
      }
    ],
    engagement,
    coachCount: coachContacts.length,
    publishedContentCount: publishedContentResult.count ?? 0,
    publishedQuizCount: quizzesResult.count ?? 0,
    assignments: assignments.slice(0, 6).map((item) => {
      const linkedContent = contentById.get(item.content_item_id ?? "");
      const linkedQuiz = quizById.get(item.quiz_id ?? "");
      const contentSubmission = submissionByAssignmentId.get(item.id);
      const hasQuizAttempt = attemptByQuizId.has(item.quiz_id ?? "");
      const kind: "quiz" | "contenu" = item.content_item_id ? "contenu" : "quiz";
      const completionStatus = item.content_item_id
        ? contentSubmission?.status === "reviewed"
          ? "reviewed"
          : contentSubmission?.status === "submitted"
            ? "submitted"
            : "pending"
        : hasQuizAttempt
          ? "done"
          : "pending";
      const dueState = getDeadlineState(item.due_at, completionStatus === "reviewed" || completionStatus === "done");

      return {
        id: item.id,
        title: linkedContent?.title ?? linkedQuiz?.title ?? item.title,
        summary:
          linkedContent?.summary ??
          linkedQuiz?.description ??
          (item.quiz_id ? "Quiz prêt à être lancé depuis ton parcours." : "Ressource à consulter puis à rendre."),
        due: formatDate(item.due_at),
        dueState,
        statusLabel:
          completionStatus === "reviewed"
            ? "corrigé"
            : completionStatus === "submitted"
              ? "en revue"
              : completionStatus === "done"
                ? "terminé"
                : getDeadlineStateLabel(dueState),
        statusTone:
          completionStatus === "reviewed" || completionStatus === "done"
            ? "success"
            : completionStatus === "submitted"
              ? "accent"
              : getDeadlineStateTone(dueState),
        kind,
        href: item.content_item_id ? `/assignments/${item.id}` : `/quiz/${item.quiz_id}?assignment=${item.id}`,
        ctaLabel:
          item.content_item_id
            ? contentSubmission
              ? "Voir le rendu"
              : "Rendre"
            : hasQuizAttempt
              ? "Revoir"
              : "Lancer",
        meta: linkedContent
          ? `${linkedContent.category || "Bibliothèque"} · ${linkedContent.content_type} · ${linkedContent.estimated_minutes ? `${linkedContent.estimated_minutes} min` : "durée libre"}`
          : `${linkedQuiz?.kind ?? "quiz"} · ${linkedQuiz?.time_limit_minutes ? `${linkedQuiz.time_limit_minutes} min` : "temps libre"}`,
        assetLabel: linkedContent?.title ?? linkedQuiz?.title ?? item.title
      };
    }),
    notifications,
    upcomingSessions: upcomingSessions.map((session, index) => ({
      ...session,
      emphasis: index === 0 ? "prochaine" : "planifiée"
    })),
    badges,
    messagingWorkspace,
    recentContents: publishedContents.map((content) => ({
      id: content.id,
      title: content.title,
      summary: content.summary ?? "Ressource publiée dans la bibliothèque ECCE.",
      category: content.category || "Sans catégorie",
      content_type: content.content_type,
      is_required: content.is_required,
      meta: `${content.category || "Bibliothèque"} · ${content.content_type}${content.estimated_minutes ? ` · ${content.estimated_minutes} min` : ""}`,
      href: `/library/${content.slug}`
    })),
    recentAttempts: attempts.map((attempt) => {
      const tone: "neutral" | "success" = attempt.status === "submitted" ? "neutral" : "success";

      return {
        id: attempt.id,
        title: quizById.get(attempt.quiz_id)?.title ?? "Quiz",
        score: attempt.status === "submitted" ? "En correction" : attempt.score !== null ? `${attempt.score}%` : "Non noté",
        meta: `Tentative ${attempt.attempt_number} · ${formatDate(attempt.submitted_at)}${attempt.status === "submitted" ? " · correction coach en cours" : ""}`,
        tone
      };
    })
  };
}

export async function getAssignmentPageData(assignmentId: string) {
  const context = await requireRole(["admin", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const userId = context.user.id;

  const assignmentResult = await admin
    .from("learning_assignments")
    .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id")
    .eq("organization_id", organizationId)
    .eq("id", assignmentId)
    .maybeSingle<AssignmentRow>();

  if (assignmentResult.error || !assignmentResult.data) {
    return {
      context,
      assignment: null,
      submissions: []
    };
  }

  const assignment = assignmentResult.data;

  if (context.role !== "admin") {
    let isAllowed = assignment.assigned_user_id === userId;

    if (!isAllowed && assignment.cohort_id) {
      const { data: cohortMember } = await admin
        .from("cohort_members")
        .select("cohort_id")
        .eq("user_id", userId)
        .eq("cohort_id", assignment.cohort_id)
        .maybeSingle<{ cohort_id: string }>();

      isAllowed = Boolean(cohortMember);
    }

    if (!isAllowed) {
      return {
        context,
        assignment: null,
        submissions: []
      };
    }
  }

  const [contentResult, submissionsResult] = await Promise.all([
    assignment.content_item_id
      ? admin
          .from("content_items")
          .select("id, title, summary, category, subcategory, tags, content_type, estimated_minutes, is_required, external_url, youtube_url")
          .eq("id", assignment.content_item_id)
          .maybeSingle<{
            id: string;
            title: string;
            summary: string | null;
            category: string | null;
            subcategory: string | null;
            tags: string[] | null;
            content_type: string;
            estimated_minutes: number | null;
            is_required: boolean;
            external_url: string | null;
            youtube_url: string | null;
          }>()
      : Promise.resolve({ data: null }),
    admin
      .from("submissions")
      .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
      .eq("user_id", userId)
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: false })
  ]);

  const submissions = (submissionsResult.data ?? []) as SubmissionRow[];
  const reviewIds = submissions.map((item) => item.id);
  const reviewsResult = reviewIds.length
    ? await admin
        .from("submission_reviews")
        .select("id, submission_id, grade, feedback, created_at")
        .in("submission_id", reviewIds)
        .order("created_at", { ascending: false })
    : { data: [] as SubmissionReviewRow[] };
  const latestReviewBySubmissionId = new Map<string, SubmissionReviewRow>();

  for (const review of (reviewsResult.data ?? []) as SubmissionReviewRow[]) {
    if (!latestReviewBySubmissionId.has(review.submission_id)) {
      latestReviewBySubmissionId.set(review.submission_id, review);
    }
  }

  const latestSubmission = submissions[0] ?? null;
  const dueState = getDeadlineState(
    assignment.due_at,
    latestSubmission?.status === "reviewed"
  );

  return {
    context,
    assignment: {
      id: assignment.id,
      title: assignment.title,
      due: formatDate(assignment.due_at),
      dueState,
      dueLabel: getDeadlineStateLabel(dueState),
      dueTone: getDeadlineStateTone(dueState),
      quizId: assignment.quiz_id,
      contentTitle: contentResult.data?.title ?? "Contenu ECCE",
      contentSummary:
        contentResult.data?.summary ??
        "Ressource assignée dans ton parcours ECCE. Consulte-la puis dépose ici ton rendu pour enclencher la relecture.",
      contentMeta:
        [
          contentResult.data?.category,
          contentResult.data?.subcategory,
          contentResult.data?.content_type,
          contentResult.data?.estimated_minutes ? `${contentResult.data.estimated_minutes} min` : null
        ]
          .filter(Boolean)
          .join(" · ") || "ressource",
      resourceUrl: contentResult.data?.youtube_url ?? contentResult.data?.external_url ?? null,
      tags: contentResult.data?.tags ?? [],
      isRequired: contentResult.data?.is_required ?? false,
      submissionCount: submissions.length,
      latestSubmissionStatus: latestSubmission ? getSubmissionStatusLabel(latestSubmission.status) : "pas encore envoyé",
      latestSubmissionTone: latestSubmission ? getSubmissionStatusTone(latestSubmission.status) : "neutral"
    },
    submissions: await Promise.all(
      submissions.map(async (submission) => ({
        id: submission.id,
        title: submission.title,
        notes: submission.notes,
        status: submission.status,
        statusLabel: getSubmissionStatusLabel(submission.status),
        statusTone: getSubmissionStatusTone(submission.status),
        submittedAt: formatDate(submission.submitted_at),
        fileUrl: await getSignedSubmissionUrl(submission.storage_path, admin),
        review: latestReviewBySubmissionId.get(submission.id) ?? null,
        reviewLabel: latestReviewBySubmissionId.get(submission.id)
          ? latestReviewBySubmissionId.get(submission.id)?.grade !== null
            ? `Note ${latestReviewBySubmissionId.get(submission.id)?.grade}/100`
            : "Feedback disponible"
          : null
      }))
    )
  };
}

export async function getQuizPageData(quizId: string) {
  const context = await requireRole(["admin", "professor", "coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const { data: quiz } = await admin
    .from("quizzes")
    .select(
      `
        id,
        title,
        description,
        kind,
        status,
        attempts_allowed,
        time_limit_minutes,
        passing_score,
        randomize_questions,
        quiz_questions (
          id,
          prompt,
          helper_text,
          question_type,
          points,
          position,
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
    .maybeSingle<
      QuizRow & {
        quiz_questions: QuizQuestionRow[];
      }
    >();

  if (!quiz) {
    return {
      context,
      quiz: null,
      attempts: []
    };
  }

  const { data: attempts } = context.roles.includes("coachee") || context.roles.includes("admin")
    ? await admin
        .from("quiz_attempts")
        .select("id, quiz_id, user_id, score, status, attempt_number, submitted_at")
        .eq("quiz_id", quizId)
        .eq("user_id", context.user.id)
        .order("attempt_number", { ascending: false })
    : { data: [] as QuizAttemptResultRow[] };

  return {
    context,
    quiz: {
      ...quiz,
      quiz_questions: [...(quiz.quiz_questions ?? [])].sort((left, right) => left.position - right.position)
    },
    attempts: (attempts ?? []) as QuizAttemptResultRow[]
  };
}
