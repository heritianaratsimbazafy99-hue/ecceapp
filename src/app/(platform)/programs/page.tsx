import { LearnerProgramBoard } from "@/components/programs/learner-program-board";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { getLearnerProgramsPageData } from "@/lib/platform-data";

export default async function ProgramsPage() {
  const { metrics, programs } = await getLearnerProgramsPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Mes parcours"
        description="Une vue dédiée pour suivre les programmes activés, lire la progression module par module et ouvrir directement la prochaine étape."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <LearnerProgramBoard programs={programs} />
    </div>
  );
}
