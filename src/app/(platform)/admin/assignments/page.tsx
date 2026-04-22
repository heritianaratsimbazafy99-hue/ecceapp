import { AssignmentCommandBoard } from "@/components/assignments/assignment-command-board";
import { AssignmentStudioComposer } from "@/components/assignments/assignment-studio-composer";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { getAdminAssignmentStudioPageData } from "@/lib/platform-data";

export default async function AdminAssignmentsPage() {
  const { metrics, userOptions, cohortOptions, contentOptions, quizOptions, assignments } =
    await getAdminAssignmentStudioPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Assignations et deadlines"
        description="Nouveau studio pour programmer les missions, maîtriser le rythme pédagogique et garder une lecture claire des deadlines."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <AssignmentStudioComposer
        cohortOptions={cohortOptions}
        contentOptions={contentOptions}
        quizOptions={quizOptions}
        userOptions={userOptions}
      />

      <AssignmentCommandBoard
        description="Vue d’orchestration des assignations déjà diffusées, avec focus sur l’urgence et le type de mission."
        emptyBody="Crée une première assignation pour alimenter les dashboards, les relances et les prochaines échéances."
        emptyTitle="Aucune assignation active."
        items={assignments}
        mode="admin"
        title="Board des deadlines"
      />
    </div>
  );
}
