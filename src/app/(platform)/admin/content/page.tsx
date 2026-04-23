import Link from "next/link";

import { ContentStudioComposer } from "@/components/content/content-studio-composer";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminContentStudioPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildAdminContentHref({
  query,
  category,
  status,
  lane
}: {
  query?: string;
  category?: string;
  status?: string;
  lane?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (category) {
    searchParams.set("category", category);
  }

  if (status && status !== "all") {
    searchParams.set("status", status);
  }

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  const value = searchParams.toString();
  return value ? `/admin/content?${value}` : "/admin/content";
}

export default async function AdminContentPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    category?: string;
    status?: string;
    lane?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    activationPulse,
    categoryOptions,
    categoryRadar,
    contentWatchlist,
    editorialFeed,
    filters,
    focusContent,
    hero,
    laneBreakdown,
    metrics,
    moduleOptions,
    priorityActions
  } = await getAdminContentStudioPageData({
    query: params.query,
    category: params.category,
    status: params.status,
    lane: params.lane
  });

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Studio contenus"
        description="Cockpit admin premium pour piloter la bibliothèque, la qualité éditoriale et la diffusion réelle des ressources ECCE."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight admin-content-hero">
        <div className="admin-content-copy">
          <span className="eyebrow">Editorial ops</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {focusContent ? <Badge tone={focusContent.tone}>{focusContent.laneLabel}</Badge> : null}
            <Badge tone={activationPulse.band === "strong" ? "success" : activationPulse.band === "watch" ? "accent" : "warning"}>
              activation {activationPulse.score}%
            </Badge>
          </div>

          <div className="admin-content-actions">
            <Link className="button" href="#content-studio">
              Créer une ressource
            </Link>
            <Link className="button button-secondary" href="/library">
              Ouvrir la bibliothèque
            </Link>
            <Link className="button button-secondary" href="/admin/assignments">
              Ouvrir les assignations
            </Link>
          </div>
        </div>

        <div className="admin-content-side">
          <EngagementMeter
            band={activationPulse.band}
            bandLabel={activationPulse.bandLabel}
            caption={activationPulse.caption}
            score={activationPulse.score}
            trend={activationPulse.trend}
            trendLabel={activationPulse.trendLabel}
          />

          <div className="admin-content-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("admin-content-lane-card", lane.isActive && "is-active")}
                href={buildAdminContentHref({
                  query: filters.query,
                  category: filters.category,
                  status: filters.status,
                  lane: filters.lane === lane.id ? "all" : lane.id
                })}
                key={lane.id}
              >
                <span>{lane.label}</span>
                <strong>{lane.count}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-content-layout">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Filtrer le studio</span>
              <h3>Recherche, catégorie, statut et lane éditoriale</h3>
              <p>Réduis la vue avant de décider quoi publier, quoi enrichir et quoi brancher dans l’exécution pédagogique.</p>
            </div>

            <Link className="button button-secondary" href="/admin/content">
              Réinitialiser
            </Link>
          </div>

          <form className="admin-content-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input defaultValue={filters.query} name="query" placeholder="Titre, résumé, catégorie, parcours" type="search" />
            </label>

            <label className="conversation-composer-field">
              <span>Catégorie</span>
              <select defaultValue={filters.category} name="category">
                <option value="">Toutes les catégories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Statut</span>
              <select defaultValue={filters.status} name="status">
                <option value="all">Tous les statuts</option>
                <option value="published">published</option>
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="archived">archived</option>
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Lane</span>
              <select defaultValue={filters.lane} name="lane">
                <option value="all">Toutes les lanes</option>
                <option value="priority">Prioritaires</option>
                <option value="connected">Connectés</option>
                <option value="draft">Brouillons</option>
                <option value="library">Bibliothèque</option>
              </select>
            </label>

            <div className="admin-content-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>

          <div className="admin-content-summary">
            <article>
              <strong>{metrics[0]?.value ?? "0"}</strong>
              <span>{metrics[0]?.label ?? "ressources visibles"}</span>
            </article>
            <article>
              <strong>{metrics[1]?.value ?? "0%"}</strong>
              <span>{metrics[1]?.label ?? "activation éditoriale"}</span>
            </article>
            <article>
              <strong>{metrics[2]?.value ?? "0/0"}</strong>
              <span>{metrics[2]?.label ?? "taxonomie prête"}</span>
            </article>
            <article>
              <strong>{metrics[3]?.value ?? "0"}</strong>
              <span>{metrics[3]?.label ?? "parcours branchés"}</span>
            </article>
          </div>
        </section>

        <aside className="admin-content-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Ressource focus</h3>
              <p>La ressource qui mérite le plus ton attention éditoriale ou de diffusion maintenant.</p>
            </div>

            {focusContent ? (
              <>
                <div className="tag-row">
                  <Badge tone={focusContent.tone}>{focusContent.laneLabel}</Badge>
                  <Badge tone={focusContent.statusTone}>{focusContent.status}</Badge>
                  {focusContent.is_required ? <Badge tone="warning">obligatoire</Badge> : null}
                </div>

                <div className="admin-content-focus-metrics">
                  <article>
                    <strong>{focusContent.assignmentCount}</strong>
                    <span>assignation(s)</span>
                  </article>
                  <article>
                    <strong>{focusContent.linkedQuizCount}</strong>
                    <span>quiz lié(s)</span>
                  </article>
                  <article>
                    <strong>{focusContent.taxonomyScore}/4</strong>
                    <span>maturité éditoriale</span>
                  </article>
                  <article>
                    <strong>{focusContent.estimated_minutes ? `${focusContent.estimated_minutes} min` : "Libre"}</strong>
                    <span>durée</span>
                  </article>
                </div>

                <div className="admin-content-focus-copy">
                  <strong>{focusContent.title}</strong>
                  <p>{focusContent.nextNeed}</p>
                </div>

                <div className="admin-content-card-meta">
                  <span>{focusContent.category || "Sans catégorie"}</span>
                  <span>{focusContent.content_type}</span>
                  <span>{focusContent.moduleLabel}</span>
                </div>

                <Link className="button button-secondary button-small" href={focusContent.previewHref}>
                  {focusContent.ctaLabel}
                </Link>
              </>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune ressource focus.</strong>
                <p>Crée un contenu ou élargis les filtres pour faire remonter une ressource utile à piloter.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Priorités éditoriales</h3>
              <p>Les arbitrages les plus utiles sur la vue active du studio contenus.</p>
            </div>

            <div className="admin-content-priority-list">
              {priorityActions.map((action) => (
                <article className="admin-content-priority-card" key={action.id}>
                  <div className="tag-row">
                    <Badge tone={action.tone}>{action.title}</Badge>
                  </div>
                  <p>{action.description}</p>
                  <Link className="button button-secondary button-small" href={action.href}>
                    {action.ctaLabel}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header-rich">
          <div>
            <h3>Watchlist contenus</h3>
            <p>Les ressources les plus utiles à relire maintenant, triées par priorité éditoriale et impact visible dans la plateforme.</p>
          </div>

          <div className="messaging-inline-stats">
            <article>
              <strong>{contentWatchlist.length}</strong>
              <span>ressource(s) en watchlist</span>
            </article>
            <article>
              <strong>{laneBreakdown.find((lane) => lane.id === "priority")?.count ?? 0}</strong>
              <span>prioritaires</span>
            </article>
            <article>
              <strong>{laneBreakdown.find((lane) => lane.id === "connected")?.count ?? 0}</strong>
              <span>connectés</span>
            </article>
            <article>
              <strong>{laneBreakdown.find((lane) => lane.id === "draft")?.count ?? 0}</strong>
              <span>brouillons</span>
            </article>
          </div>
        </div>

        {contentWatchlist.length ? (
          <div className="admin-content-watchlist">
            {contentWatchlist.map((content) => (
              <article className="admin-content-card" key={content.id}>
                <div className="tag-row">
                  <Badge tone={content.tone}>{content.laneLabel}</Badge>
                  <Badge tone={content.statusTone}>{content.status}</Badge>
                  <Badge tone="accent">{content.content_type}</Badge>
                  {content.is_required ? <Badge tone="warning">obligatoire</Badge> : null}
                </div>

                <div className="admin-content-card-copy">
                  <strong>{content.title}</strong>
                  <p>{content.summary ?? "Ajoute un résumé pour mieux positionner la ressource dans la bibliothèque ECCE."}</p>
                </div>

                <div className="admin-content-card-meta">
                  <span>{content.category || "Sans catégorie"}</span>
                  <span>{content.moduleLabel}</span>
                  <span>{content.estimated_minutes ? `${content.estimated_minutes} min` : "durée libre"}</span>
                </div>

                <div className="admin-content-card-progress">
                  <div>
                    <strong>{content.assignmentCount}</strong>
                    <span>assignation(s)</span>
                  </div>
                  <div>
                    <strong>{content.linkedQuizCount}</strong>
                    <span>quiz lié(s)</span>
                  </div>
                  <div>
                    <strong>{content.taxonomyScore}/4</strong>
                    <span>taxonomie</span>
                  </div>
                </div>

                <Link className="button button-secondary button-small" href={content.previewHref}>
                  {content.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune ressource dans la watchlist.</strong>
            <p>La vue active n’a pas encore assez de ressources visibles, ou les filtres sont trop restrictifs.</p>
          </div>
        )}
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Radar catégories</h3>
            <p>Les zones éditoriales les plus denses, les plus assignées ou les plus stratégiques dans la bibliothèque.</p>
          </div>

          {categoryRadar.length ? (
            <div className="admin-content-category-grid">
              {categoryRadar.map((category) => (
                <article className="admin-content-category-card" key={category.id}>
                  <div className="tag-row">
                    <Badge tone={category.tone}>{category.label}</Badge>
                  </div>
                  <p>
                    {category.count} ressource(s) · {category.assignmentLoad} assignation(s) · {category.linkedQuizCount} quiz lié(s)
                  </p>
                  <div className="admin-content-card-progress">
                    <div>
                      <strong>{category.requiredCount}</strong>
                      <span>obligatoire(s)</span>
                    </div>
                    <div>
                      <strong>{category.assignmentLoad}</strong>
                      <span>diffusions</span>
                    </div>
                    <div>
                      <strong>{category.linkedQuizCount}</strong>
                      <span>quiz connectés</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune catégorie visible.</strong>
              <p>Ajoute des catégories ou élargis les filtres pour lire le radar éditorial.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Feed éditorial</h3>
            <p>Les dernières ressources visibles dans le studio, utiles pour garder une lecture de mouvement sans replonger dans le brut.</p>
          </div>

          {editorialFeed.length ? (
            <div className="stack-list">
              {editorialFeed.map((event) => (
                <article className="list-row list-row-stretch" key={event.id}>
                  <div>
                    <strong>{event.title}</strong>
                    <p>
                      {event.laneLabel} · {event.moduleLabel}
                    </p>
                    <p>{event.createdAt}</p>
                  </div>
                  <div className="list-row-meta">
                    <Badge tone={event.tone}>{event.status}</Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun mouvement éditorial récent.</strong>
              <p>Les prochaines créations de ressources apparaîtront ici automatiquement.</p>
            </div>
          )}
        </section>
      </section>

      <div id="content-studio">
        <ContentStudioComposer moduleOptions={moduleOptions} />
      </div>
    </div>
  );
}
