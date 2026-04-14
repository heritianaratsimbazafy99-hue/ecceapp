import { requireRole, type AppRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  status: "invited" | "active" | "suspended";
  created_at?: string;
  user_roles?: Array<{ role: AppRole }>;
};

type ContentRow = {
  id: string;
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
  title: string;
  description?: string | null;
  kind?: string;
  status?: string;
  attempts_allowed?: number;
  time_limit_minutes?: number | null;
  passing_score?: number | null;
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

function formatUserName(user: ProfileRow) {
  return `${user.first_name} ${user.last_name}`.trim();
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
}) {
  const admin = createSupabaseAdminClient();

  let conversationQuery = admin
    .from("coach_conversations")
    .select("id, coach_id, coachee_id, updated_at")
    .eq("organization_id", params.organizationId)
    .order("updated_at", { ascending: false });

  conversationQuery =
    params.viewerRole === "coach"
      ? conversationQuery.eq("coach_id", params.userId)
      : conversationQuery.eq("coachee_id", params.userId);

  const conversationsResult = await conversationQuery.limit(12);
  const conversationRows = (conversationsResult.data ?? []) as ConversationRow[];
  const conversationIds = conversationRows.map((conversation) => conversation.id);

  const messageRows = conversationIds.length
    ? ((await admin
        .from("coach_messages")
        .select("id, conversation_id, sender_id, recipient_id, body, created_at, read_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(120)).data ?? []) as MessageRow[]
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
  const initialMessages = initialConversationId
    ? (
        (
          await admin
            .from("coach_messages")
            .select("id, conversation_id, sender_id, recipient_id, body, created_at, read_at")
            .eq("conversation_id", initialConversationId)
            .order("created_at", { ascending: true })
            .limit(60)
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

export async function getLibraryPageData() {
  const context = await requireRole(["admin", "professor", "coach", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const { data } = await admin
    .from("content_items")
    .select(
      "id, title, slug, summary, category, subcategory, tags, content_type, status, estimated_minutes, external_url, youtube_url, is_required, created_at"
    )
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("category", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  const contents = (data ?? []) as ContentRow[];
  const groups = Array.from(
    contents.reduce((map, item) => {
      const key = item.category?.trim() || "Sans catégorie";
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
      return map;
    }, new Map<string, ContentRow[]>())
  ).map(([category, items]) => ({
    category,
    items
  }));

  const taxonomy = Array.from(
    new Set(
      contents.flatMap((item) =>
        [item.category, item.subcategory, ...(item.tags ?? [])].filter(Boolean) as string[]
      )
    )
  );

  return {
    context,
    contents,
    groups,
    taxonomy
  };
}

export async function getCoachPageData() {
  const context = await requireRole(["admin", "coach"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

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
      admin
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .eq("role", "coachee"),
      admin
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .eq("role", "coach"),
      admin
        .from("profiles")
        .select("id, first_name, last_name, status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      admin.from("cohort_members").select("user_id, cohort_id"),
      (() => {
        let query = admin
          .from("coaching_sessions")
          .select("id, starts_at, status, coachee_id")
          .eq("organization_id", organizationId)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true });

        if (context.role === "coach") {
          query = query.eq("coach_id", context.user.id);
        }

        return query.limit(6);
      })(),
      admin
        .from("learning_assignments")
        .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id")
        .eq("organization_id", organizationId)
        .not("due_at", "is", null)
        .order("due_at", { ascending: true })
        .limit(20),
      admin
        .from("quiz_attempts")
        .select(
          "id, quiz_id, user_id, score, status, attempt_number, submitted_at, profiles:user_id(first_name, last_name)"
        )
        .order("submitted_at", { ascending: false })
        .limit(10),
      admin
        .from("submissions")
        .select("id, assignment_id, content_item_id, user_id, title, notes, storage_path, status, submitted_at, reviewed_at, created_at")
        .order("submitted_at", { ascending: false })
        .limit(10)
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

  const cohortIds = Array.from(new Set(cohortMembers.map((item) => item.cohort_id)));
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
  }>;

  const roster = profiles.slice(0, 8).map((profile) => ({
    id: profile.id,
    name: formatUserName(profile),
    status: profile.status,
    cohorts: cohortNamesByUserId.get(profile.id) ?? [],
    upcomingSession: sessions.find((session) => session.coachee_id === profile.id)?.starts_at ?? null,
    engagement: engagementSignalById.get(profile.id) ?? null
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
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      due: formatDate(assignment.due_at),
      targetCount: assignment.targetIds.length
    }));

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

  const coacheeOptions = profiles.map((profile) => ({
    id: profile.id,
    label: formatUserName(profile)
  }));

  const messagingWorkspace = context.roles.includes("coach")
    ? await getMessagingWorkspace({
        organizationId,
        userId: context.user.id,
        viewerRole: "coach",
        contactOptions: coacheeOptions
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
    coacheeOptions,
    roster,
    deadlines: dueAssignments,
    recentQuizResults,
    textReviewQueue,
    reviewQueue,
    messagingWorkspace,
    sessions: roster
      .filter((item) => item.upcomingSession)
      .slice(0, 6)
      .map((item) => ({
        name: item.name,
        date: formatDate(item.upcomingSession)
      }))
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
      ? admin.from("quizzes").select("id, title").in("id", quizIds)
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
        const coachRoleRows = (
          await admin
            .from("user_roles")
            .select("user_id")
            .eq("organization_id", organizationId)
            .eq("role", "coach")
        ).data ?? [];

        const coachIds = Array.from(new Set(coachRoleRows.map((item) => item.user_id)));

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
        contactOptions: coachContacts
      })
    : null;

  return {
    context,
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
    assignments: assignments.slice(0, 6).map((item) => ({
      id: item.id,
      title:
        contentById.get(item.content_item_id ?? "")?.title ??
        quizById.get(item.quiz_id ?? "")?.title ??
        item.title,
      due: formatDate(item.due_at),
      type: item.content_item_id ? "contenu" : "quiz",
      targetId: item.content_item_id ? item.id : item.quiz_id ?? null,
      status: item.content_item_id
        ? submissionByAssignmentId.get(item.id)?.status ?? "a_rendre"
        : attemptByQuizId.has(item.quiz_id ?? "") ? "termine" : "a_faire"
    })),
    notifications,
    upcomingSessions,
    badges,
    messagingWorkspace,
    recentContents: publishedContents,
    recentAttempts: attempts.map((attempt) => ({
      id: attempt.id,
      title: quizById.get(attempt.quiz_id)?.title ?? "Quiz",
      score: attempt.status === "submitted" ? "En correction" : attempt.score !== null ? `${attempt.score}%` : "Non noté",
      meta: `Tentative ${attempt.attempt_number} · ${formatDate(attempt.submitted_at)}${attempt.status === "submitted" ? " · correction coach en cours" : ""}`
    }))
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
          .select("id, title, content_type, external_url, youtube_url")
          .eq("id", assignment.content_item_id)
          .maybeSingle<{
            id: string;
            title: string;
            content_type: string;
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

  return {
    context,
    assignment: {
      id: assignment.id,
      title: assignment.title,
      due: formatDate(assignment.due_at),
      quizId: assignment.quiz_id,
      contentTitle: contentResult.data?.title ?? "Contenu ECCE",
      contentMeta: contentResult.data?.content_type ?? "ressource",
      resourceUrl: contentResult.data?.youtube_url ?? contentResult.data?.external_url ?? null
    },
    submissions: await Promise.all(
      submissions.map(async (submission) => ({
        id: submission.id,
        title: submission.title,
        notes: submission.notes,
        status: submission.status,
        submittedAt: formatDate(submission.submitted_at),
        fileUrl: await getSignedSubmissionUrl(submission.storage_path, admin),
        review: latestReviewBySubmissionId.get(submission.id) ?? null
      }))
    )
  };
}

export async function getQuizPageData(quizId: string) {
  const context = await requireRole(["admin", "coachee"]);
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

  const { data: attempts } = await admin
    .from("quiz_attempts")
    .select("id, quiz_id, user_id, score, status, attempt_number, submitted_at")
    .eq("quiz_id", quizId)
    .eq("user_id", context.user.id)
    .order("attempt_number", { ascending: false });

  return {
    context,
    quiz: {
      ...quiz,
      quiz_questions: [...(quiz.quiz_questions ?? [])].sort((left, right) => left.position - right.position)
    },
    attempts: (attempts ?? []) as QuizAttemptResultRow[]
  };
}
