"use server";

import { revalidatePath } from "next/cache";

import { requireRole, type AppRole } from "@/lib/auth";
import { getOrganizationBrandingById } from "@/lib/organization";
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

type ProgramModuleDraftPayload = {
  title: string;
  description?: string | null;
  status?: string;
};

type QuizDraftPayloadQuestion = {
  prompt: string;
  helper_text?: string | null;
  question_type: string;
  points?: number;
  position?: number;
  choices?: Array<{
    label: string;
    is_correct?: boolean;
  }>;
};

type NormalizedQuizDraftQuestion = {
  prompt: string;
  helper_text: string | null;
  question_type: (typeof VALID_QUESTION_TYPES)[number];
  points: number;
  position: number;
  choices: Array<{
    label: string;
    is_correct: boolean;
    position: number;
  }>;
};

function ok(success: string): AdminActionState {
  return { success };
}

function fail(error: string): AdminActionState {
  return { error };
}

async function ensureProgramBelongsToOrganization(
  programId: string,
  organizationId: string
) {
  const admin = createSupabaseAdminClient();

  const programResult = await admin
    .from("programs")
    .select("id, title")
    .eq("organization_id", organizationId)
    .eq("id", programId)
    .maybeSingle<{ id: string; title: string }>();

  if (programResult.error || !programResult.data) {
    return null;
  }

  return programResult.data;
}

async function ensureProgramModuleBelongsToOrganization(
  moduleId: string,
  organizationId: string
) {
  const admin = createSupabaseAdminClient();

  const moduleResult = await admin
    .from("program_modules")
    .select("id, title, program_id, programs!inner(organization_id)")
    .eq("id", moduleId)
    .eq("programs.organization_id", organizationId)
    .maybeSingle<{ id: string; title: string; program_id: string }>();

  if (moduleResult.error || !moduleResult.data) {
    return null;
  }

  return moduleResult.data;
}

function normalizeDraftQuestion(
  question: QuizDraftPayloadQuestion,
  index: number
): { question?: NormalizedQuizDraftQuestion; error?: string } {
  const prompt = String(question.prompt ?? "").trim();
  const helperText = String(question.helper_text ?? "").trim();
  const questionType = String(question.question_type ?? "").trim();
  const points = Math.max(1, Number(question.points) || 1);

  if (!prompt) {
    return { error: `La question ${index + 1} est vide.` };
  }

  if (!VALID_QUESTION_TYPES.includes(questionType as (typeof VALID_QUESTION_TYPES)[number])) {
    return { error: `Le type de la question ${index + 1} n'est pas valide.` };
  }

  if (questionType === "single_choice") {
    const choices = (question.choices ?? [])
      .map((choice, choiceIndex) => ({
        label: String(choice.label ?? "").trim(),
        is_correct: Boolean(choice.is_correct),
        position: choiceIndex
      }))
      .filter((choice) => choice.label);

    if (choices.length < 2) {
      return { error: `La question ${index + 1} doit contenir au moins deux réponses.` };
    }

    const hasCorrectChoice = choices.some((choice) => choice.is_correct);
    const normalizedChoices = choices.map((choice, choiceIndex) => ({
      ...choice,
      is_correct: hasCorrectChoice ? choice.is_correct : choiceIndex === 0
    }));

    return {
      question: {
        prompt,
        helper_text: helperText || null,
        question_type: "single_choice",
        points,
        position: Number.isFinite(Number(question.position)) ? Math.max(0, Number(question.position)) : index,
        choices: normalizedChoices
      }
    };
  }

  return {
    question: {
      prompt,
      helper_text: helperText || null,
      question_type: "text",
      points,
      position: Number.isFinite(Number(question.position)) ? Math.max(0, Number(question.position)) : index,
      choices: []
    }
  };
}

export async function createUserAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();
  const branding = await getOrganizationBrandingById(organizationId);

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
    timezone: branding.defaultTimezone,
    status: "invited"
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
  revalidatePath("/admin/learners");

  return ok(`Utilisateur créé avec le rôle ${role}. Il passera par l'onboarding ECCE à la première connexion.`);
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
  revalidatePath("/admin/learners");

  return ok(`Rôle ${role} attribué.`);
}

export async function assignCoacheeToCohortAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const coacheeId = String(formData.get("coachee_id") ?? "").trim();
  const cohortId = String(formData.get("cohort_id") ?? "").trim();

  if (!coacheeId || !cohortId) {
    return fail("Sélectionne un coaché et une cohorte.");
  }

  const [coacheeRoleResult, cohortResult, profileResult] = await Promise.all([
    admin
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", coacheeId)
      .eq("role", "coachee")
      .maybeSingle<{ user_id: string }>(),
    admin
      .from("cohorts")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("id", cohortId)
      .maybeSingle<{ id: string; name: string }>(),
    admin
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
      .eq("id", coacheeId)
      .maybeSingle<{ id: string; first_name: string; last_name: string }>()
  ]);

  if (coacheeRoleResult.error || !coacheeRoleResult.data) {
    return fail("Ce profil n'a pas le rôle coaché.");
  }

  if (cohortResult.error || !cohortResult.data) {
    return fail("Cohorte introuvable.");
  }

  if (profileResult.error || !profileResult.data) {
    return fail("Coaché introuvable.");
  }

  const { error } = await admin.from("cohort_members").upsert(
    {
      cohort_id: cohortId,
      user_id: coacheeId
    },
    {
      onConflict: "cohort_id,user_id",
      ignoreDuplicates: true
    }
  );

  if (error) {
    return fail(error.message);
  }

  await createNotifications([
    {
      organizationId,
      recipientId: coacheeId,
      actorId: context.user.id,
      kind: "learning" as const,
      title: "Nouvelle cohorte ECCE",
      body: `Tu as été ajouté(e) à la cohorte ${cohortResult.data.name}.`,
      deeplink: "/dashboard"
    }
  ]);

  revalidatePath("/admin");
  revalidatePath("/coach");
  revalidatePath("/dashboard");
  revalidatePath("/admin/learners");

  return ok(
    `${profileResult.data.first_name} ${profileResult.data.last_name} a été ajouté(e) à la cohorte ${cohortResult.data.name}.`
  );
}

export async function assignCoachAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const coachId = String(formData.get("coach_id") ?? "").trim();
  const coacheeId = String(formData.get("coachee_id") ?? "").trim();
  const cohortId = String(formData.get("cohort_id") ?? "").trim();

  if (!coachId) {
    return fail("Sélectionne un coach.");
  }

  if ((!coacheeId && !cohortId) || (coacheeId && cohortId)) {
    return fail("Choisis soit un coaché précis, soit une cohorte.");
  }

  const [coachRoleResult, coachProfileResult] = await Promise.all([
    admin
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", coachId)
      .eq("role", "coach")
      .maybeSingle<{ user_id: string }>(),
    admin
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
      .eq("id", coachId)
      .maybeSingle<{ id: string; first_name: string; last_name: string }>()
  ]);

  if (coachRoleResult.error || !coachRoleResult.data || coachProfileResult.error || !coachProfileResult.data) {
    return fail("Coach introuvable.");
  }

  const coachProfile = coachProfileResult.data;
  let successLabel = `${coachProfile.first_name} ${coachProfile.last_name}`;
  let notificationTargets: string[] = [];

  if (coacheeId) {
    const coacheeRoleResult = await admin
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", coacheeId)
      .eq("role", "coachee")
      .maybeSingle<{ user_id: string }>();

    if (coacheeRoleResult.error || !coacheeRoleResult.data) {
      return fail("Coaché introuvable.");
    }

    const { error } = await admin.from("coach_assignments").insert({
      organization_id: organizationId,
      coach_id: coachId,
      coachee_id: coacheeId,
      created_by: context.user.id
    });

    if (error) {
      return fail(error.message);
    }

    notificationTargets = [coacheeId];
    successLabel += " suit maintenant ce coaché.";
  }

  if (cohortId) {
    const cohortResult = await admin
      .from("cohorts")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("id", cohortId)
      .maybeSingle<{ id: string; name: string }>();

    if (cohortResult.error || !cohortResult.data) {
      return fail("Cohorte introuvable.");
    }

    const { error } = await admin.from("coach_assignments").insert({
      organization_id: organizationId,
      coach_id: coachId,
      cohort_id: cohortId,
      created_by: context.user.id
    });

    if (error) {
      return fail(error.message);
    }

    const cohortMembersResult = await admin
      .from("cohort_members")
      .select("user_id")
      .eq("cohort_id", cohortId);

    notificationTargets = Array.from(
      new Set((cohortMembersResult.data ?? []).map((item) => item.user_id))
    );
    successLabel += ` suit maintenant la cohorte ${cohortResult.data.name}.`;
  }

  if (notificationTargets.length) {
    await createNotifications(
      notificationTargets.map((recipientId) => ({
        organizationId,
        recipientId,
        actorId: context.user.id,
        kind: "learning" as const,
        title: "Nouveau coach référent",
        body: `${coachProfile.first_name} ${coachProfile.last_name} suit désormais ton parcours.`,
        deeplink: "/dashboard"
      }))
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/learners");
  revalidatePath("/coach");
  revalidatePath("/dashboard");

  return ok(successLabel);
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
  const moduleId = String(formData.get("module_id") ?? "").trim();
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

  if (moduleId) {
    const moduleResult = await ensureProgramModuleBelongsToOrganization(moduleId, organizationId);

    if (!moduleResult) {
      return fail("Le module de parcours sélectionné est introuvable.");
    }
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
    module_id: moduleId || null,
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
  revalidatePath("/admin/content");
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
  const moduleId = String(formData.get("module_id") ?? "").trim();
  const randomizeQuestions = String(formData.get("randomize_questions") ?? "").trim() === "true";
  const questionsPayload = String(formData.get("questions_payload") ?? "").trim();

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

  if (moduleId) {
    const moduleResult = await ensureProgramModuleBelongsToOrganization(moduleId, organizationId);

    if (!moduleResult) {
      return fail("Le module de parcours sélectionné est introuvable.");
    }
  }

  let normalizedQuestions: NormalizedQuizDraftQuestion[] = [];

  if (questionsPayload) {
    try {
      const parsedQuestions = JSON.parse(questionsPayload) as QuizDraftPayloadQuestion[];

      if (!Array.isArray(parsedQuestions)) {
        return fail("Le storyboard du quiz est invalide.");
      }

      for (const [index, question] of parsedQuestions.entries()) {
        const normalized = normalizeDraftQuestion(question, index);

        if (normalized.error || !normalized.question) {
          return fail(normalized.error ?? "Impossible de normaliser une question du quiz.");
        }

        normalizedQuestions.push(normalized.question);
      }
    } catch {
      return fail("Le storyboard du quiz n'a pas pu être décodé.");
    }
  } else if (questionPrompt) {
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

    const normalized = normalizeDraftQuestion(
      {
        prompt: questionPrompt,
        helper_text: helperText || null,
        question_type: questionType,
        points,
        position: 0,
        choices:
          questionType === "single_choice"
            ? choices.map((choice, index) => ({
                label: choice,
                is_correct: correctChoiceIndex > 0 ? index + 1 === correctChoiceIndex : index === 0
              }))
            : []
      },
      0
    );

    if (normalized.error || !normalized.question) {
      return fail(normalized.error ?? "Impossible de créer la première question.");
    }

    normalizedQuestions = [normalized.question];
  }

  const quizInsert = await admin
    .from("quizzes")
    .insert({
      organization_id: organizationId,
      module_id: moduleId || null,
      title,
      description: description || null,
      kind,
      status,
      attempts_allowed: attemptsAllowed > 0 ? attemptsAllowed : 1,
      time_limit_minutes: timeLimitMinutes > 0 ? timeLimitMinutes : null,
      passing_score: passingScore > 0 ? passingScore : null,
      randomize_questions: randomizeQuestions,
      content_item_id: contentItemId || null,
      created_by: context.user.id
    })
    .select("id")
    .single<{ id: string }>();

  if (quizInsert.error || !quizInsert.data) {
    return fail(quizInsert.error?.message ?? "Impossible de créer le quiz.");
  }

  for (const question of normalizedQuestions) {
    const questionInsert = await admin
      .from("quiz_questions")
      .insert({
        quiz_id: quizInsert.data.id,
        prompt: question.prompt,
        helper_text: question.helper_text,
        question_type: question.question_type,
        position: question.position,
        points: question.points
      })
      .select("id")
      .single<{ id: string }>();

    if (questionInsert.error || !questionInsert.data) {
      return fail(questionInsert.error?.message ?? "Le quiz a été créé, mais une question n'a pas pu être enregistrée.");
    }

    if (question.question_type === "single_choice" && question.choices.length) {
      const choicesInsert = await admin.from("quiz_question_choices").insert(
        question.choices.map((choice) => ({
          question_id: questionInsert.data.id,
          label: choice.label,
          is_correct: choice.is_correct,
          position: choice.position
        }))
      );

      if (choicesInsert.error) {
        return fail(
          choicesInsert.error.message || "Le quiz a été créé, mais les choix de réponse n'ont pas pu être enregistrés."
        );
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/quizzes");
  revalidatePath("/library");
  revalidatePath("/dashboard");

  return ok(
    normalizedQuestions.length
      ? `Quiz "${title}" créé avec ${normalizedQuestions.length} question(s).`
      : `Quiz "${title}" créé.`
  );
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
  revalidatePath("/admin/quizzes");
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
  revalidatePath("/admin/quizzes");
  revalidatePath(`/quiz/${quizId}`);

  return ok("Question supprimée.");
}

export async function createProgramAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const modulesPayload = String(formData.get("modules_payload") ?? "").trim();

  if (!title) {
    return fail("Le titre du parcours est obligatoire.");
  }

  if (!VALID_PUBLICATION_STATUS.includes(status as (typeof VALID_PUBLICATION_STATUS)[number])) {
    return fail("Le statut du parcours n'est pas valide.");
  }

  let normalizedModules: Array<{
    title: string;
    description: string | null;
    status: (typeof VALID_PUBLICATION_STATUS)[number];
    position: number;
  }> = [];

  if (modulesPayload) {
    try {
      const parsedModules = JSON.parse(modulesPayload) as ProgramModuleDraftPayload[];

      if (!Array.isArray(parsedModules)) {
        return fail("La structure des modules du parcours est invalide.");
      }

      normalizedModules = parsedModules
        .map((module, index) => ({
          title: String(module.title ?? "").trim(),
          description: String(module.description ?? "").trim() || null,
          status:
            VALID_PUBLICATION_STATUS.includes(
              String(module.status ?? "").trim() as (typeof VALID_PUBLICATION_STATUS)[number]
            )
              ? (String(module.status ?? "").trim() as (typeof VALID_PUBLICATION_STATUS)[number])
              : "published",
          position: index
        }))
        .filter((module) => module.title);
    } catch {
      return fail("Le storyboard du parcours n'a pas pu être décodé.");
    }
  }

  if (!normalizedModules.length) {
    return fail("Ajoute au moins un module prêt à structurer le parcours.");
  }

  const programInsert = await admin
    .from("programs")
    .insert({
      organization_id: organizationId,
      title,
      slug: slugify(title),
      description: description || null,
      status,
      created_by: context.user.id
    })
    .select("id")
    .single<{ id: string }>();

  if (programInsert.error || !programInsert.data) {
    return fail(programInsert.error?.message ?? "Impossible de créer le parcours.");
  }

  const moduleInsert = await admin.from("program_modules").insert(
    normalizedModules.map((module) => ({
      program_id: programInsert.data.id,
      title: module.title,
      description: module.description,
      position: module.position,
      status: module.status
    }))
  );

  if (moduleInsert.error) {
    return fail(moduleInsert.error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  revalidatePath("/admin/content");
  revalidatePath("/admin/quizzes");
  revalidatePath("/programs");

  return ok(`Parcours "${title}" créé avec ${normalizedModules.length} module(s).`);
}

export async function addProgramModuleAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const programId = String(formData.get("program_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!programId || !title) {
    return fail("Le parcours et le titre du module sont obligatoires.");
  }

  if (!VALID_PUBLICATION_STATUS.includes(status as (typeof VALID_PUBLICATION_STATUS)[number])) {
    return fail("Le statut du module n'est pas valide.");
  }

  const programResult = await ensureProgramBelongsToOrganization(programId, organizationId);

  if (!programResult) {
    return fail("Parcours introuvable.");
  }

  const lastModuleResult = await admin
    .from("program_modules")
    .select("position")
    .eq("program_id", programId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const nextPosition = (lastModuleResult.data?.position ?? -1) + 1;

  const moduleInsert = await admin.from("program_modules").insert({
    program_id: programId,
    title,
    description: description || null,
    position: nextPosition,
    status
  });

  if (moduleInsert.error) {
    return fail(moduleInsert.error.message);
  }

  revalidatePath("/admin/programs");
  revalidatePath("/admin/content");
  revalidatePath("/admin/quizzes");
  revalidatePath("/programs");

  return ok(`Module "${title}" ajouté au parcours ${programResult.title}.`);
}

export async function enrollProgramAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const programId = String(formData.get("program_id") ?? "").trim();
  const assignedUserId = String(formData.get("assigned_user_id") ?? "").trim();
  const cohortId = String(formData.get("cohort_id") ?? "").trim();

  if (!programId) {
    return fail("Sélectionne un parcours.");
  }

  if ((!assignedUserId && !cohortId) || (assignedUserId && cohortId)) {
    return fail("Choisis soit un coaché, soit une cohorte.");
  }

  const programResult = await ensureProgramBelongsToOrganization(programId, organizationId);

  if (!programResult) {
    return fail("Parcours introuvable.");
  }

  const recipientIds = new Set<string>();

  if (assignedUserId) {
    const coacheeRoleResult = await admin
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", assignedUserId)
      .eq("role", "coachee")
      .maybeSingle<{ user_id: string }>();

    if (coacheeRoleResult.error || !coacheeRoleResult.data) {
      return fail("Le coaché sélectionné est introuvable.");
    }

    recipientIds.add(assignedUserId);
  }

  if (cohortId) {
    const cohortResult = await admin
      .from("cohorts")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("id", cohortId)
      .maybeSingle<{ id: string; name: string }>();

    if (cohortResult.error || !cohortResult.data) {
      return fail("La cohorte sélectionnée est introuvable.");
    }

    const cohortMembersResult = await admin
      .from("cohort_members")
      .select("user_id")
      .eq("cohort_id", cohortId);

    for (const member of cohortMembersResult.data ?? []) {
      recipientIds.add(member.user_id);
    }

    if (!recipientIds.size) {
      return fail("Cette cohorte ne contient encore aucun coaché.");
    }
  }

  const rows = Array.from(recipientIds).map((userId) => ({
    program_id: programId,
    user_id: userId,
    cohort_id: cohortId || null
  }));

  const enrollmentInsert = await admin.from("program_enrollments").upsert(rows, {
    onConflict: "program_id,user_id",
    ignoreDuplicates: false
  });

  if (enrollmentInsert.error) {
    return fail(enrollmentInsert.error.message);
  }

  await createNotifications(
    Array.from(recipientIds).map((recipientId) => ({
      organizationId,
      recipientId,
      actorId: context.user.id,
      kind: "learning" as const,
      title: "Nouveau parcours ECCE",
      body: `${programResult.title} a été ajouté à ton espace de progression.`,
      deeplink: "/programs"
    }))
  );

  revalidatePath("/admin/programs");
  revalidatePath("/dashboard");
  revalidatePath("/programs");

  return ok(
    recipientIds.size > 1
      ? `Parcours activé pour ${recipientIds.size} coachés.`
      : `Parcours activé pour 1 coaché.`
  );
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

  if ((!assignedUserId && !cohortId) || (assignedUserId && cohortId)) {
    return fail("Choisis soit un coaché précis, soit une cohorte.");
  }

  if ((!contentItemId && !quizId) || (contentItemId && quizId)) {
    return fail("Sélectionne soit un contenu, soit un quiz.");
  }

  const parsedDueAt = dueAtInput ? new Date(dueAtInput) : null;
  if (parsedDueAt && Number.isNaN(parsedDueAt.getTime())) {
    return fail("La deadline renseignée n'est pas valide.");
  }

  const dueAt = parsedDueAt ? parsedDueAt.toISOString() : null;

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
      kind: "learning" as const,
      title: "Nouvelle assignation ECCE",
      body: dueAt
        ? `${title} a été programmé avec une échéance au ${new Date(dueAt).toLocaleString("fr-FR")}.`
        : `${title} a été ajouté à ton parcours.`,
      deeplink: quizId ? `/quiz/${quizId}?assignment=${assignmentInsert.data.id}` : `/assignments/${assignmentInsert.data.id}`
    }))
  );

  revalidatePath("/admin");
  revalidatePath("/admin/assignments");
  revalidatePath("/dashboard");
  revalidatePath("/coach");

  return ok(`Assignation "${title}" créée.`);
}
