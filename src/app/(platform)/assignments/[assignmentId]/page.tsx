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
        description="Consulte la ressource associée puis dépose ici ton rendu pour déclencher le circuit de relecture coach."
      />

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Détails de l&apos;assignation</h3>
            <p>Échéance {assignment.due}</p>
          </div>

          <div className="stack-list">
            <div className="list-row list-row-stretch">
              <div>
                <strong>{assignment.contentTitle}</strong>
                <p>{assignment.contentMeta}</p>
              </div>
              <Badge tone="accent">contenu</Badge>
            </div>

            {assignment.resourceUrl ? (
              <Link className="button button-secondary" href={assignment.resourceUrl} target="_blank">
                Ouvrir la ressource
              </Link>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Historique de tes rendus</h3>
            <p>Chaque soumission reste traçable avec son éventuel feedback.</p>
          </div>

          {submissions.length ? (
            <div className="stack-list">
              {submissions.map((submission) => (
                <article className="list-row list-row-stretch" key={submission.id}>
                  <div>
                    <strong>{submission.title}</strong>
                    <p>{submission.submittedAt}</p>
                    {submission.notes ? <p>{submission.notes}</p> : null}
                    {submission.review ? (
                      <p>
                        Feedback : {submission.review.feedback}
                        {submission.review.grade !== null ? ` · note ${submission.review.grade}/100` : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="table-actions">
                    <Badge tone={submission.status === "reviewed" ? "success" : "warning"}>
                      {submission.status}
                    </Badge>
                    {submission.fileUrl ? (
                      <Link className="button button-secondary button-small" href={submission.fileUrl} target="_blank">
                        Télécharger
                      </Link>
                    ) : null}
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
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Déposer un rendu</h3>
          <p>Tu peux envoyer une note seule, un document, ou les deux.</p>
        </div>

        <AssignmentSubmissionForm assignmentId={assignment.id} />
      </section>
    </div>
  );
}
