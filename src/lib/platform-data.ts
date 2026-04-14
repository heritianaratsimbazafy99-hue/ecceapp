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
        "id, title, description, kind, status, attempts_allowed, time_limit_minutes, passing_score, content_item_id"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("learning_assignments")
      .select("id, title, due_at, assigned_user_id, cohort_id, content_item_id, quiz_id, published_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin.from("cohorts").select("id, name").eq("organization_id", organizationId).order("name"),
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
        label: "Coachs",
        value: roleCount("coach"),
        delta: `${roleCount("coachee")} coachés enregistrés`
      },
      {
        label: "Contenus publiés",
        value: contents.filter((item) => item.status === "published").length.toString(),
        delta: `${contents.length} contenus créés`
      },
      {
        label: "Quiz / Assignations",
        value: quizzes.length.toString(),
        delta: `${assignments.length} deadlines créées`
      }
    ],
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
    quizzes,
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
    contentsResult,
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
        .from("content_items")
        .select("id", { count: "exact" })
        .eq("organization_id", organizationId)
        .eq("status", "published"),
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
    upcomingSession: sessions.find((session) => session.coachee_id === profile.id)?.starts_at ?? null
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
      score: attempt.score !== null ? `${attempt.score}%` : "Non noté",
      attempt: `Tentative ${attempt.attempt_number}`,
      submittedAt: formatDate(attempt.submitted_at)
    }));

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
        label: "Sessions à venir",
        value: sessions.length.toString(),
        delta: "dans les prochains créneaux"
      },
      {
        label: "Cohortes",
        value: cohortIds.length.toString(),
        delta: "rattachées à tes coachés"
      },
      {
        label: "Deadlines actives",
        value: dueAssignments.length.toString(),
        delta: `${String(contentsResult.count ?? 0)} contenus publiés`
      }
    ],
    coachOptions,
    coacheeOptions,
    roster,
    deadlines: dueAssignments,
    recentQuizResults,
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
        .select("id, quiz_id, score, status, attempt_number, submitted_at")
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
        .select("id, awarded_at, badges(title, description, icon)")
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
        label: "Contenus disponibles",
        value: String(publishedContentResult.count ?? 0),
        delta: `${String(quizzesResult.count ?? 0)} quiz publiés`
      },
      {
        label: "Travaux assignés",
        value: assignments.length.toString(),
        delta: "directs ou via cohorte"
      },
      {
        label: "Notifications",
        value: notifications.filter((item) => !item.read_at).length.toString(),
        delta: `${notifications.length} dernières notifications`
      },
      {
        label: "Deadlines proches",
        value: assignments.filter((item) => item.due_at).length.toString(),
        delta: "à surveiller"
      }
    ],
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
      score: attempt.score !== null ? `${attempt.score}%` : "Non noté",
      meta: `Tentative ${attempt.attempt_number} · ${formatDate(attempt.submitted_at)}`
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
