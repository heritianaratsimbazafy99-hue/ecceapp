"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  gradeQuizTextAttemptAction,
  reviewSubmissionAction,
  saveCoachingSessionNoteAction,
  scheduleCoachingSessionAction,
  type CoachActionState
} from "@/app/(platform)/coach/actions";
import { CelebrationBurst } from "@/components/feedback/celebration-burst";

const initialState: CoachActionState = {};

function toLocalDateTimeInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildSessionPreset(daysOffset: number, hour: number, durationMinutes = 60) {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + daysOffset);
  startsAt.setHours(hour, 0, 0, 0);

  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  return {
    startsAt: toLocalDateTimeInput(startsAt),
    endsAt: toLocalDateTimeInput(endsAt)
  };
}

function SubmitButton({
  idleLabel,
  pendingLabel
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function ActionFeedback({ state }: { state: CoachActionState }) {
  if (state.error) {
    return <p className="form-error">{state.error}</p>;
  }

  if (state.success) {
    return <p className="form-success">{state.success}</p>;
  }

  return null;
}

export function ScheduleCoachingSessionForm({
  coacheeOptions,
  cohortOptions,
  coachOptions,
  allowCoachSelection
}: {
  coacheeOptions: Array<{ id: string; label: string; cohortIds: string[]; cohortLabels: string[] }>;
  cohortOptions: Array<{ id: string; label: string; memberCount: number }>;
  coachOptions: Array<{ id: string; label: string }>;
  allowCoachSelection: boolean;
}) {
  const [state, formAction, pending] = useActionState(scheduleCoachingSessionAction, initialState);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [selectedCoacheeId, setSelectedCoacheeId] = useState("");
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [videoLink, setVideoLink] = useState("");

  const filteredCoacheeOptions = selectedCohortId
    ? coacheeOptions.filter((option) => option.cohortIds.includes(selectedCohortId))
    : coacheeOptions;
  const selectedCohort = cohortOptions.find((option) => option.id === selectedCohortId) ?? null;
  const selectedCoachee = coacheeOptions.find((option) => option.id === selectedCoacheeId) ?? null;
  const selectedCoach = coachOptions.find((option) => option.id === selectedCoachId) ?? null;
  const sessionPreviewTarget = selectedCoachee
    ? selectedCoachee.label
    : selectedCohort
      ? `${selectedCohort.label} · ${selectedCohort.memberCount} coaché(s)`
      : "Choisir un coaché ou une cohorte";
  const readinessScore = [
    Boolean(startsAt),
    Boolean(selectedCohortId || selectedCoacheeId),
    allowCoachSelection ? Boolean(selectedCoachId) : true,
    Boolean(videoLink)
  ].filter(Boolean).length;
  const startsAtLabel = startsAt
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(startsAt))
    : "Date non définie";

  return (
    <form action={formAction} className="coach-session-studio admin-form">
      <CelebrationBurst
        active={Boolean(state.success)}
        body="La séance est planifiée et les coachés ciblés peuvent déjà la voir dans leur dashboard."
        title="Séance planifiée"
        triggerKey={state.success}
      />

      <input name="coach_id" type="hidden" value={selectedCoachId} />
      <input name="cohort_id" type="hidden" value={selectedCohortId} />
      <input name="coachee_id" type="hidden" value={selectedCoacheeId} />
      <input name="starts_at" type="hidden" value={startsAt} />
      <input name="ends_at" type="hidden" value={endsAt} />
      <input name="video_link" type="hidden" value={videoLink} />

      <div className="coach-session-main">
        <section className="panel panel-highlight coach-session-hero">
          <div className="coach-session-copy">
            <span className="eyebrow">Session Planner</span>
            <h3>Planifier vite, sans perdre la finesse cohortes / individuel</h3>
            <p>Prépare un créneau propre, choisis la bonne cible et rends la séance immédiatement lisible côté coaché.</p>
          </div>

          <div className="coach-session-metrics">
            <article>
              <strong>{selectedCoacheeId ? "1:1" : selectedCohortId ? "groupe" : "..."}</strong>
              <span>format</span>
            </article>
            <article>
              <strong>{startsAt ? "OK" : "..."}</strong>
              <span>créneau</span>
            </article>
            <article>
              <strong>{readinessScore}/4</strong>
              <span>préparation</span>
            </article>
          </div>
        </section>

        <section className="panel coach-session-panel">
          <div className="panel-header">
            <h3>Ciblage de la séance</h3>
            <p>Tu peux planifier pour un coaché précis ou laisser le champ vide pour toute une cohorte.</p>
          </div>

          <div className="coach-session-grid">
            {allowCoachSelection ? (
              <label>
                Coach
                <select onChange={(event) => setSelectedCoachId(event.target.value)} required value={selectedCoachId}>
                  <option value="">Choisir un coach</option>
                  {coachOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              Cohorte
              <select
                onChange={(event) => {
                  const nextCohortId = event.target.value;
                  setSelectedCohortId(nextCohortId);

                  if (selectedCoacheeId && nextCohortId) {
                    const belongsToCohort = coacheeOptions.some(
                      (option) => option.id === selectedCoacheeId && option.cohortIds.includes(nextCohortId)
                    );

                    if (!belongsToCohort) {
                      setSelectedCoacheeId("");
                    }
                  }
                }}
                value={selectedCohortId}
              >
                <option value="">Aucune cohorte spécifique</option>
                {cohortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.memberCount} coaché(s)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Coaché
              <select onChange={(event) => setSelectedCoacheeId(event.target.value)} required={!selectedCohortId} value={selectedCoacheeId}>
                <option value="">
                  {selectedCohortId ? "Toute la cohorte sélectionnée" : "Choisir un coaché"}
                </option>
                {filteredCoacheeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="form-hint">
            {selectedCohort
              ? filteredCoacheeOptions.length
                ? `Cohorte active : ${selectedCohort.label}. Laisse le coaché vide pour générer une séance pour chaque membre.`
                : `La cohorte ${selectedCohort.label} ne contient encore aucun coaché.`
              : "Choisis un coaché précis ou une cohorte pour générer les séances du groupe."}
          </p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Créneau et lien visio</h3>
            <p>Pose un rythme clair et garde le lien de connexion directement associé à la séance.</p>
          </div>

          <div className="coach-session-grid">
            <label>
              Début
              <input onChange={(event) => setStartsAt(event.target.value)} required type="datetime-local" value={startsAt} />
            </label>
            <label>
              Fin
              <input onChange={(event) => setEndsAt(event.target.value)} type="datetime-local" value={endsAt} />
            </label>
            <label className="form-grid-span">
              Lien visio
              <input
                onChange={(event) => setVideoLink(event.target.value)}
                placeholder="https://meet.google.com/..."
                type="url"
                value={videoLink}
              />
            </label>
          </div>

          <div className="coach-session-presets">
            <button
              className="assignment-preset"
              onClick={() => {
                const preset = buildSessionPreset(0, 18);
                setStartsAt(preset.startsAt);
                setEndsAt(preset.endsAt);
              }}
              type="button"
            >
              Aujourd&apos;hui 18h
            </button>
            <button
              className="assignment-preset"
              onClick={() => {
                const preset = buildSessionPreset(1, 9);
                setStartsAt(preset.startsAt);
                setEndsAt(preset.endsAt);
              }}
              type="button"
            >
              Demain 9h
            </button>
            <button
              className="assignment-preset"
              onClick={() => {
                const preset = buildSessionPreset(2, 14, 90);
                setStartsAt(preset.startsAt);
                setEndsAt(preset.endsAt);
              }}
              type="button"
            >
              Dans 2 jours
            </button>
            <button
              className="assignment-preset"
              onClick={() => {
                const preset = buildSessionPreset(7, 18);
                setStartsAt(preset.startsAt);
                setEndsAt(preset.endsAt);
              }}
              type="button"
            >
              Semaine prochaine
            </button>
          </div>
        </section>

        <section className="panel panel-subtle">
          <div className="panel-header">
            <h3>Validation finale</h3>
            <p>Envoie une séance propre, cohérente et déjà exploitable côté dashboard.</p>
          </div>

          <ActionFeedback state={state} />
          <button
            className="button"
            disabled={pending || !startsAt || !(selectedCohortId || selectedCoacheeId) || (allowCoachSelection && !selectedCoachId)}
            type="submit"
          >
            {pending ? "Planification..." : "Planifier la séance"}
          </button>
        </section>
      </div>

      <aside className="coach-session-side">
        <section className="panel panel-accent">
          <div className="panel-header">
            <h3>Aperçu de séance</h3>
            <p>Le coaché verra une session claire, datée et prête à rejoindre.</p>
          </div>

          <article className="coach-session-preview">
            <div className="tag-row">
              <span className="badge badge-accent">{selectedCoacheeId ? "individuelle" : selectedCohortId ? "cohorte" : "à cibler"}</span>
              <span className="badge badge-neutral">{allowCoachSelection ? selectedCoach?.label ?? "coach à choisir" : "coach actif"}</span>
            </div>

            <div className="coach-session-preview-copy">
              <strong>{sessionPreviewTarget}</strong>
              <p>{startsAtLabel}</p>
            </div>

            <div className="coach-session-preview-meta">
              <span>{endsAt ? `Fin ${new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(endsAt))}` : "Fin libre"}</span>
              <span>{videoLink ? "Lien visio prêt" : "Ajouter un lien visio"}</span>
            </div>
          </article>
        </section>
      </aside>
    </form>
  );
}

export function ReviewSubmissionForm({
  submissionId
}: {
  submissionId: string;
}) {
  const [state, formAction] = useActionState(reviewSubmissionAction, initialState);

  return (
    <form action={formAction} className="admin-form admin-form-compact">
      <input name="submission_id" type="hidden" value={submissionId} />

      <div className="form-grid form-grid-compact">
        <label>
          Note /100
          <input max="100" min="0" name="grade" placeholder="88" step="0.01" type="number" />
        </label>
        <label className="form-grid-span">
          Feedback
          <textarea
            name="feedback"
            placeholder="Points forts, axes d'amélioration, prochaine action recommandée."
            required
            rows={4}
          />
        </label>
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Envoyer le feedback" pendingLabel="Envoi..." />
    </form>
  );
}

export function CoachingSessionNoteForm({
  defaultStatus,
  sessionId
}: {
  defaultStatus: "planned" | "completed" | "cancelled";
  sessionId: string;
}) {
  const [state, formAction] = useActionState(saveCoachingSessionNoteAction, initialState);

  return (
    <form action={formAction} className="admin-form admin-form-compact">
      <input name="session_id" type="hidden" value={sessionId} />

      <div className="form-grid">
        <label>
          Statut de séance
          <select defaultValue={defaultStatus} name="status">
            <option value="planned">Planifiée</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </label>

        <label className="form-grid-span">
          Résumé de séance
          <textarea
            name="summary"
            placeholder="Ce qui a été travaillé, décisions prises, points de compréhension."
            rows={4}
          />
        </label>

        <label className="form-grid-span">
          Blocages / signaux faibles
          <textarea
            name="blockers"
            placeholder="Difficultés, résistances, zones à sécuriser ou contexte humain à garder en tête."
            rows={4}
          />
        </label>

        <label className="form-grid-span">
          Prochaines actions
          <textarea
            name="next_actions"
            placeholder="Une action claire, une ressource à revoir, une deadline ou une décision à suivre."
            rows={4}
          />
        </label>
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Enregistrer la note" pendingLabel="Enregistrement..." />
    </form>
  );
}

export function GradeQuizTextAttemptForm({
  attemptId,
  answers
}: {
  attemptId: string;
  answers: Array<{
    questionId: string;
    prompt: string;
    answerText: string;
    maxPoints: number;
  }>;
}) {
  const [state, formAction] = useActionState(gradeQuizTextAttemptAction, initialState);

  return (
    <form action={formAction} className="admin-form admin-form-compact">
      <input name="attempt_id" type="hidden" value={attemptId} />

      <div className="stack-list">
        {answers.map((answer) => (
          <article className="panel panel-subtle" key={answer.questionId}>
            <div className="panel-header">
              <h3>{answer.prompt}</h3>
              <p>Réponse du coaché</p>
            </div>

            <div className="stack-list">
              <p>{answer.answerText}</p>
              <label>
                Points sur {answer.maxPoints}
                <input
                  max={answer.maxPoints}
                  min="0"
                  name={`answer_${answer.questionId}_points`}
                  required
                  step="0.01"
                  type="number"
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Valider la correction" pendingLabel="Correction..." />
    </form>
  );
}
