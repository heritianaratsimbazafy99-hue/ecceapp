"use server";

import { revalidatePath } from "next/cache";

import { requireRole, type AppRole } from "@/lib/auth";
import { createNotifications, getAssignmentRecipientIds } from "@/lib/platform-events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

export type AdminActionState = {
  error?: string;
  success?: string;
};

const VALID_ROLES: AppRole[] = ["admin", "professor", "coach", "coachee"];
const VALID_CONTENT_TYPES = [
  "document",
  "video",
  "youtube",
  "audio",
  "link",
  "replay",
  "template"
] as const;
const VALID_PUBLICATION_STATUS = ["draft", "scheduled", "published", "archived"] as const;
const VALID_QUIZ_KIND = ["qcm", "quiz", "assessment"] as const;
const VALID_QUESTION_TYPES = ["single_choice", "text"] as const;

function ok(success: string): AdminActionState {
  return { success };
}

function fail(error: string): AdminActionState {
  return { error };
}

export async function createUserAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as AppRole;

  if (!firstName || !lastName || !email || !password || !VALID_ROLES.includes(role)) {
    return fail("Tous les champs utilisateur sont obligatoires.");
  }

  const createdUser = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName
    }
  });

  if (createdUser.error || !createdUser.data.user) {
    return fail(createdUser.error?.message ?? "Impossible de créer l'utilisateur.");
  }

  const newUserId = createdUser.data.user.id;

  const profileInsert = await admin.from("profiles").insert({
    id: newUserId,
    organization_id: organizationId,
    first_name: firstName,
    last_name: lastName,
    status: "active"
  });

  if (profileInsert.error) {
    return fail(profileInsert.error.message);
  }

  const roleInsert = await admin.from("user_roles").upsert(
    {
      organization_id: organizationId,
      user_id: newUserId,
      role
    },
    {
      onConflict: "organization_id,user_id,role",
      ignoreDuplicates: true
    }
  );

  if (roleInsert.error) {
    return fail(roleInsert.error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/coach");

  return ok(`Utilisateur créé avec le rôle ${role}.`);
}

export async function assignRoleAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const userId = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as AppRole;

  if (!userId || !VALID_ROLES.includes(role)) {
    return fail("Sélectionne un utilisateur et un rôle valides.");
  }

  const { error } = await admin.from("user_roles").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      role
    },
    {
      onConflict: "organization_id,user_id,role",
      ignoreDuplicates: true
    }
  );

  if (error) {
    return fail(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/coach");
  revalidatePath("/dashboard");

  return ok(`Rôle ${role} attribué.`);
}

export async function createContentAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const subcategory = String(formData.get("subcategory") ?? "").trim();
  const contentType = String(formData.get("content_type") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const tagsInput = String(formData.get("tags") ?? "").trim();
  const externalUrl = String(formData.get("external_url") ?? "").trim();
  const youtubeUrl = String(formData.get("youtube_url") ?? "").trim();
  const estimatedMinutes = Number(String(formData.get("estimated_minutes") ?? "").trim() || 0);
  const isRequired = String(formData.get("is_required") ?? "") === "on";

  if (!title || !VALID_CONTENT_TYPES.includes(contentType as (typeof VALID_CONTENT_TYPES)[number])) {
    return fail("Le titre et le type de contenu sont obligatoires.");
  }

  if (!VALID_PUBLICATION_STATUS.includes(status as (typeof VALID_PUBLICATION_STATUS)[number])) {
    return fail("Le statut de publication n'est pas valide.");
  }

  const slug = slugify(title);
  const tags = tagsInput
    ? tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  const { error } = await admin.from("content_items").insert({
    organization_id: organizationId,
    title,
    slug,
    summary: summary || null,
    category: category || null,
    subcategory: subcategory || null,
    tags,
    content_type: contentType,
    status,
    external_url: externalUrl || null,
    youtube_url: youtubeUrl || null,
    is_required: isRequired,
    estimated_minutes: estimatedMinutes > 0 ? estimatedMinutes : null,
    created_by: context.user.id
  });

  if (error) {
    return fail(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/library");
  revalidatePath("/dashboard");

  return ok(`Contenu "${title}" créé.`);
}

export async function createQuizAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const attemptsAllowed = Number(String(formData.get("attempts_allowed") ?? "").trim() || 1);
  const timeLimitMinutes = Number(String(formData.get("time_limit_minutes") ?? "").trim() || 0);
  const passingScore = Number(String(formData.get("passing_score") ?? "").trim() || 0);
  const contentItemId = String(formData.get("content_item_id") ?? "").trim();

  const questionPrompt = String(formData.get("question_prompt") ?? "").trim();
  const helperText = String(formData.get("helper_text") ?? "").trim();
  const firstQuestionType = String(formData.get("first_question_type") ?? "").trim();
  const choicesText = String(formData.get("choices_text") ?? "").trim();
  const correctChoiceIndex = Number(String(formData.get("correct_choice_index") ?? "").trim() || 0);
  const points = Number(String(formData.get("points") ?? "").trim() || 1);

  if (!title || !VALID_QUIZ_KIND.includes(kind as (typeof VALID_QUIZ_KIND)[number])) {
    return fail("Le titre et le type de quiz sont obligatoires.");
  }

  if (!VALID_PUBLICATION_STATUS.includes(status as (typeof VALID_PUBLICATION_STATUS)[number])) {
    return fail("Le statut du quiz n'est pas valide.");
  }

  const quizInsert = await admin
    .from("quizzes")
    .insert({
      organization_id: organizationId,
      title,
      description: description || null,
      kind,
      status,
      attempts_allowed: attemptsAllowed > 0 ? attemptsAllowed : 1,
      time_limit_minutes: timeLimitMinutes > 0 ? timeLimitMinutes : null,
      passing_score: passingScore > 0 ? passingScore : null,
      content_item_id: contentItemId || null,
      created_by: context.user.id
    })
    .select("id")
    .single<{ id: string }>();

  if (quizInsert.error || !quizInsert.data) {
    return fail(quizInsert.error?.message ?? "Impossible de créer le quiz.");
  }

  if (questionPrompt) {
    const choices = choicesText
      .split("\n")
      .map((choice) => choice.trim())
      .filter(Boolean);
    const questionType =
      VALID_QUESTION_TYPES.includes(firstQuestionType as (typeof VALID_QUESTION_TYPES)[number])
        ? firstQuestionType
        : choices.length
          ? "single_choice"
          : "text";

    if (questionType === "single_choice" && choices.length < 2) {
      return fail("Une question à choix unique doit contenir au moins deux réponses.");
    }

    const questionInsert = await admin
      .from("quiz_questions")
      .insert({
        quiz_id: quizInsert.data.id,
        prompt: questionPrompt,
        helper_text: helperText || null,
        question_type: questionType,
        position: 0,
        points: points > 0 ? points : 1
      })
      .select("id")
      .single<{ id: string }>();

    if (questionInsert.error || !questionInsert.data) {
      return fail(questionInsert.error?.message ?? "Le quiz a été créé, mais pas la première question.");
    }

    if (questionType === "single_choice" && choices.length) {
      const choicesInsert = await admin.from("quiz_question_choices").insert(
        choices.map((choice, index) => ({
          question_id: questionInsert.data.id,
          label: choice,
          is_correct: correctChoiceIndex > 0 ? index + 1 === correctChoiceIndex : index === 0,
          position: index
        }))
      );

      if (choicesInsert.error) {
        return fail(
          choicesInsert.error.message || "Le quiz a été créé, mais les choix de réponse ont échoué."
        );
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");

  return ok(`Quiz "${title}" créé.`);
}

export async function addQuizQuestionAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const quizId = String(formData.get("quiz_id") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const helperText = String(formData.get("helper_text") ?? "").trim();
  const questionType = String(formData.get("question_type") ?? "").trim();
  const choicesText = String(formData.get("choices_text") ?? "").trim();
  const correctChoiceIndex = Number(String(formData.get("correct_choice_index") ?? "").trim() || 0);
  const points = Number(String(formData.get("points") ?? "").trim() || 1);
  const positionInput = String(formData.get("position") ?? "").trim();

  if (!quizId || !prompt) {
    return fail("Le quiz et l'intitulé de la question sont obligatoires.");
  }

  if (!VALID_QUESTION_TYPES.includes(questionType as (typeof VALID_QUESTION_TYPES)[number])) {
    return fail("Le type de question n'est pas valide.");
  }

  const quizResult = await admin
    .from("quizzes")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", quizId)
    .maybeSingle<{ id: string }>();

  if (quizResult.error || !quizResult.data) {
    return fail("Quiz introuvable.");
  }

  const choices = choicesText
    .split("\n")
    .map((choice) => choice.trim())
    .filter(Boolean);

  if (questionType === "single_choice" && choices.length < 2) {
    return fail("Une question à choix unique doit contenir au moins deux réponses.");
  }

  const lastQuestionResult = await admin
    .from("quiz_questions")
    .select("position")
    .eq("quiz_id", quizId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const nextPosition = positionInput
    ? Math.max(0, Number(positionInput))
    : (lastQuestionResult.data?.position ?? -1) + 1;

  const questionInsert = await admin
    .from("quiz_questions")
    .insert({
      quiz_id: quizId,
      prompt,
      helper_text: helperText || null,
      question_type: questionType,
      position: Number.isFinite(nextPosition) ? nextPosition : 0,
      points: points > 0 ? points : 1
    })
    .select("id")
    .single<{ id: string }>();

  if (questionInsert.error || !questionInsert.data) {
    return fail(questionInsert.error?.message ?? "Impossible d'ajouter la question.");
  }

  if (questionType === "single_choice") {
    const choicesInsert = await admin.from("quiz_question_choices").insert(
      choices.map((choice, index) => ({
        question_id: questionInsert.data.id,
        label: choice,
        is_correct: correctChoiceIndex > 0 ? index + 1 === correctChoiceIndex : index === 0,
        position: index
      }))
    );

    if (choicesInsert.error) {
      return fail(choicesInsert.error.message || "Question créée, mais les choix n'ont pas été enregistrés.");
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/quiz/${quizId}`);

  return ok("Question ajoutée au quiz.");
}

export async function deleteQuizQuestionAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const questionId = String(formData.get("question_id") ?? "").trim();
  const quizId = String(formData.get("quiz_id") ?? "").trim();

  if (!questionId || !quizId) {
    return fail("Question introuvable.");
  }

  const questionResult = await admin
    .from("quiz_questions")
    .select("id, quiz_id, quizzes!inner(id, organization_id)")
    .eq("id", questionId)
    .eq("quiz_id", quizId)
    .eq("quizzes.organization_id", organizationId)
    .maybeSingle<{ id: string; quiz_id: string }>();

  if (questionResult.error || !questionResult.data) {
    return fail("Question introuvable dans ce quiz.");
  }

  const answersResult = await admin
    .from("quiz_attempt_answers")
    .select("attempt_id")
    .eq("question_id", questionId)
    .limit(1);

  if ((answersResult.data?.length ?? 0) > 0) {
    return fail("Cette question a déjà été utilisée dans une tentative et ne peut plus être supprimée.");
  }

  const { error } = await admin.from("quiz_questions").delete().eq("id", questionId);

  if (error) {
    return fail(error.message);
  }

  revalidatePath("/admin");
  revalidatePath(`/quiz/${quizId}`);

  return ok("Question supprimée.");
}

export async function createAssignmentAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const assignedUserId = String(formData.get("assigned_user_id") ?? "").trim();
  const cohortId = String(formData.get("cohort_id") ?? "").trim();
  const contentItemId = String(formData.get("content_item_id") ?? "").trim();
  const quizId = String(formData.get("quiz_id") ?? "").trim();
  const dueAtInput = String(formData.get("due_at") ?? "").trim();

  if (!title) {
    return fail("Le titre de l'assignation est obligatoire.");
  }

  if (!assignedUserId && !cohortId) {
    return fail("Choisis au moins un utilisateur ou une cohorte.");
  }

  if (!contentItemId && !quizId) {
    return fail("Sélectionne un contenu ou un quiz à assigner.");
  }

  const dueAt = dueAtInput ? new Date(dueAtInput).toISOString() : null;

  const assignmentInsert = await admin
    .from("learning_assignments")
    .insert({
    organization_id: organizationId,
    title,
    assigned_user_id: assignedUserId || null,
    cohort_id: cohortId || null,
    content_item_id: contentItemId || null,
    quiz_id: quizId || null,
    due_at: dueAt,
    published_at: new Date().toISOString(),
    created_by: context.user.id
    })
    .select("id")
    .single<{ id: string }>();

  if (assignmentInsert.error || !assignmentInsert.data) {
    return fail(assignmentInsert.error?.message ?? "Impossible de créer l'assignation.");
  }

  const recipientIds = await getAssignmentRecipientIds(organizationId, {
    assigned_user_id: assignedUserId || null,
    cohort_id: cohortId || null
  });

  await createNotifications(
    recipientIds.map((recipientId) => ({
      organizationId,
      recipientId,
      actorId: context.user.id,
      title: "Nouvelle assignation ECCE",
      body: dueAt
        ? `${title} a été programmé avec une échéance au ${new Date(dueAt).toLocaleString("fr-FR")}.`
        : `${title} a été ajouté à ton parcours.`,
      deeplink: quizId ? `/quiz/${quizId}?assignment=${assignmentInsert.data.id}` : `/assignments/${assignmentInsert.data.id}`
    }))
  );

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/coach");

  return ok(`Assignation "${title}" créée.`);
}
