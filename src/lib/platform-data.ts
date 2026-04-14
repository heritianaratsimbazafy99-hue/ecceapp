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
};

type AssignmentRow = {
  id: string;
  title: string;
  due_at: string | null;
  content_item_id: string | null;
  quiz_id: string | null;
};

type QuizRow = {
  id: string;
  title: string;
};

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

export async function getAdminPageData() {
  const context = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const [profilesResult, contentsResult, authUsersResult] = await Promise.all([
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
    admin.auth.admin.listUsers({
      page: 1,
      perPage: 200
    })
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const contents = (contentsResult.data ?? []) as ContentRow[];
  const authUsers = authUsersResult.data?.users ?? [];
  const emailByUserId = new Map(
    authUsers.map((item) => [item.id, item.email ?? "email indisponible"])
  );

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
        label: "Brouillons",
        value: contents.filter((item) => item.status === "draft").length.toString(),
        delta: "Prêts à être relus ou publiés"
      }
    ],
    users,
    userOptions: users.map((user) => ({
      id: user.id,
      label: `${user.name} · ${user.email}`
    })),
    contents,
    contentOptions: contents.slice(0, 8)
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

  const [rolesResult, profilesResult, cohortsResult, sessionsResult, contentsResult] =
    await Promise.all([
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
        .eq("status", "published")
    ]);

  const coacheeIds = new Set((rolesResult.data ?? []).map((item) => item.user_id));
  const profiles = ((profilesResult.data ?? []) as ProfileRow[]).filter((item) =>
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
        label: "Contenus publiés",
        value: String(contentsResult.count ?? 0),
        delta: "disponibles dans la bibliothèque"
      }
    ],
    roster,
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

  const [cohortMembersResult, notificationsResult, publishedContentResult, quizzesResult] =
    await Promise.all([
      admin.from("cohort_members").select("cohort_id").eq("user_id", userId),
      admin
        .from("notifications")
        .select("id, title, body, created_at, read_at")
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
        .eq("status", "published")
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
  const quizIds = Array.from(new Set(assignments.map((item) => item.quiz_id).filter(Boolean))) as string[];

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
      type: item.content_item_id ? "contenu" : "quiz"
    })),
    notifications,
    recentContents: publishedContents
  };
}
