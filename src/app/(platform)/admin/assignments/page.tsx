import { CreateAssignmentForm } from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminAssignmentStudioPageData } from "@/lib/platform-data";

export default async function AdminAssignmentsPage() {
  const { metrics, userOptions, cohortOptions, contentOptions, quizOptions, assignments } =
    await getAdminAssignmentStudioPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Assignations et deadlines"
        description="Page dédiée pour programmer les contenus, les quiz et les échéances sans noyer l'administration."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel panel-highlight">
          <div className="panel-header">
            <h3>Créer une assignation</h3>
            <p>Programme une ressource ou un quiz pour un coaché précis ou une cohorte complète.</p>
          </div>

          <CreateAssignmentForm
            cohortOptions={cohortOptions}
            contentOptions={contentOptions}
            quizOptions={quizOptions}
            userOptions={userOptions}
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Repères</h3>
            <p>Quelques règles utiles pour garder une expérience claire côté coaché.</p>
          </div>

          <div className="stack-list">
            <article className="panel panel-subtle">
              <strong>Un objectif par assignation</strong>
              <p>Donne un titre concret et autonome pour que l&apos;action soit compréhensible dès le dashboard.</p>
            </article>
            <article className="panel panel-subtle">
              <strong>Deadlines utiles</strong>
              <p>Ajoute une échéance seulement lorsqu&apos;elle soutient un vrai rythme pédagogique.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Deadlines en cours</h3>
          <p>Vue centralisée des assignations déjà envoyées dans ECCE.</p>
        </div>

        {assignments.length ? (
          <div className="stack-list">
            {assignments.map((assignment) => (
              <article className="list-row list-row-stretch" key={assignment.id}>
                <div>
                  <strong>{assignment.title}</strong>
                  <p>
                    {assignment.type} · {assignment.asset}
                  </p>
                  <p>
                    cible : {assignment.target} · échéance : {assignment.due}
                  </p>
                </div>
                <Badge tone={assignment.type === "quiz" ? "warning" : "accent"}>{assignment.type}</Badge>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune assignation active.</strong>
            <p>Crée une première deadline pour alimenter les dashboards et les relances.</p>
          </div>
        )}
      </section>
    </div>
  );
}
