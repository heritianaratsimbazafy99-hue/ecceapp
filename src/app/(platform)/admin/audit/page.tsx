import Link from "next/link";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import type { AuditEventCategory } from "@/lib/audit";
import { getAdminAuditPageData } from "@/lib/platform-data";

function getCategoryTone(category: AuditEventCategory) {
  switch (category) {
    case "access":
      return "warning";
    case "curriculum":
      return "success";
    case "delivery":
      return "accent";
    default:
      return "neutral";
  }
}

function getActorStatusTone(status: string) {
  switch (status) {
    case "active":
      return "success";
    case "invited":
      return "accent";
    case "suspended":
      return "warning";
    default:
      return "neutral";
  }
}

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    category?: string;
    actor?: string;
  }>;
}) {
  const params = await searchParams;
  const { auditEnabled, categoryBreakdown, categoryOptions, actorOptions, errorMessage, events, filters, latestEvent, metrics } =
    await getAdminAuditPageData({
      query: params.query,
      category: params.category,
      actorId: params.actor
    });

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Journal d'audit"
        description="Trace les changements admin sensibles pour garder une lecture claire des accès, du catalogue et des opérations pédagogiques ECCE."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight audit-hero">
        <div className="audit-hero-copy">
          <span className="eyebrow">Traçabilité admin</span>
          <h3>Une lecture exploitable des actions sensibles, sans dépendre de la mémoire de l&apos;équipe.</h3>
          <p>
            Les créations de comptes, changements de statuts, opérations pédagogiques et réglages d&apos;organisation
            remontent maintenant dans un journal dédié.
          </p>

          <div className="audit-hero-actions">
            <Link className="button" href="/admin/users">
              Ouvrir les utilisateurs
            </Link>
            <Link className="button button-secondary" href="/admin/settings">
              Ouvrir les réglages
            </Link>
          </div>
        </div>

        <div className="audit-hero-side">
          {latestEvent ? (
            <article>
              <span className="eyebrow">Dernier événement</span>
              <strong>{latestEvent.summary}</strong>
              <p>
                {latestEvent.actorName} · {latestEvent.createdAtCompact}
              </p>
            </article>
          ) : (
            <article>
              <span className="eyebrow">Dernier événement</span>
              <strong>{auditEnabled ? "Aucun événement journalisé" : "Audit non disponible"}</strong>
              <p>{auditEnabled ? "Le flux se remplira dès la prochaine action admin." : "Applique le SQL côté Supabase pour activer la table."}</p>
            </article>
          )}

          <article>
            <span className="eyebrow">État du journal</span>
            <strong>{auditEnabled ? "actif" : "à initialiser"}</strong>
            <p>{auditEnabled ? "La lecture est branchée sur la base Supabase." : errorMessage ?? "Table d'audit manquante."}</p>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Filtrer le journal</span>
              <h3>Recherche et filtres</h3>
              <p>Réduis le flux par catégorie, acteur ou texte libre pour remonter plus vite à l&apos;action utile.</p>
            </div>

            <Link className="button button-secondary" href="/admin/audit">
              Réinitialiser
            </Link>
          </div>

          <form className="audit-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input defaultValue={filters.query} name="query" placeholder="Résumé, cible ou acteur" type="search" />
            </label>

            <label className="conversation-composer-field">
              <span>Catégorie</span>
              <select defaultValue={filters.category} name="category">
                <option value="all">Toutes les catégories</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Acteur</span>
              <select defaultValue={filters.actorId} name="actor">
                <option value="">Tous les acteurs</option>
                {actorOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="audit-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>
        </section>

        <aside className="audit-sidebar-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Répartition visible</h3>
              <p>Lecture rapide du flux actuellement affiché après filtres.</p>
            </div>

            <div className="audit-category-grid">
              {categoryBreakdown.map((category) => (
                <article className="audit-category-item" key={category.id}>
                  <strong>{category.count}</strong>
                  <span>{category.label}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Pourquoi ce bloc</h3>
              <p>Le risque n&apos;était plus l&apos;absence de fonctionnalités, mais l&apos;absence de mémoire fiable sur les changements sensibles.</p>
            </div>

            <div className="stack-list">
              <article className="list-row list-row-stretch">
                <div>
                  <strong>Accès</strong>
                  <p>Création de comptes, rôles et statuts sont maintenant retraçables.</p>
                </div>
                <Badge tone="warning">access</Badge>
              </article>

              <article className="list-row list-row-stretch">
                <div>
                  <strong>Catalogue pédagogique</strong>
                  <p>Parcours, modules, contenus et quiz laissent maintenant une empreinte lisible.</p>
                </div>
                <Badge tone="success">curriculum</Badge>
              </article>

              <article className="list-row list-row-stretch">
                <div>
                  <strong>Opérations</strong>
                  <p>Assignations, cohortes et activations de parcours sont regroupées dans le même journal.</p>
                </div>
                <Badge tone="accent">delivery</Badge>
              </article>
            </div>
          </section>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Flux d&apos;événements</h3>
          <p>Lecture chronologique des actions admin les plus récentes.</p>
        </div>

        {!auditEnabled ? (
          <div className="empty-state">
            <strong>Le journal d&apos;audit n&apos;est pas encore disponible.</strong>
            <p>Exécute le SQL de ce bloc dans Supabase puis recharge cette page.</p>
          </div>
        ) : events.length ? (
          <div className="audit-event-feed">
            {events.map((event) => (
              <article className="audit-event-card" key={event.id}>
                <div className="audit-event-card-head">
                  <div>
                    <div className="tag-row">
                      <Badge tone={getCategoryTone(event.category)}>{event.categoryLabel}</Badge>
                      <Badge tone={getActorStatusTone(event.actorStatus)}>
                        {event.actorStatus === "system" ? "système" : event.actorStatus}
                      </Badge>
                    </div>
                    <strong>{event.summary}</strong>
                    <p>
                      {event.actorName} · {event.createdAtLabel}
                    </p>
                  </div>

                  <div className="audit-event-meta">
                    <span>{event.targetType}</span>
                    <span>{event.targetLabel}</span>
                  </div>
                </div>

                {event.highlights.length ? (
                  <div className="tag-row">
                    {event.highlights.map((highlight) => (
                      <Badge key={`${event.id}-${highlight}`} tone="neutral">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun événement ne correspond aux filtres.</strong>
            <p>Réinitialise les filtres ou attends la prochaine action sensible côté admin.</p>
          </div>
        )}
      </section>
    </div>
  );
}
