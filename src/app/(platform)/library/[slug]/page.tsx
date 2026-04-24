import { notFound } from "next/navigation";

import { ContentReaderExperience } from "@/components/content/content-reader-experience";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { getLibraryResourcePageData } from "@/lib/platform-data";

export default async function LibraryResourcePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ assignment?: string; read?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const data = await getLibraryResourcePageData(slug, {
    assignmentId: resolvedSearchParams?.assignment,
    readState: resolvedSearchParams?.read
  });

  if (!data) {
    notFound();
  }

  const { content, linkedQuizzes, relatedResources } = data;

  return (
    <div className="page-shell">
      <PlatformTopbar
        title={content.title}
        description="Une vue de lecture ECCE plus premium pour consulter la ressource, comprendre son cadre pédagogique et enchaîner plus facilement avec la suite."
      />

      <ContentReaderExperience
        content={content}
        linkedQuizzes={linkedQuizzes}
        readingProgress={data.readingProgress}
        relatedResources={relatedResources}
      />
    </div>
  );
}
