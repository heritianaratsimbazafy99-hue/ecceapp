import { AUDIT_CATEGORY_LABELS, AUDIT_EVENT_CATEGORIES, type AuditEventCategory } from "@/lib/audit";
import { getAssignedCoachIdsForCoachee, getCoachAssignmentScope } from "@/lib/coach-assignments";
import {
  getNotificationOpsLaneLabel,
  getNotificationOpsNavigation,
  isNotificationOpsLane,
  summarizeNotificationOps,
  type NotificationOpsLane
} from "@/lib/notification-ops";
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
  created_at?: string;
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
  created_at?: string;
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

type BadgeTone = "neutral" | "accent" | "warning" | "success";
type MessageInboxLane = "reply" | "watch" | "aligned";

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

type CoachingNoteRow = {
  id: string;
  session_id: string;
  coach_id: string;
  summary: string | null;
  blockers: string | null;
  next_actions: string | null;
  created_at: string;
};

type AuditEventRow = {
  id: string;
  actor_id: string | null;
  category: AuditEventCategory;
  action: string;
  summary: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  target_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
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

function normalizeDataSearchQuery(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/[^\p{L}\p{N}\s@._-]/gu, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function matchesDataSearch(values: Array<string | null | undefined>, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  const haystack = values.join(" ").toLowerCase();
  return haystack.includes(normalizedQuery.toLowerCase());
}

async function getCoachVisibleLearnerScope() {
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

  const coacheeRolesResult =
    context.role === "coach"
      ? coachScope?.coacheeIds.length
        ? await admin
            .from("user_roles")
            .select("user_id, role")
            .eq("organization_id", organizationId)
            .eq("role", "coachee")
            .in("user_id", coachScope.coacheeIds)
        : { data: [] as Array<{ user_id: string; role: AppRole }> }
      : await admin
          .from("user_roles")
          .select("user_id, role")
          .eq("organization_id", organizationId)
          .eq("role", "coachee");

  const learnerIds = Array.from(new Set((coacheeRolesResult.data ?? []).map((item) => item.user_id)));
  const [profilesResult, cohortMembersResult] = learnerIds.length
    ? await Promise.all([
        admin
          .from("profiles")
          .select("id, first_name, last_name, status, bio, timezone, created_at")
          .eq("organization_id", organizationId)
          .in("id", learnerIds),
        admin.from("cohort_members").select("user_id, cohort_id").in("user_id", learnerIds)
      ])
    : [
        { data: [] as ProfileRow[] },
        { data: [] as Array<{ user_id: string; cohort_id: string }> }
      ];

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const cohortMembers = (cohortMembersResult.data ?? []) as Array<{
    user_id: string;
    cohort_id: string;
  }>;
  const cohortIds = Array.from(new Set(cohortMembers.map((item) => item.cohort_id)));
  const { data: cohortRows } = cohortIds.length
    ? await admin.from("cohorts").select("id, name").in("id", cohortIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const cohortNameById = new Map((cohortRows ?? []).map((item) => [item.id, item.name]));
  const cohortNamesByUserId = cohortMembers.reduce((map, item) => {
    const current = map.get(item.user_id) ?? [];
    const cohortName = cohortNameById.get(item.cohort_id);

    if (cohortName) {
      current.push(cohortName);
    }

    map.set(item.user_id, current);
    return map;
  }, new Map<string, string[]>());

  return {
    admin,
    context,
    organizationId,
    coachScope,
    learnerIds,
    profiles,
    profileById,
    cohortMembers,
    cohortNameById,
    cohortNamesByUserId
  };
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

type AdminProgramLane = "priority" | "scaffold" | "draft" | "active";
type AgendaLane = "urgent" | "today" | "upcoming" | "recent";
type AgendaScope = "sessions" | "deadlines";
type LearnerProgramLane = "urgent" | "momentum" | "launch" | "completed";

function isAdminProgramLane(value: string | null | undefined): value is AdminProgramLane {
  return ["priority", "scaffold", "draft", "active"].includes(value ?? "");
}

function getAdminProgramLaneLabel(lane: AdminProgramLane) {
  switch (lane) {
    case "priority":
      return "A activer";
    case "scaffold":
      return "A brancher";
    case "draft":
      return "A finaliser";
    default:
      return "Deja deploye";
  }
}

function getAdminProgramLaneTone(lane: AdminProgramLane): BadgeTone {
  switch (lane) {
    case "priority":
      return "warning";
    case "scaffold":
      return "accent";
    case "draft":
      return "neutral";
    default:
      return "success";
  }
}

function getProgramStatusTone(status: string): BadgeTone {
  switch (status) {
    case "published":
      return "success";
    case "scheduled":
      return "accent";
    case "draft":
      return "warning";
    default:
      return "neutral";
  }
}

function isLearnerProgramLane(value: string | null | undefined): value is LearnerProgramLane {
  return ["urgent", "momentum", "launch", "completed"].includes(value ?? "");
}

function getLearnerProgramLaneLabel(lane: LearnerProgramLane) {
  switch (lane) {
    case "urgent":
      return "A securiser";
    case "momentum":
      return "En cours";
    case "launch":
      return "A lancer";
    default:
      return "Complete";
  }
}

function getLearnerProgramLaneTone(lane: LearnerProgramLane): BadgeTone {
  switch (lane) {
    case "urgent":
      return "warning";
    case "momentum":
      return "accent";
    case "launch":
      return "neutral";
    default:
      return "success";
  }
}

function isAgendaLane(value: string | null | undefined): value is AgendaLane {
  return ["urgent", "today", "upcoming", "recent"].includes(value ?? "");
}

function isAgendaScope(value: string | null | undefined): value is AgendaScope {
  return ["sessions", "deadlines"].includes(value ?? "");
}

function getAgendaLaneLabel(lane: AgendaLane) {
  switch (lane) {
    case "urgent":
      return "A securiser";
    case "today":
      return "Aujourd'hui";
    case "upcoming":
      return "A venir";
    default:
      return "Recent";
  }
}

function getAgendaLaneTone(lane: AgendaLane): BadgeTone {
  switch (lane) {
    case "urgent":
      return "warning";
    case "today":
      return "accent";
    case "upcoming":
      return "neutral";
    default:
      return "success";
  }
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

function getMessageLaneMeta(params: {
  unreadCount: number;
  lastMessageAt: string | null;
}): {
  lane: MessageInboxLane;
  laneLabel: string;
  tone: BadgeTone;
  nextAction: string;
  priorityRank: number;
} {
  const daysSinceLastMessage = getDaysSince(params.lastMessageAt);

  if (params.unreadCount > 0) {
    return {
      lane: "reply",
      laneLabel: "Réponse attendue",
      tone: "warning",
      nextAction: "Une réponse t'attend déjà ici, mieux vaut reprendre ce fil avant qu'il se refroidisse.",
      priorityRank: 0
    };
  }

  if (daysSinceLastMessage !== null && daysSinceLastMessage > 5) {
    return {
      lane: "watch",
      laneLabel: "A relancer",
      tone: "accent",
      nextAction: "Le fil s'est calmé depuis plusieurs jours, une relance courte peut recréer le rythme.",
      priorityRank: 1
    };
  }

  return {
    lane: "aligned",
    laneLabel: "Cadencé",
    tone: "success",
    nextAction: "Le fil reste vivant et maîtrisé, garde ce tempo avec des messages courts et contextualisés.",
    priorityRank: 2
  };
}

function getAuditHighlights(metadata: Record<string, unknown> | null | undefined) {
  const highlights = metadata?.highlights;

  if (!Array.isArray(highlights)) {
    return [];
  }

  return highlights
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 4);
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
      initialMessages: [],
      recentMessages: []
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
    initialMessages,
    recentMessages: messageRows
  };
}

export async function getMessagesPageData(filters?: {
  lane?: string;
  conversationId?: string;
}) {
  const context = await requireRole(["coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const userId = context.user.id;
  const viewerIsCoach = context.roles.includes("coach");

  let contactOptions: Array<{ id: string; label: string }> = [];

  if (viewerIsCoach) {
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
    viewerRole: viewerIsCoach ? "coach" : "coachee",
    contactOptions,
    conversationLimit: 18,
    recentMessageLimit: 240,
    initialMessageLimit: 80,
    includeInitialMessages: true
  });

  const laneFilter =
    filters?.lane === "reply" || filters?.lane === "watch" || filters?.lane === "aligned"
      ? filters.lane
      : "all";
  const selectedConversationId = filters?.conversationId ?? null;
  const unreadConversationCount = messagingWorkspace.conversations.filter(
    (conversation) => conversation.unreadCount > 0
  ).length;
  const messageCountByConversationId = messagingWorkspace.recentMessages.reduce((map, message) => {
    map.set(message.conversation_id, (map.get(message.conversation_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const conversationsWithSignals = messagingWorkspace.conversations.map((conversation) => {
    const laneMeta = getMessageLaneMeta({
      unreadCount: conversation.unreadCount,
      lastMessageAt: conversation.lastMessageAt
    });
    const lastMessageValue = getDateValue(conversation.lastMessageAt) ?? 0;
    const daysSinceLastMessage = getDaysSince(conversation.lastMessageAt);

    return {
      ...conversation,
      ...laneMeta,
      lastMessageValue,
      daysSinceLastMessage,
      recentMessageCount: messageCountByConversationId.get(conversation.id) ?? 0,
      lastTouchpointLabel: conversation.lastMessageAt
        ? formatDate(conversation.lastMessageAt)
        : "Aucun échange lancé"
    };
  });

  const laneCounts = {
    reply: conversationsWithSignals.filter((conversation) => conversation.lane === "reply").length,
    watch: conversationsWithSignals.filter((conversation) => conversation.lane === "watch").length,
    aligned: conversationsWithSignals.filter((conversation) => conversation.lane === "aligned").length
  };
  const visibleConversations = conversationsWithSignals.filter((conversation) =>
    laneFilter === "all" ? true : conversation.lane === laneFilter
  );
  const sortedVisibleConversations = visibleConversations
    .slice()
    .sort((left, right) => {
      return (
        left.priorityRank - right.priorityRank ||
        right.unreadCount - left.unreadCount ||
        (right.daysSinceLastMessage ?? -1) - (left.daysSinceLastMessage ?? -1) ||
        right.recentMessageCount - left.recentMessageCount ||
        right.lastMessageValue - left.lastMessageValue
      );
    });
  const focusThread =
    (selectedConversationId
      ? sortedVisibleConversations.find((conversation) => conversation.id === selectedConversationId)
      : null) ??
    sortedVisibleConversations[0] ??
    null;
  const visibleUnreadCount = visibleConversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );
  const visibleReplyCount = visibleConversations.filter(
    (conversation) => conversation.lane === "reply"
  ).length;
  const visibleQuietCount = visibleConversations.filter(
    (conversation) => conversation.lane === "watch"
  ).length;
  const now = Date.now();
  const recentSevenDayMessages = messagingWorkspace.recentMessages.filter((message) => {
    const value = getDateValue(message.created_at);
    return value !== null && value >= now - 7 * 24 * 60 * 60 * 1000;
  }).length;
  const previousSevenDayMessages = messagingWorkspace.recentMessages.filter((message) => {
    const value = getDateValue(message.created_at);
    return (
      value !== null &&
      value < now - 7 * 24 * 60 * 60 * 1000 &&
      value >= now - 14 * 24 * 60 * 60 * 1000
    );
  }).length;
  const pulseTrend: EngagementTrend =
    recentSevenDayMessages > previousSevenDayMessages + 2
      ? "up"
      : previousSevenDayMessages > recentSevenDayMessages + 2
        ? "down"
        : "steady";
  const pulseScore = conversationsWithSignals.length
    ? clamp(
        roundMetric(
          100 -
            unreadConversationCount * 12 -
            laneCounts.watch * 10 +
            Math.min(laneCounts.aligned, 4) * 4 +
            Math.min(recentSevenDayMessages, 24)
        ),
        18,
        96
      )
    : 24;
  const pulseBand: EngagementBand =
    pulseScore >= 76 && unreadConversationCount === 0 && laneCounts.watch <= 1
      ? "strong"
      : unreadConversationCount >= 2 || laneCounts.watch >= 3 || pulseScore < 45
        ? "risk"
        : "watch";
  const filtersSummary =
    laneFilter === "all"
      ? `${visibleConversations.length} fil(s) visibles sans filtre de lane.`
      : `${visibleConversations.length} fil(s) dans ${
          laneFilter === "reply"
            ? "les réponses attendues"
            : laneFilter === "watch"
              ? "les fils à relancer"
              : "les fils cadencés"
        }.`;
  const heroTitle = viewerIsCoach
    ? visibleReplyCount
      ? `${visibleReplyCount} fil(s) coach à reprendre maintenant`
      : "Inbox coach sous contrôle"
    : visibleReplyCount
      ? `${visibleReplyCount} réponse(s) coach à traiter maintenant`
      : "Conversation fluide avec tes coachs";
  const heroSummary = viewerIsCoach
    ? focusThread
      ? `Le fil focus est ${focusThread.counterpartName}. ${focusThread.nextAction}`
      : "Ta messagerie est prête à absorber de nouveaux échanges dès qu'un coaché entre dans ton portefeuille."
    : focusThread
      ? `Le fil focus est ${focusThread.counterpartName}. ${focusThread.nextAction}`
      : "La messagerie reste prête pour suivre ton coach, poser une question et confirmer ta prochaine étape.";

  const contactSpotlights = Array.from(
    visibleConversations.reduce((map, conversation) => {
      const current =
        map.get(conversation.counterpartId) ??
        {
          id: conversation.counterpartId,
          name: conversation.counterpartName,
          threadCount: 0,
          unreadCount: 0,
          recentMessageCount: 0,
          lastMessageValue: 0,
          lastTouchpointLabel: "Aucun échange",
          laneLabel: "Cadencé",
          tone: "success" as BadgeTone,
          priorityRank: 2,
          nextAction:
            "Le fil reste vivant et maîtrisé, garde ce tempo avec des messages courts et contextualisés."
        };

      current.threadCount += 1;
      current.unreadCount += conversation.unreadCount;
      current.recentMessageCount += conversation.recentMessageCount;

      if (conversation.lastMessageValue >= current.lastMessageValue) {
        current.lastMessageValue = conversation.lastMessageValue;
        current.lastTouchpointLabel = conversation.lastTouchpointLabel;
      }

      if (conversation.priorityRank < current.priorityRank) {
        current.priorityRank = conversation.priorityRank;
        current.laneLabel = conversation.laneLabel;
        current.tone = conversation.tone;
        current.nextAction = conversation.nextAction;
      }

      map.set(conversation.counterpartId, current);
      return map;
    }, new Map<string, {
      id: string;
      name: string;
      threadCount: number;
      unreadCount: number;
      recentMessageCount: number;
      lastMessageValue: number;
      lastTouchpointLabel: string;
      laneLabel: string;
      tone: BadgeTone;
      priorityRank: number;
      nextAction: string;
    }>())
      .values()
  )
    .sort((left, right) => {
      return (
        left.priorityRank - right.priorityRank ||
        right.unreadCount - left.unreadCount ||
        right.recentMessageCount - left.recentMessageCount ||
        right.lastMessageValue - left.lastMessageValue
      );
    })
    .slice(0, 4);

  return {
    context,
    messagingWorkspace,
    metrics: [
      {
        label: "Fils visibles",
        value: visibleConversations.length.toString(),
        delta: filtersSummary
      },
      {
        label: "Réponses attendues",
        value: visibleReplyCount.toString(),
        delta: focusThread ? `Focus · ${focusThread.counterpartName}` : "Aucun fil prioritaire"
      },
      {
        label: "Messages non lus",
        value: visibleUnreadCount.toString(),
        delta: visibleUnreadCount ? "Des réponses attendent ton attention" : "Inbox à jour"
      },
      {
        label: "Fils à relancer",
        value: visibleQuietCount.toString(),
        delta: `${recentSevenDayMessages} message(s) visibles sur 7 jours`
      }
    ],
    hero: {
      eyebrow: viewerIsCoach ? "Messaging ops coach" : "Messaging ops coachee",
      title: heroTitle,
      summary: heroSummary
    },
    pulse: {
      score: pulseScore,
      band: pulseBand,
      bandLabel:
        pulseBand === "strong"
          ? "Inbox maîtrisée"
          : pulseBand === "watch"
            ? "A surveiller"
            : "A relancer",
      caption:
        recentSevenDayMessages > 0
          ? `${recentSevenDayMessages} message(s) échangé(s) sur 7 jours, ${laneCounts.watch} fil(s) calmes à réactiver.`
          : "Aucun signal récent, la messagerie mérite un premier élan.",
      trend: pulseTrend,
      trendLabel:
        pulseTrend === "up"
          ? "cadence en hausse"
          : pulseTrend === "down"
            ? "cadence plus calme"
            : "rythme stable"
    },
    filters: {
      lane: laneFilter,
      summary: filtersSummary,
      selectedConversationId
    },
    laneBreakdown: [
      {
        id: "reply",
        label: "Réponse attendue",
        count: laneCounts.reply,
        isActive: laneFilter === "reply"
      },
      {
        id: "watch",
        label: "A relancer",
        count: laneCounts.watch,
        isActive: laneFilter === "watch"
      },
      {
        id: "aligned",
        label: "Cadencé",
        count: laneCounts.aligned,
        isActive: laneFilter === "aligned"
      }
    ],
    focusThread,
    priorityThreads: sortedVisibleConversations.slice(0, 4),
    contactSpotlights,
    responsePlaybook: viewerIsCoach
      ? [
          {
            title: "Répondre d'abord aux fils en attente",
            body:
              visibleReplyCount > 0
                ? `${visibleReplyCount} fil(s) demandent déjà une réponse claire ou une prochaine action.`
                : "Aucun fil bloqué, tu peux garder la pression sur les conversations les plus silencieuses.",
            href: focusThread ? `/messages?conversation=${focusThread.id}` : "#messages-hub",
            cta: "Ouvrir le fil focus",
            tone: "warning" as BadgeTone
          },
          {
            title: "Transformer les relances en rendez-vous",
            body: "Quand un échange devient concret, bascule rapidement vers une séance planifiée dans l'agenda.",
            href: "/agenda",
            cta: "Ouvrir l'agenda",
            tone: "accent" as BadgeTone
          },
          {
            title: "Nettoyer les signaux secondaires",
            body: "Les notifications gardent la vue sur les deadlines et reviews pour éviter de multiplier les allers-retours.",
            href: "/notifications",
            cta: "Voir les notifications",
            tone: "success" as BadgeTone
          }
        ]
      : [
          {
            title: "Débloquer le prochain point avec ton coach",
            body:
              visibleReplyCount > 0
                ? `${visibleReplyCount} réponse(s) de coach t'attendent ici, reprends le fil sans attendre.`
                : "L'inbox est calme, tu peux envoyer un point d'avancement ou un blocage précis.",
            href: focusThread ? `/messages?conversation=${focusThread.id}` : "#messages-hub",
            cta: "Reprendre le fil",
            tone: "warning" as BadgeTone
          },
          {
            title: "Garder le tempo sur les deadlines",
            body: "Si un échange débouche sur une prochaine action, l'agenda te montre immédiatement ce qui arrive.",
            href: "/agenda",
            cta: "Voir l'agenda",
            tone: "accent" as BadgeTone
          },
          {
            title: "Croiser les messages avec les alertes",
            body: "Les notifications centralisent les reviews, badges et échéances pour garder le contexte complet.",
            href: "/notifications",
            cta: "Ouvrir les notifications",
            tone: "success" as BadgeTone
          }
        ]
  };
}

export async function getNotificationsPageData(params: { lane?: string } = {}) {
  const context = await requireRole(["admin", "professor", "coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const userId = context.user.id;
  const activeRole = context.role ?? context.roles[0] ?? "coachee";

  const notificationsResult = await admin
    .from("notifications")
    .select("id, title, body, created_at, read_at, deeplink")
    .eq("organization_id", organizationId)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  const notifications = (notificationsResult.data ?? []) as NotificationRow[];
  const decoratedNotifications = notifications.map((notification) => {
    const summary = summarizeNotificationOps(notification);

    return {
      ...notification,
      ...summary,
      createdAtLabel: formatDate(notification.created_at),
      recencyLabel: getRelativeDayLabel(notification.created_at)
    };
  });
  const laneFilter: NotificationOpsLane | "all" = isNotificationOpsLane(params.lane) ? params.lane : "all";
  const visibleNotifications =
    laneFilter === "all"
      ? decoratedNotifications
      : decoratedNotifications.filter((notification) => notification.lane === laneFilter);
  const sortedVisibleNotifications = [...visibleNotifications].sort((left, right) => {
    return (
      left.priorityRank - right.priorityRank ||
      Number(right.isUnread) - Number(left.isUnread) ||
      Number(right.isActionable) - Number(left.isActionable) ||
      (getDateValue(right.created_at) ?? 0) - (getDateValue(left.created_at) ?? 0)
    );
  });
  const unreadCount = decoratedNotifications.filter((item) => item.isUnread).length;
  const recentSevenDayCount = decoratedNotifications.filter((item) => isWithinDays(item.created_at, 7)).length;
  const actionCount = decoratedNotifications.filter((item) => item.lane === "action").length;
  const reviewCount = decoratedNotifications.filter((item) => item.lane === "review").length;
  const clearedCount = decoratedNotifications.filter((item) => item.lane === "cleared").length;
  const actionableUnreadCount = decoratedNotifications.filter(
    (item) => item.isUnread && item.isActionable
  ).length;
  const filtersSummary =
    laneFilter === "all"
      ? `${decoratedNotifications.length} signal(aux) dans la vue live globale`
      : `${visibleNotifications.length} signal(aux) dans ${getNotificationOpsLaneLabel(laneFilter).toLowerCase()}`;
  const categorySpotlights = Array.from(
    visibleNotifications.reduce((map, notification) => {
      const current = map.get(notification.category) ?? {
        category: notification.category,
        label: notification.categoryLabel,
        tone: notification.tone as BadgeTone,
        count: 0,
        unreadCount: 0,
        actionableCount: 0,
        priorityRank: notification.priorityRank,
        focus: notification
      };

      current.count += 1;
      current.unreadCount += Number(notification.isUnread);
      current.actionableCount += Number(notification.isActionable);

      if (
        notification.priorityRank < current.priorityRank ||
        (notification.priorityRank === current.priorityRank &&
          (getDateValue(notification.created_at) ?? 0) > (getDateValue(current.focus.created_at) ?? 0))
      ) {
        current.focus = notification;
        current.priorityRank = notification.priorityRank;
        current.tone = notification.tone as BadgeTone;
      }

      map.set(notification.category, current);
      return map;
    }, new Map<string, {
      category: (typeof decoratedNotifications)[number]["category"];
      label: string;
      tone: BadgeTone;
      count: number;
      unreadCount: number;
      actionableCount: number;
      priorityRank: number;
      focus: (typeof decoratedNotifications)[number];
    }>())
      .values()
  )
    .sort((left, right) => {
      return (
        right.unreadCount - left.unreadCount ||
        right.actionableCount - left.actionableCount ||
        right.count - left.count ||
        left.priorityRank - right.priorityRank
      );
    })
    .slice(0, 4)
    .map((bucket) => {
      const navigation = getNotificationOpsNavigation(bucket.category, activeRole);

      return {
        category: bucket.category,
        label: bucket.label,
        tone: bucket.tone,
        count: bucket.count,
        unreadCount: bucket.unreadCount,
        actionableCount: bucket.actionableCount,
        summary: bucket.focus.nextAction,
        href: bucket.focus.deeplink ?? navigation.href,
        cta: bucket.focus.deeplink ? "Ouvrir le signal" : navigation.label
      };
    });
  const dominantCategory = categorySpotlights[0] ?? null;
  const crosslink = dominantCategory
    ? getNotificationOpsNavigation(dominantCategory.category, activeRole)
    : {
        href: "/account",
        label: "Voir mes preferences"
      };
  const focusSource = sortedVisibleNotifications[0] ?? decoratedNotifications[0] ?? null;
  const focusNotification = focusSource
    ? {
        id: focusSource.id,
        title: focusSource.title,
        body: focusSource.body ?? "Notification systeme ECCE",
        laneLabel: focusSource.laneLabel,
        categoryLabel: focusSource.categoryLabel,
        tone: focusSource.tone,
        createdAtLabel: focusSource.createdAtLabel,
        recencyLabel: focusSource.recencyLabel,
        unread: focusSource.isUnread,
        actionable: focusSource.isActionable,
        nextAction: focusSource.nextAction,
        href: focusSource.deeplink ?? null
      }
    : null;
  const priorityNotifications = sortedVisibleNotifications.slice(0, 5).map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body ?? "Notification systeme ECCE",
    laneLabel: notification.laneLabel,
    categoryLabel: notification.categoryLabel,
    tone: notification.tone,
    createdAtLabel: notification.createdAtLabel,
    recencyLabel: notification.recencyLabel,
    unread: notification.isUnread,
    actionable: notification.isActionable,
    nextAction: notification.nextAction,
    href: notification.deeplink ?? null
  }));
  const roleLabel =
    context.role === "coach"
      ? "Notification ops coach"
      : context.role === "coachee"
        ? "Notification ops coachee"
        : context.role === "admin"
          ? "Notification ops admin"
          : "Notification ops professor";
  const heroTitle =
    laneFilter === "action"
      ? "Tout ce qui doit etre ouvert maintenant, sans perdre le contexte."
      : context.role === "coach"
        ? "Le command center qui trie deadlines, reviews et signaux live dans le bon ordre."
        : context.role === "coachee"
          ? "Une lecture claire de ce qui demande une action, une lecture ou juste un repere."
          : "Le cockpit des alertes utiles pour arbitrer vite sans alourdir la navigation.";
  const heroSummary = decoratedNotifications.length
    ? `${actionCount} action(s) immediate(s), ${reviewCount} signal(aux) a suivre et ${clearedCount} notification(s) deja digerees.${dominantCategory ? ` ${dominantCategory.label} concentre le plus de contexte dans la vue actuelle.` : ""}`
    : "Le flux live est pret: les prochaines deadlines, reviews, messages et jalons remonteront ici.";

  return {
    context,
    notifications,
    metrics: [
      {
        label: "Actions immediates",
        value: actionCount.toString(),
        delta: focusNotification ? `Focus · ${focusNotification.title}` : "Aucun signal urgent"
      },
      {
        label: "A suivre",
        value: reviewCount.toString(),
        delta: laneFilter === "all" ? "Tri entre lecture et action" : filtersSummary
      },
      {
        label: "Notifications non lues",
        value: unreadCount.toString(),
        delta: actionableUnreadCount
          ? `${actionableUnreadCount} ouvrent une action directe`
          : "Aucune ouverture urgente"
      },
      {
        label: "Activite 7 jours",
        value: recentSevenDayCount.toString(),
        delta: notifications[0] ? `Derniere alerte · ${formatDate(notifications[0].created_at)}` : "Aucun evenement recent"
      }
    ],
    hero: {
      eyebrow: roleLabel,
      title: heroTitle,
      summary: heroSummary,
      crosslink
    },
    filters: {
      lane: laneFilter,
      summary: filtersSummary
    },
    laneBreakdown: [
      {
        id: "action" as NotificationOpsLane,
        label: "Action immediate",
        count: actionCount,
        isActive: laneFilter === "action"
      },
      {
        id: "review" as NotificationOpsLane,
        label: "A suivre",
        count: reviewCount,
        isActive: laneFilter === "review"
      },
      {
        id: "cleared" as NotificationOpsLane,
        label: "Archive utile",
        count: clearedCount,
        isActive: laneFilter === "cleared"
      }
    ],
    focusNotification,
    priorityNotifications,
    categorySpotlights,
    responsePlaybook: [
      {
        title: actionCount ? "Traiter d'abord les signaux qui bloquent" : "Vue sous controle",
        body: focusNotification
          ? focusNotification.nextAction
          : "Aucun signal urgent pour le moment, le flux reste pret pour les prochaines alertes.",
        href: focusNotification?.href ?? "#notifications-live",
        cta: focusNotification?.href ? "Ouvrir le signal focus" : "Voir le flux live",
        tone: actionCount ? ("warning" as BadgeTone) : ("success" as BadgeTone)
      },
      {
        title: "Reconnecter la bonne surface ECCE",
        body: dominantCategory
          ? `${dominantCategory.label} est la zone la plus active dans la vue courante.`
          : "Les raccourcis restent disponibles pour revenir vers la bonne surface metier.",
        href: crosslink.href,
        cta: crosslink.label,
        tone: "accent" as BadgeTone
      },
      {
        title: "Garder seulement le bruit utile",
        body: "Les preferences de compte filtrent deja les notifications a la creation, sans casser le temps reel.",
        href: "/account",
        cta: "Ajuster mes preferences",
        tone: "neutral" as BadgeTone
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
  const base = await getAdminPageData();
  const admin = createSupabaseAdminClient();
  const organizationId = base.context.profile.organization_id;

  const [
    branding,
    coachAssignmentsResult,
    cohortMembersResult,
    assignmentStateResult,
    programsResult,
    auditEventsResult
  ] = await Promise.all([
    getOrganizationBrandingById(organizationId),
    admin
      .from("coach_assignments")
      .select("id, coach_id, coachee_id, cohort_id, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin.from("cohort_members").select("user_id, cohort_id"),
    admin
      .from("learning_assignments")
      .select("id, due_at, assigned_user_id, cohort_id, published_at")
      .eq("organization_id", organizationId),
    admin.from("programs").select("id, status").eq("organization_id", organizationId),
    admin
      .from("audit_events")
      .select("id, actor_id, category, summary, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(6)
  ]);

  const users = base.users;
  const coacheeIds = new Set(
    users.filter((user) => user.roles.includes("coachee")).map((user) => user.id)
  );
  const coachIds = new Set(users.filter((user) => user.roles.includes("coach")).map((user) => user.id));
  const coachAssignments = (coachAssignmentsResult.data ?? []) as Array<{
    id: string;
    coach_id: string;
    coachee_id: string | null;
    cohort_id: string | null;
    created_at: string;
  }>;
  const cohortMembers = ((cohortMembersResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>).filter(
    (item) => coacheeIds.has(item.user_id)
  );
  const assignmentStates = (assignmentStateResult.data ?? []) as Array<{
    id: string;
    due_at: string | null;
    assigned_user_id: string | null;
    cohort_id: string | null;
    published_at: string | null;
  }>;
  const programs = (programsResult.data ?? []) as Array<{ id: string; status: string }>;
  const programIds = programs.map((program) => program.id);
  const modulesResult = programIds.length
    ? await admin.from("program_modules").select("id, status, program_id").in("program_id", programIds)
    : { data: [] as Array<{ id: string; status: string; program_id: string }> };
  const modules = (modulesResult.data ?? []) as Array<{ id: string; status: string; program_id: string }>;
  const userById = new Map(users.map((user) => [user.id, user]));
  const cohortIdsByLearnerId = cohortMembers.reduce((map, item) => {
    const current = map.get(item.user_id) ?? [];
    current.push(item.cohort_id);
    map.set(item.user_id, current);
    return map;
  }, new Map<string, string[]>());
  const learnerIdsByCohortId = cohortMembers.reduce((map, item) => {
    const current = map.get(item.cohort_id) ?? [];
    current.push(item.user_id);
    map.set(item.cohort_id, current);
    return map;
  }, new Map<string, string[]>());
  const coachIdsByLearnerId = new Map<string, string[]>();
  for (const assignment of coachAssignments) {
    if (assignment.coachee_id) {
      const current = coachIdsByLearnerId.get(assignment.coachee_id) ?? [];
      if (!current.includes(assignment.coach_id)) {
        current.push(assignment.coach_id);
        coachIdsByLearnerId.set(assignment.coachee_id, current);
      }
    }

    if (assignment.cohort_id) {
      for (const learnerId of learnerIdsByCohortId.get(assignment.cohort_id) ?? []) {
        const current = coachIdsByLearnerId.get(learnerId) ?? [];
        if (!current.includes(assignment.coach_id)) {
          current.push(assignment.coach_id);
          coachIdsByLearnerId.set(learnerId, current);
        }
      }
    }
  }

  const activeUsers = users.filter((user) => user.status === "active").length;
  const invitedUsers = users.filter((user) => user.status === "invited").length;
  const suspendedUsers = users.filter((user) => user.status === "suspended").length;
  const roleCounts = {
    admin: users.filter((user) => user.roles.includes("admin")).length,
    professor: users.filter((user) => user.roles.includes("professor")).length,
    coach: users.filter((user) => user.roles.includes("coach")).length,
    coachee: users.filter((user) => user.roles.includes("coachee")).length
  };
  const publishedContents = base.contents.filter((content) => content.status === "published").length;
  const draftContents = base.contents.length - publishedContents;
  const requiredContents = base.contents.filter((content) => content.is_required).length;
  const publishedQuizzes = base.quizzes.filter((quiz) => quiz.status === "published").length;
  const draftQuizzes = base.quizzes.length - publishedQuizzes;
  const quizQuestionCount = base.quizzes.reduce((total, quiz) => total + (quiz.quiz_questions?.length ?? 0), 0);
  const overdueAssignments = assignmentStates.filter((assignment) => getDeadlineState(assignment.due_at) === "overdue").length;
  const dueSoonAssignments = assignmentStates.filter((assignment) => getDeadlineState(assignment.due_at) === "soon").length;
  const openAssignments = assignmentStates.filter((assignment) => getDeadlineState(assignment.due_at) === "open").length;
  const learnerCoverageCount = base.engagementSignals.filter(
    (signal) => (coachIdsByLearnerId.get(signal.id) ?? []).length > 0
  ).length;
  const learnersWithoutCoach = base.engagementSignals.filter(
    (signal) => !(coachIdsByLearnerId.get(signal.id) ?? []).length
  ).length;
  const learnersWithoutCohort = base.engagementSignals.filter(
    (signal) => !(cohortIdsByLearnerId.get(signal.id) ?? []).length
  ).length;
  const activeCoachPortfolios = Array.from(coachIds).filter((coachId) =>
    base.engagementSignals.some((signal) => (coachIdsByLearnerId.get(signal.id) ?? []).includes(coachId))
  ).length;
  const activePrograms = programs.filter((program) => program.status === "active").length;
  const draftPrograms = programs.filter((program) => program.status !== "active").length;
  const activeModules = modules.filter((module) => module.status === "published" || module.status === "active").length;

  const auditEnabled = !auditEventsResult.error;
  const recentAuditEvents = auditEnabled
    ? ((auditEventsResult.data ?? []) as Array<{
        id: string;
        actor_id: string | null;
        category: AuditEventCategory;
        summary: string;
        created_at: string;
      }>).map((event) => ({
        id: event.id,
        category: event.category,
        categoryLabel: AUDIT_CATEGORY_LABELS[event.category],
        actorName: event.actor_id ? userById.get(event.actor_id)?.name ?? "Profil supprimé" : "Système ECCE",
        summary: event.summary,
        createdAtLabel: formatDateCompact(event.created_at),
        createdAtFull: formatDate(event.created_at)
      }))
    : [];
  const latestAudit = recentAuditEvents[0] ?? null;
  const auditErrorMessage =
    auditEventsResult.error?.code === "42P01" || auditEventsResult.error?.code === "PGRST205"
      ? "Le journal d'audit n'est pas encore initialisé côté Supabase."
      : auditEventsResult.error?.message ?? null;
  const learnerAlerts = base.attentionLearners.slice(0, 5).map((signal) => ({
    id: signal.id,
    name: signal.name,
    band: signal.band,
    bandLabel: signal.bandLabel,
    score: signal.score,
    nextFocus: signal.nextFocus,
    lastActivityLabel: signal.lastActivityLabel,
    coachCount: (coachIdsByLearnerId.get(signal.id) ?? []).length,
    cohortCount: (cohortIdsByLearnerId.get(signal.id) ?? []).length
  }));

  const studioCards: Array<{
    href: string;
    eyebrow: string;
    title: string;
    tone: BadgeTone;
    status: string;
    description: string;
    highlights: string[];
  }> = [
    {
      href: "/admin/users",
      eyebrow: "Access ops",
      title: "Utilisateurs & accès",
      tone: invitedUsers > 0 || suspendedUsers > 0 ? "warning" : "success",
      status: invitedUsers > 0 ? `${invitedUsers} invitation(s) à finaliser` : `${activeUsers} accès actifs`,
      description: "Piloter les statuts, les rôles et les ouvertures d'accès sans quitter le command center.",
      highlights: [
        `${roleCounts.admin} admin`,
        `${roleCounts.coach} coach(s)`,
        `${suspendedUsers} suspendu(s)`
      ]
    },
    {
      href: "/admin/learners",
      eyebrow: "Learner ops",
      title: "Parcours coachés",
      tone: learnersWithoutCoach > 0 || learnersWithoutCohort > 0 ? "warning" : "accent",
      status:
        learnersWithoutCoach > 0
          ? `${learnersWithoutCoach} coaché(s) sans coach`
          : `${learnerCoverageCount}/${base.engagementSignals.length} coaché(s) couverts`,
      description: "Voir immédiatement les manques de couverture, les cohortes fragiles et la charge coach.",
      highlights: [
        `${learnersWithoutCohort} sans cohorte`,
        `${activeCoachPortfolios} portefeuille(s) actifs`,
        `${base.attentionLearners.length} signal(s) faibles`
      ]
    },
    {
      href: "/admin/programs",
      eyebrow: "Curriculum",
      title: "Studio parcours",
      tone: activePrograms > 0 ? "success" : "accent",
      status: activePrograms > 0 ? `${activePrograms} programme(s) actif(s)` : `${draftPrograms} programme(s) à activer`,
      description: "Structurer les parcours, les modules et l'activation pédagogique sans repasser par le hub brut.",
      highlights: [
        `${programs.length} programme(s)`,
        `${modules.length} module(s)`,
        `${activeModules} module(s) actifs`
      ]
    },
    {
      href: "/admin/content",
      eyebrow: "Library ops",
      title: "Studio contenus",
      tone: draftContents > 0 ? "accent" : "success",
      status: `${publishedContents} contenu(s) publiés`,
      description: "Suivre l'état réel de la bibliothèque, des drafts et des ressources obligatoires.",
      highlights: [
        `${draftContents} brouillon(s)`,
        `${requiredContents} ressource(s) obligatoires`,
        `${base.contents.length} au total`
      ]
    },
    {
      href: "/admin/quizzes",
      eyebrow: "Assessment",
      title: "Studio quiz",
      tone: publishedQuizzes > 0 ? "success" : "accent",
      status: `${publishedQuizzes} quiz publiés`,
      description: "Contrôler le catalogue d'évaluation, la densité de questions et les prochaines mises en ligne.",
      highlights: [
        `${draftQuizzes} draft(s)`,
        `${quizQuestionCount} question(s)`,
        `${base.analyticsOverview.averageQuizScore ?? 0}% score moyen`
      ]
    },
    {
      href: "/admin/assignments",
      eyebrow: "Execution",
      title: "Assignations",
      tone: overdueAssignments > 0 ? "warning" : dueSoonAssignments > 0 ? "accent" : "success",
      status:
        overdueAssignments > 0
          ? `${overdueAssignments} deadline(s) en retard`
          : `${dueSoonAssignments} deadline(s) cette semaine`,
      description: "Lire la tension d'exécution avant qu'elle ne se transforme en dette de suivi ou d'engagement.",
      highlights: [
        `${openAssignments} sans date`,
        `${base.analyticsOverview.totalAssignments} assignation(s)`,
        `${dueSoonAssignments} à venir`
      ]
    },
    {
      href: "/admin/settings",
      eyebrow: "Platform settings",
      title: "Réglages organisation",
      tone: branding.supportEmail ? "success" : "accent",
      status: `${branding.displayName} · ${branding.defaultTimezone}`,
      description: "Piloter le branding, le support et les paramètres transverses depuis un module dédié.",
      highlights: [
        branding.platformTagline,
        branding.allowCoachSelfSchedule ? "auto-planification coach active" : "auto-planification coach coupée",
        branding.supportEmail ?? "email support à définir"
      ]
    },
    {
      href: "/admin/audit",
      eyebrow: "Traceability",
      title: "Journal d'audit",
      tone: auditEnabled ? "success" : "warning",
      status: latestAudit ? latestAudit.summary : "Audit non initialisé",
      description: "Relire rapidement les changements sensibles opérés dans ECCE avant d'enchaîner sur un studio.",
      highlights: auditEnabled
        ? [
            `${recentAuditEvents.length} événement(s) récents`,
            latestAudit?.categoryLabel ?? "Aucune catégorie",
            latestAudit?.createdAtLabel ?? "Aucun horodatage"
          ]
        : [auditErrorMessage ?? "Table audit_events manquante", "Appliquer le SQL", "Puis recharger"]
    }
  ];

  const priorityActions: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
    tone: BadgeTone;
  }> = [
    invitedUsers > 0
      ? {
          id: "invite",
          title: `${invitedUsers} invitation(s) attendent encore leur activation`,
          description: "La friction actuelle n'est pas produit, mais l'ouverture effective des accès et des rôles.",
          href: "/admin/users",
          ctaLabel: "Ouvrir les accès",
          tone: "warning" as const
        }
      : {
          id: "invite",
          title: "Le flux d'accès est stable",
          description: "Les derniers comptes visibles ont déjà franchi l'étape d'activation.",
          href: "/admin/users",
          ctaLabel: "Voir les profils",
          tone: "success" as const
        },
    learnersWithoutCoach > 0 || learnersWithoutCohort > 0
      ? {
          id: "coverage",
          title: `${learnersWithoutCoach} sans coach · ${learnersWithoutCohort} sans cohorte`,
          description: "Le vrai risque côté plateforme reste la structure de suivi, pas seulement les contenus publiés.",
          href: "/admin/learners",
          ctaLabel: "Structurer les coachés",
          tone: "accent" as const
        }
      : {
          id: "coverage",
          title: "Population coachée structurée",
          description: "Les coachés visibles sont couverts par un coach et une cohorte utilisable.",
          href: "/admin/learners",
          ctaLabel: "Vérifier learner ops",
          tone: "success" as const
        },
    overdueAssignments > 0
      ? {
          id: "execution",
          title: `${overdueAssignments} assignation(s) ont dépassé leur deadline`,
          description: "Le backlog d'exécution mérite une lecture immédiate avant d'impacter l'engagement.",
          href: "/admin/assignments",
          ctaLabel: "Traiter les deadlines",
          tone: "warning" as const
        }
      : {
          id: "execution",
          title: "Exécution pédagogique maîtrisée",
          description: dueSoonAssignments > 0
            ? `${dueSoonAssignments} échéance(s) arrivent, sans retard ouvert pour le moment.`
            : "Aucune échéance critique ne remonte actuellement.",
          href: "/admin/assignments",
          ctaLabel: "Voir les assignations",
          tone: dueSoonAssignments > 0 ? ("accent" as const) : ("success" as const)
        },
    draftContents + draftQuizzes + draftPrograms > 0
      ? {
          id: "catalog",
          title: `${draftContents + draftQuizzes + draftPrograms} élément(s) de catalogue encore en draft`,
          description: "Le prochain gain rapide est probablement dans la mise en ligne des contenus, quiz ou parcours déjà préparés.",
          href: draftPrograms > 0 ? "/admin/programs" : draftContents > 0 ? "/admin/content" : "/admin/quizzes",
          ctaLabel: "Ouvrir le studio",
          tone: "accent" as const
        }
      : {
          id: "catalog",
          title: "Catalogue pédagogique bien diffusé",
          description: "Les principaux assets sont déjà publiés ou actifs dans ECCE.",
          href: "/library",
          ctaLabel: "Contrôler la bibliothèque",
          tone: "success" as const
        }
  ];

  return {
    context: base.context,
    branding,
    metrics: [
      {
        label: "Utilisateurs actifs",
        value: activeUsers.toString(),
        delta: `${users.length} profils ECCE`
      },
      {
        label: "Engagement coachés",
        value: `${base.analyticsOverview.averageScore}%`,
        delta: `${base.analyticsOverview.atRiskCount} à risque · ${base.analyticsOverview.watchCount} à surveiller`
      },
      {
        label: "Couverture coach",
        value: `${learnerCoverageCount}/${base.engagementSignals.length}`,
        delta: `${activeCoachPortfolios}/${coachIds.size} coach(s) avec portefeuille actif`
      },
      {
        label: "Catalogue live",
        value: `${publishedContents + publishedQuizzes}`,
        delta: `${draftContents + draftQuizzes + draftPrograms} draft(s) encore à diffuser`
      }
    ],
    hero: {
      title: branding.displayName,
      subtitle: branding.platformTagline,
      summary: `${branding.marketingHeadline} ${branding.marketingSubheadline}`
    },
    systemPulse: {
      invitedUsers,
      suspendedUsers,
      activeUsers,
      roleCounts,
      overdueAssignments,
      dueSoonAssignments,
      learnersWithoutCoach,
      learnersWithoutCohort
    },
    priorityActions,
    studioCards,
    learnerAlerts,
    recentUsers: users.slice(0, 6),
    recentAuditEvents,
    auditEnabled,
    auditMessage: auditEnabled ? null : auditErrorMessage,
    latestAudit,
    userOptions: base.userOptions
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

export async function getAdminAuditPageData(filters?: {
  query?: string;
  category?: string;
  actorId?: string;
}) {
  const context = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const query = String(filters?.query ?? "").trim();
  const normalizedQuery = query.toLowerCase();
  const categoryFilter = AUDIT_EVENT_CATEGORIES.includes(String(filters?.category ?? "").trim() as AuditEventCategory)
    ? (String(filters?.category ?? "").trim() as AuditEventCategory)
    : "all";
  const actorFilter = String(filters?.actorId ?? "").trim();

  const [eventsResult, profilesResult] = await Promise.all([
    admin
      .from("audit_events")
      .select("id, actor_id, category, action, summary, target_type, target_id, target_label, target_user_id, metadata, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("profiles")
      .select("id, first_name, last_name, status, user_roles(role)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  if (eventsResult.error) {
    return {
      context,
      auditEnabled: false,
      errorMessage: eventsResult.error.message,
      filters: {
        query,
        category: categoryFilter,
        actorId: actorFilter
      },
      metrics: [
        {
          label: "Événements récents",
          value: "0",
          delta: "Journal non disponible tant que le SQL n'est pas appliqué"
        },
        {
          label: "Admins actifs",
          value: profiles
            .filter((profile) => profile.status === "active" && (profile.user_roles ?? []).some((item) => item.role === "admin"))
            .length.toString(),
          delta: "Population potentiellement concernée"
        },
        {
          label: "Filtres",
          value: "0",
          delta: "Aucun événement à lire pour l'instant"
        },
        {
          label: "Traceabilité",
          value: "off",
          delta: "La table audit_events manque probablement côté Supabase"
        }
      ],
      actorOptions: [] as Array<{ id: string; label: string }>,
      categoryOptions: AUDIT_EVENT_CATEGORIES.map((category) => ({
        id: category,
        label: AUDIT_CATEGORY_LABELS[category]
      })),
      categoryBreakdown: AUDIT_EVENT_CATEGORIES.map((category) => ({
        id: category,
        label: AUDIT_CATEGORY_LABELS[category],
        count: 0
      })),
      events: [] as Array<{
        id: string;
        category: AuditEventCategory;
        categoryLabel: string;
        action: string;
        summary: string;
        actorId: string | null;
        actorName: string;
        actorStatus: ProfileRow["status"] | "system";
        targetLabel: string;
        targetType: string;
        createdAtLabel: string;
        createdAtCompact: string;
        highlights: string[];
      }>,
      latestEvent: null as null
    };
  }

  const rows = (eventsResult.data ?? []) as AuditEventRow[];
  const events = rows.map((event) => {
    const actorProfile = event.actor_id ? profileById.get(event.actor_id) ?? null : null;
    const targetProfile = event.target_user_id ? profileById.get(event.target_user_id) ?? null : null;
    const actorName = actorProfile
      ? formatUserName(actorProfile)
      : event.actor_id
        ? "Profil supprimé"
        : "Système ECCE";
    const targetLabel =
      event.target_label ??
      (targetProfile
        ? formatUserName(targetProfile)
        : event.target_id
          ? `${event.target_type ?? "cible"} · ${event.target_id}`
          : "Organisation ECCE");

    return {
      id: event.id,
      category: event.category,
      categoryLabel: AUDIT_CATEGORY_LABELS[event.category],
      action: event.action,
      summary: event.summary,
      actorId: event.actor_id,
      actorName,
      actorStatus: actorProfile?.status ?? "system",
      targetLabel,
      targetType: event.target_type ?? "organization",
      createdAtLabel: formatDate(event.created_at),
      createdAtCompact: formatDateCompact(event.created_at),
      createdAtRaw: event.created_at,
      highlights: getAuditHighlights(event.metadata)
    };
  });

  const filteredEvents = events.filter((event) => {
    const matchesCategory = categoryFilter === "all" ? true : event.category === categoryFilter;
    const matchesActor = actorFilter ? event.actorId === actorFilter : true;
    const matchesQuery = normalizedQuery
      ? `${event.summary} ${event.actorName} ${event.targetLabel}`.toLowerCase().includes(normalizedQuery)
      : true;

    return matchesCategory && matchesActor && matchesQuery;
  });

  const actorOptions = uniqueById(
    events
      .filter((event) => event.actorId)
      .map((event) => ({
        id: event.actorId as string,
        label: event.actorName
      }))
  );

  const categoryBreakdown = AUDIT_EVENT_CATEGORIES.map((category) => ({
    id: category,
    label: AUDIT_CATEGORY_LABELS[category],
    count: filteredEvents.filter((event) => event.category === category).length
  }));

  const recentWindow = events.filter((event) => isWithinDays(event.createdAtRaw, 7));
  const activeActorCount = new Set(recentWindow.map((event) => event.actorId).filter(Boolean)).size;
  const latestEvent = filteredEvents[0] ?? events[0] ?? null;

  return {
    context,
    auditEnabled: true,
    errorMessage: null,
    filters: {
      query,
      category: categoryFilter,
      actorId: actorFilter
    },
    metrics: [
      {
        label: "Événements 7 jours",
        value: recentWindow.length.toString(),
        delta: `${events.length} événement(s) chargés`
      },
      {
        label: "Actions d'accès",
        value: events.filter((event) => event.category === "access").length.toString(),
        delta: "Rôles, statuts et profils"
      },
      {
        label: "Ops pédagogiques",
        value: events.filter((event) => event.category === "delivery").length.toString(),
        delta: "Assignations, cohortes, parcours"
      },
      {
        label: "Acteurs actifs",
        value: activeActorCount.toString(),
        delta: "Admins ayant déclenché au moins un événement sur 7 jours"
      }
    ],
    actorOptions,
    categoryOptions: AUDIT_EVENT_CATEGORIES.map((category) => ({
      id: category,
      label: AUDIT_CATEGORY_LABELS[category]
    })),
    categoryBreakdown,
    events: filteredEvents,
    latestEvent
  };
}

export async function getAdminLearnerOpsPageData(filters?: {
  query?: string;
  cohortId?: string;
  coachId?: string;
  lane?: string;
}) {
  const base = await getAdminPageData();
  const admin = createSupabaseAdminClient();
  const organizationId = base.context.profile.organization_id;
  const query = String(filters?.query ?? "").trim();
  const normalizedQuery = query.toLowerCase();
  const selectedCohortId =
    base.cohortOptions.some((option) => option.id === String(filters?.cohortId ?? "").trim())
      ? String(filters?.cohortId ?? "").trim()
      : "";
  const selectedCoachId =
    base.coachOptions.some((option) => option.id === String(filters?.coachId ?? "").trim())
      ? String(filters?.coachId ?? "").trim()
      : "";
  const laneFilter = ["all", "uncovered", "alert", "aligned"].includes(String(filters?.lane ?? "").trim())
    ? String(filters?.lane ?? "").trim()
    : "all";

  const [coachAssignmentsResult, cohortMembersResult] = await Promise.all([
    admin
      .from("coach_assignments")
      .select("id, coach_id, coachee_id, cohort_id, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin.from("cohort_members").select("user_id, cohort_id")
  ]);

  const assignments = (coachAssignmentsResult.data ?? []) as Array<{
    id: string;
    coach_id: string;
    coachee_id: string | null;
    cohort_id: string | null;
    created_at: string;
  }>;
  const cohortMembers = (cohortMembersResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>;
  const learnerSignalById = new Map(base.engagementSignals.map((signal) => [signal.id, signal]));
  const learnerIds = new Set(base.engagementSignals.map((signal) => signal.id));
  const cohortLabelById = new Map(base.cohortOptions.map((item) => [item.id, item.label]));
  const coachById = new Map(
    base.users
      .filter((user) => user.roles.includes("coach"))
      .map((user) => [
        user.id,
        {
          name: user.name,
          email: user.email
        }
      ])
  );
  const cohortIdsByLearnerId = cohortMembers.reduce((map, item) => {
    if (!learnerIds.has(item.user_id)) {
      return map;
    }

    const current = map.get(item.user_id) ?? [];
    current.push(item.cohort_id);
    map.set(item.user_id, current);
    return map;
  }, new Map<string, string[]>());
  const learnerIdsByCohortId = cohortMembers.reduce((map, item) => {
    if (!learnerIds.has(item.user_id)) {
      return map;
    }

    const current = map.get(item.cohort_id) ?? [];
    current.push(item.user_id);
    map.set(item.cohort_id, current);
    return map;
  }, new Map<string, string[]>());
  const coachIdsByLearnerId = new Map<string, string[]>();
  const directCoachIdsByLearnerId = new Map<string, string[]>();
  const coachIdsByCohortId = new Map<string, string[]>();

  for (const assignment of assignments) {
    if (assignment.coachee_id) {
      const direct = directCoachIdsByLearnerId.get(assignment.coachee_id) ?? [];
      if (!direct.includes(assignment.coach_id)) {
        direct.push(assignment.coach_id);
        directCoachIdsByLearnerId.set(assignment.coachee_id, direct);
      }

      const all = coachIdsByLearnerId.get(assignment.coachee_id) ?? [];
      if (!all.includes(assignment.coach_id)) {
        all.push(assignment.coach_id);
        coachIdsByLearnerId.set(assignment.coachee_id, all);
      }
    }

    if (assignment.cohort_id) {
      const cohortCoachIds = coachIdsByCohortId.get(assignment.cohort_id) ?? [];
      if (!cohortCoachIds.includes(assignment.coach_id)) {
        cohortCoachIds.push(assignment.coach_id);
        coachIdsByCohortId.set(assignment.cohort_id, cohortCoachIds);
      }

      for (const learnerId of learnerIdsByCohortId.get(assignment.cohort_id) ?? []) {
        const current = coachIdsByLearnerId.get(learnerId) ?? [];
        if (!current.includes(assignment.coach_id)) {
          current.push(assignment.coach_id);
          coachIdsByLearnerId.set(learnerId, current);
        }
      }
    }
  }

  const coveredLearnerIdsByCoachId = base.coachOptions.reduce((map, coach) => {
    map.set(
      coach.id,
      Array.from(
        new Set(
          base.engagementSignals
            .map((signal) => signal.id)
            .filter((learnerId) => (coachIdsByLearnerId.get(learnerId) ?? []).includes(coach.id))
        )
      )
    );
    return map;
  }, new Map<string, string[]>());
  const coachNameListForLearner = (learnerId: string) =>
    (coachIdsByLearnerId.get(learnerId) ?? [])
      .map((coachId) => coachById.get(coachId)?.name ?? "Coach")
      .filter(Boolean);
  const hasCoachCoverage = (learnerId: string) => (coachIdsByLearnerId.get(learnerId) ?? []).length > 0;
  const hasCohortCoverage = (learnerId: string) => (cohortIdsByLearnerId.get(learnerId) ?? []).length > 0;
  const matchesLane = (signal: LearnerEngagementSignal, lane: string) => {
    const uncovered = !hasCoachCoverage(signal.id) || !hasCohortCoverage(signal.id);
    const alert = signal.band !== "strong" || signal.overdueCount > 0 || uncovered;
    const aligned = signal.band === "strong" && hasCoachCoverage(signal.id) && hasCohortCoverage(signal.id);

    switch (lane) {
      case "uncovered":
        return uncovered;
      case "alert":
        return alert;
      case "aligned":
        return aligned;
      default:
        return true;
    }
  };
  const sortSignalsByPriority = (left: LearnerEngagementSignal, right: LearnerEngagementSignal) => {
    const leftUncovered = Number(!hasCoachCoverage(left.id) || !hasCohortCoverage(left.id));
    const rightUncovered = Number(!hasCoachCoverage(right.id) || !hasCohortCoverage(right.id));
    const leftBandRank = left.band === "risk" ? 0 : left.band === "watch" ? 1 : 2;
    const rightBandRank = right.band === "risk" ? 0 : right.band === "watch" ? 1 : 2;

    return (
      rightUncovered - leftUncovered ||
      leftBandRank - rightBandRank ||
      right.overdueCount - left.overdueCount ||
      right.dueSoonCount - left.dueSoonCount ||
      left.score - right.score
    );
  };

  const scopedSignals = base.engagementSignals.filter((signal) => {
    const matchesCohort = selectedCohortId ? (cohortIdsByLearnerId.get(signal.id) ?? []).includes(selectedCohortId) : true;
    const matchesCoach = selectedCoachId ? (coachIdsByLearnerId.get(signal.id) ?? []).includes(selectedCoachId) : true;
    const matchesQuery = normalizedQuery
      ? `${signal.name} ${signal.cohorts.join(" ")} ${signal.nextFocus} ${coachNameListForLearner(signal.id).join(" ")}`.toLowerCase().includes(normalizedQuery)
      : true;

    return matchesCohort && matchesCoach && matchesQuery;
  });
  const filteredSignals = scopedSignals.filter((signal) => matchesLane(signal, laneFilter));
  const filteredOverview = buildEngagementOverview(filteredSignals);
  const filteredLearnerIds = new Set(filteredSignals.map((signal) => signal.id));
  const laneBreakdown = [
    {
      id: "uncovered",
      label: "À structurer",
      count: scopedSignals.filter((signal) => matchesLane(signal, "uncovered")).length,
      tone: "warning" as const
    },
    {
      id: "alert",
      label: "Sous tension",
      count: scopedSignals.filter((signal) => matchesLane(signal, "alert")).length,
      tone: "accent" as const
    },
    {
      id: "aligned",
      label: "Bien alignés",
      count: scopedSignals.filter((signal) => matchesLane(signal, "aligned")).length,
      tone: "success" as const
    }
  ].map((item) => ({
    ...item,
    isActive: laneFilter === item.id
  }));
  const learnersWithoutCoach = filteredSignals.filter((signal) => !hasCoachCoverage(signal.id)).length;
  const learnersWithoutCohort = filteredSignals.filter((signal) => !hasCohortCoverage(signal.id)).length;
  const priorityLearners = [...filteredSignals].sort(sortSignalsByPriority);
  const learnerOperations = priorityLearners.slice(0, 8).map((signal) => {
    const coachNames = coachNameListForLearner(signal.id);
    const cohortIds = cohortIdsByLearnerId.get(signal.id) ?? [];
    const uncovered = !hasCoachCoverage(signal.id) || !hasCohortCoverage(signal.id);

    return {
      id: signal.id,
      name: signal.name,
      score: signal.score,
      band: signal.band,
      bandLabel: signal.bandLabel,
      cohorts: signal.cohorts,
      coachNames,
      coverageLabel: uncovered
        ? !hasCoachCoverage(signal.id)
          ? "Sans coach affecté"
          : "Sans cohorte"
        : `${coachNames.length} coach(s) · ${cohortIds.length} cohorte(s)`,
      coverageTone: (!hasCoachCoverage(signal.id) ? "warning" : !hasCohortCoverage(signal.id) ? "accent" : "success") as
        | "warning"
        | "accent"
        | "success",
      lastActivityLabel: signal.lastActivityLabel,
      nextFocus: signal.nextFocus,
      assignmentCount: signal.assignmentCount,
      completionRate: signal.completionRate,
      onTimeRate: signal.onTimeRate,
      averageQuizScore: signal.averageQuizScore,
      overdueCount: signal.overdueCount,
      dueSoonCount: signal.dueSoonCount
    };
  });
  const cohortRadar = base.cohortOptions
    .map((cohort) => {
      const memberIds = learnerIdsByCohortId.get(cohort.id) ?? [];
      const signals = memberIds
        .map((learnerId) => learnerSignalById.get(learnerId))
        .filter((signal): signal is LearnerEngagementSignal => Boolean(signal))
        .filter((signal) => filteredLearnerIds.has(signal.id));
      const coachIds = coachIdsByCohortId.get(cohort.id) ?? [];
      const leadCoaches = coachIds.map((coachId) => coachById.get(coachId)?.name ?? "Coach").slice(0, 3);
      const averageScore = signals.length
        ? roundMetric(signals.reduce((total, signal) => total + signal.score, 0) / signals.length)
        : 0;
      const completionSignals = signals.filter((signal) => signal.completionRate !== null);
      const completionRate = completionSignals.length
        ? roundMetric(
            completionSignals.reduce((total, signal) => total + (signal.completionRate ?? 0), 0) / completionSignals.length
          )
        : null;
      const uncoveredCount = signals.filter((signal) => !hasCoachCoverage(signal.id)).length;
      const atRiskCount = signals.filter((signal) => signal.band === "risk").length;
      const watchCount = signals.filter((signal) => signal.band === "watch").length;
      const nextNeed =
        uncoveredCount > 0
          ? `${uncoveredCount} coaché(s) à couvrir côté coach`
          : atRiskCount > 0
            ? `${atRiskCount} coaché(s) à relancer vite`
            : signals[0]?.nextFocus ?? "Rythme cohorte stable";

      return {
        id: cohort.id,
        name: cohort.label,
        memberCount: signals.length,
        averageScore,
        completionRate,
        uncoveredCount,
        atRiskCount,
        watchCount,
        leadCoaches,
        nextNeed,
        tone: (averageScore >= 75 ? "success" : averageScore >= 45 ? "accent" : "warning") as
          | "success"
          | "accent"
          | "warning",
        isActive: cohort.id === selectedCohortId
      };
    })
    .filter((cohort) => cohort.memberCount > 0 || cohort.id === selectedCohortId || (!selectedCoachId && !query))
    .sort(
      (left, right) =>
        Number(right.isActive) - Number(left.isActive) ||
        right.uncoveredCount - left.uncoveredCount ||
        right.atRiskCount - left.atRiskCount ||
        left.averageScore - right.averageScore
    );
  const focusCohort =
    cohortRadar.find((cohort) => cohort.id === selectedCohortId) ??
    cohortRadar[0] ??
    null;
  const coachPortfolios = base.coachOptions
    .map((coach) => {
      const coachRows = assignments.filter((item) => item.coach_id === coach.id);
      const coveredLearnerIds = (coveredLearnerIdsByCoachId.get(coach.id) ?? []).filter((learnerId) => {
        const matchesSelectedCohort = selectedCohortId
          ? (cohortIdsByLearnerId.get(learnerId) ?? []).includes(selectedCohortId)
          : true;
        const matchesQuery = normalizedQuery
          ? `${learnerSignalById.get(learnerId)?.name ?? ""} ${(cohortIdsByLearnerId.get(learnerId) ?? [])
              .map((cohortId) => cohortLabelById.get(cohortId) ?? "")
              .join(" ")}`.toLowerCase().includes(normalizedQuery)
          : true;

        return matchesSelectedCohort && matchesQuery;
      });
      const coveredSignals = coveredLearnerIds
        .map((learnerId) => learnerSignalById.get(learnerId))
        .filter((signal): signal is LearnerEngagementSignal => Boolean(signal))
        .filter((signal) => laneFilter === "all" || filteredLearnerIds.has(signal.id));
      const directCoachees = uniqueById(
        coachRows
          .filter((item) => item.coachee_id)
          .map((item) => ({
            id: item.coachee_id as string,
            label: learnerSignalById.get(item.coachee_id as string)?.name ?? "Coaché"
          }))
      )
        .map((item) => item.label)
        .slice(0, 4);
      const cohorts = uniqueById(
        coachRows
          .filter((item) => item.cohort_id)
          .map((item) => ({
            id: item.cohort_id as string,
            label: cohortLabelById.get(item.cohort_id as string) ?? "Cohorte"
          }))
      )
        .map((item) => item.label)
        .slice(0, 4);
      const riskCount = coveredSignals.filter((signal) => signal.band !== "strong").length;
      const overloaded = coveredSignals.length >= 12 || riskCount >= 4;
      const statusTone = (coveredSignals.length === 0 ? "neutral" : overloaded ? "warning" : "success") as
        | "neutral"
        | "warning"
        | "success";
      const statusLabel =
        coveredSignals.length === 0 ? "à configurer" : overloaded ? "sous tension" : "opérationnel";

      return {
        id: coach.id,
        name: coachById.get(coach.id)?.name ?? coach.label,
        email: coachById.get(coach.id)?.email ?? "",
        directCount: coachRows.filter((item) => item.coachee_id).length,
        cohortCount: coachRows.filter((item) => item.cohort_id).length,
        learnerCoverageCount: coveredSignals.length,
        riskCount,
        directCoachees,
        cohorts,
        statusTone,
        statusLabel,
        sampleLearners: coveredSignals.sort(sortSignalsByPriority).slice(0, 3).map((signal) => signal.name),
        isActive: coach.id === selectedCoachId
      };
    })
    .filter((coach) => {
      const matchesCoach = selectedCoachId ? coach.id === selectedCoachId : true;
      const matchesQuery = normalizedQuery
        ? `${coach.name} ${coach.email} ${coach.directCoachees.join(" ")} ${coach.cohorts.join(" ")}`.toLowerCase().includes(normalizedQuery)
        : true;

      return matchesCoach && matchesQuery;
    })
    .sort(
      (left, right) =>
        Number(right.isActive) - Number(left.isActive) ||
        Number(right.statusTone === "warning") - Number(left.statusTone === "warning") ||
        right.riskCount - left.riskCount ||
        right.learnerCoverageCount - left.learnerCoverageCount
    );
  const activeCoachCount = coachPortfolios.filter((coach) => coach.learnerCoverageCount > 0).length;
  const assignmentHistory = assignments
    .map((assignment) => {
      const targetLearnerIds = assignment.coachee_id
        ? [assignment.coachee_id]
        : assignment.cohort_id
          ? learnerIdsByCohortId.get(assignment.cohort_id) ?? []
          : [];
      const matchesLearnerScope = targetLearnerIds.some((learnerId) => filteredLearnerIds.has(learnerId));

      return {
        id: assignment.id,
        coachName: coachById.get(assignment.coach_id)?.name ?? "Coach inconnu",
        target:
          assignment.coachee_id
            ? learnerSignalById.get(assignment.coachee_id)?.name ?? "Coaché inconnu"
            : cohortLabelById.get(assignment.cohort_id ?? "") ?? "Cohorte inconnue",
        targetType: assignment.coachee_id ? "coaché" : "cohorte",
        scopeLabel: assignment.coachee_id
          ? "Couverture directe"
          : `Cohorte · ${(learnerIdsByCohortId.get(assignment.cohort_id ?? "") ?? []).length} coaché(s)`,
        createdAt: formatDate(assignment.created_at),
        createdAtCompact: formatDateCompact(assignment.created_at),
        tone: (assignment.coachee_id ? "accent" : "warning") as "accent" | "warning",
        matchesLearnerScope
      };
    })
    .filter((assignment) => {
      const matchesCoach = selectedCoachId ? assignments.find((item) => item.id === assignment.id)?.coach_id === selectedCoachId : true;
      const matchesCohort = selectedCohortId
        ? assignments.find((item) => item.id === assignment.id)?.cohort_id === selectedCohortId || assignment.matchesLearnerScope
        : true;
      const matchesQuery = normalizedQuery
        ? `${assignment.coachName} ${assignment.target} ${assignment.scopeLabel}`.toLowerCase().includes(normalizedQuery)
        : true;

      return matchesCoach && matchesCohort && matchesQuery;
    })
    .slice(0, 12);
  const buildLearnerOpsHref = (params: {
    path: string;
    query?: string;
    coachId?: string;
    cohortId?: string;
    lane?: string;
  }) => {
    const searchParams = new URLSearchParams();

    if (params.query) {
      searchParams.set("query", params.query);
    }

    if (params.coachId) {
      searchParams.set("coach", params.coachId);
    }

    if (params.cohortId) {
      searchParams.set("cohort", params.cohortId);
    }

    if (params.lane && params.lane !== "all") {
      searchParams.set("lane", params.lane);
    }

    const value = searchParams.toString();
    return value ? `${params.path}?${value}` : params.path;
  };
  const priorityActions = [
    learnersWithoutCoach > 0
      ? {
          id: "coverage",
          title: `${learnersWithoutCoach} coaché(s) sans coach dans cette vue`,
          description: "Le risque principal n'est pas le contenu, mais l'absence de couverture de suivi.",
          href: "#admin-learners-studio",
          ctaLabel: "Affecter un coach",
          tone: "warning" as const
        }
      : {
          id: "coverage",
          title: "Couverture coach sous contrôle",
          description: "Tous les coachés visibles ont déjà au moins un coach dans leur périmètre.",
          href: "/coach",
          ctaLabel: "Voir le cockpit coach",
          tone: "success" as const
        },
    learnersWithoutCohort > 0
      ? {
          id: "cohorts",
          title: `${learnersWithoutCohort} coaché(s) encore sans cohorte`,
          description: "Sans cohorte, les parcours groupés et la lecture agenda restent moins exploitables.",
          href: "#admin-learners-studio",
          ctaLabel: "Rattacher une cohorte",
          tone: "accent" as const
        }
      : {
          id: "cohorts",
          title: "Population cohorte structurée",
          description: "Les coachés visibles sont déjà rattachés à une cohorte exploitable.",
          href: "/agenda",
          ctaLabel: "Piloter l'agenda",
          tone: "success" as const
        },
    focusCohort
      ? {
          id: "focus",
          title: `Prioriser ${focusCohort.name}`,
          description: focusCohort.nextNeed,
          href: buildLearnerOpsHref({
            path: "/admin/learners",
            query,
            coachId: selectedCoachId,
            cohortId: focusCohort.id,
            lane: "alert"
          }),
          ctaLabel: "Voir le détail",
          tone: focusCohort.tone
        }
      : {
          id: "focus",
          title: "Aucune cohorte remontée",
          description: "Le cockpit s'enrichira dès qu'une cohorte ou un coaché sera visible.",
          href: "/admin/users",
          ctaLabel: "Ouvrir les utilisateurs",
          tone: "neutral" as const
        },
    coachPortfolios[0]
      ? {
          id: "coach",
          title: `Arbitrer le portefeuille de ${coachPortfolios[0].name}`,
          description:
            coachPortfolios[0].learnerCoverageCount > 0
              ? `${coachPortfolios[0].learnerCoverageCount} coaché(s) couverts · ${coachPortfolios[0].riskCount} à surveiller`
              : "Coach disponible mais encore sans portefeuille actif.",
          href: buildLearnerOpsHref({
            path: "/admin/learners",
            query,
            coachId: coachPortfolios[0].id,
            cohortId: selectedCohortId,
            lane: laneFilter
          }),
          ctaLabel: "Isoler ce coach",
          tone: coachPortfolios[0].statusTone
        }
      : {
          id: "coach",
          title: "Aucun coach disponible",
          description: "Ajoute d'abord des coachs ou ouvre leur visibilité via une affectation.",
          href: "/admin/users",
          ctaLabel: "Gérer les utilisateurs",
          tone: "neutral" as const
        }
  ];
  const summaryParts = [
    selectedCohortId ? cohortLabelById.get(selectedCohortId) ?? "Cohorte ciblée" : null,
    selectedCoachId ? coachById.get(selectedCoachId)?.name ?? "Coach ciblé" : null,
    laneFilter !== "all"
      ? laneFilter === "uncovered"
        ? "à structurer"
        : laneFilter === "alert"
          ? "sous tension"
          : "bien alignés"
      : null,
    query ? `Recherche « ${query} »` : null
  ].filter(Boolean) as string[];

  return {
    ...base,
    filters: {
      query,
      cohortId: selectedCohortId,
      coachId: selectedCoachId,
      lane: laneFilter,
      summary: summaryParts.length ? summaryParts.join(" · ") : "Vue globale"
    },
    metrics: [
      {
        label: "Coachés visibles",
        value: filteredSignals.length.toString(),
        delta: `${base.engagementSignals.length} coaché(s) dans ECCE`
      },
      {
        label: "Sans coach",
        value: learnersWithoutCoach.toString(),
        delta: `${learnersWithoutCohort} sans cohorte sur la vue active`
      },
      {
        label: "Coachs actifs",
        value: activeCoachCount.toString(),
        delta: `${base.coachOptions.length} coach(s) configurés`
      },
      {
        label: "Tension pédagogique",
        value: `${filteredOverview.averageScore}%`,
        delta: `${laneBreakdown.find((item) => item.id === "alert")?.count ?? 0} coaché(s) sous tension`
      }
    ],
    analyticsOverview: {
      ...filteredOverview,
      totalPublishedContents: base.analyticsOverview.totalPublishedContents,
      totalQuizzes: base.analyticsOverview.totalQuizzes,
      totalAssignments: base.analyticsOverview.totalAssignments,
      totalCoaches: base.analyticsOverview.totalCoaches
    },
    laneBreakdown,
    learnerOperations,
    focusCohort,
    cohortRadar,
    coachPortfolios,
    coachAssignments: assignmentHistory,
    priorityActions
  };
}

export async function getProfessorPageData(params?: {
  query?: string;
  cohortId?: string;
  band?: string;
}) {
  const context = await requireRole(["admin", "professor"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const query = params?.query?.trim() ?? "";
  const normalizedQuery = query.toLowerCase();
  const bandFilter =
    params?.band === "risk" || params?.band === "watch" || params?.band === "strong" ? params.band : "all";

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
  const cohortIdsByUserId = cohortMembers.reduce((map, item) => {
    const current = map.get(item.user_id) ?? [];
    current.push(item.cohort_id);
    map.set(item.user_id, current);
    return map;
  }, new Map<string, string[]>());
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
  const sessions = (analyticsSessionsResult.data ?? []) as SessionAnalyticsRow[];

  const engagementSignals = buildEngagementSignals({
    learnerIds,
    profiles,
    cohortNamesByUserId,
    assignments,
    cohortMembers,
    attempts,
    submissions,
    sessions,
    notifications: (analyticsNotificationsResult.data ?? []) as NotificationAnalyticsRow[],
    badges: (analyticsBadgesResult.data ?? []) as BadgeAwardAnalyticsRow[]
  });
  const baselineOverview = buildEngagementOverview(engagementSignals);
  const engagementSignalById = new Map(engagementSignals.map((signal) => [signal.id, signal]));
  const bandRank = {
    risk: 0,
    watch: 1,
    strong: 2
  } satisfies Record<EngagementBand, number>;
  const sortSignalsByPriority = (left: LearnerEngagementSignal, right: LearnerEngagementSignal) =>
    bandRank[left.band] - bandRank[right.band] ||
    right.overdueCount - left.overdueCount ||
    right.dueSoonCount - left.dueSoonCount ||
    left.score - right.score ||
    (getDateValue(left.lastActivityAt) ?? 0) - (getDateValue(right.lastActivityAt) ?? 0);
  const sortSignalsByMomentum = (left: LearnerEngagementSignal, right: LearnerEngagementSignal) => {
    const leftBandScore = left.band === "strong" ? 2 : left.band === "watch" ? 1 : 0;
    const rightBandScore = right.band === "strong" ? 2 : right.band === "watch" ? 1 : 0;
    const leftTrendScore = left.trend === "up" ? 2 : left.trend === "steady" ? 1 : 0;
    const rightTrendScore = right.trend === "up" ? 2 : right.trend === "steady" ? 1 : 0;

    return (
      rightBandScore - leftBandScore ||
      rightTrendScore - leftTrendScore ||
      right.score - left.score ||
      right.recentActivityCount - left.recentActivityCount
    );
  };

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
      const topFocus =
        [...signals].sort(sortSignalsByPriority)[0]?.nextFocus ?? "Aucun signal remonté pour le moment";

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

  const selectedCohortId =
    params?.cohortId && cohortRows.some((cohort) => cohort.id === params.cohortId) ? params.cohortId : "";
  const filteredSignals = engagementSignals.filter((signal) => {
    const matchesCohort = selectedCohortId
      ? (cohortIdsByUserId.get(signal.id) ?? []).includes(selectedCohortId)
      : true;
    const matchesBand = bandFilter === "all" ? true : signal.band === bandFilter;
    const matchesQuery = normalizedQuery
      ? `${signal.name} ${signal.cohorts.join(" ")} ${signal.nextFocus}`.toLowerCase().includes(normalizedQuery)
      : true;

    return matchesCohort && matchesBand && matchesQuery;
  });
  const filteredOverview = buildEngagementOverview(filteredSignals);
  const filteredLearnerIds = new Set(filteredSignals.map((signal) => signal.id));
  const attentionLearners = [...filteredSignals]
    .filter((signal) => signal.band !== "strong")
    .sort(sortSignalsByPriority)
    .slice(0, 6);
  const learnerSpotlights = [...filteredSignals].sort(sortSignalsByPriority).slice(0, 6);
  const championLearners = [...filteredSignals].sort(sortSignalsByMomentum).slice(0, 5);
  const focusCohortId = selectedCohortId || cohortHealth[0]?.id || "";
  const focusCohortBase = cohortHealth.find((cohort) => cohort.id === focusCohortId) ?? null;
  const focusCohortSignals = focusCohortId
    ? engagementSignals.filter((signal) => (cohortIdsByUserId.get(signal.id) ?? []).includes(focusCohortId))
    : [];
  const focusCohort = focusCohortBase
    ? {
        ...focusCohortBase,
        shareOfPopulation: profiles.length ? roundMetric((focusCohortBase.memberCount / profiles.length) * 100) : 0,
        statusLabel:
          focusCohortBase.atRiskCount > 0
            ? `${focusCohortBase.atRiskCount} coaché(s) à relancer vite`
            : focusCohortBase.watchCount > 0
              ? `${focusCohortBase.watchCount} coaché(s) encore à surveiller`
              : "Rythme homogène à maintenir",
        learners: [...focusCohortSignals]
          .sort(sortSignalsByPriority)
          .slice(0, 4)
          .map((signal) => ({
            id: signal.id,
            name: signal.name,
            band: signal.band,
            bandLabel: signal.bandLabel,
            score: signal.score,
            nextFocus: signal.nextFocus,
            lastActivityLabel: signal.lastActivityLabel
          }))
      }
    : null;
  const cohortHealthWithSelection = cohortHealth
    .map((cohort) => ({
      ...cohort,
      isActive: cohort.id === focusCohortId
    }))
    .sort(
      (left, right) =>
        Number(right.isActive) - Number(left.isActive) ||
        right.atRiskCount - left.atRiskCount ||
        left.averageScore - right.averageScore
    );
  const cohortOptions = cohortHealth.map((cohort) => ({
    id: cohort.id,
    label: cohort.name,
    memberCount: cohort.memberCount,
    atRiskCount: cohort.atRiskCount
  }));
  const bandBreakdown = (["risk", "watch", "strong"] as EngagementBand[]).map((band) => ({
    id: band,
    label: getEngagementBandLabel(band),
    count: filteredSignals.filter((signal) => signal.band === band).length,
    tone: (band === "risk" ? "warning" : band === "watch" ? "accent" : "success") as
      | "warning"
      | "accent"
      | "success",
    isActive: bandFilter === band
  }));

  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const visibleAttempts = attempts.filter((attempt) => filteredLearnerIds.has(attempt.user_id));
  const attemptCountByQuizId = visibleAttempts.reduce((map, attempt) => {
    map.set(attempt.quiz_id, (map.get(attempt.quiz_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const gradedAttemptsByQuizId = visibleAttempts.reduce((map, attempt) => {
    if (attempt.status !== "graded" || attempt.score === null) {
      return map;
    }

    const current = map.get(attempt.quiz_id) ?? [];
    current.push(attempt.score);
    map.set(attempt.quiz_id, current);
    return map;
  }, new Map<string, number[]>());
  const quizAnalytics = quizzes
    .map((quiz) => {
      const grades = gradedAttemptsByQuizId.get(quiz.id) ?? [];
      const averageScore = grades.length ? roundMetric(grades.reduce((total, score) => total + score, 0) / grades.length) : null;
      const attemptCount = attemptCountByQuizId.get(quiz.id) ?? 0;
      let signalTone: "neutral" | "warning" | "accent" | "success" = "neutral";
      let signalLabel = "À lancer";
      let insight = "Quiz publié mais encore sans tentatives visibles.";

      if (attemptCount > 0 && averageScore !== null && averageScore < 60) {
        signalTone = "warning";
        signalLabel = "Fragile";
        insight = `${averageScore}% de moyenne sur ${attemptCount} tentative(s).`;
      } else if (attemptCount > 0 && averageScore !== null && averageScore < 75) {
        signalTone = "accent";
        signalLabel = "À consolider";
        insight = `${averageScore}% de moyenne sur ${attemptCount} tentative(s).`;
      } else if (attemptCount > 0) {
        signalTone = "success";
        signalLabel = "Stable";
        insight = `${attemptCount} tentative(s) déjà remontée(s).`;
      }

      return {
        id: quiz.id,
        title: quiz.title,
        kind: quiz.kind ?? "quiz",
        questionCount: quiz.quiz_questions?.length ?? 0,
        attemptCount,
        averageScore,
        timeLimitMinutes: quiz.time_limit_minutes ?? null,
        signalTone,
        signalLabel,
        insight
      };
    })
    .sort((left, right) => {
      const leftPriority =
        left.attemptCount === 0 ? 3 : left.averageScore !== null && left.averageScore < 60 ? 0 : left.averageScore !== null && left.averageScore < 75 ? 1 : 2;
      const rightPriority =
        right.attemptCount === 0 ? 3 : right.averageScore !== null && right.averageScore < 60 ? 0 : right.averageScore !== null && right.averageScore < 75 ? 1 : 2;

      return rightPriority === leftPriority
        ? right.attemptCount - left.attemptCount || (left.averageScore ?? 101) - (right.averageScore ?? 101)
        : leftPriority - rightPriority;
    });
  const quizWatchlist = quizAnalytics.slice(0, 6);
  const fragileQuizCount = quizAnalytics.filter(
    (quiz) => quiz.attemptCount > 0 && quiz.averageScore !== null && quiz.averageScore < 75
  ).length;

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
  const filteredContents = normalizedQuery
    ? contents.filter((content) =>
        `${content.title} ${content.summary ?? ""} ${content.category ?? ""}`.toLowerCase().includes(normalizedQuery)
      )
    : contents;
  const contentSpotlight = [...(filteredContents.length ? filteredContents : contents)]
    .sort(
      (left, right) =>
        (assignmentCountByContentId.get(right.id) ?? 0) - (assignmentCountByContentId.get(left.id) ?? 0) ||
        (linkedQuizCountByContentId.get(right.id) ?? 0) - (linkedQuizCountByContentId.get(left.id) ?? 0)
    )
    .slice(0, 4)
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
    .filter((attempt) => filteredLearnerIds.has(attempt.user_id))
    .map((attempt) => {
      const learner = profileById.get(attempt.user_id);
      const quiz = quizById.get(attempt.quiz_id);
      const tone: "success" | "accent" | "warning" =
        attempt.status === "graded"
          ? attempt.score !== null && attempt.score < 60
            ? "warning"
            : "success"
          : "accent";

      return {
        id: attempt.id,
        learner: learner ? formatUserName(learner) : "Coaché inconnu",
        quizTitle: quiz?.title ?? "Quiz",
        submittedAt: formatDate(attempt.submitted_at),
        attemptLabel: `Tentative ${attempt.attempt_number}`,
        score: attempt.status === "submitted" ? "En correction" : attempt.score !== null ? `${attempt.score}%` : "Non noté",
        tone
      };
    })
    .filter((result) =>
      normalizedQuery ? `${result.learner} ${result.quizTitle}`.toLowerCase().includes(normalizedQuery) : true
    )
    .slice(0, 8);
  const pedagogicalFeed = [
    ...attempts
      .filter((attempt) => filteredLearnerIds.has(attempt.user_id))
      .map((attempt) => {
        const learner = profileById.get(attempt.user_id);
        const quiz = quizById.get(attempt.quiz_id);

        return {
          id: `attempt-${attempt.id}`,
          type: "Quiz",
          title: `${learner ? formatUserName(learner) : "Coaché"} · ${quiz?.title ?? "Quiz"}`,
          description:
            attempt.status === "graded"
              ? `Copie notée ${attempt.score !== null ? `${attempt.score}%` : "sans score"} · tentative ${attempt.attempt_number}`
              : `Tentative ${attempt.attempt_number} encore en correction`,
          createdAt: attempt.submitted_at,
          createdAtLabel: formatDate(attempt.submitted_at),
          tone: (attempt.status === "graded"
            ? attempt.score !== null && attempt.score < 60
              ? "warning"
              : "success"
            : "accent") as "warning" | "success" | "accent"
        };
      }),
    ...submissions
      .filter((submission) => filteredLearnerIds.has(submission.user_id))
      .map((submission) => {
        const learner = profileById.get(submission.user_id);
        const submittedAt = submission.submitted_at ?? submission.created_at ?? null;

        return {
          id: `submission-${submission.id}`,
          type: "Soumission",
          title: `${learner ? formatUserName(learner) : "Coaché"} · ${submission.title}`,
          description:
            submission.status === "reviewed"
              ? "Soumission déjà relue et refermée dans le flux pédagogique."
              : "Soumission déposée, utile pour la prochaine boucle de feedback.",
          createdAt: submittedAt,
          createdAtLabel: formatDate(submittedAt),
          tone: (submission.status === "reviewed" ? "success" : "accent") as "success" | "accent"
        };
      }),
    ...sessions
      .filter((session) => filteredLearnerIds.has(session.coachee_id))
      .map((session) => {
        const learner = profileById.get(session.coachee_id);

        return {
          id: `session-${session.coachee_id}-${session.starts_at}`,
          type: "Séance",
          title: `${learner ? formatUserName(learner) : "Coaché"} · séance ${session.status === "cancelled" ? "annulée" : "coach"}`,
          description: `${getRelativeDayLabel(session.starts_at)} · ${formatTimeOnly(session.starts_at)}`,
          createdAt: session.starts_at,
          createdAtLabel: formatDate(session.starts_at),
          tone: (session.status === "cancelled" ? "warning" : "accent") as "warning" | "accent"
        };
      })
  ]
    .filter((item) => Boolean(item.createdAt))
    .filter((item) =>
      normalizedQuery ? `${item.title} ${item.description}`.toLowerCase().includes(normalizedQuery) : true
    )
    .sort((left, right) => (getDateValue(right.createdAt) ?? 0) - (getDateValue(left.createdAt) ?? 0))
    .slice(0, 8);

  const learnersWithoutCohort = profiles.filter((profile) => !(cohortNamesByUserId.get(profile.id) ?? []).length).length;
  const overdueTotal = filteredSignals.reduce((total, signal) => total + signal.overdueCount, 0);
  const dueSoonTotal = filteredSignals.reduce((total, signal) => total + signal.dueSoonCount, 0);
  const topPriorityLearner = attentionLearners[0] ?? learnerSpotlights[0] ?? null;
  const topFragileQuiz =
    quizAnalytics.find((quiz) => quiz.attemptCount > 0 && quiz.averageScore !== null && quiz.averageScore < 75) ??
    quizAnalytics[0] ??
    null;
  const leadContent = contentSpotlight[0] ?? null;
  const selectedCohortLabel = selectedCohortId ? cohortNameById.get(selectedCohortId) ?? "Cohorte ciblée" : "Vue globale";
  const activeFilterParts = [
    selectedCohortId ? selectedCohortLabel : null,
    bandFilter !== "all" ? getEngagementBandLabel(bandFilter) : null,
    query ? `Recherche « ${query} »` : null
  ].filter(Boolean) as string[];
  const priorityActions = [
    topPriorityLearner
      ? {
          id: "learners",
          eyebrow: "Relance apprenant",
          title:
            topPriorityLearner.band === "strong"
              ? `Préserver la dynamique de ${topPriorityLearner.name}`
              : `Traiter le signal de ${topPriorityLearner.name}`,
          description: `${topPriorityLearner.nextFocus} · ${topPriorityLearner.lastActivityLabel}.`,
          href: "/notifications",
          ctaLabel: "Notifier",
          tone: (topPriorityLearner.band === "risk"
            ? "warning"
            : topPriorityLearner.band === "watch"
              ? "accent"
              : "success") as "warning" | "accent" | "success"
        }
      : {
          id: "learners",
          eyebrow: "Population visible",
          title: "Aucun apprenant dans le radar courant",
          description: "Change les filtres pour réouvrir une cohorte ou une bande d'engagement plus large.",
          href: "/professor",
          ctaLabel: "Réinitialiser",
          tone: "neutral" as const
        },
    {
      id: "deadlines",
      eyebrow: "Cadence",
      title:
        overdueTotal > 0
          ? `${overdueTotal} échéance(s) déjà dépassée(s)`
          : dueSoonTotal > 0
            ? `${dueSoonTotal} deadline(s) arrivent cette semaine`
            : "Cadence des échéances sous contrôle",
      description:
        overdueTotal > 0
          ? "Le cockpit professor pointe une tension réelle sur les apprenants actuellement visibles."
          : dueSoonTotal > 0
            ? "Le bon moment pour rééquilibrer les relances avant le pic de charge."
            : "Aucun goulot d'étranglement fort n'est remonté sur ce périmètre.",
      href: "/agenda",
      ctaLabel: "Ouvrir l'agenda",
      tone: (overdueTotal > 0 ? "warning" : dueSoonTotal > 0 ? "accent" : "success") as
        | "warning"
        | "accent"
        | "success"
    },
    topFragileQuiz
      ? {
          id: "quiz",
          eyebrow: "Calibration quiz",
          title:
            topFragileQuiz.averageScore !== null && topFragileQuiz.averageScore < 75
              ? `Revoir ${topFragileQuiz.title}`
              : `Suivre ${topFragileQuiz.title}`,
          description: topFragileQuiz.insight,
          href: `/professor/quizzes/${topFragileQuiz.id}`,
          ctaLabel: "Analyser le quiz",
          tone: topFragileQuiz.signalTone
        }
      : {
          id: "quiz",
          eyebrow: "Calibration quiz",
          title: "Aucun quiz publié",
          description: "Le radar professor mettra en avant ici le quiz le plus utile à recalibrer.",
          href: "/admin/quizzes",
          ctaLabel: "Créer un quiz",
          tone: "neutral" as const
        },
    leadContent
      ? {
          id: "content",
          eyebrow: "Ressource pivot",
          title: `Capitaliser sur ${leadContent.title}`,
          description: `${leadContent.assignmentCount} assignation(s) · ${leadContent.linkedQuizCount} quiz lié(s).`,
          href: `/library/${leadContent.slug}`,
          ctaLabel: "Voir la ressource",
          tone: "success" as const
        }
      : {
          id: "content",
          eyebrow: "Ressource pivot",
          title: "Bibliothèque à enrichir",
          description: "Aucune ressource publiée n'est encore remontée comme pivot pédagogique.",
          href: "/library",
          ctaLabel: "Ouvrir la bibliothèque",
          tone: "neutral" as const
        }
  ];

  return {
    context,
    filters: {
      query,
      cohortId: selectedCohortId,
      band: bandFilter,
      summary: activeFilterParts.length ? activeFilterParts.join(" · ") : "Vue globale"
    },
    cohortOptions,
    metrics: [
      {
        label: "Apprenants visibles",
        value: filteredSignals.length.toString(),
        delta: `${profiles.length} coaché(s) suivis · ${selectedCohortId ? selectedCohortLabel : `${cohortRows.length} cohorte(s)`}`
      },
      {
        label: "Engagement moyen",
        value: `${filteredOverview.averageScore}%`,
        delta: `${filteredOverview.recentlyActiveCount} actif(s) sur 7 jours`
      },
      {
        label: "Relances prioritaires",
        value: attentionLearners.length.toString(),
        delta: overdueTotal > 0 ? `${overdueTotal} échéance(s) en retard` : `${dueSoonTotal} deadline(s) à venir`
      },
      {
        label: "Quiz sous vigilance",
        value: fragileQuizCount.toString(),
        delta:
          filteredOverview.averageQuizScore !== null
            ? `${filteredOverview.averageQuizScore}% de moyenne`
            : `${quizzes.length} quiz publiés`
      }
    ],
    analyticsOverview: {
      ...filteredOverview,
      totalPublishedContents: contents.length,
      totalQuizzes: quizzes.length,
      totalAssignments: assignments.length,
      totalLearners: profiles.length
    },
    bandBreakdown,
    focusCohort,
    priorityActions,
    cohortHealth: cohortHealthWithSelection,
    attentionLearners,
    learnerSpotlights,
    championLearners,
    pedagogicalFeed,
    recentQuizResults,
    quizWatchlist,
    contentSpotlight,
    baseline: {
      averageScore: baselineOverview.averageScore,
      learnersWithoutCohort
    }
  };
}

export async function getProfessorCoachingOpsPageData(filters?: {
  query?: string;
  coachId?: string;
  cohortId?: string;
  status?: string;
  period?: string;
}) {
  const context = await requireRole(["admin", "professor"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const normalizedQuery = normalizeDataSearchQuery(filters?.query);
  const statusFilter =
    filters?.status === "planned" || filters?.status === "completed" || filters?.status === "cancelled"
      ? filters.status
      : "all";
  const periodFilter =
    filters?.period === "week" ||
    filters?.period === "month" ||
    filters?.period === "past" ||
    filters?.period === "all"
      ? filters.period
      : "upcoming";
  const now = Date.now();
  const today = new Date(now);
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const periodWindow =
    periodFilter === "week"
      ? { start: dayStart, end: dayStart + 7 * 24 * 60 * 60 * 1000, label: "7 prochains jours" }
      : periodFilter === "month"
        ? { start: dayStart, end: dayStart + 30 * 24 * 60 * 60 * 1000, label: "30 prochains jours" }
        : periodFilter === "past"
          ? { start: null, end: now, label: "Historique" }
          : periodFilter === "all"
            ? { start: null, end: null, label: "Toutes les séances" }
            : { start: now, end: null, label: "À venir" };

  const [rolesResult, profilesResult, cohortsResult, cohortMembersResult, noteSearchResult] = await Promise.all([
    admin
      .from("user_roles")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .in("role", ["coach", "coachee"]),
    admin
      .from("profiles")
      .select("id, first_name, last_name, status, bio, timezone")
      .eq("organization_id", organizationId)
      .order("last_name"),
    admin.from("cohorts").select("id, name").eq("organization_id", organizationId).order("name"),
    admin.from("cohort_members").select("user_id, cohort_id"),
    normalizedQuery
      ? admin
          .from("coaching_notes")
          .select("session_id")
          .or(
            `summary.ilike.%${normalizedQuery}%,blockers.ilike.%${normalizedQuery}%,next_actions.ilike.%${normalizedQuery}%`
          )
          .limit(120)
      : Promise.resolve({ data: [] as Array<{ session_id: string }> })
  ]);
  const roleRows = (rolesResult.data ?? []) as Array<{ user_id: string; role: AppRole }>;
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const coachIds = new Set(roleRows.filter((row) => row.role === "coach").map((row) => row.user_id));
  const cohorts = (cohortsResult.data ?? []) as Array<{ id: string; name: string }>;
  const cohortNameById = new Map(cohorts.map((cohort) => [cohort.id, cohort.name]));
  const cohortMembers = (cohortMembersResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>;
  const cohortNamesByUserId = cohortMembers.reduce((map, member) => {
    const cohortName = cohortNameById.get(member.cohort_id);

    if (!cohortName) {
      return map;
    }

    const current = map.get(member.user_id) ?? [];
    current.push(cohortName);
    map.set(member.user_id, current);
    return map;
  }, new Map<string, string[]>());
  const coachOptions = profiles
    .filter((profile) => coachIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      label: formatUserName(profile)
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "fr"));
  const cohortOptions = cohorts.map((cohort) => ({
    id: cohort.id,
    label: cohort.name
  }));
  const selectedCoachId = filters?.coachId && coachOptions.some((coach) => coach.id === filters.coachId) ? filters.coachId : "";
  const selectedCohortId =
    filters?.cohortId && cohortOptions.some((cohort) => cohort.id === filters.cohortId) ? filters.cohortId : "";
  const matchingProfileIds = normalizedQuery
    ? profiles
        .filter((profile) =>
          matchesDataSearch(
            [
              profile.first_name,
              profile.last_name,
              profile.bio,
              profile.timezone,
              (cohortNamesByUserId.get(profile.id) ?? []).join(" ")
            ],
            normalizedQuery
          )
        )
        .map((profile) => profile.id)
    : [];
  const matchingCohortIds = normalizedQuery
    ? cohorts
        .filter((cohort) => matchesDataSearch([cohort.name], normalizedQuery))
        .map((cohort) => cohort.id)
    : [];
  const matchingNoteSessionIds = Array.from(
    new Set(((noteSearchResult.data ?? []) as Array<{ session_id: string }>).map((note) => note.session_id))
  );
  const searchFilters = normalizedQuery
    ? [
        matchingProfileIds.length ? `coach_id.in.(${matchingProfileIds.join(",")})` : null,
        matchingProfileIds.length ? `coachee_id.in.(${matchingProfileIds.join(",")})` : null,
        matchingCohortIds.length ? `cohort_id.in.(${matchingCohortIds.join(",")})` : null,
        matchingNoteSessionIds.length ? `id.in.(${matchingNoteSessionIds.join(",")})` : null,
        `video_link.ilike.%${normalizedQuery}%`
      ].filter(Boolean)
    : [];

  const sessionsResult = await (() => {
    let query = admin
      .from("coaching_sessions")
      .select("id, coach_id, coachee_id, cohort_id, starts_at, ends_at, status, video_link, created_at")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: periodFilter !== "past" })
      .limit(120);

    if (selectedCoachId) {
      query = query.eq("coach_id", selectedCoachId);
    }

    if (selectedCohortId) {
      query = query.eq("cohort_id", selectedCohortId);
    }

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (periodWindow.start !== null) {
      query = query.gte("starts_at", new Date(periodWindow.start).toISOString());
    }

    if (periodWindow.end !== null) {
      query = query.lt("starts_at", new Date(periodWindow.end).toISOString());
    }

    if (searchFilters.length) {
      query = query.or(searchFilters.join(","));
    }

    return query;
  })();
  const sessions = (sessionsResult.data ?? []) as Array<{
    id: string;
    coach_id: string;
    coachee_id: string;
    cohort_id: string | null;
    starts_at: string;
    ends_at: string | null;
    status: "planned" | "completed" | "cancelled";
    video_link: string | null;
    created_at: string;
  }>;
  const sessionIds = sessions.map((session) => session.id);
  const notesResult = sessionIds.length
    ? await admin
        .from("coaching_notes")
        .select("id, session_id, coach_id, summary, blockers, next_actions, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
    : { data: [] as CoachingNoteRow[] };
  const notesBySessionId = ((notesResult.data ?? []) as CoachingNoteRow[]).reduce((map, note) => {
    const current = map.get(note.session_id) ?? [];
    current.push(note);
    map.set(note.session_id, current);
    return map;
  }, new Map<string, CoachingNoteRow[]>());
  const getStatusLabel = (status: "planned" | "completed" | "cancelled") => {
    switch (status) {
      case "completed":
        return "réalisée";
      case "cancelled":
        return "annulée";
      default:
        return "planifiée";
    }
  };
  const getStatusTone = (status: "planned" | "completed" | "cancelled") =>
    status === "completed" ? ("success" as const) : status === "cancelled" ? ("warning" as const) : ("accent" as const);
  const visibleSessions = sessions.map((session) => {
    const sessionNotes = notesBySessionId.get(session.id) ?? [];
    const latestNote = sessionNotes[0] ?? null;
    const timestamp = getDateValue(session.starts_at) ?? 0;
    const learner = profileById.get(session.coachee_id) ?? null;
    const coach = profileById.get(session.coach_id) ?? null;
    const fallbackCohort = learner ? (cohortNamesByUserId.get(learner.id) ?? [])[0] ?? null : null;
    const isPast = timestamp < now;
    const needsNote = session.status !== "cancelled" && isPast && sessionNotes.length === 0;

    return {
      id: session.id,
      coachId: session.coach_id,
      coacheeId: session.coachee_id,
      coachName: coach ? formatUserName(coach) : "Coach inconnu",
      learnerName: learner ? formatUserName(learner) : "Coaché inconnu",
      learnerStatus: learner?.status ?? "active",
      cohortName: session.cohort_id ? cohortNameById.get(session.cohort_id) ?? fallbackCohort : fallbackCohort,
      status: session.status,
      statusLabel: getStatusLabel(session.status),
      statusTone: getStatusTone(session.status),
      date: formatDate(session.starts_at),
      dayLabel: getRelativeDayLabel(session.starts_at),
      timeLabel: `${formatTimeOnly(session.starts_at)}${session.ends_at ? ` → ${formatTimeOnly(session.ends_at)}` : ""}`,
      timestamp,
      hasVideo: Boolean(session.video_link),
      noteCount: sessionNotes.length,
      latestNoteSummary: latestNote?.summary ?? latestNote?.next_actions ?? latestNote?.blockers ?? null,
      latestNoteAt: latestNote ? formatDate(latestNote.created_at) : null,
      needsNote,
      href: `/coach/sessions/${session.id}`
    };
  });
  const plannedCount = visibleSessions.filter((session) => session.status === "planned").length;
  const completedCount = visibleSessions.filter((session) => session.status === "completed").length;
  const cancelledCount = visibleSessions.filter((session) => session.status === "cancelled").length;
  const upcomingCount = visibleSessions.filter(
    (session) => session.status === "planned" && session.timestamp >= now
  ).length;
  const stalePlannedSessions = visibleSessions.filter(
    (session) => session.status === "planned" && session.timestamp < now
  );
  const sessionsNeedingNotes = visibleSessions.filter((session) => session.needsNote);
  const actionableSessions = visibleSessions.filter(
    (session) => session.status !== "cancelled" && (session.status === "completed" || session.timestamp < now)
  );
  const documentedActionableSessions = actionableSessions.filter((session) => session.noteCount > 0).length;
  const noteCoverage = actionableSessions.length
    ? roundMetric((documentedActionableSessions / actionableSessions.length) * 100)
    : 0;
  const nextSession =
    [...visibleSessions]
      .filter((session) => session.status === "planned" && session.timestamp >= now)
      .sort((left, right) => left.timestamp - right.timestamp)[0] ?? null;
  const coachLoads = coachOptions
    .map((coach) => {
      const coachSessions = visibleSessions.filter((session) => session.coachId === coach.id);
      const learnerNames = Array.from(new Set(coachSessions.map((session) => session.learnerName))).slice(0, 3);

      return {
        id: coach.id,
        name: coach.label,
        sessionCount: coachSessions.length,
        plannedCount: coachSessions.filter((session) => session.status === "planned").length,
        completedCount: coachSessions.filter((session) => session.status === "completed").length,
        needsNoteCount: coachSessions.filter((session) => session.needsNote).length,
        learnerNames,
        isActive: selectedCoachId === coach.id
      };
    })
    .filter((coach) => coach.sessionCount > 0 || !selectedCoachId)
    .sort(
      (left, right) =>
        Number(right.isActive) - Number(left.isActive) ||
        right.needsNoteCount - left.needsNoteCount ||
        right.plannedCount - left.plannedCount ||
        right.sessionCount - left.sessionCount
    )
    .slice(0, 8);
  const cohortLoads = cohortOptions
    .map((cohort) => {
      const cohortSessions = visibleSessions.filter((session) => session.cohortName === cohort.label);

      return {
        id: cohort.id,
        name: cohort.label,
        sessionCount: cohortSessions.length,
        upcomingCount: cohortSessions.filter((session) => session.status === "planned" && session.timestamp >= now).length,
        needsNoteCount: cohortSessions.filter((session) => session.needsNote).length,
        completedCount: cohortSessions.filter((session) => session.status === "completed").length,
        isActive: selectedCohortId === cohort.id
      };
    })
    .filter((cohort) => cohort.sessionCount > 0 || !selectedCohortId)
    .sort(
      (left, right) =>
        Number(right.isActive) - Number(left.isActive) ||
        right.needsNoteCount - left.needsNoteCount ||
        right.upcomingCount - left.upcomingCount ||
        right.sessionCount - left.sessionCount
    )
    .slice(0, 8);
  const statusBreakdown = [
    { id: "planned", label: "Planifiées", count: plannedCount, tone: "accent" as const },
    { id: "completed", label: "Réalisées", count: completedCount, tone: "success" as const },
    { id: "cancelled", label: "Annulées", count: cancelledCount, tone: "warning" as const }
  ].map((status) => ({
    ...status,
    isActive: statusFilter === status.id
  }));
  const priorityActions = [
    stalePlannedSessions[0]
      ? {
          id: "stale",
          eyebrow: "Statut à clarifier",
          title: `${stalePlannedSessions.length} séance(s) planifiée(s) dans le passé`,
          description: `${stalePlannedSessions[0].learnerName} · ${stalePlannedSessions[0].date}.`,
          tone: "warning" as const,
          href: stalePlannedSessions[0].href,
          cta: "Ouvrir"
        }
      : {
          id: "stale",
          eyebrow: "Cadence saine",
          title: "Aucune séance passée encore ouverte",
          description: "Les créneaux planifiés restent cohérents avec le calendrier visible.",
          tone: "success" as const,
          href: "/agenda",
          cta: "Agenda"
        },
    sessionsNeedingNotes[0]
      ? {
          id: "notes",
          eyebrow: "Mémoire coach",
          title: `${sessionsNeedingNotes.length} séance(s) sans note`,
          description: `${sessionsNeedingNotes[0].learnerName} · ${sessionsNeedingNotes[0].coachName}.`,
          tone: "accent" as const,
          href: sessionsNeedingNotes[0].href,
          cta: "Documenter"
        }
      : {
          id: "notes",
          eyebrow: "Mémoire coach",
          title: "Les séances passées sont documentées",
          description: "La couverture des notes est propre sur le périmètre filtré.",
          tone: "success" as const,
          href: "/professor/coaching",
          cta: "Vue globale"
        },
    nextSession
      ? {
          id: "next",
          eyebrow: "Prochain direct",
          title: `${nextSession.learnerName} · ${nextSession.dayLabel}`,
          description: `${nextSession.timeLabel} avec ${nextSession.coachName}.`,
          tone: "neutral" as const,
          href: nextSession.href,
          cta: "Préparer"
        }
      : {
          id: "next",
          eyebrow: "Planification",
          title: "Aucune séance à venir dans cette vue",
          description: "Élargis la période ou ouvre l'agenda pour planifier les prochains créneaux.",
          tone: "neutral" as const,
          href: "/agenda",
          cta: "Planifier"
        }
  ];
  const activeFilterParts = [
    periodWindow.label,
    statusFilter !== "all" ? getStatusLabel(statusFilter) : null,
    selectedCoachId ? coachOptions.find((coach) => coach.id === selectedCoachId)?.label ?? "Coach ciblé" : null,
    selectedCohortId ? cohortNameById.get(selectedCohortId) ?? "Cohorte ciblée" : null,
    normalizedQuery ? `Recherche « ${normalizedQuery} »` : null
  ].filter(Boolean) as string[];
  const meterBand: EngagementBand = noteCoverage >= 75 ? "strong" : noteCoverage >= 45 ? "watch" : "risk";

  return {
    context,
    canOpenSessionWorkspace: context.roles.includes("admin"),
    filters: {
      query: normalizedQuery,
      coachId: selectedCoachId,
      cohortId: selectedCohortId,
      status: statusFilter,
      period: periodFilter,
      summary: activeFilterParts.join(" · ")
    },
    coachOptions,
    cohortOptions,
    periodOptions: [
      { id: "upcoming", label: "À venir" },
      { id: "week", label: "7 prochains jours" },
      { id: "month", label: "30 prochains jours" },
      { id: "past", label: "Historique" },
      { id: "all", label: "Tout afficher" }
    ],
    statusBreakdown,
    priorityActions,
    coachLoads,
    cohortLoads,
    sessions: visibleSessions,
    focus: {
      nextSession,
      noteCoverage,
      meterBand,
      staleCount: stalePlannedSessions.length,
      needsNoteCount: sessionsNeedingNotes.length,
      upcomingCount
    },
    metrics: [
      {
        label: "Séances visibles",
        value: visibleSessions.length.toString(),
        delta: `${periodWindow.label} · ${statusFilter === "all" ? "tous statuts" : getStatusLabel(statusFilter)}`
      },
      {
        label: "À venir",
        value: upcomingCount.toString(),
        delta: nextSession ? `${nextSession.learnerName} · ${nextSession.dayLabel}` : "aucun créneau futur"
      },
      {
        label: "Notes couvertes",
        value: `${noteCoverage}%`,
        delta: `${documentedActionableSessions}/${actionableSessions.length || 0} séance(s) actionnables`
      },
      {
        label: "À clarifier",
        value: (stalePlannedSessions.length + sessionsNeedingNotes.length).toString(),
        delta:
          stalePlannedSessions.length > 0
            ? `${stalePlannedSessions.length} statut(s) passé(s)`
            : `${sessionsNeedingNotes.length} note(s) manquante(s)`
      }
    ]
  };
}

export async function getProfessorCohortDetailPageData(cohortId: string) {
  const professorData = await getProfessorPageData({ cohortId });
  const cohort = professorData.cohortHealth.find((item) => item.id === cohortId) ?? null;

  if (!cohort) {
    return null;
  }

  const coachingData = await getProfessorCoachingOpsPageData({
    cohortId,
    period: "all"
  });
  const admin = createSupabaseAdminClient();
  const organizationId = professorData.context.profile.organization_id;
  const cohortMembersResult = await admin.from("cohort_members").select("user_id").eq("cohort_id", cohortId);
  const cohortMemberIds = Array.from(
    new Set(((cohortMembersResult.data ?? []) as Array<{ user_id: string }>).map((member) => member.user_id))
  );
  const coachAssignmentsResult = await (() => {
    let query = admin
      .from("coach_assignments")
      .select("coach_id, coachee_id, cohort_id, created_at")
      .eq("organization_id", organizationId);

    if (cohortMemberIds.length) {
      query = query.or(`cohort_id.eq.${cohortId},coachee_id.in.(${cohortMemberIds.join(",")})`);
    } else {
      query = query.eq("cohort_id", cohortId);
    }

    return query.order("created_at", { ascending: false });
  })();
  const coachAssignments = (coachAssignmentsResult.data ?? []) as Array<{
    coach_id: string;
    coachee_id: string | null;
    cohort_id: string | null;
    created_at: string;
  }>;
  const coachIds = Array.from(new Set(coachAssignments.map((assignment) => assignment.coach_id)));
  const coachProfilesResult = coachIds.length
    ? await admin
        .from("profiles")
        .select("id, first_name, last_name, status, bio, timezone")
        .eq("organization_id", organizationId)
        .in("id", coachIds)
    : { data: [] as ProfileRow[] };
  const coachProfileById = new Map(((coachProfilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const coachingLoadByCoachId = new Map(coachingData.coachLoads.map((coach) => [coach.id, coach]));
  const directLearnerCountByCoachId = coachAssignments.reduce((map, assignment) => {
    if (!assignment.coachee_id) {
      return map;
    }

    map.set(assignment.coach_id, (map.get(assignment.coach_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const cohortPortfolioByCoachId = coachAssignments.reduce((map, assignment) => {
    if (assignment.cohort_id !== cohortId) {
      return map;
    }

    map.set(assignment.coach_id, true);
    return map;
  }, new Map<string, boolean>());
  const responsibleCoaches = coachIds
    .map((coachId) => {
      const profile = coachProfileById.get(coachId);
      const load = coachingLoadByCoachId.get(coachId);
      const directLearnerCount = directLearnerCountByCoachId.get(coachId) ?? 0;
      const ownsCohortPortfolio = cohortPortfolioByCoachId.get(coachId) ?? false;

      return {
        id: coachId,
        name: profile ? formatUserName(profile) : "Coach inconnu",
        status: profile?.status ?? "active",
        scopeLabel: ownsCohortPortfolio
          ? "Portefeuille cohorte"
          : `${directLearnerCount} coaché(s) assigné(s)`,
        directLearnerCount,
        ownsCohortPortfolio,
        sessionCount: load?.sessionCount ?? 0,
        plannedCount: load?.plannedCount ?? 0,
        completedCount: load?.completedCount ?? 0,
        needsNoteCount: load?.needsNoteCount ?? 0,
        learnerNames: load?.learnerNames ?? []
      };
    })
    .sort(
      (left, right) =>
        Number(right.ownsCohortPortfolio) - Number(left.ownsCohortPortfolio) ||
        right.needsNoteCount - left.needsNoteCount ||
        right.sessionCount - left.sessionCount ||
        left.name.localeCompare(right.name, "fr")
    );
  const focusCohort = professorData.focusCohort;
  const attentionLearners = professorData.attentionLearners.slice(0, 6);
  const learnerSpotlights = professorData.learnerSpotlights.slice(0, 8);
  const championLearners = professorData.championLearners.slice(0, 5);
  const fragileQuizzes = professorData.quizWatchlist.slice(0, 6);
  const pivotContents = professorData.contentSpotlight.slice(0, 4);
  const sessions = coachingData.sessions.slice(0, 8);
  const coachingPriorities = coachingData.priorityActions.slice(0, 3);
  const professorPriorities = professorData.priorityActions.slice(0, 3);
  const priorities = [
    ...coachingPriorities.map((priority) => ({
      id: `coaching-${priority.id}`,
      eyebrow: priority.eyebrow,
      title: priority.title,
      description: priority.description,
      href: priority.href,
      ctaLabel: priority.cta,
      tone: priority.tone
    })),
    ...professorPriorities.map((priority) => ({
      id: `professor-${priority.id}`,
      eyebrow: priority.eyebrow,
      title: priority.title,
      description: priority.description,
      href: priority.href,
      ctaLabel: priority.ctaLabel,
      tone: priority.tone
    }))
  ].slice(0, 5);
  const riskCount = professorData.analyticsOverview.atRiskCount;
  const watchCount = professorData.analyticsOverview.watchCount;
  const noteCoverage = coachingData.focus.noteCoverage;
  const recommendation =
    riskCount > 0
      ? "Priorité aux coachés à risque avant d'élargir les nouveaux contenus."
      : noteCoverage < 60
        ? "Renforcer la mémoire de séance pour fiabiliser le suivi coach."
        : watchCount > 0
          ? "Stabiliser les profils à surveiller avec une relance légère et ciblée."
          : "Maintenir le rythme et capitaliser sur les contenus qui fonctionnent.";

  return {
    context: professorData.context,
    canOpenSessionWorkspace: coachingData.canOpenSessionWorkspace,
    cohort: {
      id: cohort.id,
      name: cohort.name,
      memberCount: cohort.memberCount,
      averageScore: cohort.averageScore,
      completionRate: cohort.completionRate,
      atRiskCount: cohort.atRiskCount,
      watchCount: cohort.watchCount,
      strongCount: cohort.strongCount,
      tone: cohort.tone,
      topFocus: cohort.topFocus,
      shareOfPopulation: focusCohort?.shareOfPopulation ?? 0,
      statusLabel: focusCohort?.statusLabel ?? "Cohorte à structurer"
    },
    analyticsOverview: professorData.analyticsOverview,
    coachingFocus: coachingData.focus,
    responsibleCoaches,
    learnerSpotlights,
    attentionLearners,
    championLearners,
    fragileQuizzes,
    pivotContents,
    sessions,
    priorities,
    recommendation,
    metrics: [
      {
        label: "Engagement cohorte",
        value: `${cohort.averageScore}%`,
        delta: `${cohort.memberCount} coaché(s) · ${focusCohort?.shareOfPopulation ?? 0}% du portefeuille`
      },
      {
        label: "Couverture notes",
        value: `${noteCoverage}%`,
        delta: `${coachingData.focus.needsNoteCount} note(s) à compléter`
      },
      {
        label: "Coachs responsables",
        value: responsibleCoaches.length.toString(),
        delta: responsibleCoaches[0]?.name ?? "aucun coach assigné"
      },
      {
        label: "Quiz à surveiller",
        value: fragileQuizzes.length.toString(),
        delta:
          professorData.analyticsOverview.averageQuizScore !== null
            ? `${professorData.analyticsOverview.averageQuizScore}% de moyenne`
            : "score encore en construction"
      }
    ]
  };
}

export async function getProfessorQuizDetailPageData(quizId: string) {
  const context = await requireRole(["admin", "professor"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const quizResult = await admin
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
        created_at,
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

  if (quizResult.error || !quizResult.data) {
    return null;
  }

  const quiz = quizResult.data;
  const questions = [...(quiz.quiz_questions ?? [])].sort((left, right) => left.position - right.position);
  const [attemptsResult, assignmentsResult, linkedContentResult, cohortsResult] = await Promise.all([
    admin
      .from("quiz_attempts")
      .select("id, quiz_id, user_id, assignment_id, score, status, attempt_number, submitted_at")
      .eq("quiz_id", quiz.id)
      .order("submitted_at", { ascending: false })
      .limit(240),
    (() => {
      let query = admin
        .from("learning_assignments")
        .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      query = quiz.content_item_id
        ? query.or(`quiz_id.eq.${quiz.id},content_item_id.eq.${quiz.content_item_id}`)
        : query.eq("quiz_id", quiz.id);

      return query.limit(120);
    })(),
    quiz.content_item_id
      ? admin
          .from("content_items")
          .select("id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at")
          .eq("organization_id", organizationId)
          .eq("id", quiz.content_item_id)
          .maybeSingle<ContentRow>()
      : Promise.resolve({ data: null as ContentRow | null }),
    admin.from("cohorts").select("id, name").eq("organization_id", organizationId).order("name")
  ]);
  const attempts = (attemptsResult.data ?? []) as QuizAttemptResultRow[];
  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[];
  const cohorts = (cohortsResult.data ?? []) as Array<{ id: string; name: string }>;
  const cohortIds = new Set(cohorts.map((cohort) => cohort.id));
  const learnerIds = Array.from(
    new Set([
      ...attempts.map((attempt) => attempt.user_id),
      ...assignments.map((assignment) => assignment.assigned_user_id).filter(Boolean)
    ])
  ) as string[];
  const assignmentCohortIds = Array.from(
    new Set(assignments.map((assignment) => assignment.cohort_id).filter(Boolean))
  ) as string[];
  const [profilesResult, cohortMembersResult, answersResult, relatedContentsResult] = await Promise.all([
    learnerIds.length
      ? admin
          .from("profiles")
          .select("id, first_name, last_name, status, bio, timezone")
          .eq("organization_id", organizationId)
          .in("id", learnerIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    learnerIds.length || assignmentCohortIds.length
      ? (() => {
          let query = admin.from("cohort_members").select("user_id, cohort_id");
          const filters = [
            learnerIds.length ? `user_id.in.(${learnerIds.join(",")})` : null,
            assignmentCohortIds.length ? `cohort_id.in.(${assignmentCohortIds.join(",")})` : null
          ].filter(Boolean);

          if (filters.length) {
            query = query.or(filters.join(","));
          }

          return query;
        })()
      : Promise.resolve({ data: [] as Array<{ user_id: string; cohort_id: string }> }),
    attempts.length
      ? admin
          .from("quiz_attempt_answers")
          .select("attempt_id, question_id, choice_id, answer_text, is_correct, points_awarded")
          .in(
            "attempt_id",
            attempts.map((attempt) => attempt.id)
          )
      : Promise.resolve({
          data: [] as Array<{
            attempt_id: string;
            question_id: string;
            choice_id: string | null;
            answer_text: string | null;
            is_correct: boolean | null;
            points_awarded: number | null;
          }>
        }),
    linkedContentResult.data?.category
      ? admin
          .from("content_items")
          .select("id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at")
          .eq("organization_id", organizationId)
          .eq("status", "published")
          .eq("category", linkedContentResult.data.category)
          .neq("id", linkedContentResult.data.id)
          .order("created_at", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as ContentRow[] })
  ]);
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const cohortNameById = new Map(cohorts.map((cohort) => [cohort.id, cohort.name]));
  const cohortMembers = ((cohortMembersResult.data ?? []) as Array<{ user_id: string; cohort_id: string }>).filter(
    (member) => cohortIds.has(member.cohort_id)
  );
  const cohortIdsByUserId = cohortMembers.reduce((map, member) => {
    const current = map.get(member.user_id) ?? [];
    current.push(member.cohort_id);
    map.set(member.user_id, current);
    return map;
  }, new Map<string, string[]>());
  const gradedAttempts = attempts.filter((attempt) => attempt.status === "graded" && attempt.score !== null);
  const averageScore = gradedAttempts.length
    ? roundMetric(gradedAttempts.reduce((total, attempt) => total + (attempt.score ?? 0), 0) / gradedAttempts.length)
    : null;
  const passingScore = quiz.passing_score ?? 70;
  const passedCount = gradedAttempts.filter((attempt) => (attempt.score ?? 0) >= passingScore).length;
  const passRate = gradedAttempts.length ? roundMetric((passedCount / gradedAttempts.length) * 100) : null;
  const submittedCount = attempts.filter((attempt) => attempt.status === "submitted").length;
  const answerRows = (answersResult.data ?? []) as Array<{
    attempt_id: string;
    question_id: string;
    choice_id: string | null;
    answer_text: string | null;
    is_correct: boolean | null;
    points_awarded: number | null;
  }>;
  const answersByQuestionId = answerRows.reduce((map, answer) => {
    const current = map.get(answer.question_id) ?? [];
    current.push(answer);
    map.set(answer.question_id, current);
    return map;
  }, new Map<string, typeof answerRows>());
  const questionDiagnostics = questions
    .map((question) => {
      const answers = answersByQuestionId.get(question.id) ?? [];
      const maxPoints = question.points || 1;
      const averagePoints = answers.length
        ? roundMetric(answers.reduce((total, answer) => total + (answer.points_awarded ?? 0), 0) / answers.length)
        : null;
      const mastery = answers.length
        ? roundMetric(
            (answers.reduce((total, answer) => total + (answer.points_awarded ?? 0), 0) /
              (answers.length * maxPoints)) *
              100
          )
        : null;
      const correctCount = answers.filter(
        (answer) => answer.is_correct === true || (answer.points_awarded ?? 0) >= maxPoints
      ).length;
      const wrongChoiceCount = answers.reduce((map, answer) => {
        if (!answer.choice_id || answer.is_correct === true) {
          return map;
        }

        map.set(answer.choice_id, (map.get(answer.choice_id) ?? 0) + 1);
        return map;
      }, new Map<string, number>());
      const topWrongChoice = [...wrongChoiceCount.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
      const choiceById = new Map((question.quiz_question_choices ?? []).map((choice) => [choice.id, choice]));
      const signalTone =
        mastery === null ? ("neutral" as const) : mastery < 55 ? ("warning" as const) : mastery < 75 ? ("accent" as const) : ("success" as const);

      return {
        id: question.id,
        position: question.position + 1,
        prompt: question.prompt,
        helperText: question.helper_text,
        questionType: question.question_type === "single_choice" ? "Choix unique" : "Réponse ouverte",
        maxPoints,
        answerCount: answers.length,
        correctCount,
        averagePoints,
        mastery,
        signalTone,
        signalLabel:
          mastery === null
            ? "Sans données"
            : mastery < 55
              ? "Fragile"
              : mastery < 75
                ? "À consolider"
                : "Maîtrisée",
        topWrongAnswer: topWrongChoice
          ? `${choiceById.get(topWrongChoice[0])?.label ?? "Choix non résolu"} · ${topWrongChoice[1]} réponse(s)`
          : question.question_type === "text"
            ? "Réponses ouvertes à relire qualitativement"
            : "Pas de mauvaise réponse dominante"
      };
    })
    .sort((left, right) => (left.mastery ?? 101) - (right.mastery ?? 101));
  const fragileQuestions = questionDiagnostics.filter(
    (question) => question.answerCount > 0 && question.mastery !== null && question.mastery < 75
  );
  const cohortStatsMap = new Map<
    string,
    {
      id: string;
      name: string;
      scores: number[];
      learnerIds: Set<string>;
      attemptCount: number;
      submittedCount: number;
      assignmentCount: number;
    }
  >();
  const ensureCohortStat = (cohortId: string | null) => {
    const key = cohortId ?? "none";
    const existing = cohortStatsMap.get(key);

    if (existing) {
      return existing;
    }

    const stat = {
      id: key,
      name: cohortId ? cohortNameById.get(cohortId) ?? "Cohorte" : "Sans cohorte",
      scores: [] as number[],
      learnerIds: new Set<string>(),
      attemptCount: 0,
      submittedCount: 0,
      assignmentCount: 0
    };
    cohortStatsMap.set(key, stat);
    return stat;
  };

  for (const attempt of attempts) {
    const userCohortIds = cohortIdsByUserId.get(attempt.user_id) ?? [null];
    for (const userCohortId of userCohortIds.length ? userCohortIds : [null]) {
      const stat = ensureCohortStat(userCohortId);
      stat.learnerIds.add(attempt.user_id);
      stat.attemptCount += 1;
      if (attempt.status === "submitted") {
        stat.submittedCount += 1;
      }
      if (attempt.status === "graded" && attempt.score !== null) {
        stat.scores.push(attempt.score);
      }
    }
  }

  for (const assignment of assignments) {
    if (assignment.cohort_id) {
      ensureCohortStat(assignment.cohort_id).assignmentCount += 1;
    } else if (assignment.assigned_user_id) {
      const userCohortIds = cohortIdsByUserId.get(assignment.assigned_user_id) ?? [null];
      for (const userCohortId of userCohortIds.length ? userCohortIds : [null]) {
        ensureCohortStat(userCohortId).assignmentCount += 1;
      }
    }
  }

  const cohortStats = [...cohortStatsMap.values()]
    .map((stat) => {
      const statAverage = stat.scores.length
        ? roundMetric(stat.scores.reduce((total, score) => total + score, 0) / stat.scores.length)
        : null;
      const statPassRate = stat.scores.length
        ? roundMetric((stat.scores.filter((score) => score >= passingScore).length / stat.scores.length) * 100)
        : null;

      return {
        id: stat.id,
        name: stat.name,
        learnerCount: stat.learnerIds.size,
        attemptCount: stat.attemptCount,
        submittedCount: stat.submittedCount,
        assignmentCount: stat.assignmentCount,
        averageScore: statAverage,
        passRate: statPassRate,
        tone:
          statAverage === null
            ? ("neutral" as const)
            : statAverage < 60
              ? ("warning" as const)
              : statAverage < 75
                ? ("accent" as const)
                : ("success" as const),
        href: stat.id === "none" ? "/professor" : `/professor/cohorts/${stat.id}`
      };
    })
    .sort((left, right) => (left.averageScore ?? 101) - (right.averageScore ?? 101) || right.attemptCount - left.attemptCount);
  const recentAttempts = attempts.slice(0, 8).map((attempt) => {
    const profile = profileById.get(attempt.user_id);
    const learnerCohorts = (cohortIdsByUserId.get(attempt.user_id) ?? [])
      .map((cohortId) => cohortNameById.get(cohortId))
      .filter(Boolean) as string[];

    return {
      id: attempt.id,
      learner: profile ? formatUserName(profile) : "Coaché inconnu",
      cohortLabel: learnerCohorts.length ? learnerCohorts.join(", ") : "Sans cohorte",
      status: attempt.status,
      score: attempt.status === "submitted" ? "En correction" : attempt.score !== null ? `${attempt.score}%` : "Non noté",
      tone:
        attempt.status === "graded"
          ? attempt.score !== null && attempt.score < passingScore
            ? ("warning" as const)
            : ("success" as const)
          : ("accent" as const),
      attemptLabel: `Tentative ${attempt.attempt_number}`,
      submittedAt: formatDate(attempt.submitted_at)
    };
  });
  const linkedContent = linkedContentResult.data;
  const assignmentCountByContentId = assignments.reduce((map, assignment) => {
    if (!assignment.content_item_id) {
      return map;
    }

    map.set(assignment.content_item_id, (map.get(assignment.content_item_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const reinforceContents = [linkedContent, ...(((relatedContentsResult.data ?? []) as ContentRow[]) ?? [])]
    .filter(Boolean)
    .map((content) => ({
      id: content!.id,
      title: content!.title,
      slug: content!.slug,
      summary: content!.summary ?? "Ressource utile pour renforcer les acquis liés à ce quiz.",
      category: content!.category || "Bibliothèque",
      contentType: content!.content_type,
      estimatedMinutes: content!.estimated_minutes,
      assignmentCount: assignmentCountByContentId.get(content!.id) ?? 0,
      isLinked: content!.id === linkedContent?.id
    }));
  const weakCohort = cohortStats.find((cohort) => cohort.averageScore !== null && cohort.averageScore < 75) ?? cohortStats[0] ?? null;
  const weakestQuestion = fragileQuestions[0] ?? questionDiagnostics[0] ?? null;
  const recommendation =
    averageScore !== null && averageScore < passingScore
      ? "Recalibrer le quiz avant la prochaine vague de tentatives."
      : fragileQuestions.length > 0
        ? "Renforcer les questions fragiles avec une ressource ou une explication ciblée."
        : submittedCount > 0
          ? "Finaliser les corrections ouvertes pour stabiliser la lecture professor."
          : "Suivre ce quiz comme repère pédagogique, sans action lourde immédiate.";
  const signalBand: EngagementBand =
    averageScore === null ? "watch" : averageScore >= 75 ? "strong" : averageScore >= 55 ? "watch" : "risk";
  const priorityActions = [
    weakestQuestion
      ? {
          id: "question",
          eyebrow: "Question fragile",
          title: `Q${weakestQuestion.position} · ${weakestQuestion.signalLabel}`,
          description:
            weakestQuestion.mastery !== null
              ? `${weakestQuestion.mastery}% de maîtrise · ${weakestQuestion.topWrongAnswer}.`
              : "Aucune réponse exploitable pour cette question.",
          tone: weakestQuestion.signalTone
        }
      : {
          id: "question",
          eyebrow: "Questions",
          title: "Aucune question à analyser",
          description: "Ajoute des questions ou attends les premières tentatives pour alimenter le diagnostic.",
          tone: "neutral" as const
        },
    weakCohort
      ? {
          id: "cohort",
          eyebrow: "Cohorte à cibler",
          title: weakCohort.name,
          description:
            weakCohort.averageScore !== null
              ? `${weakCohort.averageScore}% de moyenne sur ${weakCohort.attemptCount} tentative(s).`
              : `${weakCohort.assignmentCount} assignation(s), scores encore en attente.`,
          tone: weakCohort.tone
        }
      : {
          id: "cohort",
          eyebrow: "Cohortes",
          title: "Aucun groupe touché",
          description: "Assigne ce quiz à une cohorte pour obtenir une lecture comparative.",
          tone: "neutral" as const
        },
    reinforceContents[0]
      ? {
          id: "content",
          eyebrow: "Contenu support",
          title: reinforceContents[0].title,
          description: reinforceContents[0].isLinked
            ? "Ressource directement liée au quiz."
            : "Ressource de même catégorie à mobiliser en renfort.",
          tone: "success" as const
        }
      : {
          id: "content",
          eyebrow: "Contenu support",
          title: "Aucun contenu relié",
          description: "Relie une ressource au quiz pour faciliter la remédiation.",
          tone: "accent" as const
        }
  ];

  return {
    context,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description ?? "Quiz publié dans ECCE.",
      kind: quiz.kind ?? "quiz",
      status: quiz.status ?? "draft",
      passingScore,
      attemptsAllowed: quiz.attempts_allowed ?? 1,
      timeLimitMinutes: quiz.time_limit_minutes ?? null,
      questionCount: questions.length,
      createdAt: formatDate(quiz.created_at ?? null)
    },
    overview: {
      averageScore,
      passRate,
      gradedCount: gradedAttempts.length,
      attemptCount: attempts.length,
      submittedCount,
      fragileQuestionCount: fragileQuestions.length,
      cohortCount: cohortStats.filter((cohort) => cohort.id !== "none").length,
      signalBand,
      recommendation
    },
    linkedContent: linkedContent
      ? {
          id: linkedContent.id,
          title: linkedContent.title,
          slug: linkedContent.slug,
          summary: linkedContent.summary ?? "Ressource liée au quiz.",
          category: linkedContent.category || "Bibliothèque",
          contentType: linkedContent.content_type,
          estimatedMinutes: linkedContent.estimated_minutes
        }
      : null,
    questionDiagnostics,
    fragileQuestions,
    cohortStats,
    recentAttempts,
    reinforceContents,
    priorityActions,
    metrics: [
      {
        label: "Score moyen",
        value: averageScore !== null ? `${averageScore}%` : "n/a",
        delta: `${gradedAttempts.length} copie(s) notée(s)`
      },
      {
        label: "Taux de réussite",
        value: passRate !== null ? `${passRate}%` : "n/a",
        delta: `seuil ${passingScore}%`
      },
      {
        label: "Questions fragiles",
        value: fragileQuestions.length.toString(),
        delta: `${questions.length} question(s) au total`
      },
      {
        label: "Cohortes touchées",
        value: cohortStats.filter((cohort) => cohort.id !== "none").length.toString(),
        delta: `${attempts.length} tentative(s)`
      }
    ]
  };
}

export async function getAdminContentStudioPageData(filters?: {
  query?: string;
  category?: string;
  status?: string;
  lane?: string;
}) {
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

  const [contentsResult, modulesResult, quizzesResult, assignmentsResult] = await Promise.all([
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
      : Promise.resolve({ data: [] as ProgramModuleRow[] }),
    admin
      .from("quizzes")
      .select("id, title, content_item_id, status")
      .eq("organization_id", organizationId),
    admin
      .from("learning_assignments")
      .select("id, content_item_id, due_at, published_at")
      .eq("organization_id", organizationId)
  ]);

  const contents = (contentsResult.data ?? []) as ContentRow[];
  const modules = (modulesResult.data ?? []) as ProgramModuleRow[];
  const quizzes = (quizzesResult.data ?? []) as Array<{
    id: string;
    title: string;
    content_item_id: string | null;
    status: string;
  }>;
  const assignments = (assignmentsResult.data ?? []) as Array<{
    id: string;
    content_item_id: string | null;
    due_at: string | null;
    published_at: string | null;
  }>;
  const moduleOptions = buildProgramModuleOptions(programs, modules);
  const programTitleById = new Map(programs.map((program) => [program.id, program.title]));
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const assignmentStatsByContentId = assignments.reduce((map, assignment) => {
    if (!assignment.content_item_id) {
      return map;
    }

    const current =
      map.get(assignment.content_item_id) ??
      ({
        assignmentCount: 0,
        overdueCount: 0,
        dueSoonCount: 0
      } as {
        assignmentCount: number;
        overdueCount: number;
        dueSoonCount: number;
      });
    const state = getDeadlineState(assignment.due_at, false);

    current.assignmentCount += 1;
    if (state === "overdue") {
      current.overdueCount += 1;
    } else if (state === "soon") {
      current.dueSoonCount += 1;
    }

    map.set(assignment.content_item_id, current);
    return map;
  }, new Map<
    string,
    {
      assignmentCount: number;
      overdueCount: number;
      dueSoonCount: number;
    }
  >());
  const linkedQuizCountByContentId = quizzes.reduce((map, quiz) => {
    if (!quiz.content_item_id) {
      return map;
    }

    map.set(quiz.content_item_id, (map.get(quiz.content_item_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const normalizedQuery = String(filters?.query ?? "").trim().toLowerCase();
  const selectedStatus = filters?.status ? String(filters.status).trim().toLowerCase() : "all";
  const availableStatuses = new Set(contents.map((content) => content.status));
  const resolvedStatus = selectedStatus !== "all" && availableStatuses.has(selectedStatus) ? selectedStatus : "all";
  const categories = Array.from(
    new Set(contents.map((content) => content.category?.trim()).filter(Boolean) as string[])
  ).sort((left, right) => left.localeCompare(right));
  const selectedCategory =
    filters?.category && categories.includes(String(filters.category)) ? String(filters.category) : "";
  const laneFilter =
    filters?.lane === "priority" ||
    filters?.lane === "connected" ||
    filters?.lane === "draft" ||
    filters?.lane === "library"
      ? filters.lane
      : "all";

  const contentRows = contents.map((content) => {
    const programModule = content.module_id ? moduleById.get(content.module_id) ?? null : null;
    const programTitle = programModule ? programTitleById.get(programModule.program_id) ?? "Parcours" : null;
    const assignmentStats = assignmentStatsByContentId.get(content.id) ?? {
      assignmentCount: 0,
      overdueCount: 0,
      dueSoonCount: 0
    };
    const linkedQuizCount = linkedQuizCountByContentId.get(content.id) ?? 0;
    const taxonomyScore = [
      Boolean(content.summary?.trim()),
      Boolean(content.category?.trim()),
      Boolean(content.subcategory?.trim()),
      Boolean(content.tags?.length)
    ].filter(Boolean).length;
    const lane: "priority" | "connected" | "draft" | "library" =
      content.status !== "published"
        ? "draft"
        : content.is_required || assignmentStats.assignmentCount > 0
          ? "priority"
          : linkedQuizCount > 0 || Boolean(content.module_id)
            ? "connected"
            : "library";
    const tone: BadgeTone =
      lane === "draft" ? "warning" : lane === "priority" ? "accent" : lane === "connected" ? "success" : "neutral";
    const statusTone: BadgeTone =
      content.status === "published"
        ? "success"
        : content.status === "scheduled"
          ? "accent"
          : content.status === "draft"
            ? "warning"
            : "neutral";

    return {
      ...content,
      lane,
      tone,
      statusTone,
      taxonomyScore,
      assignmentCount: assignmentStats.assignmentCount,
      overdueCount: assignmentStats.overdueCount,
      dueSoonCount: assignmentStats.dueSoonCount,
      linkedQuizCount,
      moduleLabel: programModule
        ? `${programTitle} · Module ${programModule.position + 1} · ${programModule.title}`
        : "Hors parcours",
      previewHref: content.status === "published" ? `/library/${content.slug}` : "#content-studio",
      ctaLabel: content.status === "published" ? "Voir dans la bibliothèque" : "Compléter dans le studio",
      laneLabel:
        lane === "priority"
          ? "Prioritaire"
          : lane === "connected"
            ? "Connecté"
            : lane === "draft"
              ? "Brouillon"
              : "Bibliothèque",
      nextNeed:
        lane === "draft"
          ? "Finaliser puis publier pour rendre la ressource exploitable."
          : lane === "priority"
            ? assignmentStats.overdueCount > 0
              ? "La ressource diffuse déjà, mais la dette de deadline mérite une lecture."
              : "Capitaliser sur cette ressource pivot dans les assignations et les parcours."
            : lane === "connected"
              ? "Bonne base éditoriale, peut être diffusée davantage dans les missions."
              : "Ressource propre mais encore peu branchée sur l’exécution pédagogique."
    };
  });

  const scopedContents = contentRows.filter((content) => {
    const matchesQuery = normalizedQuery
      ? `${content.title} ${content.summary ?? ""} ${content.category ?? ""} ${content.subcategory ?? ""} ${content.moduleLabel}`.toLowerCase().includes(normalizedQuery)
      : true;
    const matchesCategory = selectedCategory ? content.category === selectedCategory : true;
    const matchesStatus = resolvedStatus === "all" ? true : content.status === resolvedStatus;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  const laneCounts = {
    priority: scopedContents.filter((content) => content.lane === "priority").length,
    connected: scopedContents.filter((content) => content.lane === "connected").length,
    draft: scopedContents.filter((content) => content.lane === "draft").length,
    library: scopedContents.filter((content) => content.lane === "library").length
  };

  const visibleContents = scopedContents.filter((content) => (laneFilter === "all" ? true : content.lane === laneFilter));
  const publishedVisibleCount = visibleContents.filter((content) => content.status === "published").length;
  const activationCount = visibleContents.filter(
    (content) => content.assignmentCount > 0 || content.linkedQuizCount > 0
  ).length;
  const pathwayLinkedCount = visibleContents.filter((content) => Boolean(content.module_id)).length;
  const taxonomyReadyCount = visibleContents.filter((content) => content.taxonomyScore >= 3).length;
  const averageTaxonomyScore = visibleContents.length
    ? roundMetric(
        (visibleContents.reduce((total, content) => total + content.taxonomyScore, 0) /
          (visibleContents.length * 4)) *
          100
      )
    : 0;
  const activationScore = visibleContents.length
    ? roundMetric(
        (publishedVisibleCount / visibleContents.length) * 35 +
          (activationCount / visibleContents.length) * 35 +
          (pathwayLinkedCount / visibleContents.length) * 15 +
          (averageTaxonomyScore / 100) * 15
      )
    : 0;
  const activationBand: EngagementBand =
    activationScore >= 75 ? "strong" : activationScore >= 45 ? "watch" : "risk";
  const sortedVisibleContents = visibleContents
    .slice()
    .sort((left, right) => {
      const laneRank = { priority: 0, draft: 1, connected: 2, library: 3 } as const;
      return (
        laneRank[left.lane] - laneRank[right.lane] ||
        right.assignmentCount - left.assignmentCount ||
        right.linkedQuizCount - left.linkedQuizCount ||
        right.taxonomyScore - left.taxonomyScore ||
        (getDateValue(right.created_at) ?? 0) - (getDateValue(left.created_at) ?? 0)
      );
    });
  const focusContent = sortedVisibleContents[0] ?? null;
  const categoryRadar = Array.from(
    visibleContents.reduce((map, content) => {
      const key = content.category?.trim() || "Sans catégorie";
      const current =
        map.get(key) ??
        ({
          id: key,
          label: key,
          count: 0,
          requiredCount: 0,
          assignmentLoad: 0,
          linkedQuizCount: 0
        } as {
          id: string;
          label: string;
          count: number;
          requiredCount: number;
          assignmentLoad: number;
          linkedQuizCount: number;
        });

      current.count += 1;
      current.assignmentLoad += content.assignmentCount;
      current.linkedQuizCount += content.linkedQuizCount;
      if (content.is_required) {
        current.requiredCount += 1;
      }

      map.set(key, current);
      return map;
    }, new Map<
      string,
      {
        id: string;
        label: string;
        count: number;
        requiredCount: number;
        assignmentLoad: number;
        linkedQuizCount: number;
      }
    >()).values()
  )
    .map((category) => ({
      ...category,
      tone:
        category.requiredCount > 0
          ? ("warning" as const)
          : category.assignmentLoad > 0 || category.linkedQuizCount > 0
            ? ("accent" as const)
            : ("neutral" as const)
    }))
    .sort((left, right) => {
      return (
        right.requiredCount - left.requiredCount ||
        right.assignmentLoad - left.assignmentLoad ||
        right.count - left.count
      );
    })
    .slice(0, 6);
  const editorialFeed = visibleContents
    .slice()
    .sort((left, right) => (getDateValue(right.created_at) ?? 0) - (getDateValue(left.created_at) ?? 0))
    .slice(0, 6)
    .map((content) => ({
      id: content.id,
      title: content.title,
      createdAt: formatDate(content.created_at),
      laneLabel: content.laneLabel,
      status: content.status,
      tone: content.tone,
      moduleLabel: content.moduleLabel
    }));
  const activeFilterParts = [
    selectedCategory ? `catégorie ${selectedCategory}` : null,
    resolvedStatus !== "all" ? `statut ${resolvedStatus}` : null,
    laneFilter !== "all"
      ? laneFilter === "priority"
        ? "lane prioritaire"
        : laneFilter === "connected"
          ? "lane connectée"
          : laneFilter === "draft"
            ? "lane brouillon"
            : "lane bibliothèque"
      : null,
    normalizedQuery ? `recherche « ${filters?.query?.trim()} »` : null
  ].filter(Boolean) as string[];
  const priorityActions = [
    laneCounts.draft > 0
      ? {
          id: "drafts",
          title: `${laneCounts.draft} ressource(s) restent encore en brouillon`,
          description: "Le prochain gain rapide est souvent éditorial : finaliser, publier puis diffuser.",
          href: "#content-studio",
          ctaLabel: "Compléter le studio",
          tone: "warning" as const
        }
      : {
          id: "drafts",
          title: "Le catalogue visible est déjà publié",
          description: "Le studio peut se concentrer sur la diffusion et la connexion pédagogique.",
          href: "/library",
          ctaLabel: "Voir la bibliothèque",
          tone: "success" as const
        },
    visibleContents.filter((content) => content.assignmentCount === 0 && content.linkedQuizCount === 0 && content.status === "published").length > 0
      ? {
          id: "distribution",
          title: `${visibleContents.filter((content) => content.assignmentCount === 0 && content.linkedQuizCount === 0 && content.status === "published").length} ressource(s) publiées restent peu branchées`,
          description: "La vraie dette n'est pas la création, mais la connexion aux assignations, quiz et parcours.",
          href: "/admin/assignments",
          ctaLabel: "Ouvrir les assignations",
          tone: "accent" as const
        }
      : {
          id: "distribution",
          title: "Diffusion éditoriale bien branchée",
          description: "Les ressources visibles sont déjà connectées au runtime pédagogique.",
          href: "/admin/assignments",
          ctaLabel: "Vérifier l'exécution",
          tone: "success" as const
        },
    visibleContents.filter((content) => content.taxonomyScore < 3).length > 0
      ? {
          id: "taxonomy",
          title: `${visibleContents.filter((content) => content.taxonomyScore < 3).length} ressource(s) demandent encore un cadrage éditorial`,
          description: "Catégorie, résumé et tags restent essentiels pour rendre la bibliothèque navigable.",
          href: "#content-studio",
          ctaLabel: "Renforcer la taxonomie",
          tone: "accent" as const
        }
      : {
          id: "taxonomy",
          title: "Taxonomie éditoriale cohérente",
          description: "Les ressources visibles sont correctement positionnées dans la bibliothèque ECCE.",
          href: "/library",
          ctaLabel: "Explorer la bibliothèque",
          tone: "success" as const
        },
    focusContent
      ? {
          id: "pivot",
          title: `Ressource pivot · ${focusContent.title}`,
          description:
            focusContent.assignmentCount > 0 || focusContent.linkedQuizCount > 0
              ? `${focusContent.assignmentCount} assignation(s) · ${focusContent.linkedQuizCount} quiz lié(s).`
              : "Bonne candidate pour une prochaine diffusion dans les parcours ou les missions.",
          href: focusContent.previewHref,
          ctaLabel: focusContent.ctaLabel,
          tone: focusContent.tone
        }
      : {
          id: "pivot",
          title: "Aucune ressource focus",
          description: "Crée ou élargis la vue pour faire remonter une ressource pivot.",
          href: "#content-studio",
          ctaLabel: "Créer un contenu",
          tone: "neutral" as const
        }
  ];

  return {
    context,
    filters: {
      query: filters?.query?.trim() ?? "",
      category: selectedCategory,
      status: resolvedStatus,
      lane: laneFilter,
      summary: activeFilterParts.length ? `Vue filtrée · ${activeFilterParts.join(" · ")}` : "Vue globale du studio contenus"
    },
    metrics: [
      {
        label: "Ressources visibles",
        value: visibleContents.length.toString(),
        delta: `${publishedVisibleCount} publiées`
      },
      {
        label: "Activation éditoriale",
        value: `${activationScore}%`,
        delta: `${activationCount} déjà diffusées ou reliées`
      },
      {
        label: "Taxonomie prête",
        value: `${taxonomyReadyCount}/${visibleContents.length || 0}`,
        delta: `${categories.length} catégorie(s)`
      },
      {
        label: "Parcours branchés",
        value: pathwayLinkedCount.toString(),
        delta: `${moduleOptions.length} module(s) disponibles`
      }
    ],
    hero: {
      title: focusContent
        ? `${focusContent.title} concentre le point d’attention éditorial principal`
        : "Le studio contenus est prêt à piloter la bibliothèque ECCE",
      summary: focusContent
        ? `${focusContent.laneLabel} · ${focusContent.assignmentCount} assignation(s) · ${focusContent.linkedQuizCount} quiz lié(s). ${focusContent.nextNeed}`
        : "La vue se remplira dès que des ressources seront visibles dans le studio."
    },
    activationPulse: {
      score: activationScore,
      band: activationBand,
      bandLabel:
        activationBand === "strong"
          ? "Catalogue solide"
          : activationBand === "watch"
            ? "Diffusion à consolider"
            : "Refonte éditoriale à pousser",
      caption: `${visibleContents.length} ressource(s) visibles · ${categories.length} catégorie(s)`,
      trend:
        laneCounts.draft > 0
          ? ("down" as const)
          : laneCounts.priority > 0 || laneCounts.connected > 0
            ? ("steady" as const)
            : ("up" as const),
      trendLabel:
        laneCounts.draft > 0
          ? `${laneCounts.draft} ressource(s) restent en brouillon`
          : laneCounts.priority > 0 || laneCounts.connected > 0
            ? `${laneCounts.priority + laneCounts.connected} ressource(s) déjà activées dans le produit`
            : "bibliothèque propre mais encore peu diffusée"
    },
    laneBreakdown: [
      {
        id: "priority",
        label: "Prioritaires",
        count: laneCounts.priority,
        tone: "accent" as const,
        isActive: laneFilter === "priority"
      },
      {
        id: "connected",
        label: "Connectés",
        count: laneCounts.connected,
        tone: "success" as const,
        isActive: laneFilter === "connected"
      },
      {
        id: "draft",
        label: "Brouillons",
        count: laneCounts.draft,
        tone: "warning" as const,
        isActive: laneFilter === "draft"
      },
      {
        id: "library",
        label: "Bibliothèque",
        count: laneCounts.library,
        tone: "neutral" as const,
        isActive: laneFilter === "library"
      }
    ],
    focusContent,
    priorityActions,
    contentWatchlist: sortedVisibleContents.slice(0, 6),
    categoryOptions: categories,
    categoryRadar,
    editorialFeed,
    contents: visibleContents,
    moduleOptions
  };
}

export async function getAdminQuizStudioPageData(filters?: {
  query?: string;
  kind?: string;
  status?: string;
  lane?: string;
}) {
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

  const [contentsResult, quizzesResult, modulesResult, assignmentsResult, attemptsResult, profilesResult] = await Promise.all([
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
          module_id,
          created_at,
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
      : Promise.resolve({ data: [] as ProgramModuleRow[] }),
    admin
      .from("learning_assignments")
      .select("id, quiz_id, due_at, published_at")
      .eq("organization_id", organizationId)
      .not("quiz_id", "is", null),
    admin
      .from("quiz_attempts")
      .select("id, quiz_id, user_id, assignment_id, score, status, attempt_number, submitted_at")
      .order("submitted_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
  ]);

  const contents = (contentsResult.data ?? []) as Array<{ id: string; title: string; status: string }>;
  const quizzes = (quizzesResult.data ?? []) as QuizRow[];
  const modules = (modulesResult.data ?? []) as ProgramModuleRow[];
  const assignments = (assignmentsResult.data ?? []) as Array<{
    id: string;
    quiz_id: string | null;
    due_at: string | null;
    published_at: string | null;
  }>;
  const attempts = (attemptsResult.data ?? []) as QuizAttemptResultRow[];
  const profiles = (profilesResult.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
  const contentTitleById = new Map(contents.map((content) => [content.id, content.title]));
  const profileNameById = new Map(
    profiles.map((profile) => [profile.id, `${profile.first_name} ${profile.last_name}`.trim()])
  );
  const programTitleById = new Map(programs.map((program) => [program.id, program.title]));
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const assignmentStatsByQuizId = assignments.reduce((map, assignment) => {
    if (!assignment.quiz_id) {
      return map;
    }

    const current =
      map.get(assignment.quiz_id) ??
      ({
        assignmentCount: 0,
        overdueCount: 0,
        dueSoonCount: 0
      } as {
        assignmentCount: number;
        overdueCount: number;
        dueSoonCount: number;
      });
    const state = getDeadlineState(assignment.due_at, false);

    current.assignmentCount += 1;
    if (state === "overdue") {
      current.overdueCount += 1;
    } else if (state === "soon") {
      current.dueSoonCount += 1;
    }

    map.set(assignment.quiz_id, current);
    return map;
  }, new Map<
    string,
    {
      assignmentCount: number;
      overdueCount: number;
      dueSoonCount: number;
    }
  >());
  const attemptScoresByQuizId = attempts.reduce((map, attempt) => {
    if (attempt.status !== "graded" || attempt.score === null) {
      return map;
    }

    const current = map.get(attempt.quiz_id) ?? [];
    current.push(attempt.score);
    map.set(attempt.quiz_id, current);
    return map;
  }, new Map<string, number[]>());
  const attemptCountByQuizId = attempts.reduce((map, attempt) => {
    map.set(attempt.quiz_id, (map.get(attempt.quiz_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const normalizedQuery = String(filters?.query ?? "").trim().toLowerCase();
  const kinds = Array.from(new Set(quizzes.map((quiz) => quiz.kind?.trim()).filter(Boolean) as string[])).sort((left, right) =>
    left.localeCompare(right)
  );
  const selectedKind = filters?.kind && kinds.includes(String(filters.kind)) ? String(filters.kind) : "";
  const statuses = Array.from(new Set(quizzes.map((quiz) => String(quiz.status ?? ""))).values()).filter(Boolean);
  const selectedStatus =
    filters?.status && filters.status !== "all" && statuses.includes(String(filters.status)) ? String(filters.status) : "all";
  const laneFilter =
    filters?.lane === "fragile" ||
    filters?.lane === "active" ||
    filters?.lane === "draft" ||
    filters?.lane === "ready"
      ? filters.lane
      : "all";

  const quizRows = quizzes.map((quiz) => {
    const sortedQuestions = [...(quiz.quiz_questions ?? [])].sort((left, right) => left.position - right.position);
    const questionCount = sortedQuestions.length;
    const totalPoints = sortedQuestions.reduce((total, question) => total + question.points, 0);
    const openQuestionCount = sortedQuestions.filter((question) => question.question_type === "text").length;
    const assignmentStats = assignmentStatsByQuizId.get(quiz.id) ?? {
      assignmentCount: 0,
      overdueCount: 0,
      dueSoonCount: 0
    };
    const attemptCount = attemptCountByQuizId.get(quiz.id) ?? 0;
    const scores = attemptScoresByQuizId.get(quiz.id) ?? [];
    const averageScore = scores.length
      ? roundMetric(scores.reduce((total, score) => total + score, 0) / scores.length)
      : null;
    const programModule = quiz.module_id ? moduleById.get(quiz.module_id) ?? null : null;
    const moduleLabel = programModule
      ? `${programTitleById.get(programModule.program_id) ?? "Parcours"} · Module ${programModule.position + 1} · ${programModule.title}`
      : "Hors parcours";
    const linkedContentLabel = quiz.content_item_id ? contentTitleById.get(quiz.content_item_id) ?? "Contenu lié" : null;
    const readinessScore = [
      Boolean(quiz.title.trim()),
      Boolean(quiz.description?.trim()),
      questionCount >= 3,
      Boolean(quiz.content_item_id || quiz.module_id),
      quiz.status === "published"
    ].filter(Boolean).length;
    const lane: "fragile" | "active" | "draft" | "ready" =
      quiz.status !== "published" || questionCount === 0
        ? "draft"
        : assignmentStats.overdueCount > 0 || (attemptCount > 0 && averageScore !== null && averageScore < 60)
          ? "fragile"
          : assignmentStats.assignmentCount > 0 || attemptCount > 0
            ? "active"
            : "ready";
    const tone: BadgeTone =
      lane === "fragile" ? "warning" : lane === "active" ? "accent" : lane === "draft" ? "neutral" : "success";
    const statusTone: BadgeTone =
      quiz.status === "published" ? "success" : quiz.status === "draft" ? "warning" : "neutral";

    return {
      ...quiz,
      status: quiz.status ?? "draft",
      quiz_questions: sortedQuestions,
      questionCount,
      totalPoints,
      openQuestionCount,
      assignmentCount: assignmentStats.assignmentCount,
      overdueCount: assignmentStats.overdueCount,
      dueSoonCount: assignmentStats.dueSoonCount,
      attemptCount,
      averageScore,
      readinessScore,
      lane,
      tone,
      statusTone,
      moduleLabel,
      linkedContentLabel,
      laneLabel:
        lane === "fragile"
          ? "Fragile"
          : lane === "active"
            ? "Actif"
            : lane === "draft"
              ? "Brouillon"
              : "Prêt",
      nextNeed:
        lane === "draft"
          ? "Compléter puis publier pour rendre le quiz exploitable."
          : lane === "fragile"
            ? "Le quiz diffuse déjà, mais sa calibration ou ses deadlines demandent une reprise."
            : lane === "active"
              ? "Le quiz tourne déjà dans ECCE et mérite un suivi régulier."
              : "Bonne base prête à être branchée dans des assignations ou parcours.",
      previewHref: `/quiz/${quiz.id}`,
      createdAtValue: getDateValue(quiz.created_at) ?? 0
    };
  });

  const scopedQuizzes = quizRows.filter((quiz) => {
    const matchesQuery = normalizedQuery
      ? `${quiz.title} ${quiz.description ?? ""} ${quiz.kind ?? ""} ${quiz.linkedContentLabel ?? ""} ${quiz.moduleLabel}`.toLowerCase().includes(normalizedQuery)
      : true;
    const matchesKind = selectedKind ? quiz.kind === selectedKind : true;
    const matchesStatus = selectedStatus === "all" ? true : quiz.status === selectedStatus;
    return matchesQuery && matchesKind && matchesStatus;
  });

  const laneCounts = {
    fragile: scopedQuizzes.filter((quiz) => quiz.lane === "fragile").length,
    active: scopedQuizzes.filter((quiz) => quiz.lane === "active").length,
    draft: scopedQuizzes.filter((quiz) => quiz.lane === "draft").length,
    ready: scopedQuizzes.filter((quiz) => quiz.lane === "ready").length
  };

  const visibleQuizzes = scopedQuizzes.filter((quiz) => (laneFilter === "all" ? true : quiz.lane === laneFilter));
  const publishedVisibleCount = visibleQuizzes.filter((quiz) => quiz.status === "published").length;
  const linkedVisibleCount = visibleQuizzes.filter((quiz) => Boolean(quiz.content_item_id || quiz.module_id)).length;
  const activeVisibleCount = visibleQuizzes.filter((quiz) => quiz.assignmentCount > 0 || quiz.attemptCount > 0).length;
  const totalQuestions = visibleQuizzes.reduce((total, quiz) => total + quiz.questionCount, 0);
  const averageReadiness = visibleQuizzes.length
    ? roundMetric((visibleQuizzes.reduce((total, quiz) => total + quiz.readinessScore, 0) / (visibleQuizzes.length * 5)) * 100)
    : 0;
  const calibrationScore = visibleQuizzes.length
    ? roundMetric(
        (publishedVisibleCount / visibleQuizzes.length) * 30 +
          (linkedVisibleCount / visibleQuizzes.length) * 20 +
          (activeVisibleCount / visibleQuizzes.length) * 20 +
          (averageReadiness / 100) * 30
      )
    : 0;
  const calibrationBand: EngagementBand =
    calibrationScore >= 75 ? "strong" : calibrationScore >= 45 ? "watch" : "risk";
  const sortedVisibleQuizzes = visibleQuizzes
    .slice()
    .sort((left, right) => {
      const laneRank = { fragile: 0, draft: 1, active: 2, ready: 3 } as const;
      return (
        laneRank[left.lane] - laneRank[right.lane] ||
        right.overdueCount - left.overdueCount ||
        right.attemptCount - left.attemptCount ||
        right.questionCount - left.questionCount ||
        right.createdAtValue - left.createdAtValue
      );
    });
  const focusQuiz = sortedVisibleQuizzes[0] ?? null;
  const contentBridgeRadar = Array.from(
    visibleQuizzes.reduce((map, quiz) => {
      const key = quiz.linkedContentLabel ?? "Sans ressource liée";
      const current =
        map.get(key) ??
        ({
          id: key,
          label: key,
          count: 0,
          assignmentLoad: 0,
          attemptLoad: 0,
          fragileCount: 0
        } as {
          id: string;
          label: string;
          count: number;
          assignmentLoad: number;
          attemptLoad: number;
          fragileCount: number;
        });

      current.count += 1;
      current.assignmentLoad += quiz.assignmentCount;
      current.attemptLoad += quiz.attemptCount;
      if (quiz.lane === "fragile") {
        current.fragileCount += 1;
      }

      map.set(key, current);
      return map;
    }, new Map<
      string,
      {
        id: string;
        label: string;
        count: number;
        assignmentLoad: number;
        attemptLoad: number;
        fragileCount: number;
      }
    >()).values()
  )
    .map((bridge) => ({
      ...bridge,
      tone:
        bridge.fragileCount > 0
          ? ("warning" as const)
          : bridge.assignmentLoad > 0 || bridge.attemptLoad > 0
            ? ("accent" as const)
            : ("neutral" as const)
    }))
    .sort((left, right) => {
      return (
        right.fragileCount - left.fragileCount ||
        right.assignmentLoad - left.assignmentLoad ||
        right.count - left.count
      );
    })
    .slice(0, 6);
  const recentAttemptsFeed = attempts
    .filter((attempt) => visibleQuizzes.some((quiz) => quiz.id === attempt.quiz_id))
    .slice(0, 8)
    .map((attempt) => {
      const quiz = visibleQuizzes.find((item) => item.id === attempt.quiz_id);
      const learnerName = profileNameById.get(attempt.user_id) ?? "Coaché inconnu";
      const tone: BadgeTone =
        attempt.status === "graded"
          ? attempt.score !== null && attempt.score < 60
            ? "warning"
            : "success"
          : "accent";

      return {
        id: attempt.id,
        learnerName,
        quizTitle: quiz?.title ?? "Quiz",
        submittedAt: formatDate(attempt.submitted_at),
        attemptLabel: `Tentative ${attempt.attempt_number}`,
        scoreLabel:
          attempt.status === "submitted"
            ? "En correction"
            : attempt.score !== null
              ? `${attempt.score}%`
              : "Non noté",
        tone
      };
    });
  const activeFilterParts = [
    selectedKind ? `type ${selectedKind}` : null,
    selectedStatus !== "all" ? `statut ${selectedStatus}` : null,
    laneFilter !== "all"
      ? laneFilter === "fragile"
        ? "lane fragile"
        : laneFilter === "active"
          ? "lane active"
          : laneFilter === "draft"
            ? "lane brouillon"
            : "lane prêt"
      : null,
    normalizedQuery ? `recherche « ${filters?.query?.trim()} »` : null
  ].filter(Boolean) as string[];
  const priorityActions = [
    laneCounts.fragile > 0
      ? {
          id: "fragile",
          title: `${laneCounts.fragile} quiz demandent une recalibration`,
          description: "Le vrai risque n'est pas la création brute, mais la qualité de calibration sur les quiz déjà utilisés.",
          href: "#quiz-watchlist",
          ctaLabel: "Ouvrir la watchlist",
          tone: "warning" as const
        }
      : {
          id: "fragile",
          title: "Aucun quiz fragile sur la vue active",
          description: "La calibration visible reste saine sur le périmètre courant.",
          href: "#quiz-watchlist",
          ctaLabel: "Relire les quiz",
          tone: "success" as const
        },
    laneCounts.draft > 0
      ? {
          id: "draft",
          title: `${laneCounts.draft} quiz restent encore en brouillon`,
          description: "Le prochain gain rapide est souvent dans la finalisation, pas forcément dans un nouveau quiz.",
          href: "#quiz-studio",
          ctaLabel: "Compléter le builder",
          tone: "accent" as const
        }
      : {
          id: "draft",
          title: "Le builder visible est déjà publié",
          description: "Le studio peut se concentrer sur la diffusion et la qualité pédagogique.",
          href: "/admin/assignments",
          ctaLabel: "Ouvrir les assignations",
          tone: "success" as const
        },
    visibleQuizzes.filter((quiz) => quiz.status === "published" && quiz.assignmentCount === 0 && quiz.attemptCount === 0).length > 0
      ? {
          id: "distribution",
          title: `${visibleQuizzes.filter((quiz) => quiz.status === "published" && quiz.assignmentCount === 0 && quiz.attemptCount === 0).length} quiz publiés restent sous-exploités`,
          description: "Ces quiz sont prêts, mais encore peu branchés dans les parcours ou les missions.",
          href: "/admin/assignments",
          ctaLabel: "Programmer des assignations",
          tone: "accent" as const
        }
      : {
          id: "distribution",
          title: "Diffusion quiz déjà branchée",
          description: "Les quiz visibles sont déjà connectés à l'exécution pédagogique ou aux tentatives réelles.",
          href: "/agenda",
          ctaLabel: "Ouvrir l'agenda",
          tone: "success" as const
        },
    focusQuiz
      ? {
          id: "pivot",
          title: `Quiz pivot · ${focusQuiz.title}`,
          description:
            focusQuiz.attemptCount > 0
              ? `${focusQuiz.attemptCount} tentative(s) · ${focusQuiz.averageScore ?? "n/a"}% de moyenne`
              : `${focusQuiz.questionCount} question(s) · ${focusQuiz.totalPoints} point(s)`,
          href: focusQuiz.previewHref,
          ctaLabel: "Prévisualiser",
          tone: focusQuiz.tone
        }
      : {
          id: "pivot",
          title: "Aucun quiz focus",
          description: "Crée ou élargis la vue pour faire remonter un quiz pivot.",
          href: "#quiz-studio",
          ctaLabel: "Créer un quiz",
          tone: "neutral" as const
        }
  ];

  return {
    context,
    filters: {
      query: filters?.query?.trim() ?? "",
      kind: selectedKind,
      status: selectedStatus,
      lane: laneFilter,
      summary: activeFilterParts.length ? `Vue filtrée · ${activeFilterParts.join(" · ")}` : "Vue globale du studio quiz"
    },
    metrics: [
      {
        label: "Quiz visibles",
        value: visibleQuizzes.length.toString(),
        delta: `${publishedVisibleCount} publiés`
      },
      {
        label: "Calibration",
        value: `${calibrationScore}%`,
        delta: `${laneCounts.fragile} fragiles · ${laneCounts.active} actifs`
      },
      {
        label: "Questions",
        value: totalQuestions.toString(),
        delta: `${linkedVisibleCount} quiz reliés à un contenu ou module`
      },
      {
        label: "Diffusion réelle",
        value: activeVisibleCount.toString(),
        delta: `${recentAttemptsFeed.length} tentative(s) récentes visibles`
      }
    ],
    hero: {
      title: focusQuiz
        ? `${focusQuiz.title} concentre le point d’attention principal`
        : "Le studio quiz est prêt à piloter la calibration ECCE",
      summary: focusQuiz
        ? `${focusQuiz.laneLabel} · ${focusQuiz.questionCount} question(s) · ${focusQuiz.assignmentCount} assignation(s) · ${focusQuiz.attemptCount} tentative(s). ${focusQuiz.nextNeed}`
        : "La vue se remplira dès que des quiz seront visibles dans le studio."
    },
    calibrationPulse: {
      score: calibrationScore,
      band: calibrationBand,
      bandLabel:
        calibrationBand === "strong"
          ? "Calibration solide"
          : calibrationBand === "watch"
            ? "Équilibre à consolider"
            : "Refonte quiz prioritaire",
      caption: `${visibleQuizzes.length} quiz visibles · ${totalQuestions} question(s)`,
      trend:
        laneCounts.fragile > 0
          ? ("down" as const)
          : laneCounts.active > 0
            ? ("steady" as const)
            : ("up" as const),
      trendLabel:
        laneCounts.fragile > 0
          ? `${laneCounts.fragile} quiz demandent une reprise`
          : laneCounts.active > 0
            ? `${laneCounts.active} quiz tournent déjà dans ECCE`
            : "base prête à diffuser"
    },
    laneBreakdown: [
      {
        id: "fragile",
        label: "Fragiles",
        count: laneCounts.fragile,
        tone: "warning" as const,
        isActive: laneFilter === "fragile"
      },
      {
        id: "active",
        label: "Actifs",
        count: laneCounts.active,
        tone: "accent" as const,
        isActive: laneFilter === "active"
      },
      {
        id: "draft",
        label: "Brouillons",
        count: laneCounts.draft,
        tone: "neutral" as const,
        isActive: laneFilter === "draft"
      },
      {
        id: "ready",
        label: "Prêts",
        count: laneCounts.ready,
        tone: "success" as const,
        isActive: laneFilter === "ready"
      }
    ],
    focusQuiz,
    priorityActions,
    kinds,
    contentOptions: contents.map((content) => ({
      id: content.id,
      label: `${content.title} · ${content.status}`
    })),
    moduleOptions: buildProgramModuleOptions(programs, modules),
    contentBridgeRadar,
    recentAttemptsFeed,
    quizzes: visibleQuizzes,
    quizWatchlist: sortedVisibleQuizzes.slice(0, 6)
  };
}

export async function getAdminProgramStudioPageData(filters?: {
  query?: string;
  status?: string;
  lane?: string;
}) {
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
  const userById = new Map(users.map((user) => [user.id, user]));

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

  const normalizedQuery = filters?.query?.trim().toLowerCase() ?? "";
  const resolvedStatus =
    filters?.status && ["published", "draft", "scheduled", "archived"].includes(filters.status)
      ? filters.status
      : "all";
  const laneFilter: AdminProgramLane | "all" = isAdminProgramLane(filters?.lane) ? filters.lane : "all";

  const allPrograms = programs.map((program) => {
    const programModules = modules
      .filter((module) => module.program_id === program.id)
      .sort((left, right) => left.position - right.position);
    const programEnrollments = enrollments.filter((enrollment) => enrollment.program_id === program.id);
    const moduleCards = programModules.map((module) => {
      const contentCount = contentCountByModuleId.get(module.id) ?? 0;
      const quizCount = quizCountByModuleId.get(module.id) ?? 0;
      const assetCount = contentCount + quizCount;

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        position: module.position,
        status: module.status,
        statusTone: getProgramStatusTone(module.status),
        availableLabel: module.available_at ? formatDate(module.available_at) : "Disponible immédiatement",
        contentCount,
        quizCount,
        assetCount,
        assetLabel:
          assetCount > 0
            ? `${contentCount} contenu(x) · ${quizCount} quiz`
            : "Aucun contenu ou quiz rattache",
        tone: (assetCount > 0 ? (module.status === "published" ? "success" : "accent") : "warning") as BadgeTone
      };
    });

    const moduleCount = moduleCards.length;
    const modulesWithAssets = moduleCards.filter((module) => module.assetCount > 0).length;
    const moduleCoverage = moduleCount ? roundMetric((modulesWithAssets / moduleCount) * 100) : 0;
    const unwiredModuleCount = Math.max(moduleCount - modulesWithAssets, 0);
    const contentCount = moduleCards.reduce((total, module) => total + module.contentCount, 0);
    const quizCount = moduleCards.reduce((total, module) => total + module.quizCount, 0);
    const assetCount = contentCount + quizCount;
    const enrollmentCount = programEnrollments.length;
    const learnerCount = new Set(programEnrollments.map((enrollment) => enrollment.user_id)).size;
    const cohortActivationCount = new Set(
      programEnrollments.map((enrollment) => enrollment.cohort_id).filter(Boolean)
    ).size;
    const individualActivationCount = programEnrollments.filter((enrollment) => !enrollment.cohort_id).length;
    const latestEnrollmentAt = programEnrollments[0]?.enrolled_at ?? null;
    const readyForRollout =
      program.status === "published" && moduleCount > 0 && assetCount > 0 && moduleCoverage === 100;
    const lane: AdminProgramLane =
      program.status !== "published"
        ? "draft"
        : readyForRollout && enrollmentCount === 0
          ? "priority"
          : !readyForRollout
            ? "scaffold"
            : "active";
    const tone = getAdminProgramLaneTone(lane);
    const nextNeed =
      lane === "draft"
        ? moduleCount === 0
          ? "Ajouter les premiers modules puis publier le parcours."
          : "Finaliser la promesse et publier ce parcours pour le rendre diffusable."
        : lane === "priority"
          ? "Le parcours est pret: active-le vers un coache ou une cohorte."
          : lane === "scaffold"
            ? moduleCount === 0
              ? "Ajouter au moins un module pour transformer le programme en parcours reel."
              : assetCount === 0
                ? "Relier des contenus ou des quiz aux modules avant la diffusion."
                : `Brancher encore ${unwiredModuleCount} module(s) pour completer l'experience.`
            : "Suivre les activations en cours et etendre la diffusion si besoin.";
    const href =
      lane === "priority"
        ? "#program-rollout"
        : lane === "draft"
          ? "#program-studio"
          : lane === "scaffold"
            ? assetCount === 0 || unwiredModuleCount > 0
              ? "/admin/content"
              : "#program-catalog"
            : "/programs";
    const ctaLabel =
      lane === "priority"
        ? "Activer le parcours"
        : lane === "draft"
          ? "Reprendre le studio"
          : lane === "scaffold"
            ? assetCount === 0 || unwiredModuleCount > 0
              ? "Brancher les contenus"
              : "Voir le catalogue"
            : "Voir cote coache";
    const searchText = [
      program.title,
      program.slug,
      program.description,
      program.status,
      ...moduleCards.flatMap((module) => [module.title, module.description, module.status])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      id: program.id,
      title: program.title,
      description: program.description,
      slug: program.slug,
      status: program.status,
      statusTone: getProgramStatusTone(program.status),
      created_at: program.created_at,
      createdAtLabel: formatDate(program.created_at),
      lane,
      laneLabel: getAdminProgramLaneLabel(lane),
      tone,
      nextNeed,
      href,
      ctaLabel,
      readyForRollout,
      moduleCount,
      modulesWithAssets,
      moduleCoverage,
      unwiredModuleCount,
      enrollmentCount,
      learnerCount,
      cohortActivationCount,
      individualActivationCount,
      contentCount,
      quizCount,
      assetCount,
      latestEnrollmentAt,
      latestEnrollmentLabel: latestEnrollmentAt ? formatDate(latestEnrollmentAt) : "Aucune activation",
      searchText,
      modules: moduleCards,
      recentEnrollments: programEnrollments.slice(0, 4).map((enrollment) => ({
        id: `${enrollment.program_id}-${enrollment.user_id}-${enrollment.cohort_id ?? "solo"}`,
        learner: userById.get(enrollment.user_id)?.name ?? "Coaché",
        context: enrollment.cohort_id
          ? `via ${cohortNameById.get(enrollment.cohort_id) ?? "cohorte"}`
          : "activation individuelle",
        enrolledAt: formatDate(enrollment.enrolled_at),
        programLabel: programTitleById.get(enrollment.program_id) ?? "Parcours"
      }))
    };
  });

  const basePrograms = allPrograms.filter((program) => {
    if (resolvedStatus !== "all" && program.status !== resolvedStatus) {
      return false;
    }

    if (normalizedQuery && !program.searchText.includes(normalizedQuery)) {
      return false;
    }

    return true;
  });

  const laneCounts = basePrograms.reduce(
    (counts, program) => {
      counts[program.lane] += 1;
      return counts;
    },
    {
      priority: 0,
      scaffold: 0,
      draft: 0,
      active: 0
    } as Record<AdminProgramLane, number>
  );

  const visiblePrograms =
    laneFilter === "all" ? basePrograms : basePrograms.filter((program) => program.lane === laneFilter);

  const sortedVisiblePrograms = visiblePrograms.slice().sort((left, right) => {
    const laneRank = { priority: 0, scaffold: 1, draft: 2, active: 3 } as const;

    return (
      laneRank[left.lane] - laneRank[right.lane] ||
      right.unwiredModuleCount - left.unwiredModuleCount ||
      left.enrollmentCount - right.enrollmentCount ||
      right.learnerCount - left.learnerCount ||
      (getDateValue(right.latestEnrollmentAt ?? right.created_at) ?? 0) -
        (getDateValue(left.latestEnrollmentAt ?? left.created_at) ?? 0)
    );
  });

  const focusProgram = sortedVisiblePrograms[0] ?? null;
  const visibleProgramIds = new Set(visiblePrograms.map((program) => program.id));
  const visibleEnrollments = enrollments.filter((enrollment) => visibleProgramIds.has(enrollment.program_id));
  const publishedVisibleCount = visiblePrograms.filter((program) => program.status === "published").length;
  const activatedVisibleCount = visiblePrograms.filter((program) => program.enrollmentCount > 0).length;
  const readyVisibleCount = visiblePrograms.filter((program) => program.readyForRollout).length;
  const totalVisibleModules = visiblePrograms.reduce((total, program) => total + program.moduleCount, 0);
  const wiredVisibleModules = visiblePrograms.reduce((total, program) => total + program.modulesWithAssets, 0);
  const averageModuleCoverage = visiblePrograms.length
    ? roundMetric(
        visiblePrograms.reduce((total, program) => total + program.moduleCoverage, 0) / visiblePrograms.length
      )
    : 0;
  const deliveryScore = visiblePrograms.length
    ? roundMetric(
        (publishedVisibleCount / visiblePrograms.length) * 30 +
          (readyVisibleCount / visiblePrograms.length) * 25 +
          (activatedVisibleCount / visiblePrograms.length) * 25 +
          (averageModuleCoverage / 100) * 20
      )
    : 0;
  const activationBand: EngagementBand =
    deliveryScore >= 75 ? "strong" : deliveryScore >= 45 ? "watch" : "risk";
  const activeFilterParts = [
    resolvedStatus !== "all" ? `statut ${resolvedStatus}` : null,
    laneFilter !== "all"
      ? laneFilter === "priority"
        ? "lane a activer"
        : laneFilter === "scaffold"
          ? "lane a brancher"
          : laneFilter === "draft"
            ? "lane a finaliser"
            : "lane deja deploye"
      : null,
    normalizedQuery ? `recherche « ${filters?.query?.trim()} »` : null
  ].filter(Boolean) as string[];
  const priorityActions = [
    laneCounts.draft > 0
      ? {
          id: "drafts",
          title: `${laneCounts.draft} parcours restent encore a finaliser`,
          description: "La dette la plus simple a resorber reste souvent la publication des parcours deja cadrees.",
          href: "#program-studio",
          ctaLabel: "Reprendre le studio",
          tone: "warning" as const
        }
      : {
          id: "drafts",
          title: "Les parcours visibles sont deja sortis du brouillon",
          description: "Le studio peut se concentrer sur la diffusion et la qualite de raccordement.",
          href: "#program-catalog",
          ctaLabel: "Voir le catalogue",
          tone: "success" as const
        },
    laneCounts.priority > 0
      ? {
          id: "rollout",
          title: `${laneCounts.priority} parcours sont prets mais encore peu deploies`,
          description: "Le gain rapide est maintenant cote rollout: activer les parcours vers les bonnes cohortes.",
          href: "#program-rollout",
          ctaLabel: "Ouvrir l'activation",
          tone: "accent" as const
        }
      : laneCounts.scaffold > 0
        ? {
            id: "rollout",
            title: `${laneCounts.scaffold} parcours demandent encore des branchements`,
            description: "Avant d'activer davantage, connecte les modules aux contenus et quiz qui manquent.",
            href: "/admin/content",
            ctaLabel: "Brancher les assets",
            tone: "accent" as const
          }
        : {
            id: "rollout",
            title: "Diffusion parcours sous controle",
            description: "Les parcours visibles sont deja diffuses ou suffisamment structures pour l'etre.",
            href: "/programs",
            ctaLabel: "Voir cote coache",
            tone: "success" as const
          },
    focusProgram
      ? {
          id: "pivot",
          title: `Programme pivot · ${focusProgram.title}`,
          description: `${focusProgram.moduleCoverage}% de couverture modulaire · ${focusProgram.enrollmentCount} activation(s). ${focusProgram.nextNeed}`,
          href: focusProgram.href,
          ctaLabel: focusProgram.ctaLabel,
          tone: focusProgram.tone
        }
      : {
          id: "pivot",
          title: "Aucun parcours focus",
          description: "Crée un premier parcours ou elargis la vue pour faire remonter un programme pivot.",
          href: "#program-studio",
          ctaLabel: "Creer un parcours",
          tone: "neutral" as const
        }
  ];

  const rolloutRadar = Array.from(
    visibleEnrollments.reduce((map, enrollment) => {
      const key = enrollment.cohort_id ? `cohort:${enrollment.cohort_id}` : "individual";
      const current =
        map.get(key) ??
        ({
          id: key,
          label: enrollment.cohort_id
            ? cohortNameById.get(enrollment.cohort_id) ?? "Cohorte"
            : "Activations individuelles",
          count: 0,
          programIds: new Set<string>(),
          learnerIds: new Set<string>()
        } as {
          id: string;
          label: string;
          count: number;
          programIds: Set<string>;
          learnerIds: Set<string>;
        });

      current.count += 1;
      current.programIds.add(enrollment.program_id);
      current.learnerIds.add(enrollment.user_id);

      map.set(key, current);
      return map;
    }, new Map<
      string,
      {
        id: string;
        label: string;
        count: number;
        programIds: Set<string>;
        learnerIds: Set<string>;
      }
    >()).values()
  )
    .map((item) => ({
      id: item.id,
      label: item.label,
      count: item.count,
      programCount: item.programIds.size,
      learnerCount: item.learnerIds.size,
      tone:
        item.id === "individual"
          ? ("neutral" as const)
          : item.count >= 3
            ? ("success" as const)
            : ("accent" as const),
      summary: `${item.programIds.size} parcours · ${item.learnerIds.size} coache(s)`
    }))
    .sort((left, right) => {
      return right.count - left.count || right.learnerCount - left.learnerCount || right.programCount - left.programCount;
    })
    .slice(0, 4);

  const recentActivationFeed = visibleEnrollments
    .slice()
    .sort((left, right) => (getDateValue(right.enrolled_at) ?? 0) - (getDateValue(left.enrolled_at) ?? 0))
    .slice(0, 6)
    .map((enrollment) => ({
      id: `${enrollment.program_id}-${enrollment.user_id}-${enrollment.cohort_id ?? "solo"}`,
      learner: userById.get(enrollment.user_id)?.name ?? "Coaché",
      program: programTitleById.get(enrollment.program_id) ?? "Parcours",
      context: enrollment.cohort_id
        ? `via ${cohortNameById.get(enrollment.cohort_id) ?? "cohorte"}`
        : "activation individuelle",
      enrolledAt: formatDate(enrollment.enrolled_at)
    }));

  return {
    context,
    filters: {
      query: filters?.query?.trim() ?? "",
      status: resolvedStatus,
      lane: laneFilter,
      summary: activeFilterParts.length ? `Vue filtrée · ${activeFilterParts.join(" · ")}` : "Vue globale du studio parcours"
    },
    metrics: [
      {
        label: "Parcours visibles",
        value: visiblePrograms.length.toString(),
        delta: `${publishedVisibleCount} publies`
      },
      {
        label: "Delivery score",
        value: `${deliveryScore}%`,
        delta: `${readyVisibleCount} pret(s) pour rollout`
      },
      {
        label: "Modules branches",
        value: `${wiredVisibleModules}/${totalVisibleModules || 0}`,
        delta: `${Math.max(totalVisibleModules - wiredVisibleModules, 0)} encore vides`
      },
      {
        label: "Coaches touches",
        value: new Set(visibleEnrollments.map((enrollment) => enrollment.user_id)).size.toString(),
        delta: `${visibleEnrollments.length} activation(s) visibles`
      }
    ],
    hero: {
      title: focusProgram
        ? `${focusProgram.title} concentre le prochain arbitrage parcours`
        : "Le studio parcours est pret a piloter la diffusion ECCE",
      summary: focusProgram
        ? `${focusProgram.laneLabel} · ${focusProgram.moduleCount} module(s) · ${focusProgram.assetCount} asset(s) · ${focusProgram.enrollmentCount} activation(s). ${focusProgram.nextNeed}`
        : "La vue se remplira des que des parcours, modules et activations seront visibles dans l'organisation."
    },
    activationPulse: {
      score: deliveryScore,
      band: activationBand,
      bandLabel:
        activationBand === "strong"
          ? "Rollout solide"
          : activationBand === "watch"
            ? "Diffusion a consolider"
            : "Execution a reprendre",
      caption: `${visiblePrograms.length} parcours visibles · ${totalVisibleModules} module(s)`,
      trend:
        laneCounts.priority > 0
          ? ("down" as const)
          : laneCounts.scaffold > 0 || laneCounts.draft > 0
            ? ("steady" as const)
            : ("up" as const),
      trendLabel:
        laneCounts.priority > 0
          ? `${laneCounts.priority} parcours attendent encore leur rollout`
          : laneCounts.scaffold > 0
            ? `${laneCounts.scaffold} parcours restent partiellement branches`
            : laneCounts.draft > 0
              ? `${laneCounts.draft} parcours restent a publier`
              : "la diffusion visible est bien branchee"
    },
    laneBreakdown: [
      {
        id: "priority" as AdminProgramLane,
        label: "A activer",
        count: laneCounts.priority,
        tone: "warning" as const,
        isActive: laneFilter === "priority"
      },
      {
        id: "scaffold" as AdminProgramLane,
        label: "A brancher",
        count: laneCounts.scaffold,
        tone: "accent" as const,
        isActive: laneFilter === "scaffold"
      },
      {
        id: "draft" as AdminProgramLane,
        label: "A finaliser",
        count: laneCounts.draft,
        tone: "neutral" as const,
        isActive: laneFilter === "draft"
      },
      {
        id: "active" as AdminProgramLane,
        label: "Deja deployes",
        count: laneCounts.active,
        tone: "success" as const,
        isActive: laneFilter === "active"
      }
    ],
    focusProgram,
    priorityActions,
    rolloutRadar,
    recentActivationFeed,
    programWatchlist: sortedVisiblePrograms.slice(0, 6),
    programOptions: programs.map((program) => ({
      id: program.id,
      label: `${program.title} · ${program.status}`
    })),
    coacheeOptions,
    cohortOptions,
    programs: sortedVisiblePrograms
  };
}

export async function getAdminAssignmentStudioPageData(filters?: {
  query?: string;
  target?: string;
  kind?: string;
  lane?: string;
}) {
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
      .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at, created_at")
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
  const coacheeProfiles = profiles.filter((profile) =>
    (profile.user_roles ?? []).some((role) => role.role === "coachee")
  );
  const coacheeIds = new Set(coacheeProfiles.map((profile) => profile.id));

  const [attemptsResult, submissionsResult] = coacheeProfiles.length
    ? await Promise.all([
        admin
          .from("quiz_attempts")
          .select("id, quiz_id, user_id, assignment_id, score, status, attempt_number, submitted_at")
          .in(
            "user_id",
            coacheeProfiles.map((profile) => profile.id)
          )
          .order("submitted_at", { ascending: false }),
        admin
          .from("submissions")
          .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
          .in(
            "user_id",
            coacheeProfiles.map((profile) => profile.id)
          )
          .order("submitted_at", { ascending: false })
      ])
    : [
        {
          data: [] as QuizAttemptResultRow[]
        },
        {
          data: [] as SubmissionRow[]
        }
      ];

  const attempts = (attemptsResult.data ?? []) as QuizAttemptResultRow[];
  const submissions = (submissionsResult.data ?? []) as SubmissionRow[];
  const emailByUserId = new Map(authUsers.map((item) => [item.id, item.email ?? "email indisponible"]));
  const userNameById = new Map(profiles.map((profile) => [profile.id, formatUserName(profile)]));
  const contentById = new Map(contents.map((content) => [content.id, content]));
  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const cohortNameById = new Map(cohorts.map((cohort) => [cohort.id, cohort.name]));
  const cohortSizeById = cohortMembers.reduce((map, item) => {
    map.set(item.cohort_id, (map.get(item.cohort_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const now = Date.now();
  const deadlineSoonLimit = now + 7 * 24 * 60 * 60 * 1000;

  const latestAttemptByAssignmentKey = new Map<string, QuizAttemptResultRow>();
  const latestAttemptByQuizKey = new Map<string, QuizAttemptResultRow>();
  for (const attempt of attempts) {
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
  for (const submission of submissions) {
    if (!submission.assignment_id) {
      continue;
    }

    const submissionKey = `${submission.user_id}:${submission.assignment_id}`;
    if (!latestSubmissionByAssignmentKey.has(submissionKey)) {
      latestSubmissionByAssignmentKey.set(submissionKey, submission);
    }
  }

  const coacheeUsers = coacheeProfiles.map((profile) => ({
    id: profile.id,
    name: formatUserName(profile),
    email: emailByUserId.get(profile.id) ?? "email indisponible"
  }));

  const expandedAssignments = buildAssignmentTargets(assignments, cohortMembers);

  const assignmentRows = expandedAssignments.map((assignment) => {
    const content = contentById.get(assignment.content_item_id ?? "");
    const quiz = quizById.get(assignment.quiz_id ?? "");
    const kind: "quiz" | "contenu" = assignment.quiz_id ? "quiz" : "contenu";
    const targetIsCohort = Boolean(assignment.cohort_id);
    const targetIds = assignment.targetIds.filter((targetId) => coacheeIds.has(targetId));
    const dueAtValue = getDateValue(assignment.due_at);

    let completedCount = 0;
    let overdueTargetCount = 0;
    let dueSoonTargetCount = 0;
    let resolvedCount = 0;
    let onTimeCount = 0;

    for (const targetId of targetIds) {
      const attempt =
        latestAttemptByAssignmentKey.get(`${targetId}:${assignment.id}`) ??
        (assignment.quiz_id ? latestAttemptByQuizKey.get(`${targetId}:${assignment.quiz_id}`) : undefined);
      const submission = latestSubmissionByAssignmentKey.get(`${targetId}:${assignment.id}`);

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

      if (dueAtValue !== null) {
        if (!completedItem && dueAtValue < now) {
          overdueTargetCount += 1;
        }

        if (!completedItem && dueAtValue >= now && dueAtValue <= deadlineSoonLimit) {
          dueSoonTargetCount += 1;
        }

        if (completedItem && completedAtValue !== null) {
          resolvedCount += 1;
          if (completedAtValue <= dueAtValue) {
            onTimeCount += 1;
          }
        } else if (!completedItem && dueAtValue < now) {
          resolvedCount += 1;
        }
      }
    }

    const targetCount = targetIds.length;
    const completionRate = targetCount ? roundMetric((completedCount / targetCount) * 100) : 0;
    const onTimeRate = resolvedCount ? roundMetric((onTimeCount / resolvedCount) * 100) : null;
    const isComplete = targetCount > 0 && completedCount >= targetCount;
    const dueState = getDeadlineState(assignment.due_at, isComplete, now);
    const scope: "individual" | "cohort" = targetIsCohort ? "cohort" : "individual";
    const lane: "critical" | "watch" | "evergreen" | "aligned" =
      dueState === "open"
        ? "evergreen"
        : overdueTargetCount > 0 || (dueState === "soon" && completionRate < 40)
          ? "critical"
          : dueSoonTargetCount > 0 || completionRate < 75
            ? "watch"
            : "aligned";
    const tone: BadgeTone =
      lane === "critical" ? "warning" : lane === "watch" ? "accent" : lane === "evergreen" ? "neutral" : "success";

    return {
      id: assignment.id,
      title: assignment.title,
      summary:
        content?.summary ??
        quiz?.description ??
        (assignment.quiz_id ? "Quiz programmé dans le parcours ECCE." : "Ressource programmée dans le parcours ECCE."),
      due: formatDate(assignment.due_at),
      dueCompact: formatDateCompact(assignment.due_at),
      dueRelativeLabel: getRelativeDayLabel(assignment.due_at, now),
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
      scope,
      lane,
      tone,
      completionRate,
      completedCount,
      targetCount,
      overdueTargetCount,
      dueSoonTargetCount,
      onTimeRate,
      createdAt: formatDate(assignment.created_at ?? assignment.published_at ?? null),
      createdAtValue:
        getDateValue(assignment.created_at ?? assignment.published_at ?? assignment.due_at) ??
        0,
      meta: content
        ? `${content.content_type} · ${content.estimated_minutes ? `${content.estimated_minutes} min` : "durée libre"}`
        : `${quiz?.kind ?? "quiz"} · ${quiz?.time_limit_minutes ? `${quiz.time_limit_minutes} min` : "temps libre"}`,
      href: assignment.content_item_id
        ? `/assignments/${assignment.id}`
        : assignment.quiz_id
          ? `/quiz/${assignment.quiz_id}?assignment=${assignment.id}`
          : null,
      ctaLabel: assignment.content_item_id ? "Ouvrir l'assignation" : "Ouvrir le quiz"
    };
  });

  const normalizedQuery = String(filters?.query ?? "").trim().toLowerCase();
  const selectedTarget = filters?.target === "individual" || filters?.target === "cohort" ? filters.target : "all";
  const selectedKind = filters?.kind === "quiz" || filters?.kind === "contenu" ? filters.kind : "all";
  const selectedLane =
    filters?.lane === "critical" ||
    filters?.lane === "watch" ||
    filters?.lane === "evergreen" ||
    filters?.lane === "aligned"
      ? filters.lane
      : "all";

  const queryFilteredAssignments = assignmentRows.filter((assignment) => {
    if (!normalizedQuery) {
      return true;
    }

    return [
      assignment.title,
      assignment.summary ?? "",
      assignment.targetLabel,
      assignment.audienceLabel,
      assignment.assetLabel,
      assignment.meta
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const typeFilteredAssignments = queryFilteredAssignments.filter((assignment) => {
    const matchesTarget = selectedTarget === "all" ? true : assignment.scope === selectedTarget;
    const matchesKind = selectedKind === "all" ? true : assignment.kind === selectedKind;
    return matchesTarget && matchesKind;
  });

  const visibleAssignments = typeFilteredAssignments.filter((assignment) =>
    selectedLane === "all" ? true : assignment.lane === selectedLane
  );

  const laneCounts = {
    critical: typeFilteredAssignments.filter((assignment) => assignment.lane === "critical").length,
    watch: typeFilteredAssignments.filter((assignment) => assignment.lane === "watch").length,
    evergreen: typeFilteredAssignments.filter((assignment) => assignment.lane === "evergreen").length,
    aligned: typeFilteredAssignments.filter((assignment) => assignment.lane === "aligned").length
  };

  const filteredTargetedLearners = new Set(visibleAssignments.flatMap((assignment) => {
    const source = expandedAssignments.find((item) => item.id === assignment.id);
    return source ? source.targetIds.filter((targetId) => coacheeIds.has(targetId)) : [];
  }));
  const filteredCohortCount = new Set(
    visibleAssignments.map((assignment) => assignment.scope === "cohort" ? assignment.targetLabel : "").filter(Boolean)
  ).size;
  const averageCompletionRate = visibleAssignments.length
    ? roundMetric(
        visibleAssignments.reduce((total, assignment) => total + assignment.completionRate, 0) /
          visibleAssignments.length
      )
    : 0;
  const dueSoonCount = visibleAssignments.filter((assignment) => assignment.dueState === "soon").length;
  const overdueCount = visibleAssignments.filter((assignment) => assignment.dueState === "overdue").length;
  const withoutDeadlineCount = visibleAssignments.filter((assignment) => assignment.dueState === "open").length;
  const quizCount = visibleAssignments.filter((assignment) => assignment.kind === "quiz").length;
  const contentCount = visibleAssignments.filter((assignment) => assignment.kind === "contenu").length;
  const completionBand: EngagementBand =
    averageCompletionRate >= 75 ? "strong" : averageCompletionRate >= 45 ? "watch" : "risk";

  const sortedAssignments = visibleAssignments
    .slice()
    .sort((left, right) => {
      const leftPriority =
        (left.lane === "critical" ? 400 : left.lane === "watch" ? 250 : left.lane === "evergreen" ? 150 : 50) +
        left.overdueTargetCount * 80 +
        left.dueSoonTargetCount * 30 +
        (100 - left.completionRate);
      const rightPriority =
        (right.lane === "critical" ? 400 : right.lane === "watch" ? 250 : right.lane === "evergreen" ? 150 : 50) +
        right.overdueTargetCount * 80 +
        right.dueSoonTargetCount * 30 +
        (100 - right.completionRate);

      if (rightPriority !== leftPriority) {
        return rightPriority - leftPriority;
      }

      return right.createdAtValue - left.createdAtValue;
    });

  const focusAssignment = sortedAssignments[0] ?? null;

  const assetRadar = Array.from(
    visibleAssignments.reduce((map, assignment) => {
      const key = `${assignment.kind}:${assignment.assetLabel}`;
      const current = map.get(key) ?? {
        id: key,
        title: assignment.assetLabel,
        kind: assignment.kind,
        assignmentCount: 0,
        targetCount: 0,
        completedCount: 0,
        criticalCount: 0,
        overdueTargetCount: 0
      };

      current.assignmentCount += 1;
      current.targetCount += assignment.targetCount;
      current.completedCount += assignment.completedCount;
      current.overdueTargetCount += assignment.overdueTargetCount;
      if (assignment.lane === "critical") {
        current.criticalCount += 1;
      }

      map.set(key, current);
      return map;
    }, new Map<
      string,
      {
        id: string;
        title: string;
        kind: "quiz" | "contenu";
        assignmentCount: number;
        targetCount: number;
        completedCount: number;
        criticalCount: number;
        overdueTargetCount: number;
      }
    >()).values()
  )
    .map((asset) => ({
      id: asset.id,
      title: asset.title,
      kind: asset.kind,
      tone:
        asset.criticalCount > 0
          ? ("warning" as const)
          : asset.targetCount > 0 && asset.completedCount / asset.targetCount >= 0.8
            ? ("success" as const)
            : ("accent" as const),
      assignmentCount: asset.assignmentCount,
      targetCount: asset.targetCount,
      averageCompletion: asset.targetCount ? roundMetric((asset.completedCount / asset.targetCount) * 100) : 0,
      criticalCount: asset.criticalCount,
      overdueTargetCount: asset.overdueTargetCount
    }))
    .sort((left, right) => {
      if (right.criticalCount !== left.criticalCount) {
        return right.criticalCount - left.criticalCount;
      }

      if (right.overdueTargetCount !== left.overdueTargetCount) {
        return right.overdueTargetCount - left.overdueTargetCount;
      }

      return right.assignmentCount - left.assignmentCount;
    })
    .slice(0, 6);

  const executionFeed = visibleAssignments
    .slice()
    .sort((left, right) => right.createdAtValue - left.createdAtValue)
    .slice(0, 6)
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      createdAt: assignment.createdAt,
      dueLabel: assignment.dueRelativeLabel,
      scopeLabel: assignment.scope === "cohort" ? "Cohorte" : "Individuel",
      targetLabel: assignment.targetLabel,
      tone: assignment.tone
    }));

  const priorityActions = [
    overdueCount > 0
      ? {
          id: "deadline",
          title: `${overdueCount} assignation(s) ont dépassé leur tempo`,
          description: "Le vrai risque n'est plus la programmation, mais la dette de suivi déjà visible dans les deadlines.",
          href: "#assignment-board",
          ctaLabel: "Traiter le board",
          tone: "warning" as const
        }
      : {
          id: "deadline",
          title: "Aucune dette de deadline immédiate",
          description: "Le studio peut rester orienté orchestration plutôt qu'urgence pure.",
          href: "#assignment-board",
          ctaLabel: "Relire le board",
          tone: "success" as const
        },
    withoutDeadlineCount > 0
      ? {
          id: "evergreen",
          title: `${withoutDeadlineCount} assignation(s) restent sans échéance`,
          description: "Le mode evergreen est utile, mais il faut l'assumer explicitement pour ne pas créer de zone grise pédagogique.",
          href: "#assignment-board",
          ctaLabel: "Voir les evergreen",
          tone: "accent" as const
        }
      : {
          id: "evergreen",
          title: "Cadence explicite sur la vue active",
          description: "Les missions visibles ont toutes un tempo lisible pour le coaché.",
          href: "#assignment-studio",
          ctaLabel: "Créer la suite",
          tone: "success" as const
        },
    laneCounts.critical + laneCounts.watch > 0
      ? {
          id: "coverage",
          title: `${laneCounts.critical + laneCounts.watch} mission(s) demandent une relance pédagogique`,
          description: "Le signal principal remonte côté exécution: consigne, tempo ou cible doivent être réajustés.",
          href: "/admin/learners",
          ctaLabel: "Croiser avec learner ops",
          tone: "accent" as const
        }
      : {
          id: "coverage",
          title: "Pipeline d'exécution bien équilibré",
          description: "La vue active ne remonte ni dette forte ni glissement pédagogique majeur.",
          href: "/agenda",
          ctaLabel: "Ouvrir l'agenda",
          tone: "success" as const
        },
    assetRadar[0]
      ? {
          id: "asset",
          title: `Asset focus · ${assetRadar[0].title}`,
          description:
            assetRadar[0].criticalCount > 0
              ? "Cet asset concentre actuellement la plus forte tension d'exécution sur la vue active."
              : "Cet asset est le meilleur point d'observation pour décider d'une nouvelle diffusion ou d'une relance.",
          href: assetRadar[0].kind === "quiz" ? "/admin/quizzes" : "/admin/content",
          ctaLabel: "Ouvrir le studio lié",
          tone: assetRadar[0].tone
        }
      : {
          id: "asset",
          title: "Aucun asset encore diffusé",
          description: "Crée une première assignation pour lancer la lecture d'exécution dans ECCE.",
          href: "#assignment-studio",
          ctaLabel: "Créer une assignation",
          tone: "neutral" as const
        }
  ];

  const summaryBits = [
    normalizedQuery ? `recherche « ${filters?.query?.trim()} »` : null,
    selectedTarget === "cohort" ? "cibles cohortes" : selectedTarget === "individual" ? "cibles individuelles" : null,
    selectedKind === "quiz" ? "quiz" : selectedKind === "contenu" ? "contenus" : null,
    selectedLane === "critical"
      ? "lane critique"
      : selectedLane === "watch"
        ? "lane à surveiller"
        : selectedLane === "evergreen"
          ? "lane sans deadline"
          : selectedLane === "aligned"
            ? "lane alignée"
            : null
  ].filter(Boolean);

  return {
    context,
    metrics: [
      {
        label: "Assignations visibles",
        value: visibleAssignments.length.toString(),
        delta: `${quizCount} quiz · ${contentCount} contenus`
      },
      {
        label: "Complétion moyenne",
        value: `${averageCompletionRate}%`,
        delta: `${laneCounts.critical} critiques · ${laneCounts.watch} à surveiller`
      },
      {
        label: "Coachés touchés",
        value: `${filteredTargetedLearners.size}/${coacheeUsers.length}`,
        delta: `${filteredCohortCount} cohorte(s) actives`
      },
      {
        label: "Cadence ouverte",
        value: withoutDeadlineCount.toString(),
        delta: `${dueSoonCount} à venir · ${overdueCount} en retard`
      }
    ],
    filters: {
      query: filters?.query?.trim() ?? "",
      target: selectedTarget,
      kind: selectedKind,
      lane: selectedLane,
      summary: summaryBits.length ? `Vue filtrée · ${summaryBits.join(" · ")}` : "Vue globale du studio assignations"
    },
    hero: {
      title: focusAssignment
        ? `${focusAssignment.title} concentre le point d'attention principal`
        : "Le studio assignations est prêt à piloter le tempo pédagogique",
      summary: focusAssignment
        ? `${focusAssignment.targetLabel} · ${focusAssignment.assetLabel}. ${focusAssignment.completedCount}/${focusAssignment.targetCount} complété(s), ${focusAssignment.statusLabel} côté deadline.`
        : "La vue se remplira dès que des assignations seront visibles côté admin."
    },
    laneBreakdown: [
      {
        id: "critical",
        label: "Critiques",
        count: laneCounts.critical,
        tone: "warning" as const,
        isActive: selectedLane === "critical"
      },
      {
        id: "watch",
        label: "À surveiller",
        count: laneCounts.watch,
        tone: "accent" as const,
        isActive: selectedLane === "watch"
      },
      {
        id: "evergreen",
        label: "Sans deadline",
        count: laneCounts.evergreen,
        tone: "neutral" as const,
        isActive: selectedLane === "evergreen"
      },
      {
        id: "aligned",
        label: "Alignées",
        count: laneCounts.aligned,
        tone: "success" as const,
        isActive: selectedLane === "aligned"
      }
    ],
    completionPulse: {
      score: averageCompletionRate,
      band: completionBand,
      bandLabel:
        completionBand === "strong"
          ? "Exécution solide"
          : completionBand === "watch"
            ? "Cadence à surveiller"
            : "Relance prioritaire",
      caption: `${filteredTargetedLearners.size} coaché(s) touchés · ${visibleAssignments.length} mission(s) visibles`,
      trend: laneCounts.critical > 0 ? ("down" as const) : laneCounts.watch > 0 ? ("steady" as const) : ("up" as const),
      trendLabel:
        laneCounts.critical > 0
          ? `${laneCounts.critical} mission(s) critiques demandent une action rapide`
          : laneCounts.watch > 0
            ? `${laneCounts.watch} mission(s) restent à stabiliser`
            : "pipeline d'exécution propre sur la vue active"
    },
    focusAssignment: focusAssignment
      ? {
          ...focusAssignment,
          laneLabel:
            focusAssignment.lane === "critical"
              ? "Critique"
              : focusAssignment.lane === "watch"
                ? "À surveiller"
                : focusAssignment.lane === "evergreen"
                  ? "Sans deadline"
                  : "Alignée",
          nextNeed:
            focusAssignment.lane === "critical"
              ? "Relance ou arbitrage immédiat conseillé."
              : focusAssignment.lane === "watch"
                ? "Surveiller la complétion avant glissement."
                : focusAssignment.lane === "evergreen"
                  ? "Assumer explicitement le mode evergreen."
                  : "Exécution saine, peut servir de référence."
        }
      : null,
    priorityActions,
    assignmentWatchlist: sortedAssignments.slice(0, 6).map((assignment) => ({
      ...assignment,
      laneLabel:
        assignment.lane === "critical"
          ? "Critique"
          : assignment.lane === "watch"
            ? "À surveiller"
            : assignment.lane === "evergreen"
              ? "Sans deadline"
              : "Alignée"
    })),
    assetRadar,
    executionFeed,
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
    assignments: visibleAssignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      summary: assignment.summary,
      due: assignment.due,
      dueState: assignment.dueState,
      statusLabel: assignment.statusLabel,
      statusTone: assignment.statusTone,
      targetLabel: assignment.targetLabel,
      audienceLabel: assignment.audienceLabel,
      assetLabel: assignment.assetLabel,
      kind: assignment.kind,
      meta: `${assignment.meta} · ${assignment.completedCount}/${assignment.targetCount} complété(s)`,
      href: assignment.href,
      ctaLabel: assignment.ctaLabel
    }))
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

export async function getCoachReviewQueueData(filters?: {
  lane?: string;
  query?: string;
  limit?: number;
}) {
  const scope = await getCoachVisibleLearnerScope();
  const { admin, learnerIds, organizationId, profileById, profiles } = scope;
  const normalizedQuery = normalizeDataSearchQuery(filters?.query);
  const limit = Math.min(Math.max(filters?.limit ?? 40, 10), 100);
  const profileSearchIds = normalizedQuery
    ? profiles
        .filter((profile) =>
          matchesDataSearch(
            [profile.first_name, profile.last_name, profile.bio, profile.timezone],
            normalizedQuery
          )
        )
        .map((profile) => profile.id)
    : [];

  if (!learnerIds.length) {
    return {
      context: scope.context,
      filters: {
        lane: filters?.lane ?? "all",
        query: normalizedQuery
      },
      recentQuizResults: [],
      reviewQueue: [],
      textReviewQueue: []
    };
  }

  const [quizSearchResult, contentSearchResult, matchingTextAnswerResult] = normalizedQuery
    ? await Promise.all([
        admin
          .from("quizzes")
          .select("id, title, description")
          .eq("organization_id", organizationId)
          .or(`title.ilike.%${normalizedQuery}%,description.ilike.%${normalizedQuery}%`)
          .limit(100),
        admin
          .from("content_items")
          .select("id, title, summary, category, subcategory")
          .eq("organization_id", organizationId)
          .or(
            `title.ilike.%${normalizedQuery}%,summary.ilike.%${normalizedQuery}%,category.ilike.%${normalizedQuery}%,subcategory.ilike.%${normalizedQuery}%`
          )
          .limit(100),
        admin
          .from("quiz_attempt_answers")
          .select("attempt_id")
          .ilike("answer_text", `%${normalizedQuery}%`)
          .limit(100)
      ])
    : [
        { data: [] as Array<{ id: string; title: string; description: string | null }> },
        { data: [] as Array<{ id: string; title: string; summary: string | null; category: string | null; subcategory: string | null }> },
        { data: [] as Array<{ attempt_id: string }> }
      ];
  const matchedQuizIds = Array.from(new Set((quizSearchResult.data ?? []).map((item) => item.id)));
  const matchedContentIds = Array.from(new Set((contentSearchResult.data ?? []).map((item) => item.id)));
  const matchedAnswerAttemptIds = Array.from(
    new Set((matchingTextAnswerResult.data ?? []).map((item) => item.attempt_id))
  );

  const textAttemptSearchFilters = normalizedQuery
    ? [
        profileSearchIds.length ? `user_id.in.(${profileSearchIds.join(",")})` : null,
        matchedQuizIds.length ? `quiz_id.in.(${matchedQuizIds.join(",")})` : null,
        matchedAnswerAttemptIds.length ? `id.in.(${matchedAnswerAttemptIds.join(",")})` : null
      ].filter(Boolean)
    : [];
  const shouldFetchTextAttempts = !normalizedQuery || textAttemptSearchFilters.length > 0;
  const textAttemptsResult = shouldFetchTextAttempts
    ? await (() => {
        let query = admin
          .from("quiz_attempts")
          .select(
            "id, quiz_id, user_id, assignment_id, score, status, attempt_number, submitted_at, profiles:user_id(first_name, last_name)"
          )
          .in("user_id", learnerIds)
          .order("submitted_at", { ascending: false })
          .limit(limit);

        if (textAttemptSearchFilters.length) {
          query = query.or(textAttemptSearchFilters.join(","));
        }

        return query;
      })()
    : { data: [] as QuizAttemptResultRow[] };
  const coachVisibleAttempts = ((textAttemptsResult.data ?? []) as QuizAttemptResultRow[]).filter((attempt) =>
    learnerIds.includes(attempt.user_id)
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
        learnerId: attempt.user_id,
        quizTitle: textQuizTitleById.get(attempt.quiz_id) ?? "Quiz",
        submittedAt: formatDate(attempt.submitted_at),
        attemptLabel: `Tentative ${attempt.attempt_number}`,
        score: attempt.score !== null ? `${attempt.score}%` : "En attente",
        answers
      };
    });

  const submissionSearchFilters = normalizedQuery
    ? [
        `title.ilike.%${normalizedQuery}%`,
        `notes.ilike.%${normalizedQuery}%`,
        profileSearchIds.length ? `user_id.in.(${profileSearchIds.join(",")})` : null,
        matchedContentIds.length ? `content_item_id.in.(${matchedContentIds.join(",")})` : null
      ].filter(Boolean)
    : [];
  const submissionsResult = await (() => {
    let query = admin
      .from("submissions")
      .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
      .in("user_id", learnerIds)
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (submissionSearchFilters.length) {
      query = query.or(submissionSearchFilters.join(","));
    }

    return query;
  })();
  const submissions = ((submissionsResult.data ?? []) as SubmissionRow[]).filter((item) =>
    learnerIds.includes(item.user_id)
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
    submissions.map(async (submission) => {
      const learner = profileById.get(submission.user_id);

      return {
        id: submission.id,
        learner: learner ? formatUserName(learner) : "Coaché inconnu",
        learnerId: submission.user_id,
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
  const recentQuizResults = coachVisibleAttempts.slice(0, 8).map((attempt) => {
    const profile = profileById.get(attempt.user_id);

    return {
      id: attempt.id,
      learner: profile ? formatUserName(profile) : "Coaché inconnu",
      learnerId: attempt.user_id,
      score: attempt.status === "submitted" ? "En correction" : attempt.score !== null ? `${attempt.score}%` : "Non noté",
      status: attempt.status,
      attempt: `Tentative ${attempt.attempt_number}`,
      submittedAt: formatDate(attempt.submitted_at)
    };
  });

  return {
    context: scope.context,
    filters: {
      lane: filters?.lane ?? "all",
      query: normalizedQuery
    },
    recentQuizResults,
    reviewQueue,
    textReviewQueue
  };
}

export async function getCoachLearnerDetailPageData(learnerId: string) {
  const scope = await getCoachVisibleLearnerScope();
  const { admin, cohortMembers, cohortNameById, cohortNamesByUserId, context, organizationId, profileById } = scope;
  const learner = profileById.get(learnerId) ?? null;

  if (!learner) {
    return {
      context,
      learner: null,
      metrics: [],
      engagement: null,
      assignmentCards: [],
      submissionCards: [],
      recentAttempts: [],
      sessions: [],
      badges: [],
      notifications: [],
      activityFeed: []
    };
  }

  const learnerCohortMembers = cohortMembers.filter((member) => member.user_id === learnerId);
  const learnerCohortIds = learnerCohortMembers.map((member) => member.cohort_id);
  const assignmentFilter = learnerCohortIds.length
    ? `assigned_user_id.eq.${learnerId},cohort_id.in.(${learnerCohortIds.join(",")})`
    : `assigned_user_id.eq.${learnerId}`;
  const [
    assignmentsResult,
    attemptsResult,
    submissionsResult,
    sessionsResult,
    notificationsResult,
    badgesResult,
    assignedCoachIds
  ] = await Promise.all([
    admin
      .from("learning_assignments")
      .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, created_at, published_at")
      .eq("organization_id", organizationId)
      .or(assignmentFilter)
      .order("due_at", { ascending: true })
      .limit(60),
    admin
      .from("quiz_attempts")
      .select("id, quiz_id, user_id, assignment_id, score, status, attempt_number, submitted_at")
      .eq("user_id", learnerId)
      .order("submitted_at", { ascending: false })
      .limit(30),
    admin
      .from("submissions")
      .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
      .eq("user_id", learnerId)
      .order("submitted_at", { ascending: false })
      .limit(30),
    admin
      .from("coaching_sessions")
      .select("id, coach_id, coachee_id, cohort_id, starts_at, ends_at, status, video_link")
      .eq("organization_id", organizationId)
      .eq("coachee_id", learnerId)
      .order("starts_at", { ascending: false })
      .limit(12),
    admin
      .from("notifications")
      .select("id, title, body, created_at, read_at, deeplink, recipient_id")
      .eq("organization_id", organizationId)
      .eq("recipient_id", learnerId)
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("user_badges")
      .select("id, user_id, awarded_at, badges(title, description, icon)")
      .eq("user_id", learnerId)
      .order("awarded_at", { ascending: false })
      .limit(8),
    getAssignedCoachIdsForCoachee({
      organizationId,
      coacheeId: learnerId,
      cohortIds: learnerCohortIds
    })
  ]);
  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[];
  const attempts = (attemptsResult.data ?? []) as QuizAttemptResultRow[];
  const submissions = (submissionsResult.data ?? []) as SubmissionRow[];
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
  const notifications = (notificationsResult.data ?? []) as Array<NotificationRow & { recipient_id: string }>;
  const badges = (badgesResult.data ?? []) as UserBadgeRow[];
  const contentIds = Array.from(
    new Set(
      [
        ...assignments.map((assignment) => assignment.content_item_id),
        ...submissions.map((submission) => submission.content_item_id)
      ].filter(Boolean)
    )
  ) as string[];
  const quizIds = Array.from(
    new Set(
      [
        ...assignments.map((assignment) => assignment.quiz_id),
        ...attempts.map((attempt) => attempt.quiz_id)
      ].filter(Boolean)
    )
  ) as string[];
  const submissionIds = submissions.map((submission) => submission.id);
  const [contentRowsResult, quizRowsResult, reviewsResult, coachProfilesResult] = await Promise.all([
    contentIds.length
      ? admin.from("content_items").select("id, title, slug, summary, content_type").in("id", contentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; slug: string; summary: string | null; content_type: string }> }),
    quizIds.length
      ? admin.from("quizzes").select("id, title, description, passing_score").in("id", quizIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; description: string | null; passing_score: number | null }> }),
    submissionIds.length
      ? admin
          .from("submission_reviews")
          .select("id, submission_id, reviewer_id, grade, feedback, created_at")
          .in("submission_id", submissionIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as SubmissionReviewRow[] }),
    assignedCoachIds.length
      ? admin
          .from("profiles")
          .select("id, first_name, last_name, status")
          .eq("organization_id", organizationId)
          .in("id", assignedCoachIds)
      : Promise.resolve({ data: [] as ProfileRow[] })
  ]);
  const contentById = new Map((contentRowsResult.data ?? []).map((content) => [content.id, content]));
  const quizById = new Map((quizRowsResult.data ?? []).map((quiz) => [quiz.id, quiz]));
  const latestReviewBySubmissionId = new Map<string, SubmissionReviewRow>();
  for (const review of (reviewsResult.data ?? []) as SubmissionReviewRow[]) {
    if (!latestReviewBySubmissionId.has(review.submission_id)) {
      latestReviewBySubmissionId.set(review.submission_id, review);
    }
  }

  const latestAttemptByAssignmentKey = new Map<string, QuizAttemptResultRow>();
  const latestAttemptByQuizKey = new Map<string, QuizAttemptResultRow>();
  for (const attempt of attempts) {
    if (attempt.assignment_id && !latestAttemptByAssignmentKey.has(attempt.assignment_id)) {
      latestAttemptByAssignmentKey.set(attempt.assignment_id, attempt);
    }

    if (!latestAttemptByQuizKey.has(attempt.quiz_id)) {
      latestAttemptByQuizKey.set(attempt.quiz_id, attempt);
    }
  }

  const latestSubmissionByAssignmentId = new Map<string, SubmissionRow>();
  for (const submission of submissions) {
    if (submission.assignment_id && !latestSubmissionByAssignmentId.has(submission.assignment_id)) {
      latestSubmissionByAssignmentId.set(submission.assignment_id, submission);
    }
  }

  const engagement =
    buildEngagementSignals({
      learnerIds: [learnerId],
      profiles: [learner],
      cohortNamesByUserId,
      assignments,
      cohortMembers: learnerCohortMembers,
      attempts,
      submissions,
      sessions,
      notifications,
      badges: badges.map((badge) => ({
        user_id: learnerId,
        awarded_at: badge.awarded_at
      }))
    })[0] ?? null;
  const gradedAttempts = attempts.filter((attempt) => attempt.status === "graded" && attempt.score !== null);
  const upcomingSessions = sessions
    .filter((session) => getDateValue(session.starts_at) !== null && (getDateValue(session.starts_at) ?? 0) >= Date.now())
    .sort((left, right) => (getDateValue(left.starts_at) ?? 0) - (getDateValue(right.starts_at) ?? 0));
  const coachProfiles = (coachProfilesResult.data ?? []) as ProfileRow[];
  const submissionCards = await Promise.all(
    submissions.slice(0, 8).map(async (submission) => ({
      id: submission.id,
      title: submission.title,
      contentTitle: contentById.get(submission.content_item_id ?? "")?.title ?? "Contenu",
      submittedAt: formatDate(submission.submitted_at),
      status: submission.status,
      statusLabel: getSubmissionStatusLabel(submission.status),
      statusTone: getSubmissionStatusTone(submission.status),
      notes: submission.notes,
      fileUrl: await getSignedSubmissionUrl(submission.storage_path, admin),
      review: latestReviewBySubmissionId.get(submission.id) ?? null
    }))
  );
  const assignmentCards = assignments.slice(0, 12).map((assignment) => {
    const latestAttempt =
      latestAttemptByAssignmentKey.get(assignment.id) ??
      (assignment.quiz_id ? latestAttemptByQuizKey.get(assignment.quiz_id) : undefined);
    const latestSubmission = latestSubmissionByAssignmentId.get(assignment.id);
    const completed = assignment.quiz_id
      ? Boolean(latestAttempt && latestAttempt.status !== "in_progress" && latestAttempt.status !== "expired")
      : Boolean(latestSubmission && latestSubmission.status !== "not_started");
    const dueState = getDeadlineState(assignment.due_at, completed);
    const content = contentById.get(assignment.content_item_id ?? "");
    const quiz = quizById.get(assignment.quiz_id ?? "");

    return {
      id: assignment.id,
      title: assignment.title,
      assetTitle: quiz?.title ?? content?.title ?? "Asset pédagogique",
      kind: assignment.quiz_id ? "quiz" : "contenu",
      due: formatDate(assignment.due_at),
      statusLabel: getDeadlineStateLabel(dueState),
      statusTone: getDeadlineStateTone(dueState),
      audienceLabel: assignment.cohort_id
        ? `Cohorte · ${cohortNameById.get(assignment.cohort_id) ?? "groupe"}`
        : "Assignation individuelle",
      href: assignment.quiz_id ? `/quiz/${assignment.quiz_id}?assignment=${assignment.id}` : `/assignments/${assignment.id}`,
      latestResult: latestAttempt?.score !== null && latestAttempt?.score !== undefined
        ? `${latestAttempt.score}%`
        : latestSubmission
          ? getSubmissionStatusLabel(latestSubmission.status)
          : "Non démarré"
    };
  });
  const activityFeed = [
    ...attempts.slice(0, 8).map((attempt) => ({
      id: `attempt-${attempt.id}`,
      title: quizById.get(attempt.quiz_id)?.title ?? "Quiz",
      meta: `Tentative ${attempt.attempt_number} · ${attempt.status === "submitted" ? "correction en cours" : attempt.score !== null ? `${attempt.score}%` : "non noté"}`,
      date: formatDate(attempt.submitted_at),
      sortValue: getDateValue(attempt.submitted_at) ?? 0,
      tone: (attempt.status === "graded" ? "success" : "accent") as BadgeTone
    })),
    ...submissions.slice(0, 8).map((submission) => ({
      id: `submission-${submission.id}`,
      title: submission.title,
      meta: `${contentById.get(submission.content_item_id ?? "")?.title ?? "Soumission"} · ${getSubmissionStatusLabel(submission.status)}`,
      date: formatDate(submission.submitted_at),
      sortValue: getDateValue(submission.submitted_at ?? submission.created_at) ?? 0,
      tone: getSubmissionStatusTone(submission.status)
    })),
    ...sessions.slice(0, 8).map((session) => ({
      id: `session-${session.id}`,
      title: "Séance de coaching",
      meta: session.status,
      date: formatDate(session.starts_at),
      sortValue: getDateValue(session.starts_at) ?? 0,
      tone: (session.status === "planned" ? "accent" : "neutral") as BadgeTone
    }))
  ]
    .sort((left, right) => right.sortValue - left.sortValue)
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.meta,
      date: item.date,
      tone: item.tone
    }));

  return {
    context,
    learner: {
      id: learner.id,
      name: formatUserName(learner),
      bio: learner.bio ?? null,
      status: learner.status,
      timezone: learner.timezone ?? "UTC",
      createdAt: learner.created_at ? formatDate(learner.created_at) : "Date non disponible",
      cohorts: cohortNamesByUserId.get(learnerId) ?? [],
      coaches: coachProfiles.map((coach) => ({
        id: coach.id,
        name: formatUserName(coach)
      }))
    },
    metrics: [
      {
        label: "Engagement",
        value: `${engagement?.score ?? 0}%`,
        delta: engagement?.trendLabel ?? "signal en construction"
      },
      {
        label: "Assignations",
        value: `${engagement?.completedCount ?? 0}/${engagement?.assignmentCount ?? assignments.length}`,
        delta: engagement?.nextFocus ?? "aucune action prioritaire"
      },
      {
        label: "Score quiz moyen",
        value: engagement?.averageQuizScore !== null && engagement?.averageQuizScore !== undefined ? `${engagement.averageQuizScore}%` : "—",
        delta: `${gradedAttempts.length} tentative(s) notée(s)`
      },
      {
        label: "Séances à venir",
        value: upcomingSessions.length.toString(),
        delta: upcomingSessions[0] ? formatDate(upcomingSessions[0].starts_at) : "aucune séance planifiée"
      }
    ],
    engagement,
    assignmentCards,
    submissionCards,
    recentAttempts: attempts.slice(0, 8).map((attempt) => ({
      id: attempt.id,
      title: quizById.get(attempt.quiz_id)?.title ?? "Quiz",
      meta: `Tentative ${attempt.attempt_number} · ${formatDate(attempt.submitted_at)}`,
      status: attempt.status,
      score: attempt.status === "submitted" ? "En correction" : attempt.score !== null ? `${attempt.score}%` : "Non noté"
    })),
    sessions: sessions.slice(0, 8).map((session) => ({
      id: session.id,
      date: formatDate(session.starts_at),
      end: session.ends_at ? formatDate(session.ends_at) : "Fin libre",
      status: session.status,
      videoLink: session.video_link,
      cohort: session.cohort_id ? (cohortNameById.get(session.cohort_id) ?? null) : null
    })),
    badges: badges.map((badge) => {
      const badgeInfo = Array.isArray(badge.badges) ? badge.badges[0] : badge.badges;

      return {
        id: badge.id,
        title: badgeInfo?.title ?? "Badge ECCE",
        description: badgeInfo?.description ?? "Nouveau jalon débloqué.",
        awardedAt: formatDate(badge.awarded_at)
      };
    }),
    notifications: notifications.slice(0, 6).map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      createdAt: formatDate(notification.created_at),
      read: Boolean(notification.read_at),
      deeplink: notification.deeplink
    })),
    activityFeed
  };
}

export async function getCoachSessionPageData(sessionId: string) {
  const context = await requireRole(["admin", "coach"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const sessionResult = await admin
    .from("coaching_sessions")
    .select("id, organization_id, coach_id, coachee_id, cohort_id, starts_at, ends_at, status, video_link, created_at")
    .eq("organization_id", organizationId)
    .eq("id", sessionId)
    .maybeSingle<{
      id: string;
      organization_id: string;
      coach_id: string;
      coachee_id: string;
      cohort_id: string | null;
      starts_at: string;
      ends_at: string | null;
      status: "planned" | "completed" | "cancelled";
      video_link: string | null;
      created_at: string;
    }>();

  if (sessionResult.error || !sessionResult.data) {
    return null;
  }

  const session = sessionResult.data;

  if (context.role === "coach" && session.coach_id !== context.user.id) {
    return null;
  }

  const [profilesResult, cohortResult, notesResult, learnerDetail] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, last_name, status, bio, timezone")
      .eq("organization_id", organizationId)
      .in("id", [session.coach_id, session.coachee_id]),
    session.cohort_id
      ? admin
          .from("cohorts")
          .select("id, name")
          .eq("organization_id", organizationId)
          .eq("id", session.cohort_id)
          .maybeSingle<{ id: string; name: string }>()
      : Promise.resolve({ data: null as { id: string; name: string } | null }),
    admin
      .from("coaching_notes")
      .select("id, session_id, coach_id, summary, blockers, next_actions, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false }),
    getCoachLearnerDetailPageData(session.coachee_id)
  ]);
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const coach = profileById.get(session.coach_id) ?? null;
  const learner = profileById.get(session.coachee_id) ?? null;
  const notes = ((notesResult.data ?? []) as CoachingNoteRow[]).map((note) => ({
    id: note.id,
    summary: note.summary,
    blockers: note.blockers,
    nextActions: note.next_actions,
    createdAt: formatDate(note.created_at),
    authorName: profileById.get(note.coach_id) ? formatUserName(profileById.get(note.coach_id)!) : "Coach"
  }));
  const timestamp = getDateValue(session.starts_at) ?? Date.now();
  const now = Date.now();
  const isPast = timestamp < now;
  const noteCompleteness = notes.reduce((total, note) => {
    return total + [note.summary, note.blockers, note.nextActions].filter((value) => value && value.trim()).length;
  }, 0);
  const learnerEngagement = learnerDetail?.engagement ?? null;

  return {
    context,
    session: {
      id: session.id,
      status: session.status,
      statusTone:
        session.status === "completed"
          ? ("success" as const)
          : session.status === "cancelled"
            ? ("warning" as const)
            : ("accent" as const),
      date: formatDate(session.starts_at),
      dayLabel: getRelativeDayLabel(session.starts_at),
      timeLabel: `${formatTimeOnly(session.starts_at)}${session.ends_at ? ` → ${formatTimeOnly(session.ends_at)}` : ""}`,
      videoLink: session.video_link,
      isPast,
      cohort: cohortResult.data?.name ?? null,
      createdAt: formatDate(session.created_at)
    },
    coach: coach
      ? {
          id: coach.id,
          name: formatUserName(coach),
          status: coach.status
        }
      : null,
    learner: learner
      ? {
          id: learner.id,
          name: formatUserName(learner),
          status: learner.status,
          timezone: learner.timezone ?? "UTC",
          bio: learner.bio ?? null,
          engagement: learnerEngagement
        }
      : null,
    metrics: [
      {
        label: "Statut séance",
        value: session.status,
        delta: isPast ? "créneau passé" : "créneau à venir"
      },
      {
        label: "Notes",
        value: notes.length.toString(),
        delta: `${noteCompleteness} champ(s) documenté(s)`
      },
      {
        label: "Engagement coaché",
        value: learnerEngagement ? `${learnerEngagement.score}%` : "—",
        delta: learnerEngagement?.nextFocus ?? "signal à consolider"
      },
      {
        label: "Rythme",
        value: getRelativeDayLabel(session.starts_at),
        delta: formatTimeOnly(session.starts_at)
      }
    ],
    notes,
    learnerSnapshot: learnerDetail
      ? {
          assignments: learnerDetail.assignmentCards.slice(0, 4),
          attempts: learnerDetail.recentAttempts.slice(0, 4),
          submissions: learnerDetail.submissionCards.slice(0, 4),
          activity: learnerDetail.activityFeed.slice(0, 5)
        }
      : null
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

export async function getAgendaPageData(filters?: {
  query?: string;
  lane?: string;
  scope?: string;
}) {
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
    const timestamp = new Date(session.starts_at).getTime();
    const isToday = relativeDay === "Aujourd'hui";
    const isOverdue = timestamp < now && session.status === "planned";
    const lane: AgendaLane = isOverdue ? "urgent" : isToday ? "today" : timestamp >= now ? "upcoming" : "recent";
    const title = context.role === "coachee" ? "Séance de coaching" : coacheeName;
    const subtitle =
      context.role === "admin"
        ? `Coach · ${coachName}`
        : session.cohort_id
          ? `Cohorte · ${cohortNameById.get(session.cohort_id) ?? "groupe"}`
          : "Séance individuelle";
    const audienceLabel =
      context.role === "coachee"
        ? coachName
        : session.cohort_id
          ? `${cohortNameById.get(session.cohort_id) ?? "Cohorte"}`
          : "1:1";

    return {
      id: `session-${session.id}`,
      type: "session" as const,
      timestamp,
      dayLabel: relativeDay,
      dateLabel: formatDateCompact(session.starts_at),
      timeLabel: `${formatTimeOnly(session.starts_at)}${session.ends_at ? ` → ${formatTimeOnly(session.ends_at)}` : ""}`,
      title,
      subtitle,
      statusLabel: session.status,
      statusTone:
        session.status === "completed"
          ? ("success" as const)
          : session.status === "cancelled"
            ? ("warning" as const)
            : ("accent" as const),
      audienceLabel,
      href: context.role === "coachee" ? session.video_link || null : `/coach/sessions/${session.id}`,
      ctaLabel: context.role === "coachee" ? (session.video_link ? "Rejoindre" : null) : "Ouvrir la séance",
      isOverdue,
      isToday,
      lane,
      laneLabel: getAgendaLaneLabel(lane),
      tone: getAgendaLaneTone(lane),
      nextAction:
        session.video_link && timestamp >= now
          ? "Le lien de séance est prêt: tu peux rejoindre ou préparer ce rendez-vous depuis l'agenda."
          : session.video_link
            ? "La séance est passée mais le lien reste utile pour reprendre le contexte."
            : session.status === "planned"
              ? "La séance est planifiée mais le lien n'est pas encore renseigné."
              : session.status === "completed"
                ? "La séance est terminée: tu peux relire le contexte avant la suite."
                : "Vérifie le statut de cette séance avant de relancer le fil pédagogique.",
      contextLabel: context.role === "coachee" ? `Coach · ${coachName}` : `Coaché · ${coacheeName}`,
      searchText: [title, subtitle, audienceLabel, coachName, coacheeName, session.status].join(" ").toLowerCase()
    };
  });

  const deadlineEvents = assignments.map((assignment) => {
    const dueState = getDeadlineState(assignment.due_at, false, now);
    const dueTimestamp = assignment.due_at ? new Date(assignment.due_at).getTime() : now;
    const content = assignment.content_item_id ? contentById.get(assignment.content_item_id) : null;
    const quiz = assignment.quiz_id ? quizById.get(assignment.quiz_id) : null;
    const isToday = getRelativeDayLabel(assignment.due_at, now) === "Aujourd'hui";
    const lane: AgendaLane = dueState === "overdue" ? "urgent" : isToday ? "today" : dueTimestamp >= now ? "upcoming" : "recent";
    const subtitle =
      assignment.quiz_id
        ? `Quiz · ${quiz?.title ?? "quiz"}`
        : `Contenu · ${content?.title ?? "ressource"}`;
    const audienceLabel =
      context.role === "coachee"
        ? assignment.cohort_id
          ? `Cohorte · ${cohortNameById.get(assignment.cohort_id) ?? "groupe"}`
          : "Assignation individuelle"
        : assignment.assigned_user_id
          ? profileById.get(assignment.assigned_user_id)
            ? formatUserName(profileById.get(assignment.assigned_user_id)!)
            : "Coaché"
          : `Cohorte · ${cohortNameById.get(assignment.cohort_id ?? "") ?? "groupe"}`;

    return {
      id: `deadline-${assignment.id}`,
      type: "deadline" as const,
      timestamp: dueTimestamp,
      dayLabel: getRelativeDayLabel(assignment.due_at, now),
      dateLabel: formatDateCompact(assignment.due_at),
      timeLabel: formatTimeOnly(assignment.due_at),
      title: assignment.title,
      subtitle,
      statusLabel: getDeadlineStateLabel(dueState),
      statusTone: getDeadlineStateTone(dueState),
      audienceLabel,
      href: assignment.quiz_id
        ? `/quiz/${assignment.quiz_id}${context.role === "coachee" ? `?assignment=${assignment.id}` : ""}`
        : context.role === "coachee"
          ? `/assignments/${assignment.id}`
          : content
            ? `/library/${content.slug}`
            : null,
      ctaLabel: assignment.quiz_id ? "Ouvrir le quiz" : context.role === "coachee" ? "Ouvrir l'assignation" : "Ouvrir la ressource",
      isOverdue: dueState === "overdue",
      isToday,
      lane,
      laneLabel: getAgendaLaneLabel(lane),
      tone: getAgendaLaneTone(lane),
      nextAction:
        dueState === "overdue"
          ? "La deadline a basculé en retard: ouvre cette étape en priorité."
          : dueState === "soon"
            ? "La deadline arrive vite: mieux vaut lancer cette étape maintenant."
            : assignment.quiz_id
              ? "Le quiz est prêt à être repris directement depuis l'agenda."
              : "La ressource reste accessible pour préparer la prochaine échéance.",
      contextLabel: subtitle,
      searchText: [assignment.title, subtitle, audienceLabel, getDeadlineStateLabel(dueState)].join(" ").toLowerCase()
    };
  });

  const normalizedQuery = filters?.query?.trim().toLowerCase() ?? "";
  const laneFilter: AgendaLane | "all" = isAgendaLane(filters?.lane) ? filters.lane : "all";
  const scopeFilter: AgendaScope | "all" = isAgendaScope(filters?.scope) ? filters.scope : "all";
  const allEvents = [...sessionEvents, ...deadlineEvents];
  const baseEvents = allEvents.filter((event) => {
    if (normalizedQuery && !event.searchText.includes(normalizedQuery)) {
      return false;
    }

    if (scopeFilter === "sessions" && event.type !== "session") {
      return false;
    }

    if (scopeFilter === "deadlines" && event.type !== "deadline") {
      return false;
    }

    return true;
  });
  const laneCounts = baseEvents.reduce(
    (counts, event) => {
      counts[event.lane] += 1;
      return counts;
    },
    {
      urgent: 0,
      today: 0,
      upcoming: 0,
      recent: 0
    } as Record<AgendaLane, number>
  );
  const visibleEvents =
    laneFilter === "all" ? baseEvents : baseEvents.filter((event) => event.lane === laneFilter);
  const events = visibleEvents.slice().sort((left, right) => left.timestamp - right.timestamp);
  const priorityEvents = visibleEvents
    .slice()
    .sort((left, right) => {
      const laneRank = { urgent: 0, today: 1, upcoming: 2, recent: 3 } as const;

      if (laneRank[left.lane] !== laneRank[right.lane]) {
        return laneRank[left.lane] - laneRank[right.lane];
      }

      if (left.lane === "recent" && right.lane === "recent") {
        return right.timestamp - left.timestamp;
      }

      return left.timestamp - right.timestamp;
    });
  const focusEvent = priorityEvents[0] ?? null;
  const groupedEvents = events.reduce(
    (map, event) => {
      const key = `${event.dayLabel}-${event.dateLabel}`;
      const current = map.get(key) ?? {
        id: key,
        label: `${event.dayLabel} · ${event.dateLabel}`,
        events: [] as typeof events
      };

      current.events.push(event);
      map.set(key, current);
      return map;
    },
    new Map<string, { id: string; label: string; events: typeof events }>()
  );
  const daySpotlights = Array.from(groupedEvents.values())
    .sort((left, right) => {
      const leftUrgent = left.events.filter((event) => event.lane === "urgent").length;
      const rightUrgent = right.events.filter((event) => event.lane === "urgent").length;

      return rightUrgent - leftUrgent || left.events[0].timestamp - right.events[0].timestamp;
    })
    .slice(0, 4)
    .map((group) => {
      const urgentCount = group.events.filter((event) => event.lane === "urgent").length;
      const todayCount = group.events.filter((event) => event.lane === "today").length;
      const upcomingCount = group.events.filter((event) => event.lane === "upcoming").length;
      const tone = urgentCount > 0 ? ("warning" as const) : todayCount > 0 ? ("accent" as const) : upcomingCount > 0 ? ("neutral" as const) : ("success" as const);

      return {
        id: group.id,
        label: group.label,
        count: group.events.length,
        tone,
        summary:
          urgentCount > 0
            ? `${urgentCount} point(s) à sécuriser · ${group.events[0].title}`
            : todayCount > 0
              ? `${todayCount} point(s) aujourd'hui · ${group.events[0].title}`
              : upcomingCount > 0
                ? `${upcomingCount} événement(s) à venir · ${group.events[0].title}`
                : `Relecture récente · ${group.events[0].title}`,
        href: group.events[0]?.href ?? "#agenda-timeline",
        ctaLabel: group.events[0]?.ctaLabel ?? "Voir la timeline"
      };
    });

  const upcomingSessions = visibleEvents.filter((event) => event.type === "session" && event.timestamp >= now && event.statusLabel === "planned").length;
  const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
  const dueThisWeek = visibleEvents.filter((event) => event.type === "deadline" && event.timestamp >= now && event.timestamp <= weekEnd).length;
  const overdueCount = visibleEvents.filter((event) => event.isOverdue).length;
  const todayCount = visibleEvents.filter((event) => event.isToday).length;
  const nextEvent = events.find((event) => event.timestamp >= now) ?? priorityEvents[0] ?? null;
  const activeFilterParts = [
    scopeFilter === "sessions" ? "séances" : scopeFilter === "deadlines" ? "deadlines" : null,
    laneFilter !== "all" ? getAgendaLaneLabel(laneFilter) : null,
    normalizedQuery ? `recherche « ${filters?.query?.trim()} »` : null
  ].filter(Boolean) as string[];
  const responsePlaybook = [
    focusEvent
      ? {
          id: "focus",
          title: focusEvent.lane === "urgent" ? "Sécuriser le temps fort critique" : "Ouvrir le prochain temps fort",
          body: focusEvent.nextAction,
          href: focusEvent.href ?? "#agenda-timeline",
          ctaLabel: focusEvent.href ? focusEvent.ctaLabel ?? "Ouvrir l'événement" : "Voir la timeline",
          tone: focusEvent.tone
        }
      : {
          id: "focus",
          title: "Aucun temps fort dans cette vue",
          body: "L'agenda remontera ici la prochaine séance ou la prochaine deadline utile dès qu'elle deviendra visible.",
          href: "/dashboard",
          ctaLabel: "Retour au dashboard",
          tone: "neutral" as const
        },
    {
      id: "messages",
      title: "Relier l'agenda aux messages",
      body: "Quand un événement demande une coordination rapide, la messagerie garde le bon contexte de reprise.",
      href: "/messages",
      ctaLabel: "Ouvrir les messages",
      tone: "accent" as const
    },
    {
      id: "programs",
      title: "Croiser les échéances avec les parcours",
      body: "Les deadlines et quiz prennent plus de sens quand tu les relis au parcours actif et à la prochaine étape utile.",
      href: "/programs",
      ctaLabel: "Voir les parcours",
      tone: "success" as const
    }
  ];

  return {
    context,
    filters: {
      query: filters?.query?.trim() ?? "",
      lane: laneFilter,
      scope: scopeFilter,
      summary: activeFilterParts.length ? `Vue filtrée · ${activeFilterParts.join(" · ")}` : "Vue globale de l'agenda"
    },
    metrics: [
      {
        label: "Événements visibles",
        value: visibleEvents.length.toString(),
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
    hero: {
      title: focusEvent
        ? `${focusEvent.title} donne le tempo du prochain mouvement`
        : "L'agenda reste prêt à remonter le prochain temps fort utile",
      summary: focusEvent
        ? `${focusEvent.laneLabel} · ${focusEvent.timeLabel} · ${focusEvent.nextAction}`
        : "Séances, deadlines et reprises récentes remonteront ici dès qu'un événement devient visible dans ton périmètre ECCE."
    },
    laneBreakdown: [
      {
        id: "urgent" as AgendaLane,
        label: "A securiser",
        count: laneCounts.urgent,
        tone: "warning" as const,
        isActive: laneFilter === "urgent"
      },
      {
        id: "today" as AgendaLane,
        label: "Aujourd'hui",
        count: laneCounts.today,
        tone: "accent" as const,
        isActive: laneFilter === "today"
      },
      {
        id: "upcoming" as AgendaLane,
        label: "A venir",
        count: laneCounts.upcoming,
        tone: "neutral" as const,
        isActive: laneFilter === "upcoming"
      },
      {
        id: "recent" as AgendaLane,
        label: "Recent",
        count: laneCounts.recent,
        tone: "success" as const,
        isActive: laneFilter === "recent"
      }
    ],
    focusEvent,
    priorityEvents: priorityEvents.slice(0, 6),
    daySpotlights,
    responsePlaybook,
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

export async function getLearnerProgramsPageData(filters?: {
  query?: string;
  lane?: string;
}) {
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
      filters: {
        query: filters?.query?.trim() ?? "",
        lane: "all" as const,
        summary: "Aucun parcours actif"
      },
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
          label: "Étapes ouvertes",
          value: "0",
          delta: "Le studio admin peut maintenant structurer les parcours"
        },
        {
          label: "Modules visibles",
          value: "0",
          delta: "Le cockpit apprenant se remplira automatiquement"
        }
      ],
      hero: {
        title: "Tes parcours apparaîtront ici dès leur activation",
        summary:
          "La vue premium des parcours reste prête: progression, modules, prochaines étapes et signaux d’élan émergeront dès qu’un programme sera attribué."
      },
      laneBreakdown: [
        {
          id: "urgent" as LearnerProgramLane,
          label: "A securiser",
          count: 0,
          tone: "warning" as const,
          isActive: false
        },
        {
          id: "momentum" as LearnerProgramLane,
          label: "En cours",
          count: 0,
          tone: "accent" as const,
          isActive: false
        },
        {
          id: "launch" as LearnerProgramLane,
          label: "A lancer",
          count: 0,
          tone: "neutral" as const,
          isActive: false
        },
        {
          id: "completed" as LearnerProgramLane,
          label: "Completes",
          count: 0,
          tone: "success" as const,
          isActive: false
        }
      ],
      focusProgram: null,
      moduleRadar: [],
      recentCompletionsFeed: [],
      responsePlaybook: [
        {
          id: "launch",
          title: "Aucun parcours a lancer pour l'instant",
          body: "Dès qu’un coach ou l’admin activera un programme, tu verras ici sa prochaine étape utile.",
          href: "/dashboard",
          ctaLabel: "Retour au dashboard",
          tone: "neutral" as const
        }
      ],
      programWatchlist: [],
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

  const normalizedQuery = filters?.query?.trim().toLowerCase() ?? "";
  const laneFilter: LearnerProgramLane | "all" = isLearnerProgramLane(filters?.lane) ? filters.lane : "all";

  const allPrograms = programs.map((program) => {
    const programModules = (moduleListByProgramId.get(program.id) ?? []).sort((left, right) => left.position - right.position);

    const moduleCards = programModules.map((module) => {
      const moduleContents = contents.filter((content) => content.module_id === module.id);
      const moduleQuizzes = quizzes.filter((quiz) => quiz.module_id === module.id);

      const items = [
        ...moduleContents.map((content) => {
          const assignment = assignmentByContentId.get(content.id) ?? null;
          const submission = latestSubmissionByContentId.get(content.id) ?? null;
          const completed = Boolean(submission && ["submitted", "reviewed", "late"].includes(submission.status));
          const dueState = getDeadlineState(assignment?.due_at, completed);
          const activityAt = submission?.submitted_at ?? submission?.reviewed_at ?? assignment?.published_at ?? content.created_at;
          const stateLabel = completed
            ? submission?.status === "reviewed"
              ? "Corrigé"
              : "Terminé"
            : dueState === "overdue"
              ? "En retard"
              : dueState === "soon"
                ? "A ouvrir vite"
                : assignment?.due_at
                  ? "Planifié"
                  : "Libre";

          return {
            id: content.id,
            type: "contenu",
            title: content.title,
            description: content.summary || `${content.content_type}${content.estimated_minutes ? ` · ${content.estimated_minutes} min` : ""}`,
            completed,
            href: assignment ? `/assignments/${assignment.id}` : `/library/${content.slug}`,
            dueLabel: assignment?.due_at ? formatDate(assignment.due_at) : "Accessible maintenant",
            tone: completed ? "success" : assignment?.due_at ? getDeadlineStateTone(dueState) : "neutral",
            dueState,
            stateLabel,
            ctaLabel: completed ? "Revoir la ressource" : assignment ? "Ouvrir la mission" : "Ouvrir la ressource",
            metaLabel: content.category || content.content_type,
            activityAt
          };
        }),
        ...moduleQuizzes.map((quiz) => {
          const assignment = assignmentByQuizId.get(quiz.id) ?? null;
          const attempt = latestAttemptByQuizId.get(quiz.id) ?? null;
          const completed = Boolean(attempt && ["submitted", "graded"].includes(attempt.status));
          const dueState = getDeadlineState(assignment?.due_at, completed);
          const activityAt = attempt?.submitted_at ?? assignment?.published_at ?? null;
          const stateLabel = completed
            ? attempt?.status === "graded"
              ? "Corrigé"
              : "Soumis"
            : dueState === "overdue"
              ? "En retard"
              : dueState === "soon"
                ? "A lancer vite"
                : assignment?.due_at
                  ? "Planifié"
                  : "Ouvert";

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
            tone: completed ? "success" : assignment?.due_at ? getDeadlineStateTone(dueState) : "accent",
            dueState,
            stateLabel,
            ctaLabel: completed ? "Revoir le quiz" : "Ouvrir le quiz",
            metaLabel: quiz.kind ?? "quiz",
            activityAt
          };
        })
      ];

      const completedItems = items.filter((item) => item.completed).length;
      const pendingItems = items.filter((item) => !item.completed).length;
      const urgentItems = items.filter((item) => !item.completed && item.dueState === "overdue").length;
      const soonItems = items.filter((item) => !item.completed && item.dueState === "soon").length;
      const totalItems = items.length;
      const progress = totalItems ? Math.round((completedItems / totalItems) * 100) : 0;
      const nextItem =
        items.find((item) => !item.completed && item.dueState === "overdue") ??
        items.find((item) => !item.completed && item.dueState === "soon") ??
        items.find((item) => !item.completed) ??
        null;

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
        pendingItems,
        urgentItems,
        soonItems,
        totalItems,
        nextFocus: nextItem?.title ?? (items.length ? "Module complété" : "Module en préparation"),
        nextHref: nextItem?.href ?? null,
        nextCtaLabel: nextItem?.ctaLabel ?? null,
        nextNeed: nextItem
          ? `${nextItem.stateLabel} · ${nextItem.dueLabel}`
          : items.length
            ? "Tu as terminé ce module."
            : "Ce module sera enrichi bientôt.",
        items
      };
    });

    const totalItems = moduleCards.reduce((total, module) => total + module.totalItems, 0);
    const completedItems = moduleCards.reduce((total, module) => total + module.completedItems, 0);
    const pendingItems = moduleCards.reduce((total, module) => total + module.pendingItems, 0);
    const overdueItems = moduleCards.reduce((total, module) => total + module.urgentItems, 0);
    const soonItems = moduleCards.reduce((total, module) => total + module.soonItems, 0);
    const progress = totalItems ? Math.round((completedItems / totalItems) * 100) : 0;
    const nextModule =
      moduleCards.find((module) => module.urgentItems > 0) ??
      moduleCards.find((module) => module.soonItems > 0) ??
      moduleCards.find((module) => module.pendingItems > 0) ??
      null;
    const nextActionItem =
      nextModule?.items.find((item) => !item.completed && item.dueState === "overdue") ??
      nextModule?.items.find((item) => !item.completed && item.dueState === "soon") ??
      nextModule?.items.find((item) => !item.completed) ??
      null;
    const enrollment = enrollments.find((item) => item.program_id === program.id);
    const latestActivityAt = [
      enrollment?.enrolled_at ?? null,
      ...moduleCards.flatMap((module) => module.items.map((item) => item.activityAt ?? null))
    ]
      .filter(Boolean)
      .sort((left, right) => (getDateValue(right) ?? 0) - (getDateValue(left) ?? 0))[0] ?? null;
    const lane: LearnerProgramLane =
      progress >= 100
        ? "completed"
        : overdueItems > 0 || soonItems > 0
          ? "urgent"
          : progress === 0
            ? "launch"
            : "momentum";
    const tone = getLearnerProgramLaneTone(lane);
    const nextNeed =
      lane === "completed"
        ? "Parcours terminé: tu peux consolider ou revisiter les modules clés."
        : lane === "urgent"
          ? overdueItems > 0
            ? `${overdueItems} étape(s) demandent une reprise rapide pour éviter le décalage.`
            : `${soonItems} étape(s) méritent d’être ouvertes maintenant pour garder le rythme.`
          : lane === "launch"
            ? "Le bon premier geste est simplement d’ouvrir la prochaine ressource ou le prochain quiz."
            : "Le parcours est lancé: garde l’élan en ouvrant la prochaine étape utile.";
    const searchText = [
      program.title,
      program.slug,
      program.description,
      ...moduleCards.flatMap((module) => [
        module.title,
        module.description,
        ...module.items.flatMap((item) => [item.title, item.description, item.metaLabel])
      ])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      id: program.id,
      title: program.title,
      description: program.description,
      status: program.status,
      statusTone: getProgramStatusTone(program.status),
      enrolledAt: enrollment ? formatDate(enrollment.enrolled_at) : "Activation récente",
      latestActivityLabel: latestActivityAt ? formatDate(latestActivityAt) : "Aucune activité récente",
      progress,
      progressTone: getProgramProgressTone(progress),
      completedItems,
      pendingItems,
      overdueItems,
      soonItems,
      totalItems,
      moduleCount: moduleCards.length,
      completedModules: moduleCards.filter((module) => module.progress >= 100).length,
      lane,
      laneLabel: getLearnerProgramLaneLabel(lane),
      tone,
      nextFocus: nextActionItem?.title ?? nextModule?.nextFocus ?? "Parcours complété",
      nextNeed,
      primaryHref: nextActionItem?.href ?? null,
      primaryCtaLabel: nextActionItem?.ctaLabel ?? "Voir le parcours",
      modules: moduleCards,
      searchText
    };
  });

  const basePrograms = allPrograms.filter((program) => {
    if (normalizedQuery && !program.searchText.includes(normalizedQuery)) {
      return false;
    }

    return true;
  });

  const laneCounts = basePrograms.reduce(
    (counts, program) => {
      counts[program.lane] += 1;
      return counts;
    },
    {
      urgent: 0,
      momentum: 0,
      launch: 0,
      completed: 0
    } as Record<LearnerProgramLane, number>
  );

  const visiblePrograms =
    laneFilter === "all" ? basePrograms : basePrograms.filter((program) => program.lane === laneFilter);
  const sortedVisiblePrograms = visiblePrograms.slice().sort((left, right) => {
    const laneRank = { urgent: 0, momentum: 1, launch: 2, completed: 3 } as const;

    return (
      laneRank[left.lane] - laneRank[right.lane] ||
      right.overdueItems - left.overdueItems ||
      right.soonItems - left.soonItems ||
      left.progress - right.progress ||
      right.pendingItems - left.pendingItems
    );
  });

  const averageProgress = visiblePrograms.length
    ? Math.round(visiblePrograms.reduce((total, program) => total + program.progress, 0) / visiblePrograms.length)
    : 0;
  const openStepsCount = visiblePrograms.reduce((total, program) => total + program.pendingItems, 0);
  const focusProgram = sortedVisiblePrograms[0] ?? null;
  const activeFilterParts = [
    laneFilter !== "all"
      ? laneFilter === "urgent"
        ? "lane à sécuriser"
        : laneFilter === "momentum"
          ? "lane en cours"
          : laneFilter === "launch"
            ? "lane à lancer"
            : "lane complétée"
      : null,
    normalizedQuery ? `recherche « ${filters?.query?.trim()} »` : null
  ].filter(Boolean) as string[];

  const moduleRadar = Array.from(
    visiblePrograms
      .flatMap((program) =>
        program.modules.map((module) => ({
          programId: program.id,
          programTitle: program.title,
          programLane: program.laneLabel,
          tone: program.tone,
          ...module
        }))
      )
      .sort((left, right) => {
        return (
          right.urgentItems - left.urgentItems ||
          right.soonItems - left.soonItems ||
          right.pendingItems - left.pendingItems ||
          left.progress - right.progress
        );
      })
      .slice(0, 4)
  ).map((module) => ({
    id: module.id,
    title: module.title,
    programTitle: module.programTitle,
    tone: module.urgentItems > 0 ? ("warning" as const) : module.soonItems > 0 ? ("accent" as const) : module.progress >= 100 ? ("success" as const) : ("neutral" as const),
    summary:
      module.pendingItems > 0
        ? `${module.pendingItems} étape(s) ouvertes · ${module.nextNeed}`
        : "Module entièrement complété.",
    href: module.nextHref ?? null,
    ctaLabel: module.nextCtaLabel ?? "Voir le module"
  }));

  const recentCompletionsFeed = visiblePrograms
    .flatMap((program) =>
      program.modules.flatMap((module) =>
        module.items
          .filter((item) => item.completed)
          .map((item) => ({
            id: `${program.id}-${module.id}-${item.id}`,
            title: item.title,
            programTitle: program.title,
            moduleTitle: module.title,
            completedAtValue: item.activityAt,
            completedAt: item.activityAt ? formatDate(item.activityAt) : "Activité récente",
            tone: item.tone,
            href: item.href,
            ctaLabel: item.ctaLabel
          }))
      )
    )
    .sort((left, right) => (getDateValue(right.completedAtValue) ?? 0) - (getDateValue(left.completedAtValue) ?? 0))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.title,
      programTitle: item.programTitle,
      moduleTitle: item.moduleTitle,
      completedAt: item.completedAt,
      tone: item.tone,
      href: item.href,
      ctaLabel: item.ctaLabel
    }));

  const responsePlaybook = [
    focusProgram
      ? {
          id: "focus",
          title: focusProgram.lane === "urgent" ? "Sécuriser d’abord le parcours focus" : "Reprendre le bon parcours maintenant",
          body: focusProgram.nextNeed,
          href: focusProgram.primaryHref ?? "#programs-catalog",
          ctaLabel: focusProgram.primaryHref ? focusProgram.primaryCtaLabel : "Voir le catalogue",
          tone: focusProgram.tone
        }
      : {
          id: "focus",
          title: "Aucun parcours à reprendre",
          body: "Le cockpit apprenant se remplira dès qu’un parcours deviendra actif.",
          href: "/dashboard",
          ctaLabel: "Retour au dashboard",
          tone: "neutral" as const
        },
    {
      id: "agenda",
      title: "Croiser les parcours avec ton agenda",
      body: "Les deadlines et séances restent plus faciles à tenir quand tu relies ton parcours à la timeline ECCE.",
      href: "/agenda",
      ctaLabel: "Voir l’agenda",
      tone: "accent" as const
    },
    {
      id: "messages",
      title: "Réutiliser le bon contexte avec ton coach",
      body: "Si un blocage apparaît dans un module, la messagerie garde l’échange aligné avec la prochaine action.",
      href: "/messages",
      ctaLabel: "Ouvrir les messages",
      tone: "success" as const
    }
  ];

  return {
    context,
    filters: {
      query: filters?.query?.trim() ?? "",
      lane: laneFilter,
      summary: activeFilterParts.length ? `Vue filtrée · ${activeFilterParts.join(" · ")}` : "Vue globale de mes parcours"
    },
    metrics: [
      {
        label: "Parcours visibles",
        value: visiblePrograms.length.toString(),
        delta: `${enrollments.length} activation(s) enregistrée(s)`
      },
      {
        label: "Progression moyenne",
        value: `${averageProgress}%`,
        delta: focusProgram ? `Focus · ${focusProgram.nextFocus}` : "Aucun focus pour le moment"
      },
      {
        label: "Étapes ouvertes",
        value: openStepsCount.toString(),
        delta: `${visiblePrograms.reduce((total, program) => total + program.overdueItems + program.soonItems, 0)} à sécuriser`
      },
      {
        label: "Modules visibles",
        value: visiblePrograms.reduce((total, program) => total + program.moduleCount, 0).toString(),
        delta: `${visiblePrograms.reduce((total, program) => total + program.totalItems, 0)} ressources et quiz`
      }
    ],
    hero: {
      title: focusProgram
        ? `${focusProgram.title} concentre la prochaine étape la plus utile`
        : "Tes parcours restent prêts à t’indiquer quoi ouvrir maintenant",
      summary: focusProgram
        ? `${focusProgram.laneLabel} · ${focusProgram.completedItems}/${focusProgram.totalItems || 0} étapes complétées. ${focusProgram.nextNeed}`
        : "La progression, les modules et les prochaines actions apparaîtront ici dès qu’un programme sera activé."
    },
    laneBreakdown: [
      {
        id: "urgent" as LearnerProgramLane,
        label: "A securiser",
        count: laneCounts.urgent,
        tone: "warning" as const,
        isActive: laneFilter === "urgent"
      },
      {
        id: "momentum" as LearnerProgramLane,
        label: "En cours",
        count: laneCounts.momentum,
        tone: "accent" as const,
        isActive: laneFilter === "momentum"
      },
      {
        id: "launch" as LearnerProgramLane,
        label: "A lancer",
        count: laneCounts.launch,
        tone: "neutral" as const,
        isActive: laneFilter === "launch"
      },
      {
        id: "completed" as LearnerProgramLane,
        label: "Completes",
        count: laneCounts.completed,
        tone: "success" as const,
        isActive: laneFilter === "completed"
      }
    ],
    focusProgram,
    moduleRadar,
    recentCompletionsFeed,
    responsePlaybook,
    programWatchlist: sortedVisiblePrograms.slice(0, 5),
    programs: sortedVisiblePrograms
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
