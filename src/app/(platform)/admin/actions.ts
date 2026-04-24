"use server";

import path from "node:path";

import { revalidatePath, revalidateTag } from "next/cache";

import { createAuditEvent } from "@/lib/audit";
import { requireRole, type AppRole } from "@/lib/auth";
import { CONTENT_STORAGE_AUDIT_CACHE_TAG, CONTENT_TAXONOMY_CACHE_TAG } from "@/lib/cache-tags";
import { getCoachAssignmentScope } from "@/lib/coach-assignments";
import { CONTENT_FILE_BUCKET, listOrganizationContentPdfFiles, type ContentPdfStorageFile } from "@/lib/content-files";
import { getOrganizationBrandingById } from "@/lib/organization";
import { createNotifications, getAssignmentRecipientIds } from "@/lib/platform-events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

export type AdminActionState = {
  error?: string;
  success?: string;
};

const VALID_ROLES: AppRole[] = ["admin", "professor", "coach", "coachee"];
const VALID_MEMBERSHIP_STATUSES = ["invited", "active", "suspended"] as const;
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
const STAFF_CONTENT_ROLES: AppRole[] = ["admin", "professor", "coach"];
const MAX_CONTENT_FILE_BYTES = 100 * 1024 * 1024;

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

export type ContentPdfUploadTicketState = {
  bucket?: string;
  error?: string;
  maxSizeBytes: number;
  signedUrl?: string;
  storagePath?: string;
  token?: string;
};

function ok(success: string): AdminActionState {
  return { success };
}

function fail(error: string): AdminActionState {
  return { error };
}

function revalidateAdminAudit() {
  revalidatePath("/admin/audit");
}

function revalidateContentStudioCaches(options: { storage?: boolean; taxonomy?: boolean } = {}) {
  if (options.storage) {
    revalidateTag(CONTENT_STORAGE_AUDIT_CACHE_TAG);
  }

  if (options.taxonomy) {
    revalidateTag(CONTENT_TAXONOMY_CACHE_TAG);
  }
}

function formatDateForAudit(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getDateValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function parseTagList(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().replace(/\s+/g, " "))
        .filter(Boolean)
    )
  );
}

function validateContentPdfDescriptor({
  fileName,
  fileSize,
  fileType
}: {
  fileName: string;
  fileSize: number;
  fileType: string;
}) {
  const extension = path.extname(fileName).toLowerCase();
  const isPdf = fileType === "application/pdf" || extension === ".pdf";

  if (!isPdf) {
    return "Seuls les fichiers PDF peuvent être déposés comme cours.";
  }

  if (fileSize <= 0) {
    return "Le PDF sélectionné est vide.";
  }

  if (fileSize > MAX_CONTENT_FILE_BYTES) {
    return "Le PDF dépasse la limite de 100 Mo.";
  }

  return null;
}

function getUploadedContentPdfPath(formData: FormData, organizationId: string, actorId: string) {
  const storagePath = String(formData.get("uploaded_storage_path") ?? "").trim();

  if (!storagePath) {
    return { storagePath: null };
  }

  const expectedPrefix = `${organizationId}/courses/${actorId}/`;

  if (
    !storagePath.startsWith(expectedPrefix) ||
    !storagePath.toLowerCase().endsWith(".pdf") ||
    storagePath.includes("..")
  ) {
    return {
      storagePath: null,
      error: "Le PDF téléversé ne correspond pas à l'espace de création autorisé."
    };
  }

  return { storagePath };
}

function validateHttpUrl(value: string, label: string) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return `${label} doit commencer par http:// ou https://.`;
    }

    return null;
  } catch {
    return `${label} n'est pas une URL valide.`;
  }
}

function validateContentUrls({ externalUrl, youtubeUrl }: { externalUrl: string; youtubeUrl: string }) {
  const externalUrlError = validateHttpUrl(externalUrl, "Le lien externe");

  if (externalUrlError) {
    return externalUrlError;
  }

  const youtubeUrlError = validateHttpUrl(youtubeUrl, "Le lien YouTube");

  if (youtubeUrlError) {
    return youtubeUrlError;
  }

  if (youtubeUrl) {
    const host = new URL(youtubeUrl).hostname.replace(/^www\./, "");

    if (!host.includes("youtube.com") && !host.includes("youtu.be")) {
      return "Le lien YouTube doit pointer vers youtube.com ou youtu.be.";
    }
  }

  return null;
}

function validatePublishedContentSource({
  contentType,
  externalUrl,
  status,
  storagePath,
  youtubeUrl
}: {
  contentType: string;
  externalUrl: string;
  status: string;
  storagePath: string | null;
  youtubeUrl: string;
}) {
  if (status !== "published" || contentType === "template") {
    return null;
  }

  if (contentType === "youtube" && !youtubeUrl) {
    return "Ajoute un lien YouTube avant de publier cette ressource.";
  }

  if (!storagePath && !externalUrl && !youtubeUrl) {
    return "Ajoute un PDF ou un lien exploitable avant de publier cette ressource.";
  }

  return null;
}

async function removeContentPdfFile(
  storagePath: string | null,
  admin: ReturnType<typeof createSupabaseAdminClient>
) {
  if (!storagePath) {
    return;
  }

  try {
    await admin.storage.from(CONTENT_FILE_BUCKET).remove([storagePath]);
  } catch {
    // Cleanup is best-effort: the content save error should remain the user-facing signal.
  }
}

async function failAndCleanupContentPdf(
  error: string,
  storagePath: string | null,
  admin: ReturnType<typeof createSupabaseAdminClient>
) {
  await removeContentPdfFile(storagePath, admin);
  return fail(error);
}

function canManageAssignmentsOrganizationWide(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("professor");
}

export async function createContentPdfUploadTicketAction(
  formData: FormData
): Promise<ContentPdfUploadTicketState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const fileName = String(formData.get("file_name") ?? "").trim();
  const fileType = String(formData.get("file_type") ?? "").trim();
  const fileSize = Number(String(formData.get("file_size") ?? "").trim() || 0);

  if (!fileName) {
    return { error: "Le nom du PDF est obligatoire.", maxSizeBytes: MAX_CONTENT_FILE_BYTES };
  }

  const validationError = validateContentPdfDescriptor({ fileName, fileSize, fileType });

  if (validationError) {
    return { error: validationError, maxSizeBytes: MAX_CONTENT_FILE_BYTES };
  }

  const extension = path.extname(fileName).toLowerCase() || ".pdf";
  const baseName =
    slugify(path.basename(fileName, extension)) ||
    slugify(title) ||
    "cours-pdf";
  const storagePath = `${organizationId}/courses/${context.user.id}/${Date.now()}-${baseName}.pdf`;

  const signedUpload = await admin.storage.from(CONTENT_FILE_BUCKET).createSignedUploadUrl(storagePath);

  if (signedUpload.error || !signedUpload.data) {
    return {
      maxSizeBytes: MAX_CONTENT_FILE_BYTES,
      error:
        signedUpload.error?.message ||
        "Impossible de préparer l'upload signé. Vérifie que le bucket Supabase course-files existe."
    };
  }

  return {
    bucket: CONTENT_FILE_BUCKET,
    maxSizeBytes: MAX_CONTENT_FILE_BYTES,
    signedUrl: signedUpload.data.signedUrl,
    storagePath: signedUpload.data.path,
    token: signedUpload.data.token
  };
}

export async function cleanupOrphanContentPdfFilesAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();
  const cleanupWindowHours = Math.min(
    Math.max(Number(String(formData.get("cleanup_window_hours") ?? "").trim() || 24), 1),
    168
  );
  const cutoff = Date.now() - cleanupWindowHours * 60 * 60 * 1000;
  const referencedResult = await admin
    .from("content_items")
    .select("storage_path")
    .eq("organization_id", organizationId)
    .not("storage_path", "is", null);

  if (referencedResult.error) {
    return fail(referencedResult.error.message);
  }

  let storageFiles: ContentPdfStorageFile[];

  try {
    storageFiles = await listOrganizationContentPdfFiles(admin, organizationId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Impossible d'auditer les fichiers PDF.");
  }

  const referencedPaths = new Set(
    ((referencedResult.data ?? []) as Array<{ storage_path: string | null }>)
      .map((item) => item.storage_path)
      .filter(Boolean) as string[]
  );
  const staleOrphans = storageFiles.filter((file) => {
    if (referencedPaths.has(file.path)) {
      return false;
    }

    const timestamp = getDateValue(file.createdAt) ?? getDateValue(file.updatedAt);
    return timestamp !== null && timestamp < cutoff;
  });

  if (!staleOrphans.length) {
    return ok(`Aucun PDF orphelin vieux de plus de ${cleanupWindowHours}h.`);
  }

  const removal = await admin.storage.from(CONTENT_FILE_BUCKET).remove(staleOrphans.map((file) => file.path));

  if (removal.error) {
    return fail(removal.error.message);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "content.media_cleanup",
    summary: `${staleOrphans.length} PDF orphelin(s) supprimé(s).`,
    targetType: "content_media",
    highlights: [`fenêtre ${cleanupWindowHours}h`, `${staleOrphans.length} fichier(s)`]
  });

  revalidatePath("/admin/content");
  revalidateAdminAudit();
  revalidateContentStudioCaches({ storage: true });

  return ok(`${staleOrphans.length} PDF orphelin(s) supprimé(s).`);
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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "access",
    action: "user.created",
    summary: `Compte ${firstName} ${lastName} créé avec le rôle ${role}.`,
    targetType: "profile",
    targetId: newUserId,
    targetLabel: `${firstName} ${lastName}`,
    targetUserId: newUserId,
    highlights: [`rôle ${role}`, "statut invited", email]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidateAdminAudit();
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

  const profileResult = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("organization_id", organizationId)
    .eq("id", userId)
    .maybeSingle<{ id: string; first_name: string; last_name: string }>();

  if (profileResult.error || !profileResult.data) {
    return fail("Utilisateur introuvable dans cette organisation.");
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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "access",
    action: "user.role_assigned",
    summary: `Rôle ${role} ajouté à ${profileResult.data.first_name} ${profileResult.data.last_name}.`,
    targetType: "profile",
    targetId: userId,
    targetLabel: `${profileResult.data.first_name} ${profileResult.data.last_name}`,
    targetUserId: userId,
    highlights: [`rôle ${role}`]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidateAdminAudit();
  revalidatePath("/coach");
  revalidatePath("/dashboard");
  revalidatePath("/admin/learners");

  return ok(`Rôle ${role} attribué.`);
}

export async function updateUserProfileAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const userId = String(formData.get("user_id") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!userId || !firstName || !lastName || !timezone) {
    return fail("Le prénom, le nom et le fuseau sont obligatoires.");
  }

  const profileResult = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("organization_id", organizationId)
    .eq("id", userId)
    .maybeSingle<{ id: string; first_name: string; last_name: string }>();

  if (profileResult.error || !profileResult.data) {
    return fail("Utilisateur introuvable dans cette organisation.");
  }

  const { error } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      timezone,
      bio: bio || null
    })
    .eq("organization_id", organizationId)
    .eq("id", userId);

  if (error) {
    return fail(error.message);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "access",
    action: "user.profile_updated",
    summary: `Profil de ${firstName} ${lastName} mis à jour.`,
    targetType: "profile",
    targetId: userId,
    targetLabel: `${firstName} ${lastName}`,
    targetUserId: userId,
    highlights: [timezone, bio ? "bio mise à jour" : "bio vide"]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidateAdminAudit();
  revalidatePath("/coach");
  revalidatePath("/dashboard");
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/agenda");

  return ok(`Le profil de ${firstName} ${lastName} a été mis à jour.`);
}

export async function updateUserStatusAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(["admin"]);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const userId = String(formData.get("user_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!userId || !VALID_MEMBERSHIP_STATUSES.includes(status as (typeof VALID_MEMBERSHIP_STATUSES)[number])) {
    return fail("Le statut demandé n'est pas valide.");
  }

  const profileResult = await admin
    .from("profiles")
    .select("id, first_name, last_name, status, user_roles(role)")
    .eq("organization_id", organizationId)
    .eq("id", userId)
    .maybeSingle<{
      id: string;
      first_name: string;
      last_name: string;
      status: (typeof VALID_MEMBERSHIP_STATUSES)[number];
      user_roles: Array<{ role: AppRole }>;
    }>();

  if (profileResult.error || !profileResult.data) {
    return fail("Utilisateur introuvable dans cette organisation.");
  }

  const targetProfile = profileResult.data;
  const nextStatus = status as (typeof VALID_MEMBERSHIP_STATUSES)[number];
  const isSelf = targetProfile.id === context.user.id;
  const targetRoles = (targetProfile.user_roles ?? []).map((item) => item.role);

  if (targetProfile.status === nextStatus) {
    return ok(`Le statut de ${targetProfile.first_name} ${targetProfile.last_name} était déjà ${nextStatus}.`);
  }

  if (isSelf) {
    return fail("Modifie le statut de ton propre compte ailleurs pour éviter de te bloquer dans l'admin.");
  }

  if (targetRoles.includes("admin") && targetProfile.status === "active" && nextStatus !== "active") {
    const activeAdminsResult = await admin
      .from("profiles")
      .select("id, user_roles!inner(role)")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .eq("user_roles.role", "admin");

    if ((activeAdminsResult.data?.length ?? 0) <= 1) {
      return fail("Impossible de désactiver le dernier admin actif de l'organisation.");
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ status: nextStatus })
    .eq("organization_id", organizationId)
    .eq("id", userId);

  if (error) {
    return fail(error.message);
  }

  const displayName = `${targetProfile.first_name} ${targetProfile.last_name}`.trim();

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "access",
    action: "user.status_updated",
    summary: `Statut de ${displayName} changé vers ${nextStatus}.`,
    targetType: "profile",
    targetId: userId,
    targetLabel: displayName,
    targetUserId: userId,
    highlights: [`statut ${nextStatus}`]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidateAdminAudit();
  revalidatePath("/coach");
  revalidatePath("/dashboard");
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/agenda");
  revalidatePath("/auth/sign-in");
  revalidatePath("/auth/onboarding");

  if (nextStatus === "active") {
    return ok(`${displayName} est maintenant actif(ve) sur ECCE.`);
  }

  if (nextStatus === "invited") {
    return ok(`${displayName} repassera par l'onboarding à la prochaine connexion.`);
  }

  return ok(`L'accès de ${displayName} est suspendu jusqu'à réactivation.`);
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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "delivery",
    action: "cohort.member_added",
    summary: `${profileResult.data.first_name} ${profileResult.data.last_name} ajouté(e) à la cohorte ${cohortResult.data.name}.`,
    targetType: "cohort",
    targetId: cohortId,
    targetLabel: cohortResult.data.name,
    targetUserId: coacheeId,
    highlights: [cohortResult.data.name]
  });

  revalidatePath("/admin");
  revalidateAdminAudit();
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
  let auditTargetType = "coach_assignment";
  let auditTargetId: string | null = null;
  let auditTargetLabel = `${coachProfile.first_name} ${coachProfile.last_name}`;

  if (coacheeId) {
    const [coacheeRoleResult, coacheeProfileResult] = await Promise.all([
      admin
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", coacheeId)
        .eq("role", "coachee")
        .maybeSingle<{ user_id: string }>(),
      admin
        .from("profiles")
        .select("first_name, last_name")
        .eq("organization_id", organizationId)
        .eq("id", coacheeId)
        .maybeSingle<{ first_name: string; last_name: string }>()
    ]);

    if (coacheeRoleResult.error || !coacheeRoleResult.data || coacheeProfileResult.error || !coacheeProfileResult.data) {
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
    auditTargetType = "coachee";
    auditTargetId = coacheeId;
    auditTargetLabel = `${coacheeProfileResult.data.first_name} ${coacheeProfileResult.data.last_name}`;
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
    auditTargetType = "cohort";
    auditTargetId = cohortId;
    auditTargetLabel = cohortResult.data.name;
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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "delivery",
    action: "coach.assignment_created",
    summary: successLabel,
    targetType: auditTargetType,
    targetId: auditTargetId,
    targetLabel: auditTargetLabel,
    targetUserId: coacheeId || null,
    highlights: [`coach ${coachProfile.first_name} ${coachProfile.last_name}`, `${notificationTargets.length} destinataire(s)`]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/learners");
  revalidateAdminAudit();
  revalidatePath("/coach");
  revalidatePath("/dashboard");

  return ok(successLabel);
}

export async function createContentAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
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
  const fileUpload = getUploadedContentPdfPath(formData, organizationId, context.user.id);

  if (fileUpload.error) {
    return fail(fileUpload.error);
  }

  if (!title || !VALID_CONTENT_TYPES.includes(contentType as (typeof VALID_CONTENT_TYPES)[number])) {
    return failAndCleanupContentPdf(
      "Le titre et le type de contenu sont obligatoires.",
      fileUpload.storagePath,
      admin
    );
  }

  if (!VALID_PUBLICATION_STATUS.includes(status as (typeof VALID_PUBLICATION_STATUS)[number])) {
    return failAndCleanupContentPdf("Le statut de publication n'est pas valide.", fileUpload.storagePath, admin);
  }

  if (moduleId) {
    const moduleResult = await ensureProgramModuleBelongsToOrganization(moduleId, organizationId);

    if (!moduleResult) {
      return failAndCleanupContentPdf(
        "Le module de parcours sélectionné est introuvable.",
        fileUpload.storagePath,
        admin
      );
    }
  }

  const slug = slugify(title);
  const tags = tagsInput ? parseTagList(tagsInput) : [];
  const resolvedContentType = fileUpload.storagePath ? "document" : contentType;
  const urlValidationError = validateContentUrls({ externalUrl, youtubeUrl });

  if (urlValidationError) {
    return failAndCleanupContentPdf(urlValidationError, fileUpload.storagePath, admin);
  }

  const sourceValidationError = validatePublishedContentSource({
    contentType: resolvedContentType,
    externalUrl,
    status,
    storagePath: fileUpload.storagePath,
    youtubeUrl
  });

  if (sourceValidationError) {
    return failAndCleanupContentPdf(sourceValidationError, fileUpload.storagePath, admin);
  }

  const { error } = await admin.from("content_items").insert({
    organization_id: organizationId,
    title,
    slug,
    module_id: moduleId || null,
    summary: summary || null,
    category: category || null,
    subcategory: subcategory || null,
    tags,
    content_type: resolvedContentType,
    status,
    external_url: externalUrl || null,
    storage_path: fileUpload.storagePath,
    youtube_url: youtubeUrl || null,
    is_required: isRequired,
    estimated_minutes: estimatedMinutes > 0 ? estimatedMinutes : null,
    created_by: context.user.id
  });

  if (error) {
    return failAndCleanupContentPdf(error.message, fileUpload.storagePath, admin);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "content.created",
    summary: `Contenu "${title}" créé.`,
    targetType: "content",
    targetLabel: title,
    highlights: [
      resolvedContentType,
      status,
      fileUpload.storagePath ? "PDF téléversé" : "source externe",
      estimatedMinutes > 0 ? `${estimatedMinutes} min` : "durée libre"
    ]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidateAdminAudit();
  revalidatePath("/library");
  revalidatePath("/dashboard");
  revalidateContentStudioCaches({ storage: Boolean(fileUpload.storagePath) });

  return ok(`Contenu "${title}" créé.`);
}

export async function updateContentAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const contentId = String(formData.get("content_id") ?? "").trim();
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
  const removePdf = String(formData.get("remove_pdf") ?? "").trim() === "true";
  const fileUpload = getUploadedContentPdfPath(formData, organizationId, context.user.id);

  if (fileUpload.error) {
    return fail(fileUpload.error);
  }

  if (!contentId) {
    return failAndCleanupContentPdf("Le contenu à modifier est introuvable.", fileUpload.storagePath, admin);
  }

  if (!title || !VALID_CONTENT_TYPES.includes(contentType as (typeof VALID_CONTENT_TYPES)[number])) {
    return failAndCleanupContentPdf(
      "Le titre et le type de contenu sont obligatoires.",
      fileUpload.storagePath,
      admin
    );
  }

  if (!VALID_PUBLICATION_STATUS.includes(status as (typeof VALID_PUBLICATION_STATUS)[number])) {
    return failAndCleanupContentPdf("Le statut de publication n'est pas valide.", fileUpload.storagePath, admin);
  }

  const existingResult = await admin
    .from("content_items")
    .select("id, title, slug, status, storage_path")
    .eq("organization_id", organizationId)
    .eq("id", contentId)
    .maybeSingle<{
      id: string;
      title: string;
      slug: string;
      status: string;
      storage_path: string | null;
    }>();

  if (existingResult.error || !existingResult.data) {
    return failAndCleanupContentPdf("Le contenu à modifier est introuvable.", fileUpload.storagePath, admin);
  }

  if (moduleId) {
    const moduleResult = await ensureProgramModuleBelongsToOrganization(moduleId, organizationId);

    if (!moduleResult) {
      return failAndCleanupContentPdf(
        "Le module de parcours sélectionné est introuvable.",
        fileUpload.storagePath,
        admin
      );
    }
  }

  const tags = tagsInput ? parseTagList(tagsInput) : [];
  const resolvedStoragePath = fileUpload.storagePath ?? (removePdf ? null : existingResult.data.storage_path);
  const resolvedContentType = fileUpload.storagePath ? "document" : contentType;
  const urlValidationError = validateContentUrls({ externalUrl, youtubeUrl });

  if (urlValidationError) {
    return failAndCleanupContentPdf(urlValidationError, fileUpload.storagePath, admin);
  }

  const sourceValidationError = validatePublishedContentSource({
    contentType: resolvedContentType,
    externalUrl,
    status,
    storagePath: resolvedStoragePath,
    youtubeUrl
  });

  if (sourceValidationError) {
    return failAndCleanupContentPdf(sourceValidationError, fileUpload.storagePath, admin);
  }

  const { error } = await admin
    .from("content_items")
    .update({
      title,
      module_id: moduleId || null,
      summary: summary || null,
      category: category || null,
      subcategory: subcategory || null,
      tags,
      content_type: resolvedContentType,
      status,
      external_url: externalUrl || null,
      storage_path: resolvedStoragePath,
      youtube_url: youtubeUrl || null,
      is_required: isRequired,
      estimated_minutes: estimatedMinutes > 0 ? estimatedMinutes : null
    })
    .eq("organization_id", organizationId)
    .eq("id", contentId);

  if (error) {
    return failAndCleanupContentPdf(error.message, fileUpload.storagePath, admin);
  }

  if (
    existingResult.data.storage_path &&
    existingResult.data.storage_path !== resolvedStoragePath &&
    (removePdf || fileUpload.storagePath)
  ) {
    await removeContentPdfFile(existingResult.data.storage_path, admin);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "content.updated",
    summary: `Contenu "${title}" mis à jour.`,
    targetType: "content",
    targetId: contentId,
    targetLabel: title,
    highlights: [
      `ancien titre ${existingResult.data.title}`,
      resolvedContentType,
      status,
      fileUpload.storagePath ? "PDF remplacé" : removePdf ? "PDF supprimé" : resolvedStoragePath ? "PDF conservé" : "sans PDF",
      tags.length >= 3 ? `${tags.length} sujets` : "taxonomie à compléter"
    ]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${contentId}`);
  revalidateAdminAudit();
  revalidatePath("/library");
  revalidatePath(`/library/${existingResult.data.slug}`);
  revalidatePath("/dashboard");
  revalidateContentStudioCaches({
    storage: Boolean(fileUpload.storagePath) || removePdf
  });

  return ok(`Contenu "${title}" mis à jour.`);
}

export async function createContentTaxonomyThemeAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const position = Number(String(formData.get("position") ?? "").trim() || 0);

  if (!label) {
    return fail("Le nom du thème est obligatoire.");
  }

  const { data, error } = await admin
    .from("content_taxonomy_themes")
    .insert({
      organization_id: organizationId,
      label,
      description: description || null,
      position: Number.isFinite(position) ? position : 0,
      created_by: context.user.id
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return fail(error.message);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "content_taxonomy.theme_created",
    summary: `Thème éditorial "${label}" créé.`,
    targetType: "content_taxonomy_theme",
    targetId: data.id,
    targetLabel: label,
    highlights: [description || "sans description"]
  });

  revalidatePath("/admin/content");
  revalidatePath("/library");
  revalidateAdminAudit();
  revalidateContentStudioCaches({ taxonomy: true });

  return ok(`Thème "${label}" ajouté à la taxonomie.`);
}

export async function updateContentTaxonomyThemeAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const themeId = String(formData.get("theme_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const position = Number(String(formData.get("position") ?? "").trim() || 0);

  if (!themeId || !label) {
    return fail("Le thème à modifier et son nom sont obligatoires.");
  }

  const existingResult = await admin
    .from("content_taxonomy_themes")
    .select("id, label")
    .eq("organization_id", organizationId)
    .eq("id", themeId)
    .maybeSingle<{ id: string; label: string }>();

  if (existingResult.error || !existingResult.data) {
    return fail("Le thème à modifier est introuvable.");
  }

  const { error } = await admin
    .from("content_taxonomy_themes")
    .update({
      label,
      description: description || null,
      position: Number.isFinite(position) ? position : 0
    })
    .eq("organization_id", organizationId)
    .eq("id", themeId);

  if (error) {
    return fail(error.message);
  }

  if (existingResult.data.label !== label) {
    await admin
      .from("content_items")
      .update({ category: label })
      .eq("organization_id", organizationId)
      .eq("category", existingResult.data.label);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "content_taxonomy.theme_updated",
    summary: `Thème éditorial "${label}" mis à jour.`,
    targetType: "content_taxonomy_theme",
    targetId: themeId,
    targetLabel: label,
    highlights: [`ancien nom ${existingResult.data.label}`, `position ${Number.isFinite(position) ? position : 0}`]
  });

  revalidatePath("/admin/content");
  revalidatePath("/library");
  revalidateAdminAudit();
  revalidateContentStudioCaches({ taxonomy: true });

  return ok(`Thème "${label}" mis à jour.`);
}

export async function deleteContentTaxonomyThemeAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const themeId = String(formData.get("theme_id") ?? "").trim();

  if (!themeId) {
    return fail("Le thème à supprimer est introuvable.");
  }

  const existingResult = await admin
    .from("content_taxonomy_themes")
    .select("id, label")
    .eq("organization_id", organizationId)
    .eq("id", themeId)
    .maybeSingle<{ id: string; label: string }>();

  if (existingResult.error || !existingResult.data) {
    return fail("Le thème à supprimer est introuvable.");
  }

  const { error } = await admin
    .from("content_taxonomy_themes")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", themeId);

  if (error) {
    return fail(error.message);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "content_taxonomy.theme_deleted",
    summary: `Thème éditorial "${existingResult.data.label}" supprimé.`,
    targetType: "content_taxonomy_theme",
    targetId: themeId,
    targetLabel: existingResult.data.label,
    highlights: ["les sous-thèmes rattachés sont supprimés avec le thème"]
  });

  revalidatePath("/admin/content");
  revalidatePath("/library");
  revalidateAdminAudit();
  revalidateContentStudioCaches({ taxonomy: true });

  return ok(`Thème "${existingResult.data.label}" supprimé.`);
}

export async function createContentTaxonomySubthemeAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const themeId = String(formData.get("theme_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const topicsInput = String(formData.get("topics") ?? "").trim();
  const position = Number(String(formData.get("position") ?? "").trim() || 0);

  if (!themeId || !label) {
    return fail("Le thème parent et le nom du sous-thème sont obligatoires.");
  }

  const themeResult = await admin
    .from("content_taxonomy_themes")
    .select("id, label")
    .eq("organization_id", organizationId)
    .eq("id", themeId)
    .maybeSingle<{ id: string; label: string }>();

  if (themeResult.error || !themeResult.data) {
    return fail("Le thème parent sélectionné est introuvable.");
  }

  const topics = Array.from(
    new Set(
      topicsInput
        .split(",")
        .map((topic) => topic.trim().replace(/\s+/g, " "))
        .filter(Boolean)
    )
  );

  const { data, error } = await admin
    .from("content_taxonomy_subthemes")
    .insert({
      organization_id: organizationId,
      theme_id: themeId,
      label,
      topics,
      position: Number.isFinite(position) ? position : 0,
      created_by: context.user.id
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return fail(error.message);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "content_taxonomy.subtheme_created",
    summary: `Sous-thème éditorial "${label}" créé.`,
    targetType: "content_taxonomy_subtheme",
    targetId: data.id,
    targetLabel: label,
    highlights: [`thème ${themeResult.data.label}`, `${topics.length} sujet(s)`]
  });

  revalidatePath("/admin/content");
  revalidatePath("/library");
  revalidateAdminAudit();
  revalidateContentStudioCaches({ taxonomy: true });

  return ok(`Sous-thème "${label}" ajouté à la taxonomie.`);
}

export async function updateContentTaxonomySubthemeAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const subthemeId = String(formData.get("subtheme_id") ?? "").trim();
  const themeId = String(formData.get("theme_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const topicsInput = String(formData.get("topics") ?? "").trim();
  const position = Number(String(formData.get("position") ?? "").trim() || 0);

  if (!subthemeId || !themeId || !label) {
    return fail("Le sous-thème, son thème parent et son nom sont obligatoires.");
  }

  const [existingResult, themeResult] = await Promise.all([
    admin
      .from("content_taxonomy_subthemes")
      .select("id, label, theme_id")
      .eq("organization_id", organizationId)
      .eq("id", subthemeId)
      .maybeSingle<{ id: string; label: string; theme_id: string }>(),
    admin
      .from("content_taxonomy_themes")
      .select("id, label")
      .eq("organization_id", organizationId)
      .eq("id", themeId)
      .maybeSingle<{ id: string; label: string }>()
  ]);

  if (existingResult.error || !existingResult.data) {
    return fail("Le sous-thème à modifier est introuvable.");
  }

  if (themeResult.error || !themeResult.data) {
    return fail("Le thème parent sélectionné est introuvable.");
  }

  const previousThemeResult = await admin
    .from("content_taxonomy_themes")
    .select("id, label")
    .eq("organization_id", organizationId)
    .eq("id", existingResult.data.theme_id)
    .maybeSingle<{ id: string; label: string }>();
  const previousThemeLabel = previousThemeResult.data?.label ?? null;
  const topics = parseTagList(topicsInput);

  const { error } = await admin
    .from("content_taxonomy_subthemes")
    .update({
      theme_id: themeId,
      label,
      topics,
      position: Number.isFinite(position) ? position : 0
    })
    .eq("organization_id", organizationId)
    .eq("id", subthemeId);

  if (error) {
    return fail(error.message);
  }

  if (previousThemeLabel) {
    await admin
      .from("content_items")
      .update({
        category: themeResult.data.label,
        subcategory: label
      })
      .eq("organization_id", organizationId)
      .eq("category", previousThemeLabel)
      .eq("subcategory", existingResult.data.label);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "content_taxonomy.subtheme_updated",
    summary: `Sous-thème éditorial "${label}" mis à jour.`,
    targetType: "content_taxonomy_subtheme",
    targetId: subthemeId,
    targetLabel: label,
    highlights: [
      `ancien nom ${existingResult.data.label}`,
      `thème ${themeResult.data.label}`,
      `${topics.length} sujet(s)`
    ]
  });

  revalidatePath("/admin/content");
  revalidatePath("/library");
  revalidateAdminAudit();
  revalidateContentStudioCaches({ taxonomy: true });

  return ok(`Sous-thème "${label}" mis à jour.`);
}

export async function deleteContentTaxonomySubthemeAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const subthemeId = String(formData.get("subtheme_id") ?? "").trim();

  if (!subthemeId) {
    return fail("Le sous-thème à supprimer est introuvable.");
  }

  const existingResult = await admin
    .from("content_taxonomy_subthemes")
    .select("id, label")
    .eq("organization_id", organizationId)
    .eq("id", subthemeId)
    .maybeSingle<{ id: string; label: string }>();

  if (existingResult.error || !existingResult.data) {
    return fail("Le sous-thème à supprimer est introuvable.");
  }

  const { error } = await admin
    .from("content_taxonomy_subthemes")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", subthemeId);

  if (error) {
    return fail(error.message);
  }

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "content_taxonomy.subtheme_deleted",
    summary: `Sous-thème éditorial "${existingResult.data.label}" supprimé.`,
    targetType: "content_taxonomy_subtheme",
    targetId: subthemeId,
    targetLabel: existingResult.data.label
  });

  revalidatePath("/admin/content");
  revalidatePath("/library");
  revalidateAdminAudit();
  revalidateContentStudioCaches({ taxonomy: true });

  return ok(`Sous-thème "${existingResult.data.label}" supprimé.`);
}

export async function createQuizAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
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

  if (contentItemId) {
    const contentResult = await admin
      .from("content_items")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", contentItemId)
      .maybeSingle<{ id: string }>();

    if (contentResult.error || !contentResult.data) {
      return fail("Le contenu lié sélectionné est introuvable.");
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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "quiz.created",
    summary: `Quiz "${title}" créé.`,
    targetType: "quiz",
    targetId: quizInsert.data.id,
    targetLabel: title,
    highlights: [kind, status, `${normalizedQuestions.length} question(s)`]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/quizzes");
  revalidateAdminAudit();
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
  const context = await requireRole(STAFF_CONTENT_ROLES);
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
    .select("id, title")
    .eq("organization_id", organizationId)
    .eq("id", quizId)
    .maybeSingle<{ id: string; title: string }>();

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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "quiz.question_added",
    summary: `Question ajoutée au quiz "${quizResult.data.title}".`,
    targetType: "quiz",
    targetId: quizId,
    targetLabel: quizResult.data.title,
    highlights: [questionType, `${choices.length} choix`, `position ${Number.isFinite(nextPosition) ? nextPosition : 0}`]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/quizzes");
  revalidateAdminAudit();
  revalidatePath(`/quiz/${quizId}`);

  return ok("Question ajoutée au quiz.");
}

export async function deleteQuizQuestionAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireRole(STAFF_CONTENT_ROLES);
  const organizationId = context.profile.organization_id;
  const admin = createSupabaseAdminClient();

  const questionId = String(formData.get("question_id") ?? "").trim();
  const quizId = String(formData.get("quiz_id") ?? "").trim();

  if (!questionId || !quizId) {
    return fail("Question introuvable.");
  }

  const questionResult = await admin
    .from("quiz_questions")
    .select("id, quiz_id, prompt, quizzes!inner(id, organization_id, title)")
    .eq("id", questionId)
    .eq("quiz_id", quizId)
    .eq("quizzes.organization_id", organizationId)
    .maybeSingle<{ id: string; quiz_id: string; prompt: string; quizzes: { title: string } }>();

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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "quiz.question_deleted",
    summary: `Question retirée du quiz "${questionResult.data.quizzes.title}".`,
    targetType: "quiz",
    targetId: quizId,
    targetLabel: questionResult.data.quizzes.title,
    highlights: [questionResult.data.prompt.slice(0, 48)]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/quizzes");
  revalidateAdminAudit();
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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "program.created",
    summary: `Parcours "${title}" créé avec ${normalizedModules.length} module(s).`,
    targetType: "program",
    targetId: programInsert.data.id,
    targetLabel: title,
    highlights: [status, `${normalizedModules.length} module(s)`]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  revalidateAdminAudit();
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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "curriculum",
    action: "program.module_added",
    summary: `Module "${title}" ajouté au parcours ${programResult.title}.`,
    targetType: "program",
    targetId: programId,
    targetLabel: programResult.title,
    highlights: [status, title]
  });

  revalidatePath("/admin/programs");
  revalidateAdminAudit();
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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "delivery",
    action: "program.enrolled",
    summary: `Parcours "${programResult.title}" activé pour ${recipientIds.size} coaché(s).`,
    targetType: "program",
    targetId: programId,
    targetLabel: programResult.title,
    highlights: [`${recipientIds.size} coaché(s)`]
  });

  revalidatePath("/admin/programs");
  revalidateAdminAudit();
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
  const context = await requireRole(STAFF_CONTENT_ROLES);
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

  const [targetRoleResult, cohortResult, contentResult, quizResult] = await Promise.all([
    assignedUserId
      ? admin
          .from("user_roles")
          .select("user_id")
          .eq("organization_id", organizationId)
          .eq("user_id", assignedUserId)
          .eq("role", "coachee")
          .maybeSingle<{ user_id: string }>()
      : Promise.resolve({ data: null, error: null }),
    cohortId
      ? admin
          .from("cohorts")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("id", cohortId)
          .maybeSingle<{ id: string }>()
      : Promise.resolve({ data: null, error: null }),
    contentItemId
      ? admin
          .from("content_items")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("id", contentItemId)
          .maybeSingle<{ id: string }>()
      : Promise.resolve({ data: null, error: null }),
    quizId
      ? admin
          .from("quizzes")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("id", quizId)
          .maybeSingle<{ id: string }>()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (assignedUserId && (targetRoleResult.error || !targetRoleResult.data)) {
    return fail("Le coaché sélectionné est introuvable dans cette organisation.");
  }

  if (cohortId && (cohortResult.error || !cohortResult.data)) {
    return fail("La cohorte sélectionnée est introuvable dans cette organisation.");
  }

  if (contentItemId && (contentResult.error || !contentResult.data)) {
    return fail("Le contenu sélectionné est introuvable dans cette organisation.");
  }

  if (quizId && (quizResult.error || !quizResult.data)) {
    return fail("Le quiz sélectionné est introuvable dans cette organisation.");
  }

  if (!canManageAssignmentsOrganizationWide(context.roles)) {
    const scope = await getCoachAssignmentScope({
      organizationId,
      coachId: context.user.id
    });
    const canAssignUser = assignedUserId ? scope.coacheeIds.includes(assignedUserId) : true;
    const canAssignCohort = cohortId ? scope.cohortIds.includes(cohortId) : true;

    if (!canAssignUser || !canAssignCohort) {
      return fail("Tu peux assigner uniquement les coachés ou cohortes rattachés à ton espace coach.");
    }
  }

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

  await createAuditEvent({
    organizationId,
    actorId: context.user.id,
    category: "delivery",
    action: "assignment.created",
    summary: `Assignation "${title}" créée.`,
    targetType: quizId ? "quiz_assignment" : "content_assignment",
    targetId: assignmentInsert.data.id,
    targetLabel: title,
    highlights: [
      quizId ? "quiz" : "contenu",
      dueAt ? `deadline ${formatDateForAudit(dueAt)}` : "sans deadline",
      `${recipientIds.length} destinataire(s)`
    ]
  });

  revalidatePath("/admin");
  revalidatePath("/admin/assignments");
  revalidateAdminAudit();
  revalidatePath("/dashboard");
  revalidatePath("/coach");

  return ok(`Assignation "${title}" créée.`);
}
