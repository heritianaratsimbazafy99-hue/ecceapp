"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function appendReadFlag(slug: string, assignmentId: string | null, readState: "done" | "error") {
  const params = new URLSearchParams();

  if (assignmentId) {
    params.set("assignment", assignmentId);
  }

  params.set("read", readState);

  return `/library/${slug}?${params.toString()}`;
}

export async function markContentAsReadAction(formData: FormData) {
  const context = await requireRole(["coachee"]);
  const admin = createSupabaseAdminClient();
  const organizationId = context.profile.organization_id;
  const userId = context.user.id;

  const contentId = String(formData.get("content_id") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim() || null;
  const fallbackSlug = String(formData.get("content_slug") ?? "").trim();

  if (!contentId) {
    redirect("/library");
  }

  const contentResult = await admin
    .from("content_items")
    .select("id, slug, title, status")
    .eq("organization_id", organizationId)
    .eq("id", contentId)
    .eq("status", "published")
    .maybeSingle<{ id: string; slug: string; title: string; status: string }>();

  if (contentResult.error || !contentResult.data) {
    redirect("/library");
  }

  const content = contentResult.data;

  if (assignmentId) {
    const assignmentResult = await admin
      .from("learning_assignments")
      .select("id, content_item_id, assigned_user_id, cohort_id")
      .eq("organization_id", organizationId)
      .eq("id", assignmentId)
      .maybeSingle<{
        id: string;
        content_item_id: string | null;
        assigned_user_id: string | null;
        cohort_id: string | null;
      }>();

    if (
      assignmentResult.error ||
      !assignmentResult.data ||
      assignmentResult.data.content_item_id !== contentId
    ) {
      redirect(`/library/${content.slug || fallbackSlug}`);
    }

    let canUseAssignment = assignmentResult.data.assigned_user_id === userId;

    if (!canUseAssignment && assignmentResult.data.cohort_id) {
      const { data: cohortMembership } = await admin
        .from("cohort_members")
        .select("cohort_id")
        .eq("user_id", userId)
        .eq("cohort_id", assignmentResult.data.cohort_id)
        .maybeSingle<{ cohort_id: string }>();

      canUseAssignment = Boolean(cohortMembership);
    }

    if (!canUseAssignment) {
      redirect(`/library/${content.slug || fallbackSlug}`);
    }
  }

  const existingProgressQuery = admin
    .from("content_progress")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("content_item_id", contentId)
    .limit(1);
  const existingProgressResult = assignmentId
    ? await existingProgressQuery.eq("assignment_id", assignmentId).maybeSingle<{ id: string }>()
    : await existingProgressQuery.is("assignment_id", null).maybeSingle<{ id: string }>();
  const completedAt = new Date().toISOString();

  const progressMutationResult = existingProgressResult.data?.id
    ? await admin
      .from("content_progress")
      .update({
        completed_at: completedAt,
        status: "completed"
      })
      .eq("id", existingProgressResult.data.id)
    : await admin.from("content_progress").insert({
        organization_id: organizationId,
        user_id: userId,
        content_item_id: contentId,
        assignment_id: assignmentId,
        status: "completed",
        completed_at: completedAt
      });

  if (progressMutationResult.error) {
    redirect(appendReadFlag(content.slug || fallbackSlug, assignmentId, "error"));
  }

  revalidatePath(`/library/${content.slug || fallbackSlug}`);
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/programs");
  revalidatePath("/admin/assignments");
  revalidatePath("/coach");

  redirect(appendReadFlag(content.slug || fallbackSlug, assignmentId, "done"));
}
