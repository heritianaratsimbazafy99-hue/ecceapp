import { notFound } from "next/navigation";

import { ContentReaderExperience } from "@/components/content/content-reader-experience";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { getLibraryResourcePageData } from "@/lib/platform-data";

export default async function LibraryResourcePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getLibraryResourcePageData(slug);

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
        relatedResources={relatedResources}
      />
    </div>
  );
}
