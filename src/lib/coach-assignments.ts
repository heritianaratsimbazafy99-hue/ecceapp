import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CoachAssignmentRow = {
  coach_id: string;
  coachee_id: string | null;
  cohort_id: string | null;
};

type CohortMemberRow = {
  user_id: string;
  cohort_id: string;
};

export async function getCoachAssignmentScope(params: {
  organizationId: string;
  coachId: string;
}) {
  const admin = createSupabaseAdminClient();

  const assignmentsResult = await admin
    .from("coach_assignments")
    .select("coach_id, coachee_id, cohort_id")
    .eq("organization_id", params.organizationId)
    .eq("coach_id", params.coachId);

  const assignments = (assignmentsResult.data ?? []) as CoachAssignmentRow[];
  const directCoacheeIds = Array.from(
    new Set(assignments.map((assignment) => assignment.coachee_id).filter(Boolean))
  ) as string[];
  const cohortIds = Array.from(
    new Set(assignments.map((assignment) => assignment.cohort_id).filter(Boolean))
  ) as string[];

  const cohortMembersResult = cohortIds.length
    ? await admin
        .from("cohort_members")
        .select("user_id, cohort_id")
        .in("cohort_id", cohortIds)
    : { data: [] as CohortMemberRow[] };

  const cohortCoacheeIds = Array.from(
    new Set(((cohortMembersResult.data ?? []) as CohortMemberRow[]).map((item) => item.user_id))
  );
  const coacheeIds = Array.from(new Set([...directCoacheeIds, ...cohortCoacheeIds]));

  return {
    assignments,
    directCoacheeIds,
    cohortIds,
    coacheeIds
  };
}

export async function getAssignedCoachIdsForCoachee(params: {
  organizationId: string;
  coacheeId: string;
  cohortIds?: string[];
}) {
  const admin = createSupabaseAdminClient();
  const cohortIds =
    params.cohortIds ??
    (
      (
        await admin
          .from("cohort_members")
          .select("cohort_id")
          .eq("user_id", params.coacheeId)
      ).data ?? []
    ).map((item) => item.cohort_id);

  const [directAssignmentsResult, cohortAssignmentsResult] = await Promise.all([
    admin
      .from("coach_assignments")
      .select("coach_id")
      .eq("organization_id", params.organizationId)
      .eq("coachee_id", params.coacheeId),
    cohortIds.length
      ? admin
          .from("coach_assignments")
          .select("coach_id")
          .eq("organization_id", params.organizationId)
          .in("cohort_id", cohortIds)
      : Promise.resolve({ data: [] as Array<{ coach_id: string }> })
  ]);

  return Array.from(
    new Set(
      [
        ...((directAssignmentsResult.data ?? []) as Array<{ coach_id: string }>),
        ...((cohortAssignmentsResult.data ?? []) as Array<{ coach_id: string }>)
      ].map((item) => item.coach_id)
    )
  );
}

export async function coachCanAccessCoachee(params: {
  organizationId: string;
  coachId: string;
  coacheeId: string;
}) {
  const scope = await getCoachAssignmentScope({
    organizationId: params.organizationId,
    coachId: params.coachId
  });

  return scope.coacheeIds.includes(params.coacheeId);
}

export async function coachCanAccessCohort(params: {
  organizationId: string;
  coachId: string;
  cohortId: string;
}) {
  const scope = await getCoachAssignmentScope({
    organizationId: params.organizationId,
    coachId: params.coachId
  });

  return scope.cohortIds.includes(params.cohortId);
}
