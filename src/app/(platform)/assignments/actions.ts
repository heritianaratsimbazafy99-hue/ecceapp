"use server";

import { Buffer } from "node:buffer";
import path from "node:path";
import { revalidatePath } from "next/cache";

import {
  createNotifications,
  getOrganizationStaffIds
} from "@/lib/platform-events";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

const SUBMISSION_BUCKET = "submission-files";
const MAX_SUBMISSION_FILE_BYTES = 25 * 1024 * 1024;
const SUBMISSION_MIME_BY_EXTENSION: Record<string, string> = {
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain"
};
const ALLOWED_SUBMISSION_MIME_TYPES = new Set(Object.values(SUBMISSION_MIME_BY_EXTENSION));

export type AssignmentActionState = {
  error?: string;
  success?: string;
};

function validateSubmissionAttachment(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  const contentType = file.type || SUBMISSION_MIME_BY_EXTENSION[extension];

  if (file.size <= 0) {
    return { error: "Le fichier joint est vide." };
  }

  if (file.size > MAX_SUBMISSION_FILE_BYTES) {
    return { error: "Le fichier joint dépasse la limite de 25 Mo." };
  }

  if (!extension || !SUBMISSION_MIME_BY_EXTENSION[extension]) {
    return { error: "Format non autorisé. Utilise PDF, Word, PowerPoint, TXT, PNG ou JPG." };
  }

  if (!contentType || !ALLOWED_SUBMISSION_MIME_TYPES.has(contentType)) {
    return { error: "Type de fichier non autorisé pour cette soumission." };
  }

  return {
    contentType,
    extension
  };
}

export async function submitAssignmentAction(
  _prevState: AssignmentActionState,
  formData: FormData
): Promise<AssignmentActionState> {
  const context = await requireRole(["admin", "coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;

  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const file = formData.get("attachment");

  if (!assignmentId) {
    return { error: "Assignation introuvable." };
  }

  if ((!notes || !notes.length) && (!(file instanceof File) || file.size === 0)) {
    return { error: "Ajoute au moins une note ou un fichier avant l'envoi." };
  }

  const assignmentResult = await admin
    .from("learning_assignments")
    .select("id, title, assigned_user_id, cohort_id, content_item_id")
    .eq("organization_id", organizationId)
    .eq("id", assignmentId)
    .maybeSingle<{
      id: string;
      title: string;
      assigned_user_id: string | null;
      cohort_id: string | null;
      content_item_id: string | null;
    }>();

  if (assignmentResult.error || !assignmentResult.data) {
    return { error: assignmentResult.error?.message ?? "Assignation introuvable." };
  }

  const assignment = assignmentResult.data;

  if (!assignment.content_item_id) {
    return { error: "Cette assignation est un quiz. Ouvre-la depuis la page quiz pour l'envoyer." };
  }

  if (context.role !== "admin") {
    let isAllowed = assignment.assigned_user_id === context.user.id;

    if (!isAllowed && assignment.cohort_id) {
      const { data: cohortMembership } = await admin
        .from("cohort_members")
        .select("cohort_id")
        .eq("user_id", context.user.id)
        .eq("cohort_id", assignment.cohort_id)
        .maybeSingle<{ cohort_id: string }>();

      isAllowed = Boolean(cohortMembership);
    }

    if (!isAllowed) {
      return { error: "Tu n'as pas accès à cette assignation." };
    }
  }

  let storagePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    const validation = validateSubmissionAttachment(file);

    if (validation.error) {
      return { error: validation.error };
    }

    const extension = validation.extension;
    const baseName = slugify(path.basename(file.name, extension)) || "piece-jointe";
    storagePath = `${organizationId}/${context.user.id}/${assignmentId}/${Date.now()}-${baseName}${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await admin.storage.from(SUBMISSION_BUCKET).upload(storagePath, buffer, {
      cacheControl: "3600",
      contentType: validation.contentType,
      upsert: false
    });

    if (uploadResult.error) {
      return {
        error:
          uploadResult.error.message ||
          "Impossible d'envoyer le fichier. Vérifie que le bucket `submission-files` existe."
      };
    }
  }

  const submissionInsert = await admin
    .from("submissions")
    .insert({
      assignment_id: assignmentId,
      content_item_id: assignment.content_item_id,
      user_id: context.user.id,
      title: assignment.title,
      notes: notes || null,
      storage_path: storagePath,
      status: "submitted",
      submitted_at: new Date().toISOString()
    })
    .select("id")
    .single<{ id: string }>();

  if (submissionInsert.error || !submissionInsert.data) {
    return { error: submissionInsert.error?.message ?? "Impossible d'enregistrer la soumission." };
  }

  const staffIds = await getOrganizationStaffIds(organizationId);

  await createNotifications(
    staffIds
      .filter((recipientId) => recipientId !== context.user.id)
      .map((recipientId) => ({
        organizationId,
        recipientId,
        actorId: context.user.id,
        kind: "review" as const,
        title: "Nouvelle soumission à relire",
        body: `${assignment.title} attend un retour coach.`,
        deeplink: "/coach"
      }))
  );

  revalidatePath("/dashboard");
  revalidatePath("/coach");
  revalidatePath(`/assignments/${assignmentId}`);

  return {
    success: "Soumission envoyée. Le coach sera notifié automatiquement."
  };
}
