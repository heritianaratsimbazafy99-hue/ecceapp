"use client";

import { useActionState, useState } from "react";

import { CelebrationBurst } from "@/components/feedback/celebration-burst";
import {
  submitAssignmentAction,
  type AssignmentActionState
} from "@/app/(platform)/assignments/actions";
import { Badge } from "@/components/ui/badge";

const initialState: AssignmentActionState = {};

export function AssignmentSubmissionForm({
  assignmentId,
  assignmentTitle,
  due,
  contentTitle,
  resourceReady
}: {
  assignmentId: string;
  assignmentTitle: string;
  due: string;
  contentTitle: string;
  resourceReady: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitAssignmentAction, initialState);
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const noteStrength =
    notes.trim().length >= 280 ? "complet" : notes.trim().length >= 120 ? "solide" : notes.trim().length ? "léger" : "vide";

  return (
    <form action={formAction} className="assignment-submission-studio admin-form" encType="multipart/form-data">
      <input name="assignment_id" type="hidden" value={assignmentId} />

      <CelebrationBurst
        active={Boolean(state.success)}
        triggerKey={state.success ?? ""}
        body="Ton rendu a bien été enregistré dans ECCE."
        title="Soumission envoyée"
      />

      <div className="assignment-submission-main">
        <section className="panel panel-highlight assignment-submission-hero">
          <div className="assignment-submission-copy">
            <span className="eyebrow">Submission Studio</span>
            <h3>Déposer un rendu clair, contextualisé et facile à relire côté coach</h3>
            <p>Ajoute du contexte utile, joins ton support si nécessaire et rends la relecture plus fluide dès le premier envoi.</p>
          </div>

          <div className="assignment-submission-metrics">
            <article>
              <strong>{notes.trim().length}</strong>
              <span>caractères de contexte</span>
            </article>
            <article>
              <strong>{fileName ? "1" : "0"}</strong>
              <span>pièce jointe</span>
            </article>
            <article>
              <strong>{noteStrength}</strong>
              <span>niveau de détail</span>
            </article>
          </div>
        </section>

        <section className="panel assignment-submission-panel">
          <div className="panel-header">
            <h3>Contexte à transmettre</h3>
            <p>Donne au coach les bonnes clés de lecture avant même l’ouverture du document.</p>
          </div>

          <div className="assignment-submission-grid">
            <label className="form-grid-span">
              Notes pour le coach
              <textarea
                name="notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ajoute ici le contexte, les difficultés rencontrées, ce que tu veux faire relire ou la décision que tu as prise."
                rows={7}
                value={notes}
              />
            </label>
            <label className="form-grid-span">
              Fichier
              <input
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                name="attachment"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
                type="file"
              />
            </label>
          </div>

          <div className="assignment-submission-tips">
            <article>
              <strong>Ce qui aide le plus</strong>
              <p>Explique ce que tu as voulu produire, ce qui te semble fort, et où tu veux un retour précis.</p>
            </article>
            <article>
              <strong>Format accepté</strong>
              <p>PDF, Word, PowerPoint, texte ou capture. Le but est d’envoyer un support facile à revoir.</p>
            </article>
          </div>
        </section>

        <section className="panel panel-subtle">
          <div className="panel-header">
            <h3>Validation finale</h3>
            <p>Envoie soit un contexte écrit, soit un fichier, soit les deux pour une revue plus complète.</p>
          </div>

          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}

          <button className="button" disabled={pending} type="submit">
            {pending ? "Envoi..." : "Envoyer ma soumission"}
          </button>
        </section>
      </div>

      <aside className="assignment-submission-side">
        <section className="panel panel-accent">
          <div className="panel-header">
            <h3>Aperçu du rendu</h3>
            <p>Tu vois ici la manière dont ton envoi se présente dans le parcours ECCE.</p>
          </div>

          <article className="assignment-submission-preview">
            <div className="tag-row">
              <Badge tone={resourceReady ? "success" : "neutral"}>{resourceReady ? "ressource prête" : "sans lien"}</Badge>
              <Badge tone={fileName ? "accent" : "neutral"}>{fileName ? "avec pièce jointe" : "notes seules possibles"}</Badge>
            </div>

            <div className="assignment-submission-preview-copy">
              <strong>{assignmentTitle}</strong>
              <p>{contentTitle}</p>
            </div>

            <div className="assignment-submission-preview-meta">
              <span>{due}</span>
              <span>{fileName || "Aucun fichier sélectionné"}</span>
            </div>

            <div className="assignment-submission-preview-note">
              <small>Résumé de ton message</small>
              <p>
                {notes.trim()
                  ? notes.trim().length > 220
                    ? `${notes.trim().slice(0, 217)}...`
                    : notes.trim()
                  : "Ton message apparaîtra ici pour que tu puisses relire ce que le coach recevra."}
              </p>
            </div>
          </article>
        </section>
      </aside>
    </form>
  );
}
