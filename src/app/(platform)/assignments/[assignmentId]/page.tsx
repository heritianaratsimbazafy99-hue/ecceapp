import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { Badge } from "@/components/ui/badge";
import { getAssignmentPageData } from "@/lib/platform-data";

import { AssignmentSubmissionForm } from "./form";

export default async function AssignmentPage({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const { assignment, submissions } = await getAssignmentPageData(assignmentId);

  if (!assignment) {
    notFound();
  }

  if (assignment.quizId) {
    redirect(`/quiz/${assignment.quizId}?assignment=${assignment.id}`);
  }

  return (
    <div className="page-shell">
      <PlatformTopbar
        title={assignment.title}
        description="Une expérience plus claire pour consulter la ressource, comprendre l’attendu et déposer un rendu propre."
      />

      <section className="assignment-page-shell">
        <section className="panel panel-highlight assignment-page-hero">
          <div className="assignment-page-copy">
            <span className="eyebrow">Assignment Experience</span>
            <h3>Consulte la ressource, comprends le niveau d’attendu et envoie un rendu relisible du premier coup</h3>
            <p>{assignment.contentSummary}</p>
          </div>

          <div className="assignment-page-metrics">
            <article>
              <strong>{assignment.due}</strong>
              <span>échéance</span>
            </article>
            <article>
              <strong>{assignment.submissionCount}</strong>
              <span>rendu(s) déjà envoyés</span>
            </article>
            <article>
              <strong>{assignment.latestSubmissionStatus}</strong>
              <span>dernier état</span>
            </article>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel assignment-resource-panel">
            <div className="panel-header">
              <h3>Ressource et consigne</h3>
              <p>Tout ce qu’il faut pour comprendre le cadre avant de soumettre.</p>
            </div>

            <article className="assignment-resource-card">
              <div className="tag-row">
                <Badge tone="accent">contenu</Badge>
                <Badge tone={assignment.dueTone}>{assignment.dueLabel}</Badge>
                {assignment.isRequired ? <Badge tone="warning">obligatoire</Badge> : null}
              </div>

              <div className="assignment-resource-copy">
                <strong>{assignment.contentTitle}</strong>
                <p>{assignment.contentMeta}</p>
                <p>{assignment.contentSummary}</p>
              </div>

              {assignment.tags.length ? (
                <div className="collection-tags">
                  {assignment.tags.map((tag) => (
                    <span className="collection-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="assignment-resource-actions">
                {assignment.resourceUrl ? (
                  <Link className="button button-secondary" href={assignment.resourceUrl} target="_blank">
                    Ouvrir la ressource
                  </Link>
                ) : (
                  <span className="form-hint">Cette assignation n’a pas de lien externe, mais le rendu peut déjà être déposé.</span>
                )}
              </div>
            </article>
          </div>

          <div className="panel assignment-guidance-panel">
            <div className="panel-header">
              <h3>Repères de dépôt</h3>
              <p>Quelques points pour rendre la revue coach plus rapide et plus utile.</p>
            </div>

            <div className="assignment-guidance-list">
              <article>
                <strong>Explique ta logique</strong>
                <p>Dis ce que tu as voulu faire, ce qui t’a bloqué, et où tu veux un feedback précis.</p>
              </article>
              <article>
                <strong>Ajoute un support si utile</strong>
                <p>Un PDF, une présentation ou une capture aident souvent à accélérer la relecture.</p>
              </article>
              <article>
                <strong>Réutilise l’historique</strong>
                <p>Si tu renvoies une nouvelle version, appuie-toi sur le feedback précédent pour montrer la progression.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="panel assignment-history-panel">
          <div className="panel-header">
            <h3>Historique de tes rendus</h3>
            <p>Chaque soumission reste traçable avec son éventuel feedback.</p>
          </div>

          {submissions.length ? (
            <div className="assignment-history-grid">
              {submissions.map((submission) => (
                <article className="collection-card assignment-history-card" key={submission.id}>
                  <div className="tag-row">
                    <Badge tone={submission.statusTone}>{submission.statusLabel}</Badge>
                    {submission.reviewLabel ? <Badge tone="success">{submission.reviewLabel}</Badge> : null}
                  </div>

                  <div className="assignment-history-copy">
                    <strong>{submission.title}</strong>
                    <p>{submission.submittedAt}</p>
                    {submission.notes ? <p>{submission.notes}</p> : null}
                    {submission.review ? (
                      <div className="assignment-review-summary">
                        <strong>Feedback coach</strong>
                        <p>
                          {submission.review.feedback}
                          {submission.review.grade !== null ? ` · note ${submission.review.grade}/100` : ""}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="assignment-history-actions">
                    {submission.fileUrl ? (
                      <Link className="button button-secondary button-small" href={submission.fileUrl} target="_blank">
                        Télécharger
                      </Link>
                    ) : (
                      <span className="form-hint">Aucun fichier joint</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune soumission pour l&apos;instant.</strong>
              <p>Dépose ton premier rendu ci-dessous pour déclencher la relecture coach.</p>
            </div>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Déposer un rendu</h3>
          <p>Tu peux envoyer une note seule, un document, ou les deux dans le nouveau studio de soumission.</p>
        </div>

        <AssignmentSubmissionForm
          assignmentId={assignment.id}
          assignmentTitle={assignment.title}
          contentTitle={assignment.contentTitle}
          due={assignment.due}
          resourceReady={Boolean(assignment.resourceUrl)}
        />
      </section>
    </div>
  );
}
