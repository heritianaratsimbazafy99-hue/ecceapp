import Link from "next/link";

import { LearnerProgramBoard } from "@/components/programs/learner-program-board";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getLearnerProgramsPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildProgramsHref({
  query,
  lane
}: {
  query?: string;
  lane?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  const value = searchParams.toString();
  return value ? `/programs?${value}` : "/programs";
}

export default async function ProgramsPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    lane?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    filters,
    focusProgram,
    hero,
    laneBreakdown,
    metrics,
    moduleRadar,
    programs,
    programWatchlist,
    recentCompletionsFeed,
    responsePlaybook
  } = await getLearnerProgramsPageData({
    query: params.query,
    lane: params.lane
  });
  const activeLaneBadge =
    filters.lane === "all"
      ? null
      : laneBreakdown.find((lane) => lane.id === filters.lane)?.label ?? null;

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Mes parcours"
        description="Cockpit premium pour reprendre le bon programme, garder l’élan module par module et ouvrir la prochaine étape utile sans friction."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight learner-programs-hero">
        <div className="learner-programs-copy">
          <span className="eyebrow">Pilotage apprenant</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {activeLaneBadge ? <Badge tone="accent">{activeLaneBadge}</Badge> : null}
            {focusProgram ? <Badge tone={focusProgram.tone}>{focusProgram.laneLabel}</Badge> : null}
          </div>

          <div className="learner-programs-actions">
            <Link className="button" href={focusProgram?.primaryHref ?? "#programs-catalog"}>
              {focusProgram?.primaryCtaLabel ?? "Voir mes parcours"}
            </Link>
            <Link className="button button-secondary" href="/agenda">
              Ouvrir l&apos;agenda
            </Link>
            <Link className="button button-secondary" href="/messages">
              Contacter mon coach
            </Link>
          </div>
        </div>

        <div className="learner-programs-side">
          <div className="learner-programs-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("learner-programs-lane-card", lane.isActive && "is-active")}
                href={buildProgramsHref({
                  query: filters.query,
                  lane: filters.lane === lane.id ? "all" : lane.id
                })}
                key={lane.id}
              >
                <span>{lane.label}</span>
                <strong>{lane.count}</strong>
              </Link>
            ))}
          </div>

          <article className="learner-programs-focus-note">
            <span>Focus immédiat</span>
            <strong>{focusProgram?.nextFocus ?? "Tes parcours restent prêts"}</strong>
            <p>
              {focusProgram?.nextNeed ??
                "Dès qu’un parcours devient actif, cette zone remonte l’étape à ouvrir en premier pour garder le bon rythme."}
            </p>
          </article>
        </div>
      </section>

      <section className="learner-programs-layout">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Filtrer mes parcours</span>
              <h3>Recherche et lane d&apos;attention</h3>
              <p>Réduis la vue pour retrouver vite le bon programme, puis relance directement la prochaine étape utile.</p>
            </div>

            <Link className="button button-secondary" href="/programs">
              Réinitialiser
            </Link>
          </div>

          <form className="learner-programs-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input
                defaultValue={filters.query}
                name="query"
                placeholder="Titre, description, module, ressource"
                type="search"
              />
            </label>

            <label className="conversation-composer-field">
              <span>Lane</span>
              <select defaultValue={filters.lane} name="lane">
                <option value="all">Toutes les lanes</option>
                <option value="urgent">À sécuriser</option>
                <option value="momentum">En cours</option>
                <option value="launch">À lancer</option>
                <option value="completed">Complétés</option>
              </select>
            </label>

            <div className="learner-programs-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>

          <div className="learner-programs-summary">
            {metrics.map((metric) => (
              <article key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>

          <div className="learner-programs-playbook-grid">
            {responsePlaybook.map((item) => (
              <article className="learner-programs-playbook-card" key={item.id}>
                <Badge tone={item.tone}>{item.title}</Badge>
                <p>{item.body}</p>
                <Link className="inline-link" href={item.href}>
                  {item.ctaLabel}
                </Link>
              </article>
            ))}
          </div>

          <div className="panel-header">
            <div>
              <h3>Watchlist parcours</h3>
              <p>Les programmes qui concentrent le plus de contexte utile dans la vue active.</p>
            </div>
          </div>

          {programWatchlist.length ? (
            <div className="learner-programs-watchlist">
              {programWatchlist.map((program) => (
                <article className="learner-programs-watch-card" key={program.id}>
                  <div className="learner-programs-watch-copy">
                    <div className="learner-programs-watch-topline">
                      <strong>{program.title}</strong>
                      <Badge tone={program.tone}>{program.laneLabel}</Badge>
                    </div>
                    <p>{program.nextNeed}</p>
                    <small>
                      {program.completedItems}/{program.totalItems || 0} étapes complétées · {program.latestActivityLabel}
                    </small>
                  </div>

                  <div className="learner-programs-watch-meta">
                    <span>{program.progress}%</span>
                    {program.primaryHref ? (
                      <Link className="inline-link" href={program.primaryHref}>
                        {program.primaryCtaLabel}
                      </Link>
                    ) : (
                      <small>Catalogue uniquement</small>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state-compact">
              <strong>Aucun parcours dans cette vue.</strong>
              <p>Élargis les filtres pour retrouver tes programmes ou attends la prochaine activation ECCE.</p>
            </div>
          )}
        </section>

        <aside className="learner-programs-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Parcours focus</h3>
              <p>Le meilleur point d’entrée pour reprendre la bonne progression maintenant.</p>
            </div>

            {focusProgram ? (
              <>
                <div className="tag-row">
                  <Badge tone={focusProgram.tone}>{focusProgram.laneLabel}</Badge>
                  <Badge tone={focusProgram.statusTone}>{focusProgram.status}</Badge>
                </div>

                <div className="learner-programs-focus-metrics">
                  <article>
                    <strong>{focusProgram.progress}%</strong>
                    <span>progression</span>
                  </article>
                  <article>
                    <strong>{focusProgram.pendingItems}</strong>
                    <span>étapes ouvertes</span>
                  </article>
                  <article>
                    <strong>{focusProgram.completedModules}/{focusProgram.moduleCount || 0}</strong>
                    <span>modules complétés</span>
                  </article>
                  <article>
                    <strong>{focusProgram.latestActivityLabel}</strong>
                    <span>dernière activité</span>
                  </article>
                </div>

                <div className="learner-programs-focus-copy">
                  <strong>{focusProgram.title}</strong>
                  <p>{focusProgram.description ?? "Parcours ECCE actif, prêt à guider ta prochaine étape utile."}</p>
                  <small>{focusProgram.nextFocus}</small>
                </div>

                <p className="learner-programs-focus-note-inline">{focusProgram.nextNeed}</p>

                {focusProgram.primaryHref ? (
                  <Link className="button button-secondary button-small" href={focusProgram.primaryHref}>
                    {focusProgram.primaryCtaLabel}
                  </Link>
                ) : null}
              </>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun parcours focus pour le moment.</strong>
                <p>Cette zone remontera automatiquement le bon programme dès qu’une activité deviendra prioritaire.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Radar modules</h3>
              <p>Les modules qui demandent une reprise, une ouverture rapide ou une consolidation.</p>
            </div>

            {moduleRadar.length ? (
              <div className="learner-programs-radar-list">
                {moduleRadar.map((item) => (
                  <article className="learner-programs-radar-item" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {item.programTitle} · {item.summary}
                      </p>
                    </div>

                    <div className="learner-programs-radar-meta">
                      <Badge tone={item.tone}>{item.programTitle}</Badge>
                      {item.href ? (
                        <Link className="inline-link" href={item.href}>
                          {item.ctaLabel}
                        </Link>
                      ) : (
                        <small>Module en lecture seule</small>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun module visible.</strong>
                <p>Le radar se remplira dès qu’un parcours actif ou filtré contiendra des modules exploitables.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Complétions récentes</h3>
              <p>Le journal des étapes récemment terminées pour garder la continuité pédagogique.</p>
            </div>

            {recentCompletionsFeed.length ? (
              <div className="learner-programs-recent-list">
                {recentCompletionsFeed.map((item) => (
                  <article className="learner-programs-recent-item" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {item.programTitle} · {item.moduleTitle}
                      </p>
                    </div>

                    <div className="learner-programs-recent-meta">
                      <Badge tone={item.tone}>Complété</Badge>
                      <small>{item.completedAt}</small>
                      <Link className="inline-link" href={item.href}>
                        {item.ctaLabel}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune complétion récente.</strong>
                <p>Dès qu’une ressource ou un quiz est terminé, cette vue remonte le dernier mouvement utile.</p>
              </div>
            )}
          </section>
        </aside>
      </section>

      <section className="panel" id="programs-catalog">
        <div className="library-search-head">
          <div>
            <span className="eyebrow">Catalogue actif</span>
            <h3>Vue détaillée de mes parcours</h3>
            <p>Chaque carte garde la hiérarchie programme → module → ressource pour ouvrir rapidement la bonne étape.</p>
          </div>

          <div className="tag-row">
            <Badge tone="neutral">{programs.length} parcours visible(s)</Badge>
            {focusProgram ? <Badge tone={focusProgram.tone}>{focusProgram.nextFocus}</Badge> : null}
          </div>
        </div>

        <LearnerProgramBoard programs={programs} />
      </section>
    </div>
  );
}
