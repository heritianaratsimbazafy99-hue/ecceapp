import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const AUDIT_EVENT_CATEGORIES = ["access", "curriculum", "delivery", "organization"] as const;

export type AuditEventCategory = (typeof AUDIT_EVENT_CATEGORIES)[number];

export const AUDIT_CATEGORY_LABELS: Record<AuditEventCategory, string> = {
  access: "Accès & rôles",
  curriculum: "Catalogue pédagogique",
  delivery: "Diffusion & opérations",
  organization: "Organisation & branding"
};

type AuditMetadataScalar = string | number | boolean | null;
type AuditMetadataValue = AuditMetadataScalar | AuditMetadataScalar[];

export type AuditEventInput = {
  organizationId: string;
  actorId?: string | null;
  category: AuditEventCategory;
  action: string;
  summary: string;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  targetUserId?: string | null;
  highlights?: string[];
  metadata?: Record<string, AuditMetadataValue>;
};

function buildMetadata({
  highlights,
  metadata
}: Pick<AuditEventInput, "highlights" | "metadata">) {
  return {
    ...(metadata ?? {}),
    highlights: (highlights ?? []).filter(Boolean)
  };
}

export async function createAuditEvent({
  organizationId,
  actorId = null,
  category,
  action,
  summary,
  targetType = null,
  targetId = null,
  targetLabel = null,
  targetUserId = null,
  highlights = [],
  metadata = {}
}: AuditEventInput) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("audit_events").insert({
    organization_id: organizationId,
    actor_id: actorId,
    category,
    action,
    summary,
    target_type: targetType,
    target_id: targetId,
    target_label: targetLabel,
    target_user_id: targetUserId,
    metadata: buildMetadata({
      highlights,
      metadata
    })
  });

  if (error) {
    console.error("[audit] Unable to persist audit event", {
      action,
      category,
      error: error.message
    });
  }
}
