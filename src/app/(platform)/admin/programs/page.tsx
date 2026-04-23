import {
  AddProgramModuleForm,
  ProgramEnrollmentForm,
  ProgramStudioComposer
} from "@/components/programs/program-studio-composer";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminProgramStudioPageData } from "@/lib/platform-data";

export default async function AdminProgramsPage() {
  const { metrics, programOptions, coacheeOptions, cohortOptions, programs } =
    await getAdminProgramStudioPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Studio parcours"
        description="Transforme les programmes ECCE en vrais parcours structurés, reliés à des modules, puis activables par coaché ou par cohorte."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <ProgramStudioComposer />

      <ProgramEnrollmentForm
        cohortOptions={cohortOptions}
        coacheeOptions={coacheeOptions}
        programOptions={programOptions}
      />

      <section className="panel">
        <div className="panel-header">
          <h3>Catalogue des parcours</h3>
          <p>Chaque carte te montre la structure modulaire, le niveau d&apos;activation et les rattachements contenus/quiz.</p>
        </div>

        {programs.length ? (
          <div className="program-admin-grid">
            {programs.map((program) => (
              <article className="panel program-admin-card" key={program.id}>
                <div className="program-admin-card-head">
                  <div>
                    <div className="tag-row">
                      <Badge tone={program.status === "published" ? "success" : "accent"}>{program.status}</Badge>
                      <Badge tone="neutral">{program.moduleCount} module(s)</Badge>
                      <Badge tone="accent">{program.learnerCount} coaché(s)</Badge>
                    </div>
                    <h3>{program.title}</h3>
                    {program.description ? <p>{program.description}</p> : null}
                  </div>

                  <div className="program-admin-kpis">
                    <article>
                      <strong>{program.contentCount}</strong>
                      <span>contenus liés</span>
                    </article>
                    <article>
                      <strong>{program.quizCount}</strong>
                      <span>quiz liés</span>
                    </article>
                    <article>
                      <strong>{program.enrollmentCount}</strong>
                      <span>activations</span>
                    </article>
                  </div>
                </div>

                <div className="program-admin-module-list">
                  {program.modules.map((module) => (
                    <article className="program-admin-module" key={module.id}>
                      <div>
                        <strong>
                          Module {module.position + 1} · {module.title}
                        </strong>
                        {module.description ? <p>{module.description}</p> : null}
                        <small>{module.availableLabel}</small>
                      </div>

                      <div className="tag-row">
                        <Badge tone={module.status === "published" ? "success" : "accent"}>{module.status}</Badge>
                        <Badge tone="neutral">{module.contentCount} contenu(x)</Badge>
                        <Badge tone="accent">{module.quizCount} quiz</Badge>
                      </div>
                    </article>
                  ))}
                </div>

                <AddProgramModuleForm programId={program.id} />

                {program.recentEnrollments.length ? (
                  <div className="program-admin-enrollment-list">
                    {program.recentEnrollments.map((enrollment) => (
                      <article className="list-row list-row-stretch" key={enrollment.id}>
                        <div>
                          <strong>{enrollment.learner}</strong>
                          <p>{enrollment.context}</p>
                        </div>
                        <small>{enrollment.enrolledAt}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state empty-state-compact">
                    <strong>Aucune activation pour ce parcours.</strong>
                    <p>Utilise le panneau ci-dessus pour le déployer vers un coaché ou une cohorte.</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun parcours structuré pour le moment.</strong>
            <p>Le studio est prêt pour créer le premier cursus ECCE et lier ses modules aux contenus et quiz.</p>
          </div>
        )}
      </section>
    </div>
  );
}
