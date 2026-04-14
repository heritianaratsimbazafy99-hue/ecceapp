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

export type AssignmentActionState = {
  error?: string;
  success?: string;
};

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
    const extension = path.extname(file.name) || ".bin";
    const baseName = slugify(path.basename(file.name, extension)) || "piece-jointe";
    storagePath = `${organizationId}/${context.user.id}/${assignmentId}/${Date.now()}-${baseName}${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await admin.storage.from(SUBMISSION_BUCKET).upload(storagePath, buffer, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
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
