import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentEditForm } from "@/components/content/content-edit-form";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminContentEditPageData } from "@/lib/platform-data";

export default async function AdminContentEditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminContentEditPageData(id);

  if (!data) {
    notFound();
  }

  const { assignmentCount, content, linkedQuizzes, metrics, moduleOptions, taxonomyPresets } = data;

  return (
    <div className="page-shell">
      <PlatformTopbar
        actions={
          <>
            <Link className="button button-secondary" href="/admin/content">
              Studio contenus
            </Link>
            {content.status === "published" ? (
              <Link className="button" href={content.publishedHref}>
                Bibliothèque
              </Link>
            ) : null}
          </>
        }
        title={`Éditer · ${content.title}`}
        description="Vue de correction V1.5 pour finaliser un contenu existant, renforcer sa taxonomie et garder la bibliothèque coach exploitable."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel admin-content-edit-context">
        <div className="panel-header-rich">
          <div>
            <h3>Impact actuel</h3>
            <p>
              {assignmentCount} assignation(s), {linkedQuizzes.length} quiz lié(s), créé le {content.createdAt}. La
              correction conserve le slug existant pour ne pas casser les liens déjà diffusés.
            </p>
          </div>

          <div className="tag-row">
            <Badge tone={content.statusTone}>{content.status}</Badge>
            <Badge tone={content.taxonomyScore >= 3 ? "success" : "warning"}>
              taxonomie {content.taxonomyScore}/4
            </Badge>
            {content.is_required ? <Badge tone="warning">obligatoire</Badge> : null}
          </div>
        </div>
      </section>

      <ContentEditForm content={content} moduleOptions={moduleOptions} taxonomyPresets={taxonomyPresets} />
    </div>
  );
}
