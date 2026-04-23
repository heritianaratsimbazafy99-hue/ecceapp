import Link from "next/link";

import { Badge } from "@/components/ui/badge";

type ProgramItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  dueLabel: string;
  tone: "neutral" | "accent" | "warning" | "success";
};

type ProgramModuleCard = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  status: string;
  availableLabel: string;
  progress: number;
  progressTone: "neutral" | "accent" | "warning" | "success";
  completedItems: number;
  totalItems: number;
  nextFocus: string;
  items: ProgramItem[];
};

type ProgramCard = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  enrolledAt: string;
  progress: number;
  progressTone: "neutral" | "accent" | "warning" | "success";
  completedItems: number;
  totalItems: number;
  moduleCount: number;
  nextFocus: string;
  modules: ProgramModuleCard[];
};

export function LearnerProgramBoard({ programs }: { programs: ProgramCard[] }) {
  if (!programs.length) {
    return (
      <div className="empty-state">
        <strong>Aucun parcours activé pour l&apos;instant.</strong>
        <p>
          Dès qu&apos;un programme ECCE te sera attribué, tu verras ici sa progression, ses modules et
          les prochaines actions à ouvrir.
        </p>
      </div>
    );
  }

  return (
    <div className="program-board">
      {programs.map((program) => (
        <article className="panel program-card" key={program.id}>
          <div className="program-card-hero">
            <div>
              <div className="tag-row">
                <Badge tone={program.progressTone}>{program.progress}%</Badge>
                <Badge tone={program.status === "published" ? "success" : "accent"}>{program.status}</Badge>
                <Badge tone="neutral">{program.moduleCount} module(s)</Badge>
              </div>
              <h3>{program.title}</h3>
              {program.description ? <p>{program.description}</p> : null}
            </div>

            <div className="program-card-metrics">
              <article>
                <strong>{program.completedItems}/{program.totalItems || 0}</strong>
                <span>étapes complétées</span>
              </article>
              <article>
                <strong>{program.enrolledAt}</strong>
                <span>activation</span>
              </article>
            </div>
          </div>

          <div className="program-progress-track" aria-hidden="true">
            <span style={{ width: `${program.progress}%` }} />
          </div>

          <div className="program-next-focus">
            <span className="eyebrow">Prochaine étape</span>
            <strong>{program.nextFocus}</strong>
          </div>

          <div className="program-module-list">
            {program.modules.map((module) => (
              <article className="program-module-card" key={module.id}>
                <div className="program-module-card-head">
                  <div>
                    <span className="eyebrow">Module {module.position + 1}</span>
                    <strong>{module.title}</strong>
                    {module.description ? <p>{module.description}</p> : null}
                  </div>

                  <div className="tag-row">
                    <Badge tone={module.progressTone}>{module.progress}%</Badge>
                    <Badge tone="neutral">
                      {module.completedItems}/{module.totalItems || 0}
                    </Badge>
                  </div>
                </div>

                <div className="program-module-meta">
                  <small>{module.availableLabel}</small>
                  <small>{module.nextFocus}</small>
                </div>

                {module.items.length ? (
                  <div className="program-item-grid">
                    {module.items.map((item) => (
                      <article className="program-item-card" key={`${module.id}-${item.id}`}>
                        <div>
                          <div className="tag-row">
                            <Badge tone={item.tone}>{item.type}</Badge>
                            {item.completed ? <Badge tone="success">complété</Badge> : null}
                          </div>
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                          <small>{item.dueLabel}</small>
                        </div>

                        <Link className="button button-secondary button-small" href={item.href}>
                          {item.type === "quiz" ? "Ouvrir le quiz" : "Ouvrir la ressource"}
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state empty-state-compact">
                    <strong>Module en préparation.</strong>
                    <p>Ce module existe déjà dans le parcours, mais aucune ressource n&apos;y est encore rattachée.</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
