import Link from "next/link";

import {
  AddProgramModuleForm,
  ProgramEnrollmentForm,
  ProgramStudioComposer
} from "@/components/programs/program-studio-composer";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminProgramStudioPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildAdminProgramsHref({
  query,
  status,
  lane
}: {
  query?: string;
  status?: string;
  lane?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (status && status !== "all") {
    searchParams.set("status", status);
  }

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  const value = searchParams.toString();
  return value ? `/admin/programs?${value}` : "/admin/programs";
}

export default async function AdminProgramsPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    status?: string;
    lane?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    activationPulse,
    cohortOptions,
    coacheeOptions,
    filters,
    focusProgram,
    hero,
    laneBreakdown,
    metrics,
    priorityActions,
    programOptions,
    programs,
    programWatchlist,
    recentActivationFeed,
    rolloutRadar
  } = await getAdminProgramStudioPageData({
    query: params.query,
    status: params.status,
    lane: params.lane
  });

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Studio parcours"
        description="Cockpit admin premium pour piloter la structure, la diffusion et l’activation réelle des parcours ECCE sans retomber dans un simple catalogue."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight admin-programs-hero">
        <div className="admin-programs-copy">
          <span className="eyebrow">Program ops</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {focusProgram ? <Badge tone={focusProgram.tone}>{focusProgram.laneLabel}</Badge> : null}
            <Badge tone={activationPulse.band === "strong" ? "success" : activationPulse.band === "watch" ? "accent" : "warning"}>
              delivery {activationPulse.score}%
            </Badge>
          </div>

          <div className="admin-programs-actions">
            <Link className="button" href="#program-studio">
              Créer un parcours
            </Link>
            <Link className="button button-secondary" href="#program-rollout">
              Activer un parcours
            </Link>
            <Link className="button button-secondary" href={focusProgram?.href ?? "#program-catalog"}>
              {focusProgram?.ctaLabel ?? "Ouvrir le catalogue"}
            </Link>
          </div>
        </div>

        <div className="admin-programs-side">
          <EngagementMeter
            band={activationPulse.band}
            bandLabel={activationPulse.bandLabel}
            caption={activationPulse.caption}
            score={activationPulse.score}
            trend={activationPulse.trend}
            trendLabel={activationPulse.trendLabel}
          />

          <div className="admin-programs-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("admin-programs-lane-card", lane.isActive && "is-active")}
                href={buildAdminProgramsHref({
                  query: filters.query,
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

      <section className="admin-programs-layout">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Filtrer le cockpit</span>
              <h3>Recherche, statut et lane de rollout</h3>
              <p>Réduis la vue avant de décider quoi publier, quoi brancher et quoi activer vers les coachés.</p>
            </div>

            <Link className="button button-secondary" href="/admin/programs">
              Réinitialiser
            </Link>
          </div>

          <form className="admin-programs-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input
                defaultValue={filters.query}
                name="query"
                placeholder="Titre, description, slug, module"
                type="search"
              />
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
                <option value="priority">À activer</option>
                <option value="scaffold">À brancher</option>
                <option value="draft">À finaliser</option>
                <option value="active">Déjà déployés</option>
              </select>
            </label>

            <div className="admin-programs-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>

          <div className="admin-programs-summary">
            {metrics.map((metric) => (
              <article key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>
        </section>

        <aside className="admin-programs-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Programme focus</h3>
              <p>Le parcours qui mérite le plus ton attention structurelle ou de diffusion maintenant.</p>
            </div>

            {focusProgram ? (
              <>
                <div className="tag-row">
                  <Badge tone={focusProgram.tone}>{focusProgram.laneLabel}</Badge>
                  <Badge tone={focusProgram.statusTone}>{focusProgram.status}</Badge>
                </div>

                <div className="admin-programs-focus-metrics">
                  <article>
                    <strong>{focusProgram.moduleCount}</strong>
                    <span>module(s)</span>
                  </article>
                  <article>
                    <strong>{focusProgram.moduleCoverage}%</strong>
                    <span>couverture modulaire</span>
                  </article>
                  <article>
                    <strong>{focusProgram.assetCount}</strong>
                    <span>asset(s)</span>
                  </article>
                  <article>
                    <strong>{focusProgram.enrollmentCount}</strong>
                    <span>activation(s)</span>
                  </article>
                </div>

                <div className="admin-programs-focus-copy">
                  <strong>{focusProgram.title}</strong>
                  <p>{focusProgram.description ?? "Parcours ECCE prêt à être piloté plus finement depuis ce cockpit."}</p>
                  <small>{focusProgram.latestEnrollmentLabel}</small>
                </div>

                <p className="admin-programs-focus-note">{focusProgram.nextNeed}</p>

                <Link className="button button-secondary button-small" href={focusProgram.href}>
                  {focusProgram.ctaLabel}
                </Link>
              </>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun parcours focus.</strong>
                <p>Crée un premier programme ou élargis la vue pour faire remonter un pivot d’orchestration.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Radar d’activation</h3>
              <p>Les contextes qui concentrent le plus de rollout sur la vue active.</p>
            </div>

            {rolloutRadar.length ? (
              <div className="admin-programs-radar-list">
                {rolloutRadar.map((item) => (
                  <article className="admin-programs-radar-item" key={item.id}>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.summary}</p>
                    </div>

                    <div className="admin-programs-radar-meta">
                      <Badge tone={item.tone}>{item.count} activation(s)</Badge>
                      <small>
                        {item.programCount} parcours · {item.learnerCount} coaché(s)
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune activation visible.</strong>
                <p>Le radar se remplira dès qu’un parcours sera déployé individuellement ou par cohorte.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Activations récentes</h3>
              <p>Le dernier mouvement de diffusion pour garder le bon contexte opérationnel.</p>
            </div>

            {recentActivationFeed.length ? (
              <div className="admin-programs-recent-list">
                {recentActivationFeed.map((item) => (
                  <article className="admin-programs-recent-item" key={item.id}>
                    <div>
                      <strong>{item.program}</strong>
                      <p>
                        {item.learner} · {item.context}
                      </p>
                    </div>
                    <small>{item.enrolledAt}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune activation récente.</strong>
                <p>Active un parcours pour alimenter immédiatement ce journal de rollout.</p>
              </div>
            )}
          </section>
        </aside>
      </section>

      <section className="panel">
        <div className="library-search-head">
          <div>
            <span className="eyebrow">Watchlist studio</span>
            <h3>Les programmes à arbitrer en premier</h3>
            <p>Cette watchlist te dit où publier, où brancher les modules et où relancer la diffusion maintenant.</p>
          </div>

          <Link className="button button-secondary" href="#program-catalog">
            Ouvrir le catalogue
          </Link>
        </div>

        <div className="tag-row">
          <Badge tone="neutral">{programs.length} parcours visible(s)</Badge>
          <Badge tone="accent">{programWatchlist.length} dans la watchlist</Badge>
          {focusProgram ? <Badge tone={focusProgram.tone}>{focusProgram.title}</Badge> : null}
        </div>

        <div className="admin-programs-playbook-grid">
          {priorityActions.map((action) => (
            <article className="admin-programs-playbook-card" key={action.id}>
              <Badge tone={action.tone}>{action.title}</Badge>
              <p>{action.description}</p>
              <Link className="inline-link" href={action.href}>
                {action.ctaLabel}
              </Link>
            </article>
          ))}
        </div>

        {programWatchlist.length ? (
          <div className="admin-programs-watchlist" id="program-watchlist">
            {programWatchlist.map((program) => (
              <article className="admin-programs-watch-card" key={program.id}>
                <div className="admin-programs-watch-copy">
                  <div className="admin-programs-watch-topline">
                    <strong>{program.title}</strong>
                    <Badge tone={program.tone}>{program.laneLabel}</Badge>
                  </div>
                  <p>{program.nextNeed}</p>
                  <small>
                    {program.moduleCount} module(s) · {program.assetCount} asset(s) · {program.enrollmentCount} activation(s)
                  </small>
                </div>

                <div className="admin-programs-watch-meta">
                  <span>{program.status}</span>
                  <span>{program.moduleCoverage}% branché</span>
                  <Link className="button button-secondary button-small" href={program.href}>
                    {program.ctaLabel}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state-compact">
            <strong>Aucun programme dans cette vue.</strong>
            <p>Réinitialise les filtres ou crée un premier parcours pour remplir la watchlist.</p>
          </div>
        )}
      </section>

      <div id="program-studio">
        <ProgramStudioComposer />
      </div>

      <div id="program-rollout">
        <ProgramEnrollmentForm
          cohortOptions={cohortOptions}
          coacheeOptions={coacheeOptions}
          programOptions={programOptions}
        />
      </div>

      <section className="panel" id="program-catalog">
        <div className="panel-header">
          <div>
            <h3>Catalogue des parcours</h3>
            <p>Chaque carte montre la maturité du rollout, la couverture des modules et le prochain geste opératoire utile.</p>
          </div>
          <Badge tone="neutral">{filters.summary}</Badge>
        </div>

        {programs.length ? (
          <div className="program-admin-grid">
            {programs.map((program) => (
              <article className="panel program-admin-card" key={program.id}>
                <div className="program-admin-card-head">
                  <div>
                    <div className="tag-row">
                      <Badge tone={program.tone}>{program.laneLabel}</Badge>
                      <Badge tone={program.statusTone}>{program.status}</Badge>
                      <Badge tone="neutral">{program.moduleCount} module(s)</Badge>
                      <Badge tone="accent">{program.learnerCount} coaché(s)</Badge>
                    </div>
                    <h3>{program.title}</h3>
                    {program.description ? <p>{program.description}</p> : null}
                  </div>

                  <div className="program-admin-kpis">
                    <article>
                      <strong>{program.contentCount}</strong>
                      <span>contenus liés</span>
                    </article>
                    <article>
                      <strong>{program.quizCount}</strong>
                      <span>quiz liés</span>
                    </article>
                    <article>
                      <strong>{program.moduleCoverage}%</strong>
                      <span>modules branchés</span>
                    </article>
                    <article>
                      <strong>{program.enrollmentCount}</strong>
                      <span>activations</span>
                    </article>
                  </div>
                </div>

                <div className="program-next-focus">
                  <strong>Prochaine action</strong>
                  <p>{program.nextNeed}</p>
                  <div className="tag-row">
                    <Badge tone="neutral">{program.latestEnrollmentLabel}</Badge>
                    <Badge tone={program.readyForRollout ? "success" : "accent"}>
                      {program.readyForRollout ? "Prêt pour rollout" : "Rollout incomplet"}
                    </Badge>
                    <Link className="inline-link" href={program.href}>
                      {program.ctaLabel}
                    </Link>
                  </div>
                </div>

                <div className="program-admin-module-list">
                  {program.modules.map((module) => (
                    <article className="program-admin-module" key={module.id}>
                      <div>
                        <strong>
                          Module {module.position + 1} · {module.title}
                        </strong>
                        {module.description ? <p>{module.description}</p> : null}
                        <small>
                          {module.availableLabel} · {module.assetLabel}
                        </small>
                      </div>

                      <div className="tag-row">
                        <Badge tone={module.statusTone}>{module.status}</Badge>
                        <Badge tone={module.tone}>{module.assetCount} asset(s)</Badge>
                      </div>
                    </article>
                  ))}
                </div>

                <AddProgramModuleForm programId={program.id} />

                {program.recentEnrollments.length ? (
                  <div className="program-admin-enrollment-list">
                    {program.recentEnrollments.map((enrollment) => (
                      <article className="list-row list-row-stretch" key={enrollment.id}>
                        <div>
                          <strong>{enrollment.learner}</strong>
                          <p>{enrollment.context}</p>
                        </div>
                        <small>{enrollment.enrolledAt}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state empty-state-compact">
                    <strong>Aucune activation pour ce parcours.</strong>
                    <p>Utilise le panneau ci-dessus pour le déployer vers un coaché ou une cohorte.</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : programOptions.length ? (
          <div className="empty-state">
            <strong>Aucun parcours pour cette vue filtrée.</strong>
            <p>Réinitialise les filtres pour retrouver tout le catalogue ou crée un nouveau parcours.</p>
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun parcours structuré pour le moment.</strong>
            <p>Le studio est prêt pour créer le premier cursus ECCE et lier ses modules aux contenus et quiz.</p>
          </div>
        )}
      </section>
    </div>
  );
}
