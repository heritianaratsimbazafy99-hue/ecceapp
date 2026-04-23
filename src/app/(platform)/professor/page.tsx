import Link from "next/link";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getProfessorPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function getBandTone(band: "risk" | "watch" | "strong") {
  switch (band) {
    case "risk":
      return "warning";
    case "watch":
      return "accent";
    default:
      return "success";
  }
}

function buildProfessorHref({
  query,
  cohortId,
  band
}: {
  query?: string;
  cohortId?: string;
  band?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (cohortId) {
    searchParams.set("cohort", cohortId);
  }

  if (band && band !== "all") {
    searchParams.set("band", band);
  }

  const value = searchParams.toString();
  return value ? `/professor?${value}` : "/professor";
}

export default async function ProfessorPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    cohort?: string;
    band?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    analyticsOverview,
    attentionLearners,
    bandBreakdown,
    baseline,
    championLearners,
    cohortHealth,
    cohortOptions,
    contentSpotlight,
    filters,
    focusCohort,
    learnerSpotlights,
    metrics,
    pedagogicalFeed,
    priorityActions,
    quizWatchlist,
    recentQuizResults
  } = await getProfessorPageData({
    query: params.query,
    cohortId: params.cohort,
    band: params.band
  });

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Insights professor"
        description="Cockpit professor premium pour arbitrer la santé pédagogique, filtrer les cohortes et transformer les signaux faibles en décisions rapides."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight professor-command-hero">
        <div className="professor-command-copy">
          <span className="eyebrow">Intelligence pédagogique</span>
          <h3>Une lecture professor enfin construite pour agir, pas seulement pour observer.</h3>
          <p>
            {focusCohort
              ? `${focusCohort.name} concentre actuellement le point d'attention principal. ${focusCohort.statusLabel}.`
              : "Le cockpit se remplira dès que des cohortes et des apprenants seront visibles dans ECCE."}
          </p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {focusCohort ? <Badge tone={focusCohort.tone}>{focusCohort.name}</Badge> : null}
            <Badge tone={analyticsOverview.averageScore >= baseline.averageScore ? "success" : "warning"}>
              baseline {baseline.averageScore}%
            </Badge>
          </div>

          <div className="professor-command-actions">
            <Link className="button" href="/agenda">
              Piloter les échéances
            </Link>
            <Link className="button button-secondary" href="/admin/programs">
              Ouvrir les programmes
            </Link>
            <Link className="button button-secondary" href="/library">
              Explorer la bibliothèque
            </Link>
          </div>
        </div>

        <div className="professor-command-meter">
          <EngagementMeter
            band={
              analyticsOverview.averageScore >= 75
                ? "strong"
                : analyticsOverview.averageScore >= 45
                  ? "watch"
                  : "risk"
            }
            bandLabel={
              analyticsOverview.averageScore >= 75
                ? "Cadence solide"
                : analyticsOverview.averageScore >= 45
                  ? "Équilibre à surveiller"
                  : "Relance prioritaire"
            }
            caption={`${analyticsOverview.totalAssignments} assignation(s) actives · ${analyticsOverview.totalPublishedContents} ressource(s) publiées`}
            score={analyticsOverview.averageScore}
            trend={analyticsOverview.atRiskCount > 0 ? "down" : "steady"}
            trendLabel={
              analyticsOverview.atRiskCount > 0
                ? `${analyticsOverview.atRiskCount} apprenant(s) demandent une relance rapide`
                : "dynamique stable sur le périmètre visible"
            }
          />

          <div className="professor-band-grid">
            {bandBreakdown.map((band) => (
              <Link
                className={cn("professor-band-card", band.isActive && "is-active")}
                href={buildProfessorHref({
                  query: filters.query,
                  cohortId: filters.cohortId,
                  band: filters.band === band.id ? "all" : band.id
                })}
                key={band.id}
              >
                <span>{band.label}</span>
                <strong>{band.count}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="professor-command-layout">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Filtrer le cockpit</span>
              <h3>Recherche, cohorte et bande d&apos;engagement</h3>
              <p>Réduis la vue au groupe utile avant de lire les priorités, le radar apprenants et la watchlist quiz.</p>
            </div>

            <Link className="button button-secondary" href="/professor">
              Réinitialiser
            </Link>
          </div>

          <form className="professor-filter-form" method="get">
            <label className="conversation-search">
              <span>Recherche</span>
              <input defaultValue={filters.query} name="query" placeholder="Nom, cohorte, focus pédagogique" type="search" />
            </label>

            <label className="conversation-composer-field">
              <span>Cohorte</span>
              <select defaultValue={filters.cohortId} name="cohort">
                <option value="">Toutes les cohortes</option>
                {cohortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.memberCount} coaché(s)
                  </option>
                ))}
              </select>
            </label>

            <label className="conversation-composer-field">
              <span>Bande</span>
              <select defaultValue={filters.band} name="band">
                <option value="all">Toutes les bandes</option>
                <option value="risk">à risque</option>
                <option value="watch">à surveiller</option>
                <option value="strong">solide</option>
              </select>
            </label>

            <div className="professor-filter-actions">
              <button className="button" type="submit">
                Appliquer
              </button>
            </div>
          </form>

          <div className="professor-filter-summary">
            <article>
              <strong>{analyticsOverview.totalLearners}</strong>
              <span>coaché(s) suivis dans l&apos;organisation</span>
            </article>
            <article>
              <strong>{baseline.learnersWithoutCohort}</strong>
              <span>coaché(s) encore sans cohorte</span>
            </article>
            <article>
              <strong>{analyticsOverview.completionRate ?? 0}%</strong>
              <span>complétion moyenne sur la vue courante</span>
            </article>
            <article>
              <strong>{analyticsOverview.onTimeRate ?? 0}%</strong>
              <span>ponctualité moyenne visible</span>
            </article>
          </div>
        </section>

        <aside className="professor-side-stack">
          <section className="panel professor-focus-panel">
            <div className="panel-header">
              <h3>Cohorte focus</h3>
              <p>La cohorte la plus utile à lire maintenant, ou celle explicitement ciblée par ton filtre.</p>
            </div>

            {focusCohort ? (
              <>
                <div className="professor-focus-metrics">
                  <article>
                    <strong>{focusCohort.averageScore}%</strong>
                    <span>engagement moyen</span>
                  </article>
                  <article>
                    <strong>{focusCohort.memberCount}</strong>
                    <span>coaché(s) visibles</span>
                  </article>
                  <article>
                    <strong>{focusCohort.shareOfPopulation}%</strong>
                    <span>du portefeuille professor</span>
                  </article>
                  <article>
                    <strong>{focusCohort.completionRate ?? 0}%</strong>
                    <span>complétion moyenne</span>
                  </article>
                </div>

                <div className="stack-list">
                  {focusCohort.learners.map((learner) => (
                    <article className="list-row list-row-stretch" key={learner.id}>
                      <div>
                        <strong>{learner.name}</strong>
                        <p>
                          {learner.lastActivityLabel} · {learner.nextFocus}
                        </p>
                      </div>
                      <div className="list-row-meta">
                        <Badge tone={getBandTone(learner.band)}>{learner.bandLabel}</Badge>
                        <strong>{learner.score}%</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>Aucune cohorte à lire.</strong>
                <p>Rattache d&apos;abord des coachés à des cohortes pour voir apparaître le focus ici.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Priorités professor</h3>
              <p>Quatre actions concrètes dérivées du radar actuel pour accélérer la prochaine décision.</p>
            </div>

            <div className="professor-priority-list">
              {priorityActions.map((action) => (
                <article className="professor-priority-card" key={action.id}>
                  <div className="tag-row">
                    <Badge tone={action.tone}>{action.eyebrow}</Badge>
                  </div>
                  <strong>{action.title}</strong>
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
            <h3>Radar cohortes</h3>
            <p>Lecture comparative des groupes, avec mise en avant de la cohorte focus pour arbitrer plus vite.</p>
          </div>

          <div className="messaging-inline-stats">
            <article>
              <strong>{cohortHealth.length}</strong>
              <span>cohorte(s) actives</span>
            </article>
            <article>
              <strong>{analyticsOverview.strongCount}</strong>
              <span>apprenants solides</span>
            </article>
            <article>
              <strong>{analyticsOverview.watchCount}</strong>
              <span>apprenants à surveiller</span>
            </article>
            <article>
              <strong>{analyticsOverview.atRiskCount}</strong>
              <span>apprenants à risque</span>
            </article>
          </div>
        </div>

        {cohortHealth.length ? (
          <div className="professor-cohort-grid">
            {cohortHealth.map((cohort) => (
              <Link
                className={cn("collection-card professor-cohort-card", cohort.isActive && "is-active")}
                href={buildProfessorHref({
                  query: filters.query,
                  band: filters.band,
                  cohortId: filters.cohortId === cohort.id ? "" : cohort.id
                })}
                key={cohort.id}
              >
                <div className="tag-row">
                  <Badge tone={cohort.tone}>{cohort.averageScore}%</Badge>
                  <Badge tone="neutral">{cohort.memberCount} coaché(s)</Badge>
                </div>
                <strong>{cohort.name}</strong>
                <p>{cohort.topFocus}</p>
                <div className="professor-cohort-kpis">
                  <div>
                    <strong>{cohort.atRiskCount}</strong>
                    <span>à risque</span>
                  </div>
                  <div>
                    <strong>{cohort.watchCount}</strong>
                    <span>à surveiller</span>
                  </div>
                  <div>
                    <strong>{cohort.completionRate ?? 0}%</strong>
                    <span>complétion</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune cohorte disponible.</strong>
            <p>Le radar cohortes s&apos;activera dès que des groupes seront constitués dans l&apos;admin.</p>
          </div>
        )}
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header-rich">
            <div>
              <h3>Radar apprenants</h3>
              <p>Les profils les plus utiles à lire dans la vue courante, avec leurs tensions réelles et leur prochaine marche.</p>
            </div>

            <div className="messaging-inline-stats">
              <article>
                <strong>{learnerSpotlights.length}</strong>
                <span>cartes visibles</span>
              </article>
              <article>
                <strong>{attentionLearners.length}</strong>
                <span>signaux à traiter</span>
              </article>
            </div>
          </div>

          {learnerSpotlights.length ? (
            <div className="professor-learner-grid">
              {learnerSpotlights.map((learner) => (
                <article className="professor-learner-card" key={learner.id}>
                  <div className="professor-learner-card-head">
                    <div>
                      <strong>{learner.name}</strong>
                      <p>{learner.cohorts.length ? learner.cohorts.join(", ") : "Sans cohorte"}</p>
                    </div>
                    <Badge tone={getBandTone(learner.band)}>{learner.bandLabel}</Badge>
                  </div>

                  <p className="professor-learner-card-copy">{learner.nextFocus}</p>

                  <div className="professor-learner-meta">
                    <span>{learner.score}% score</span>
                    <span>
                      {learner.completionRate !== null ? `${learner.completionRate}% complétion` : "Complétion en construction"}
                    </span>
                    <span>
                      {learner.averageQuizScore !== null ? `${learner.averageQuizScore}% quiz` : "Quiz non notés"}
                    </span>
                    <span>{learner.lastActivityLabel}</span>
                  </div>

                  <div className="tag-row">
                    {learner.overdueCount ? <Badge tone="warning">{learner.overdueCount} retard(s)</Badge> : null}
                    {learner.dueSoonCount ? <Badge tone="accent">{learner.dueSoonCount} à venir</Badge> : null}
                    <Badge tone="neutral">{learner.recentActivityCount} activité(s)</Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun apprenant ne correspond aux filtres.</strong>
              <p>Élargis la cohorte, la bande ou la recherche pour réouvrir le radar professor.</p>
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="panel-header">
            <h3>Dynamique positive</h3>
            <p>Les profils qui peuvent servir de repère ou de benchmark pédagogique dans la vue active.</p>
          </div>

          {championLearners.length ? (
            <div className="stack-list">
              {championLearners.map((learner) => (
                <article className="list-row list-row-stretch" key={learner.id}>
                  <div>
                    <strong>{learner.name}</strong>
                    <p>
                      {learner.trendLabel} · {learner.nextFocus}
                    </p>
                  </div>
                  <div className="list-row-meta">
                    <Badge tone={getBandTone(learner.band)}>{learner.bandLabel}</Badge>
                    <strong>{learner.score}%</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune dynamique visible.</strong>
              <p>Le panneau se remplira dès qu&apos;un groupe d&apos;apprenants remontera dans la vue professor.</p>
            </div>
          )}
        </aside>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Watchlist quiz</h3>
            <p>Les évaluations les plus utiles à recalibrer selon la compréhension réelle remontée en base.</p>
          </div>

          {quizWatchlist.length ? (
            <div className="professor-quiz-list">
              {quizWatchlist.map((quiz) => (
                <article className="professor-quiz-card" key={quiz.id}>
                  <div className="tag-row">
                    <Badge tone={quiz.signalTone}>{quiz.signalLabel}</Badge>
                    <Badge tone="neutral">{quiz.questionCount} question(s)</Badge>
                  </div>
                  <strong>{quiz.title}</strong>
                  <p>{quiz.insight}</p>
                  <div className="professor-quiz-meta">
                    <span>{quiz.attemptCount} tentative(s)</span>
                    <span>{quiz.averageScore !== null ? `${quiz.averageScore}% moyen` : "Score en attente"}</span>
                    <span>{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "Temps libre"}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun quiz publié.</strong>
              <p>Les quiz publiés apparaîtront ici avec leur niveau de fragilité pédagogique.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Copies récentes</h3>
            <p>Les dernières tentatives remontées pour sentir immédiatement le niveau de compréhension visible.</p>
          </div>

          {recentQuizResults.length ? (
            <div className="stack-list">
              {recentQuizResults.map((result) => (
                <article className="list-row list-row-stretch" key={result.id}>
                  <div>
                    <strong>{result.learner}</strong>
                    <p>
                      {result.quizTitle} · {result.attemptLabel} · {result.submittedAt}
                    </p>
                  </div>
                  <Badge tone={result.tone}>{result.score}</Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune copie visible.</strong>
              <p>Les tentatives récentes réapparaîtront ici dès qu&apos;elles correspondront au périmètre filtré.</p>
            </div>
          )}
        </section>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Ressources pivots</h3>
            <p>Les contenus les plus structurants du moment, d&apos;après les assignations et les quiz qui les prolongent.</p>
          </div>

          {contentSpotlight.length ? (
            <div className="professor-resource-grid">
              {contentSpotlight.map((content) => (
                <article className="collection-card professor-resource-card" key={content.id}>
                  <div className="tag-row">
                    <Badge tone="success">{content.contentType}</Badge>
                    <Badge tone="neutral">{content.category}</Badge>
                  </div>
                  <strong>{content.title}</strong>
                  <p>{content.summary}</p>
                  <div className="professor-resource-meta">
                    <span>{content.estimatedMinutes ? `${content.estimatedMinutes} min` : "Durée libre"}</span>
                    <span>{content.assignmentCount} assignation(s)</span>
                    <span>{content.linkedQuizCount} quiz lié(s)</span>
                  </div>
                  <Link className="button button-secondary button-small" href={`/library/${content.slug}`}>
                    Voir la ressource
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune ressource visible.</strong>
              <p>Publie ou élargis la recherche pour alimenter la partie bibliothèque du cockpit professor.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Feed pédagogique</h3>
            <p>Un flux utile des copies, soumissions et séances pour garder la lecture opérationnelle sans retourner dans l&apos;admin.</p>
          </div>

          {pedagogicalFeed.length ? (
            <div className="stack-list">
              {pedagogicalFeed.map((item) => (
                <article className="list-row list-row-stretch" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.type} · {item.description}
                    </p>
                  </div>
                  <div className="list-row-meta">
                    <Badge tone={item.tone}>{item.type}</Badge>
                    <span>{item.createdAtLabel}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun flux récent sur ce périmètre.</strong>
              <p>Le feed professor se remplira dès qu&apos;une activité pédagogique correspondra à la vue courante.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
