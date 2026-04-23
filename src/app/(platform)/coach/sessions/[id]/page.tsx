import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachingSessionNoteForm } from "@/app/(platform)/coach/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getCoachSessionPageData } from "@/lib/platform-data";

export default async function CoachSessionPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCoachSessionPageData(id);

  if (!data) {
    notFound();
  }

  const { coach, learner, learnerSnapshot, metrics, notes, session } = data;

  return (
    <div className="page-shell">
      <PlatformTopbar
        actions={
          <>
            <Link className="button button-secondary" href="/agenda">
              Agenda
            </Link>
            {learner ? (
              <Link className="button" href={`/coach/learners/${learner.id}`}>
                Fiche coaché
              </Link>
            ) : null}
          </>
        }
        title={learner ? `Séance · ${learner.name}` : "Séance de coaching"}
        description="Workspace de séance pour préparer, documenter et transformer un échange coach en prochaines actions concrètes."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight session-workspace-hero">
        <div className="session-workspace-copy">
          <span className="eyebrow">Session Workspace</span>
          <h3>Documenter la séance pendant que le contexte est encore vivant.</h3>
          <p>
            Relie le rendez-vous au coaché, aux signaux récents et aux prochaines actions pour éviter que
            l’accompagnement se perde dans des notes dispersées.
          </p>

          <div className="tag-row">
            <Badge tone={session.statusTone}>{session.status}</Badge>
            <Badge tone="accent">{session.dayLabel}</Badge>
            {session.cohort ? <Badge tone="neutral">{session.cohort}</Badge> : <Badge tone="neutral">1:1</Badge>}
          </div>

          <div className="session-workspace-actions">
            {session.videoLink ? (
              <Link className="button" href={session.videoLink} target="_blank">
                Rejoindre la visio
              </Link>
            ) : null}
            {learner ? (
              <Link className="button button-secondary" href={`/coach/learners/${learner.id}`}>
                Ouvrir la fiche
              </Link>
            ) : null}
          </div>
        </div>

        <div className="session-workspace-side">
          <article>
            <span className="eyebrow">Créneau</span>
            <strong>{session.date}</strong>
            <p>{session.timeLabel}</p>
          </article>

          <article>
            <span className="eyebrow">Cadre</span>
            <strong>{coach?.name ?? "Coach"}</strong>
            <p>{learner ? `Coaché · ${learner.name}` : "Coaché indisponible"}</p>
          </article>
        </div>
      </section>

      <section className="session-workspace-layout">
        <div className="session-workspace-main">
          <section className="panel">
            <div className="panel-header-rich">
              <div>
                <h3>Note de séance</h3>
                <p>Ajoute un résumé, les blocages et les prochaines actions. Chaque sauvegarde crée une trace horodatée.</p>
              </div>
              <Badge tone={session.statusTone}>{session.status}</Badge>
            </div>

            <CoachingSessionNoteForm defaultStatus={session.status} sessionId={session.id} />
          </section>

          <section className="panel">
            <div className="panel-header-rich">
              <div>
                <h3>Historique des notes</h3>
                <p>Les notes les plus récentes remontent d’abord pour garder le fil de l’accompagnement.</p>
              </div>
              <Badge tone="neutral">{notes.length} note(s)</Badge>
            </div>

            {notes.length ? (
              <div className="session-note-list">
                {notes.map((note) => (
                  <article className="session-note-card" key={note.id}>
                    <div className="session-note-card-head">
                      <div>
                        <strong>{note.authorName}</strong>
                        <p>{note.createdAt}</p>
                      </div>
                      <Badge tone="accent">note coach</Badge>
                    </div>

                    {note.summary ? (
                      <div>
                        <span className="eyebrow">Résumé</span>
                        <p>{note.summary}</p>
                      </div>
                    ) : null}
                    {note.blockers ? (
                      <div>
                        <span className="eyebrow">Blocages</span>
                        <p>{note.blockers}</p>
                      </div>
                    ) : null}
                    {note.nextActions ? (
                      <div>
                        <span className="eyebrow">Prochaines actions</span>
                        <p>{note.nextActions}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>Aucune note enregistrée.</strong>
                <p>Ajoute une première trace pour rendre cette séance exploitable dans le suivi coach.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="session-workspace-context">
          <section className="panel">
            <div className="panel-header">
              <h3>Signal coaché</h3>
              <p>Contexte rapide avant de rédiger la note ou préparer le prochain échange.</p>
            </div>

            {learner?.engagement ? (
              <EngagementMeter
                band={learner.engagement.band}
                bandLabel={learner.engagement.bandLabel}
                caption={`${learner.engagement.assignmentCount} assignation(s) · ${learner.engagement.recentActivityCount} activité(s) récentes`}
                compact
                score={learner.engagement.score}
                trend={learner.engagement.trend}
                trendLabel={learner.engagement.trendLabel}
              />
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Signal encore léger.</strong>
                <p>Le score se consolidera après quelques actions pédagogiques.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>À regarder avant la séance</h3>
              <p>Dernières assignations, copies et rendus qui peuvent nourrir l’échange.</p>
            </div>

            {learnerSnapshot ? (
              <div className="session-context-stack">
                {learnerSnapshot.assignments.slice(0, 3).map((assignment) => (
                  <article className="session-context-card" key={assignment.id}>
                    <Badge tone={assignment.statusTone}>{assignment.statusLabel}</Badge>
                    <strong>{assignment.title}</strong>
                    <p>
                      {assignment.assetTitle} · {assignment.latestResult}
                    </p>
                  </article>
                ))}

                {learnerSnapshot.attempts.slice(0, 2).map((attempt) => (
                  <article className="session-context-card" key={attempt.id}>
                    <Badge tone={attempt.status === "graded" ? "success" : "accent"}>{attempt.score}</Badge>
                    <strong>{attempt.title}</strong>
                    <p>{attempt.meta}</p>
                  </article>
                ))}

                {learnerSnapshot.submissions.slice(0, 2).map((submission) => (
                  <article className="session-context-card" key={submission.id}>
                    <Badge tone={submission.statusTone}>{submission.statusLabel}</Badge>
                    <strong>{submission.title}</strong>
                    <p>{submission.contentTitle}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun contexte disponible.</strong>
                <p>La fiche coaché se remplira avec les prochains rendus et quiz.</p>
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
