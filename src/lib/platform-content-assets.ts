import { unstable_cache } from "next/cache";

import { CONTENT_STORAGE_AUDIT_CACHE_TAG, CONTENT_TAXONOMY_CACHE_TAG } from "@/lib/cache-tags";
import { CONTENT_FILE_BUCKET, listOrganizationContentPdfFiles } from "@/lib/content-files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type { ContentPdfStorageFile } from "@/lib/content-files";

export type ContentTaxonomyThemeRow = {
  id: string;
  label: string;
  description: string | null;
  position: number;
};

export type ContentTaxonomySubthemeRow = {
  id: string;
  theme_id: string;
  label: string;
  topics: string[] | null;
  position: number;
};

export function buildContentTaxonomyPresets(
  themes: ContentTaxonomyThemeRow[],
  subthemes: ContentTaxonomySubthemeRow[]
) {
  return themes.map((theme) => ({
    id: theme.id,
    theme: theme.label,
    description: theme.description ?? "",
    position: theme.position,
    subthemes: subthemes
      .filter((subtheme) => subtheme.theme_id === theme.id)
      .map((subtheme) => ({
        id: subtheme.id,
        label: subtheme.label,
        topics: subtheme.topics ?? [],
        position: subtheme.position
      }))
  }));
}

export const getCachedContentTaxonomyRows = unstable_cache(
  async (organizationId: string) => {
    const admin = createSupabaseAdminClient();
    const [themesResult, subthemesResult] = await Promise.all([
      admin
        .from("content_taxonomy_themes")
        .select("id, label, description, position")
        .eq("organization_id", organizationId)
        .order("position", { ascending: true })
        .order("label", { ascending: true }),
      admin
        .from("content_taxonomy_subthemes")
        .select("id, theme_id, label, topics, position")
        .eq("organization_id", organizationId)
        .order("position", { ascending: true })
        .order("label", { ascending: true })
    ]);

    return {
      themes: (themesResult.data ?? []) as ContentTaxonomyThemeRow[],
      subthemes: (subthemesResult.data ?? []) as ContentTaxonomySubthemeRow[]
    };
  },
  ["content-taxonomy-rows"],
  {
    revalidate: 300,
    tags: [CONTENT_TAXONOMY_CACHE_TAG]
  }
);

export const getCachedContentStorageAudit = unstable_cache(
  async (organizationId: string) => {
    const admin = createSupabaseAdminClient();
    return listOrganizationContentPdfFiles(admin, organizationId);
  },
  ["content-storage-audit"],
  {
    revalidate: 300,
    tags: [CONTENT_STORAGE_AUDIT_CACHE_TAG]
  }
);

export async function getSignedContentFileUrl(storagePath: string | null, admin = createSupabaseAdminClient()) {
  if (!storagePath) {
    return null;
  }

  const { data } = await admin.storage.from(CONTENT_FILE_BUCKET).createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl ?? null;
}
