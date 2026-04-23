import Link from "next/link";
import { notFound } from "next/navigation";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getProfessorQuizDetailPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

export default async function ProfessorQuizDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProfessorQuizDetailPageData(id);

  if (!data) {
    notFound();
  }

  const {
    cohortStats,
    linkedContent,
    metrics,
    overview,
    priorityActions,
    questionDiagnostics,
    quiz,
    recentAttempts,
    reinforceContents
  } = data;

  return (
    <div className="page-shell">
      <PlatformTopbar
        actions={
          <>
            <Link className="button button-secondary" href="/professor">
              Insights professor
            </Link>
            <Link className="button button-secondary" href="/admin/quizzes">
              Studio quiz
            </Link>
            {linkedContent ? (
              <Link className="button" href={`/library/${linkedContent.slug}`}>
                Ressource liée
              </Link>
            ) : (
              <Link className="button" href="/library">
                Bibliothèque
              </Link>
            )}
          </>
        }
        title={quiz.title}
        description="Vue détail professor pour analyser scores, questions fragiles, cohortes touchées et contenus à renforcer autour d'un quiz."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight quiz-detail-hero">
        <div className="quiz-detail-copy">
          <span className="eyebrow">Quiz professor</span>
          <h3>{overview.recommendation}</h3>
          <p>
            {quiz.description} Seuil de réussite : {quiz.passingScore}% · {quiz.questionCount} question(s) ·{" "}
            {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "temps libre"}.
          </p>

          <div className="tag-row">
            <Badge tone={overview.averageScore !== null && overview.averageScore < quiz.passingScore ? "warning" : "success"}>
              {overview.averageScore !== null ? `${overview.averageScore}% moyen` : "score en attente"}
            </Badge>
            <Badge tone="neutral">{quiz.kind}</Badge>
            <Badge tone={quiz.status === "published" ? "success" : "accent"}>{quiz.status}</Badge>
            <Badge tone="accent">{overview.attemptCount} tentative(s)</Badge>
          </div>

          <div className="quiz-detail-actions">
            <Link className="button" href="#quiz-detail-questions">
              Lire les questions
            </Link>
            {linkedContent ? (
              <Link className="button button-secondary" href={`/library/${linkedContent.slug}`}>
                Ouvrir la ressource
              </Link>
            ) : null}
          </div>
        </div>

        <div className="quiz-detail-meter">
          <EngagementMeter
            band={overview.signalBand}
            bandLabel={
              overview.signalBand === "strong"
                ? "Quiz stable"
                : overview.signalBand === "watch"
                  ? "Quiz à surveiller"
                  : "Quiz fragile"
            }
            caption={`${overview.passRate ?? 0}% réussite · ${overview.fragileQuestionCount} question(s) fragiles`}
            score={overview.averageScore ?? 0}
            trend={overview.fragileQuestionCount > 0 ? "down" : overview.submittedCount > 0 ? "steady" : "up"}
            trendLabel={
              overview.fragileQuestionCount > 0
                ? "recalibrage utile"
                : overview.submittedCount > 0
                  ? "corrections à finaliser"
                  : "lecture stable"
            }
          />

          <div className="quiz-detail-pulse-grid">
            <article>
              <strong>{overview.gradedCount}</strong>
              <span>notées</span>
            </article>
            <article>
              <strong>{overview.submittedCount}</strong>
              <span>à corriger</span>
            </article>
            <article>
              <strong>{overview.cohortCount}</strong>
              <span>cohortes</span>
            </article>
          </div>
        </div>
      </section>

      <section className="content-grid" id="quiz-detail-questions">
        <section className="panel">
          <div className="panel-header-rich">
            <div>
              <h3>Questions fragiles</h3>
              <p>Diagnostic par item, basé sur les points attribués et les mauvaises réponses dominantes.</p>
            </div>
            <Badge tone={overview.fragileQuestionCount > 0 ? "warning" : "success"}>
              {overview.fragileQuestionCount} fragile(s)
            </Badge>
          </div>

          {questionDiagnostics.length ? (
            <div className="quiz-detail-question-list">
              {questionDiagnostics.map((question) => (
                <article className={cn("quiz-detail-question-card", question.signalTone === "warning" && "is-fragile")} key={question.id}>
                  <div className="quiz-detail-question-head">
                    <div>
                      <span className="eyebrow">Q{question.position} · {question.questionType}</span>
                      <strong>{question.prompt}</strong>
                    </div>
                    <Badge tone={question.signalTone}>{question.signalLabel}</Badge>
                  </div>

                  <div className="quiz-detail-question-meta">
                    <span>{question.answerCount} réponse(s)</span>
                    <span>{question.mastery !== null ? `${question.mastery}% maîtrise` : "maîtrise en attente"}</span>
                    <span>{question.correctCount} correcte(s)</span>
                    <span>{question.averagePoints !== null ? `${question.averagePoints}/${question.maxPoints} pt moyen` : "points en attente"}</span>
                  </div>

                  <p>{question.topWrongAnswer}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune question disponible.</strong>
              <p>Ajoute des questions au quiz pour activer ce diagnostic.</p>
            </div>
          )}
        </section>

        <aside className="quiz-detail-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Décisions rapides</h3>
              <p>Actions recommandées pour stabiliser ce quiz.</p>
            </div>

            <div className="quiz-detail-priority-list">
              {priorityActions.map((action) => (
                <article className="quiz-detail-priority-card" key={action.id}>
                  <Badge tone={action.tone}>{action.eyebrow}</Badge>
                  <strong>{action.title}</strong>
                  <p>{action.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Tentatives récentes</h3>
              <p>Derniers passages pour repérer vite les copies à lire.</p>
            </div>

            {recentAttempts.length ? (
              <div className="stack-list">
                {recentAttempts.map((attempt) => (
                  <article className="list-row list-row-stretch" key={attempt.id}>
                    <div>
                      <strong>{attempt.learner}</strong>
                      <p>
                        {attempt.cohortLabel} · {attempt.attemptLabel} · {attempt.submittedAt}
                      </p>
                    </div>
                    <Badge tone={attempt.tone}>{attempt.score}</Badge>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune tentative.</strong>
                <p>Le détail se remplira dès que le quiz sera lancé.</p>
              </div>
            )}
          </section>
        </aside>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Cohortes touchées</h3>
            <p>Comparatif des groupes exposés au quiz ou à son contenu lié.</p>
          </div>

          {cohortStats.length ? (
            <div className="quiz-detail-cohort-grid">
              {cohortStats.map((cohort) => (
                <Link className="quiz-detail-cohort-card" href={cohort.href} key={cohort.id}>
                  <div className="tag-row">
                    <Badge tone={cohort.tone}>{cohort.averageScore !== null ? `${cohort.averageScore}%` : "score en attente"}</Badge>
                    <Badge tone="neutral">{cohort.attemptCount} tentative(s)</Badge>
                  </div>
                  <strong>{cohort.name}</strong>
                  <div className="quiz-detail-cohort-meta">
                    <span>{cohort.learnerCount} coaché(s)</span>
                    <span>{cohort.passRate !== null ? `${cohort.passRate}% réussite` : "réussite en attente"}</span>
                    <span>{cohort.assignmentCount} assignation(s)</span>
                    <span>{cohort.submittedCount} correction(s)</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune cohorte exposée.</strong>
              <p>Assigne le quiz ou son contenu pour obtenir une lecture par groupe.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Contenus à renforcer</h3>
            <p>Ressources liées ou proches à mobiliser pour améliorer la compréhension.</p>
          </div>

          {reinforceContents.length ? (
            <div className="quiz-detail-content-list">
              {reinforceContents.map((content) => (
                <article className="quiz-detail-content-card" key={content.id}>
                  <div className="tag-row">
                    <Badge tone={content.isLinked ? "success" : "accent"}>{content.isLinked ? "lié" : "renfort"}</Badge>
                    <Badge tone="neutral">{content.category}</Badge>
                  </div>
                  <strong>{content.title}</strong>
                  <p>{content.summary}</p>
                  <div className="quiz-detail-content-meta">
                    <span>{content.assignmentCount} assignation(s)</span>
                    <span>{content.estimatedMinutes ? `${content.estimatedMinutes} min` : "durée libre"}</span>
                    <span>{content.contentType}</span>
                  </div>
                  <Link className="button button-secondary button-small" href={`/library/${content.slug}`}>
                    Voir
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun contenu support.</strong>
              <p>Relie une ressource au quiz pour structurer la remédiation.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
