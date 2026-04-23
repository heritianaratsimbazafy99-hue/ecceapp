import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getLearnerProgramsPageData } from "@/lib/platform-data";

type ProgramCard = Awaited<ReturnType<typeof getLearnerProgramsPageData>>["programs"][number];

export function LearnerProgramBoard({ programs }: { programs: ProgramCard[] }) {
  if (!programs.length) {
    return (
      <div className="empty-state">
        <strong>Aucun parcours activé pour l&apos;instant.</strong>
        <p>
          Dès qu&apos;un programme ECCE te sera attribué, tu verras ici sa progression détaillée, ses modules et
          la meilleure prochaine action à ouvrir.
        </p>
      </div>
    );
  }

  return (
    <div className="program-board">
      {programs.map((program) => (
        <article className="panel program-card" key={program.id}>
          <div className="program-card-hero">
            <div className="program-card-copy">
              <div className="tag-row">
                <Badge tone={program.progressTone}>{program.progress}%</Badge>
                <Badge tone={program.tone}>{program.laneLabel}</Badge>
                <Badge tone={program.statusTone}>{program.status}</Badge>
                <Badge tone="neutral">{program.moduleCount} module(s)</Badge>
              </div>

              <div>
                <h3>{program.title}</h3>
                <p>{program.description ?? "Parcours ECCE actif, structuré pour guider ton avancement étape par étape."}</p>
              </div>

              <small>{program.nextNeed}</small>
            </div>

            <div className="program-card-metrics">
              <article>
                <strong>
                  {program.completedItems}/{program.totalItems || 0}
                </strong>
                <span>étapes complétées</span>
              </article>
              <article>
                <strong>
                  {program.completedModules}/{program.moduleCount || 0}
                </strong>
                <span>modules complétés</span>
              </article>
              <article>
                <strong>{program.latestActivityLabel}</strong>
                <span>dernière activité</span>
              </article>
            </div>
          </div>

          <div className="program-progress-track" aria-hidden="true">
            <span style={{ width: `${program.progress}%` }} />
          </div>

          <div className="program-next-focus">
            <div className="program-next-focus-copy">
              <span className="eyebrow">Prochaine étape</span>
              <strong>{program.nextFocus}</strong>
              <p>{program.nextNeed}</p>
            </div>

            <div className="program-card-actions">
              <div className="tag-row">
                <Badge tone={program.pendingItems > 0 ? "accent" : "success"}>
                  {program.pendingItems} ouverte(s)
                </Badge>
                {(program.overdueItems > 0 || program.soonItems > 0) && (
                  <Badge tone={program.overdueItems > 0 ? "warning" : "accent"}>
                    {program.overdueItems > 0 ? `${program.overdueItems} à sécuriser` : `${program.soonItems} à ouvrir vite`}
                  </Badge>
                )}
              </div>

              {program.primaryHref ? (
                <Link className="button button-secondary button-small" href={program.primaryHref}>
                  {program.primaryCtaLabel}
                </Link>
              ) : null}
            </div>
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
                    {module.urgentItems > 0 ? <Badge tone="warning">{module.urgentItems} urgent(s)</Badge> : null}
                  </div>
                </div>

                <div className="program-module-stats">
                  <small>{module.availableLabel}</small>
                  <small>{module.nextNeed}</small>
                </div>

                {module.nextHref ? (
                  <div className="program-module-actions">
                    <Link className="inline-link" href={module.nextHref}>
                      {module.nextCtaLabel ?? "Ouvrir le module"}
                    </Link>
                  </div>
                ) : null}

                {module.items.length ? (
                  <div className="program-item-grid">
                    {module.items.map((item) => (
                      <article className="program-item-card" key={`${module.id}-${item.id}`}>
                        <div className="program-item-copy">
                          <div className="tag-row">
                            <Badge tone={item.type === "quiz" ? "accent" : "neutral"}>{item.type}</Badge>
                            <Badge tone={item.tone}>{item.stateLabel}</Badge>
                          </div>

                          <strong>{item.title}</strong>
                          <p>{item.description}</p>

                          <div className="program-item-meta">
                            <small>{item.metaLabel}</small>
                            <small>{item.dueLabel}</small>
                          </div>
                        </div>

                        <Link className="button button-secondary button-small" href={item.href}>
                          {item.ctaLabel}
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state empty-state-compact">
                    <strong>Module en préparation.</strong>
                    <p>Ce module est visible dans le parcours, mais ses ressources seront rattachées un peu plus tard.</p>
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
