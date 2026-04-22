"use client";

import { useActionState, useState } from "react";

import { createAssignmentAction, type AdminActionState } from "@/app/(platform)/admin/actions";
import { CelebrationBurst } from "@/components/feedback/celebration-burst";
import { Badge } from "@/components/ui/badge";

type SelectOption = {
  id: string;
  label: string;
  meta?: string;
  summary?: string | null;
};

const initialState: AdminActionState = {};

function toLocalDateTimeInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildPreset(daysOffset: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return toLocalDateTimeInput(date);
}

export function AssignmentStudioComposer({
  userOptions,
  cohortOptions,
  contentOptions,
  quizOptions
}: {
  userOptions: SelectOption[];
  cohortOptions: SelectOption[];
  contentOptions: SelectOption[];
  quizOptions: SelectOption[];
}) {
  const [state, formAction, pending] = useActionState(createAssignmentAction, initialState);
  const [title, setTitle] = useState("");
  const [targetMode, setTargetMode] = useState<"individual" | "cohort">("individual");
  const [assetMode, setAssetMode] = useState<"content" | "quiz">("quiz");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [contentItemId, setContentItemId] = useState("");
  const [quizId, setQuizId] = useState("");
  const [dueAt, setDueAt] = useState("");

  const selectedUser = userOptions.find((option) => option.id === assignedUserId) ?? null;
  const selectedCohort = cohortOptions.find((option) => option.id === cohortId) ?? null;
  const selectedAsset =
    (assetMode === "content"
      ? contentOptions.find((option) => option.id === contentItemId)
      : quizOptions.find((option) => option.id === quizId)) ?? null;
  const targetReady = targetMode === "individual" ? Boolean(assignedUserId) : Boolean(cohortId);
  const assetReady = assetMode === "content" ? Boolean(contentItemId) : Boolean(quizId);
  const readinessScore = [Boolean(title.trim()), targetReady, assetReady, Boolean(dueAt)].filter(Boolean).length;
  const dueLabel = dueAt
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(dueAt))
    : "Sans échéance";

  return (
    <form action={formAction} className="assignment-studio-shell admin-form">
      <CelebrationBurst
        active={Boolean(state.success)}
        body="L’assignation est envoyée, la deadline est enregistrée et les notifications ECCE sont prêtes."
        title="Assignation créée"
        triggerKey={state.success}
      />

      <input name="title" type="hidden" value={title} />
      <input name="assigned_user_id" type="hidden" value={targetMode === "individual" ? assignedUserId : ""} />
      <input name="cohort_id" type="hidden" value={targetMode === "cohort" ? cohortId : ""} />
      <input name="content_item_id" type="hidden" value={assetMode === "content" ? contentItemId : ""} />
      <input name="quiz_id" type="hidden" value={assetMode === "quiz" ? quizId : ""} />
      <input name="due_at" type="hidden" value={dueAt} />

      <div className="assignment-studio-main">
        <section className="panel panel-highlight assignment-studio-hero">
          <div className="assignment-studio-hero-copy">
            <span className="eyebrow">Assignment Studio</span>
            <h3>Programmer une action claire, rythmée et immédiatement compréhensible côté coaché</h3>
            <p>
              Choisis la bonne cible, le bon asset et un tempo lisible pour transformer une simple assignation en vrai
              rendez-vous pédagogique.
            </p>
          </div>

          <div className="assignment-studio-hero-metrics">
            <article>
              <strong>{targetMode === "individual" ? "1:1" : "cohorte"}</strong>
              <span>mode de diffusion</span>
            </article>
            <article>
              <strong>{assetMode === "quiz" ? "quiz" : "contenu"}</strong>
              <span>asset choisi</span>
            </article>
            <article>
              <strong>{readinessScore}/4</strong>
              <span>niveau de préparation</span>
            </article>
          </div>
        </section>

        <section className="panel assignment-planner-panel">
          <div className="panel-header">
            <h3>Cadrage de l’assignation</h3>
            <p>Le message doit être simple à comprendre avant même que le coaché n’ouvre la ressource.</p>
          </div>

          <div className="assignment-planner-layout">
            <article className="assignment-planner-card assignment-planner-card-primary">
              <div className="assignment-planner-head">
                <span className="eyebrow">Mission</span>
                <strong>Nommer l’action</strong>
                <p>Utilise un titre autonome, clair et orienté résultat.</p>
              </div>

              <label className="form-grid-span">
                Titre de l&apos;assignation
                <input
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Quiz semaine 1 - Posture du coach"
                  required
                  type="text"
                  value={title}
                />
              </label>
            </article>

            <div className="assignment-planner-stack">
              <article className="assignment-planner-card">
                <div className="assignment-planner-head">
                  <span className="eyebrow">Cible</span>
                  <strong>Qui reçoit cette action ?</strong>
                </div>

                <div className="assignment-toggle-group">
                  <button
                    className={`assignment-toggle${targetMode === "individual" ? " is-active" : ""}`}
                    onClick={() => {
                      setTargetMode("individual");
                      setCohortId("");
                    }}
                    type="button"
                  >
                    Individuel
                  </button>
                  <button
                    className={`assignment-toggle${targetMode === "cohort" ? " is-active" : ""}`}
                    onClick={() => {
                      setTargetMode("cohort");
                      setAssignedUserId("");
                    }}
                    type="button"
                  >
                    Cohorte
                  </button>
                </div>

                {targetMode === "individual" ? (
                  <label>
                    Coaché ciblé
                    <select onChange={(event) => setAssignedUserId(event.target.value)} value={assignedUserId}>
                      <option value="">Choisir un coaché</option>
                      {userOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    Cohorte ciblée
                    <select onChange={(event) => setCohortId(event.target.value)} value={cohortId}>
                      <option value="">Choisir une cohorte</option>
                      {cohortOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <p className="form-hint">
                  {targetMode === "individual"
                    ? selectedUser?.label ?? "Une assignation individuelle apparaît comme une mission personnalisée."
                    : selectedCohort?.meta ?? "La cohorte permet de diffuser la même consigne à tout un groupe."}
                </p>
              </article>

              <article className="assignment-planner-card assignment-planner-card-soft">
                <div className="assignment-planner-head">
                  <span className="eyebrow">Asset</span>
                  <strong>Que doit-on faire ?</strong>
                </div>

                <div className="assignment-toggle-group">
                  <button
                    className={`assignment-toggle${assetMode === "quiz" ? " is-active" : ""}`}
                    onClick={() => {
                      setAssetMode("quiz");
                      setContentItemId("");
                    }}
                    type="button"
                  >
                    Quiz
                  </button>
                  <button
                    className={`assignment-toggle${assetMode === "content" ? " is-active" : ""}`}
                    onClick={() => {
                      setAssetMode("content");
                      setQuizId("");
                    }}
                    type="button"
                  >
                    Contenu
                  </button>
                </div>

                {assetMode === "quiz" ? (
                  <label>
                    Quiz à envoyer
                    <select onChange={(event) => setQuizId(event.target.value)} value={quizId}>
                      <option value="">Choisir un quiz</option>
                      {quizOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    Contenu à envoyer
                    <select onChange={(event) => setContentItemId(event.target.value)} value={contentItemId}>
                      <option value="">Choisir un contenu</option>
                      {contentOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <p className="form-hint">
                  {selectedAsset?.meta ??
                    "Choisis un quiz ou un contenu unique pour garder une consigne claire et mesurable."}
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Cadence et deadline</h3>
            <p>Ajoute une échéance seulement quand elle soutient vraiment le rythme pédagogique.</p>
          </div>

          <div className="assignment-planner-stack">
            <label className="form-grid-span">
              Date et heure
              <input onChange={(event) => setDueAt(event.target.value)} type="datetime-local" value={dueAt} />
            </label>

            <div className="assignment-preset-grid">
              <button className="assignment-preset" onClick={() => setDueAt(buildPreset(0, 18))} type="button">
                Aujourd&apos;hui 18h
              </button>
              <button className="assignment-preset" onClick={() => setDueAt(buildPreset(1, 10))} type="button">
                Demain 10h
              </button>
              <button className="assignment-preset" onClick={() => setDueAt(buildPreset(3, 18))} type="button">
                Dans 3 jours
              </button>
              <button className="assignment-preset" onClick={() => setDueAt(buildPreset(7, 18))} type="button">
                Dans 7 jours
              </button>
              <button className="assignment-preset" onClick={() => setDueAt("")} type="button">
                Sans deadline
              </button>
            </div>
          </div>
        </section>

        <section className="panel panel-subtle">
          <div className="panel-header">
            <h3>Prête à partir</h3>
            <p>Vérifie les derniers éléments avant d’envoyer la consigne dans les dashboards ECCE.</p>
          </div>

          <div className="assignment-readiness-grid">
            <div>
              <strong>{targetReady ? "OK" : "..."}</strong>
              <span>cible choisie</span>
            </div>
            <div>
              <strong>{assetReady ? "OK" : "..."}</strong>
              <span>asset choisi</span>
            </div>
            <div>
              <strong>{dueAt ? "Oui" : "Libre"}</strong>
              <span>rythme défini</span>
            </div>
          </div>

          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}

          <button className="button" disabled={pending || !title.trim() || !targetReady || !assetReady} type="submit">
            {pending ? "Programmation..." : "Créer l'assignation"}
          </button>
        </section>
      </div>

      <aside className="assignment-studio-side">
        <section className="panel panel-accent">
          <div className="panel-header">
            <h3>Aperçu de diffusion</h3>
            <p>Le rendu ci-dessous simule la manière dont l’action sera perçue côté plateforme.</p>
          </div>

          <article className="assignment-preview-card">
            <div className="tag-row">
              <Badge tone={assetMode === "quiz" ? "warning" : "accent"}>{assetMode}</Badge>
              <Badge tone={dueAt ? "accent" : "neutral"}>{dueAt ? "avec deadline" : "sans deadline"}</Badge>
            </div>

            <div className="assignment-preview-copy">
              <strong>{title.trim() || "Titre de l’assignation"}</strong>
              <p>
                {selectedAsset?.summary ??
                  "Le résumé de la ressource ou du quiz aidera le coaché à comprendre l’action demandée."}
              </p>
            </div>

            <div className="assignment-preview-meta">
              <span>{targetMode === "individual" ? selectedUser?.label ?? "Coaché" : selectedCohort?.label ?? "Cohorte"}</span>
              <span>{selectedAsset?.label ?? "Asset"}</span>
              <span>{dueLabel}</span>
            </div>

            <div className="assignment-preview-cta">
              <button className="button button-secondary" type="button">
                {assetMode === "quiz" ? "Lancer le quiz" : "Consulter la ressource"}
              </button>
              <small>Une notification in-app sera envoyée au moment de la création.</small>
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Repères d’orchestration</h3>
            <p>Le bon tempo fait souvent gagner plus de complétion que la deadline elle-même.</p>
          </div>

          <div className="assignment-quality-list">
            <article>
              <strong>Un seul objectif</strong>
              <p>Évite de mélanger lecture et évaluation dans la même consigne si l’action devient ambiguë.</p>
            </article>
            <article>
              <strong>Une vraie temporalité</strong>
              <p>Une deadline doit soutenir un rythme de séance, une cohorte ou un jalon concret.</p>
            </article>
            <article>
              <strong>Un signal clair</strong>
              <p>Le titre et le type d’asset doivent permettre au coaché de comprendre l’effort attendu en 3 secondes.</p>
            </article>
          </div>
        </section>
      </aside>
    </form>
  );
}
