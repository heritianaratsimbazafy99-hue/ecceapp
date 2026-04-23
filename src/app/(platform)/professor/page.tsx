import Link from "next/link";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getProfessorPageData } from "@/lib/platform-data";

export default async function ProfessorPage() {
  const {
    analyticsOverview,
    attentionLearners,
    cohortHealth,
    contentSpotlight,
    metrics,
    quizPulse,
    recentQuizResults
  } = await getProfessorPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Insights professor"
        description="Une vue académique dédiée pour lire la santé des cohortes, repérer les signaux faibles et piloter la qualité pédagogique sans passer par l’admin."
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel panel-highlight professor-hero-panel">
          <div className="panel-header">
            <h3>Cap pédagogique global</h3>
            <p>Une synthèse claire de la dynamique apprenante avant d&apos;entrer dans le détail des cohortes et des quiz.</p>
          </div>

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
                ? "Cohortes saines"
                : analyticsOverview.averageScore >= 45
                  ? "Surveillance utile"
                  : "Relance prioritaire"
            }
            caption={`${analyticsOverview.totalAssignments} assignations actives · ${analyticsOverview.totalPublishedContents} contenus publiés`}
            score={analyticsOverview.averageScore}
            trend={analyticsOverview.atRiskCount > 0 ? "down" : "steady"}
            trendLabel={
              analyticsOverview.atRiskCount > 0
                ? `${analyticsOverview.atRiskCount} coaché(s) demandent une attention rapide`
                : "dynamique globale stable"
            }
          />

          <div className="professor-hero-actions">
            <Link className="button" href="/library">
              Explorer la bibliothèque
            </Link>
            <Link className="button button-secondary" href="/notifications">
              Voir les notifications
            </Link>
          </div>
        </div>

        <div className="panel professor-summary-panel">
          <div className="panel-header">
            <h3>Lecture rapide</h3>
            <p>Les points clés à garder en tête avant d&apos;arbitrer vos prochains ajustements pédagogiques.</p>
          </div>

          <div className="professor-summary-list">
            <article>
              <strong>{analyticsOverview.totalLearners}</strong>
              <span>coaché(s) suivis dans la vue professor</span>
            </article>
            <article>
              <strong>{analyticsOverview.completionRate ?? 0}%</strong>
              <span>complétion moyenne</span>
            </article>
            <article>
              <strong>{analyticsOverview.onTimeRate ?? 0}%</strong>
              <span>ponctualité sur les échéances</span>
            </article>
            <article>
              <strong>{analyticsOverview.strongCount}</strong>
              <span>coaché(s) dans une dynamique forte</span>
            </article>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Santé des cohortes</h3>
          <p>Un radar plus pédagogique des groupes : volume, engagement moyen, vigilance et prochaine intervention utile.</p>
        </div>

        {cohortHealth.length ? (
          <div className="professor-cohort-grid">
            {cohortHealth.map((cohort) => (
              <article className="collection-card professor-cohort-card" key={cohort.id}>
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
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune cohorte disponible.</strong>
            <p>Rattache d&apos;abord des coachés à des cohortes pour voir apparaître la lecture groupée ici.</p>
          </div>
        )}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Coachés à surveiller</h3>
            <p>Les profils qui cumulent retards, faible activité récente ou score d&apos;engagement fragile.</p>
          </div>

          {attentionLearners.length ? (
            <div className="stack-list">
              {attentionLearners.map((learner) => (
                <article className="list-row list-row-stretch" key={learner.id}>
                  <div>
                    <strong>{learner.name}</strong>
                    <p>
                      {learner.lastActivityLabel} · {learner.nextFocus}
                    </p>
                  </div>
                  <div className="list-row-meta">
                    <Badge tone={learner.band === "risk" ? "warning" : "accent"}>{learner.bandLabel}</Badge>
                    <strong>{learner.score}%</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun signal critique pour le moment.</strong>
              <p>La dynamique globale reste saine sur les cohortes visibles.</p>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Pulse quiz récent</h3>
            <p>Une lecture rapide des dernières copies remontées, utile pour sentir le niveau de compréhension réel.</p>
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
              <strong>Aucun résultat quiz pour l&apos;instant.</strong>
              <p>Les tentatives récentes s&apos;afficheront ici dès qu&apos;elles remonteront en base.</p>
            </div>
          )}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Quiz qui structurent le parcours</h3>
            <p>Les quiz les plus utilisés pour sentir où l&apos;évaluation porte réellement l&apos;apprentissage.</p>
          </div>

          {quizPulse.length ? (
            <div className="professor-pulse-list">
              {quizPulse.map((quiz) => (
                <article className="professor-pulse-item" key={quiz.id}>
                  <div>
                    <div className="tag-row">
                      <Badge tone="accent">{quiz.kind}</Badge>
                      <Badge tone="neutral">{quiz.questionCount} question(s)</Badge>
                    </div>
                    <strong>{quiz.title}</strong>
                    <p>
                      {quiz.attemptCount} tentative(s)
                      {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : " · temps libre"}
                    </p>
                  </div>
                  <Badge tone={quiz.averageScore !== null && quiz.averageScore >= 70 ? "success" : "warning"}>
                    {quiz.averageScore !== null ? `${quiz.averageScore}%` : "n/a"}
                  </Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun quiz publié.</strong>
              <p>Publie un quiz depuis le studio admin pour le voir apparaître ici.</p>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Ressources pédagogiques en avant</h3>
            <p>Les contenus publiés les plus structurants, selon leur présence dans le parcours et leurs quiz liés.</p>
          </div>

          {contentSpotlight.length ? (
            <div className="professor-content-grid">
              {contentSpotlight.map((content) => (
                <article className="collection-card professor-content-card" key={content.id}>
                  <div className="tag-row">
                    <Badge tone="success">{content.contentType}</Badge>
                    <Badge tone="neutral">{content.category}</Badge>
                  </div>
                  <strong>{content.title}</strong>
                  <p>{content.summary}</p>
                  <div className="professor-content-meta">
                    <span>{content.estimatedMinutes ? `${content.estimatedMinutes} min` : "durée libre"}</span>
                    <span>{content.assignmentCount} assignation(s)</span>
                    <span>{content.linkedQuizCount} quiz lié(s)</span>
                  </div>
                  <div className="assignment-card-footer">
                    <Link className="button button-secondary button-small" href={`/library/${content.slug}`}>
                      Voir la ressource
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune ressource publiée.</strong>
              <p>Publie des contenus depuis le studio admin pour alimenter ce radar pédagogique.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
