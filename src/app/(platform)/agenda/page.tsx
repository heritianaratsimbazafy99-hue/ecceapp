import { ScheduleCoachingSessionForm } from "@/app/(platform)/coach/forms";
import { AgendaCommandCenter } from "@/components/agenda/agenda-command-center";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { getAgendaPageData } from "@/lib/platform-data";

function getRoleLabel(role: string | null) {
  switch (role) {
    case "admin":
      return "admin";
    case "coach":
      return "coach";
    case "coachee":
      return "coaché";
    default:
      return "utilisateur";
  }
}

export default async function AgendaPage() {
  const { context, metrics, events, planner } = await getAgendaPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Agenda"
        description="Une vue centrale pour relire les séances, deadlines et prochaines actions sans naviguer entre plusieurs espaces."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {planner ? (
        <section className="panel">
          <div className="panel-header">
            <h3>Planification rapide</h3>
            <p>Depuis l&apos;agenda, tu peux ajouter une séance puis relire immédiatement son emplacement dans la timeline.</p>
          </div>

          <ScheduleCoachingSessionForm
            allowCoachSelection={planner.allowCoachSelection}
            coachOptions={planner.coachOptions}
            cohortOptions={planner.cohortOptions}
            coacheeOptions={planner.coacheeOptions}
          />
        </section>
      ) : null}

      <AgendaCommandCenter events={events} roleLabel={getRoleLabel(context.role)} />
    </div>
  );
}
