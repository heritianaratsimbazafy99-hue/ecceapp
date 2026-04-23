"use client";

import { useActionState, useState } from "react";

import {
  addProgramModuleAction,
  createProgramAction,
  enrollProgramAction,
  type AdminActionState
} from "@/app/(platform)/admin/actions";
import { CelebrationBurst } from "@/components/feedback/celebration-burst";
import { Badge } from "@/components/ui/badge";

type ProgramOption = {
  id: string;
  label: string;
};

type CoacheeOption = {
  id: string;
  label: string;
  cohortIds: string[];
};

type CohortOption = {
  id: string;
  label: string;
};

type DraftModule = {
  id: string;
  title: string;
  description: string;
  status: string;
};

const initialState: AdminActionState = {};

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function createDraftModule(): DraftModule {
  return {
    id: createId(),
    title: "",
    description: "",
    status: "published"
  };
}

export function ProgramStudioComposer() {
  const [state, formAction, pending] = useActionState(createProgramAction, initialState);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("published");
  const [modules, setModules] = useState<DraftModule[]>([createDraftModule()]);

  const readyModules = modules.filter((module) => module.title.trim()).length;

  const updateModule = (moduleId: string, updater: (module: DraftModule) => DraftModule) => {
    setModules((currentModules) =>
      currentModules.map((module) => (module.id === moduleId ? updater(module) : module))
    );
  };

  const moveModule = (moduleId: string, direction: -1 | 1) => {
    setModules((currentModules) => {
      const sourceIndex = currentModules.findIndex((module) => module.id === moduleId);

      if (sourceIndex < 0) {
        return currentModules;
      }

      const targetIndex = sourceIndex + direction;

      if (targetIndex < 0 || targetIndex >= currentModules.length) {
        return currentModules;
      }

      const nextModules = [...currentModules];
      const [module] = nextModules.splice(sourceIndex, 1);
      nextModules.splice(targetIndex, 0, module);
      return nextModules;
    });
  };

  const removeModule = (moduleId: string) => {
    setModules((currentModules) =>
      currentModules.length === 1 ? [createDraftModule()] : currentModules.filter((module) => module.id !== moduleId)
    );
  };

  return (
    <form action={formAction} className="program-studio-shell admin-form">
      <CelebrationBurst
        active={Boolean(state.success)}
        body="Le parcours rejoint maintenant ECCE avec sa structure de modules et peut être activé pour des coachés ou des cohortes."
        title="Parcours créé"
        triggerKey={state.success}
      />

      <input name="title" type="hidden" value={title} />
      <input name="description" type="hidden" value={description} />
      <input name="status" type="hidden" value={status} />
      <input
        name="modules_payload"
        type="hidden"
        value={JSON.stringify(
          modules.map((module) => ({
            title: module.title,
            description: module.description,
            status: module.status
          }))
        )}
      />

      <section className="panel panel-highlight program-studio-hero">
        <div className="program-studio-hero-copy">
          <span className="eyebrow">Program Studio</span>
          <h3>Structure un vrai parcours ECCE avec ses modules, son rythme et sa mise en diffusion.</h3>
          <p>
            Ce studio transforme les tables `programs` et `program_modules` en un flux produit concret,
            prêt à accueillir contenus, quiz et activations par cohorte.
          </p>
        </div>

        <div className="program-studio-hero-metrics">
          <article>
            <strong>{title.trim() || "Parcours ECCE"}</strong>
            <span>titre de travail</span>
          </article>
          <article>
            <strong>{readyModules}/{modules.length}</strong>
            <span>modules prêts</span>
          </article>
          <article>
            <strong>{status}</strong>
            <span>statut de diffusion</span>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Cadrage du parcours</h3>
          <p>Pose l&apos;intention générale, le statut et le pitch qui serviront de repère partout dans ECCE.</p>
        </div>

        <div className="program-briefing-layout">
          <article className="program-briefing-card program-briefing-card-primary">
            <div className="program-briefing-card-head">
              <span className="eyebrow">Vision</span>
              <strong>Promesse du parcours</strong>
              <p>Décris ce que l&apos;apprenant va vraiment traverser une fois le programme activé.</p>
            </div>

            <div className="program-studio-grid">
              <label className="form-grid-span">
                Titre du parcours
                <input
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Parcours - Fondamentaux du coaching"
                  type="text"
                  value={title}
                />
              </label>

              <label className="form-grid-span">
                Description
                <textarea
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Explique la transformation visée, le niveau attendu et le résultat concret après complétion."
                  rows={5}
                  value={description}
                />
              </label>
            </div>
          </article>

          <article className="program-briefing-card">
            <div className="program-briefing-card-head">
              <span className="eyebrow">Diffusion</span>
              <strong>Statut de sortie</strong>
            </div>

            <label>
              Statut
              <select onChange={(event) => setStatus(event.target.value)} value={status}>
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>

            <div className="program-studio-preview-note">
              <Badge tone={status === "published" ? "success" : "accent"}>{status}</Badge>
              <p>
                Les contenus et quiz pourront ensuite être rattachés à un module précis depuis leurs studios respectifs.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Architecture modulaire</h3>
          <p>Compose le squelette du parcours avant d&apos;y attacher ressources, quiz et assignations.</p>
        </div>

        <div className="program-module-stack">
          {modules.map((module, index) => (
            <article className="program-module-draft" key={module.id}>
              <div className="program-module-draft-head">
                <div>
                  <span className="eyebrow">Module {index + 1}</span>
                  <strong>{module.title.trim() || "Module à cadrer"}</strong>
                </div>

                <div className="tag-row">
                  <button
                    className="button button-secondary button-small"
                    disabled={index === 0}
                    onClick={() => moveModule(module.id, -1)}
                    type="button"
                  >
                    Monter
                  </button>
                  <button
                    className="button button-secondary button-small"
                    disabled={index === modules.length - 1}
                    onClick={() => moveModule(module.id, 1)}
                    type="button"
                  >
                    Descendre
                  </button>
                  <button
                    className="button button-secondary button-small"
                    onClick={() => removeModule(module.id)}
                    type="button"
                  >
                    Retirer
                  </button>
                </div>
              </div>

              <div className="program-studio-grid">
                <label>
                  Titre du module
                  <input
                    onChange={(event) =>
                      updateModule(module.id, (currentModule) => ({
                        ...currentModule,
                        title: event.target.value
                      }))
                    }
                    placeholder="Module 1 - Cadrage de séance"
                    type="text"
                    value={module.title}
                  />
                </label>

                <label>
                  Statut
                  <select
                    onChange={(event) =>
                      updateModule(module.id, (currentModule) => ({
                        ...currentModule,
                        status: event.target.value
                      }))
                    }
                    value={module.status}
                  >
                    <option value="draft">draft</option>
                    <option value="scheduled">scheduled</option>
                    <option value="published">published</option>
                    <option value="archived">archived</option>
                  </select>
                </label>

                <label className="form-grid-span">
                  Cap du module
                  <textarea
                    onChange={(event) =>
                      updateModule(module.id, (currentModule) => ({
                        ...currentModule,
                        description: event.target.value
                      }))
                    }
                    placeholder="Explique ce que ce module doit faire comprendre, pratiquer ou produire."
                    rows={4}
                    value={module.description}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>

        <div className="program-studio-actions">
          <button className="button button-secondary" onClick={() => setModules((current) => [...current, createDraftModule()])} type="button">
            Ajouter un module
          </button>

          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}

          <button className="button" disabled={pending} type="submit">
            {pending ? "Création du parcours..." : "Créer le parcours"}
          </button>
        </div>
      </section>
    </form>
  );
}

export function AddProgramModuleForm({ programId }: { programId: string }) {
  const [state, formAction, pending] = useActionState(addProgramModuleAction, initialState);

  return (
    <form action={formAction} className="program-inline-form admin-form">
      <input name="program_id" type="hidden" value={programId} />

      <div className="program-inline-grid">
        <label>
          Nouveau module
          <input name="title" placeholder="Module suivant" type="text" />
        </label>
        <label>
          Statut
          <select defaultValue="published" name="status">
            <option value="draft">draft</option>
            <option value="scheduled">scheduled</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label className="form-grid-span">
          Description
          <input name="description" placeholder="Ajoute l'objectif pédagogique du module." type="text" />
        </label>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}

      <button className="button button-secondary button-small" disabled={pending} type="submit">
        {pending ? "Ajout..." : "Ajouter un module"}
      </button>
    </form>
  );
}

export function ProgramEnrollmentForm({
  programOptions,
  coacheeOptions,
  cohortOptions
}: {
  programOptions: ProgramOption[];
  coacheeOptions: CoacheeOption[];
  cohortOptions: CohortOption[];
}) {
  const [state, formAction, pending] = useActionState(enrollProgramAction, initialState);
  const [targetMode, setTargetMode] = useState<"individual" | "cohort">("individual");

  return (
    <form action={formAction} className="panel panel-highlight admin-form program-enrollment-panel">
      <CelebrationBurst
        active={Boolean(state.success)}
        body="Le parcours est maintenant visible dans l'espace de progression des coachés concernés."
        title="Parcours activé"
        triggerKey={state.success}
      />

      <div className="panel-header">
        <h3>Activer un parcours</h3>
        <p>Déploie un programme vers un coaché précis ou toute une cohorte sans passer par des assignations manuelles.</p>
      </div>

      <div className="program-enrollment-mode">
        <button
          className={`program-enrollment-chip ${targetMode === "individual" ? "is-active" : ""}`}
          onClick={() => setTargetMode("individual")}
          type="button"
        >
          Individuel
        </button>
        <button
          className={`program-enrollment-chip ${targetMode === "cohort" ? "is-active" : ""}`}
          onClick={() => setTargetMode("cohort")}
          type="button"
        >
          Cohorte
        </button>
      </div>

      <div className="program-inline-grid">
        <label className="form-grid-span">
          Parcours
          <select defaultValue="" name="program_id" required>
            <option disabled value="">
              Choisir un parcours
            </option>
            {programOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {targetMode === "individual" ? (
          <label className="form-grid-span">
            Coaché
            <select defaultValue="" name="assigned_user_id" required>
              <option disabled value="">
                Choisir un coaché
              </option>
              {coacheeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="form-grid-span">
            Cohorte
            <select defaultValue="" name="cohort_id" required>
              <option disabled value="">
                Choisir une cohorte
              </option>
              {cohortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {targetMode === "individual" ? null : <input name="assigned_user_id" type="hidden" value="" />}
      {targetMode === "cohort" ? null : <input name="cohort_id" type="hidden" value="" />}

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}

      <button className="button" disabled={pending} type="submit">
        {pending ? "Activation..." : "Activer le parcours"}
      </button>
    </form>
  );
}
