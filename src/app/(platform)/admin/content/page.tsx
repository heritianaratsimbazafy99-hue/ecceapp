import Link from "next/link";

import { ContentStudioComposer } from "@/components/content/content-studio-composer";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminContentStudioPageData } from "@/lib/platform-data";

export default async function AdminContentPage() {
  const { metrics, contents } = await getAdminContentStudioPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Studio contenus"
        description="Refonte du flux éditorial : cadrage, preview live, qualité éditoriale et catalogue de ressources plus lisible."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <ContentStudioComposer />

      <section className="panel">
        <div className="panel-header">
          <h3>Catalogue éditorial</h3>
          <p>Chaque ressource se lit maintenant comme une fiche de diffusion, avec aperçu, niveau de priorité et accès rapide.</p>
        </div>

        {contents.length ? (
          <div className="content-catalog-grid">
            {contents.map((content) => (
              <article className="collection-card content-catalog-card" key={content.id}>
                <div>
                  <div className="tag-row">
                    <Badge tone={content.status === "published" ? "success" : "neutral"}>{content.status}</Badge>
                    <Badge tone="accent">{content.content_type}</Badge>
                    {content.is_required ? <Badge tone="warning">obligatoire</Badge> : null}
                  </div>

                  <strong>{content.title}</strong>
                  <p>
                    {content.category || "Sans catégorie"} · {content.content_type} ·{" "}
                    {content.estimated_minutes ? `${content.estimated_minutes} min` : "durée libre"}
                  </p>
                  {content.summary ? <p>{content.summary}</p> : null}
                </div>

                <div className="table-actions">
                  {content.external_url || content.youtube_url ? (
                    <Link
                      className="button button-secondary button-small"
                      href={content.youtube_url || content.external_url || "#"}
                      target="_blank"
                    >
                      Ouvrir
                    </Link>
                  ) : (
                    <span className="form-hint">Aucun lien rattaché</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun contenu n&apos;a encore été créé.</strong>
            <p>Le studio est prêt pour alimenter la bibliothèque ECCE.</p>
          </div>
        )}
      </section>
    </div>
  );
}
