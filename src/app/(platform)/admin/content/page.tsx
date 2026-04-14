import { CreateContentForm } from "@/app/(platform)/admin/forms";
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
        description="Un espace dédié pour créer des ressources plus sereinement et enrichir la bibliothèque ECCE."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel panel-highlight">
          <div className="panel-header">
            <h3>Créer un contenu</h3>
            <p>Concentre-toi sur la ressource, pas sur le bruit administratif.</p>
          </div>
          <CreateContentForm />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Cadre éditorial</h3>
            <p>Un bon contenu ECCE est clair, actionnable et relié à une progression pédagogique.</p>
          </div>

          <div className="stack-list">
            <article className="panel panel-subtle">
              <strong>1. Intention pédagogique</strong>
              <p>Explique en une phrase ce que le coaché saura faire après la ressource.</p>
            </article>
            <article className="panel panel-subtle">
              <strong>2. Format utile</strong>
              <p>Choisis `document`, `video`, `youtube` ou `template` selon le meilleur usage réel.</p>
            </article>
            <article className="panel panel-subtle">
              <strong>3. Publication maîtrisée</strong>
              <p>Passe à `published` uniquement quand le résumé, les liens et la taxonomie sont prêts.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Catalogue des contenus</h3>
          <p>Vue centralisée des ressources déjà créées, avec statut et niveau de priorité.</p>
        </div>

        {contents.length ? (
          <div className="stack-list">
            {contents.map((content) => (
              <article className="list-row list-row-stretch" key={content.id}>
                <div>
                  <strong>{content.title}</strong>
                  <p>
                    {content.category || "Sans catégorie"} · {content.content_type} ·{" "}
                    {content.estimated_minutes ? `${content.estimated_minutes} min` : "durée libre"}
                  </p>
                  {content.summary ? <p>{content.summary}</p> : null}
                </div>

                <div className="table-actions">
                  {content.is_required ? <Badge tone="accent">obligatoire</Badge> : null}
                  <Badge tone={content.status === "published" ? "success" : "neutral"}>{content.status}</Badge>
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
