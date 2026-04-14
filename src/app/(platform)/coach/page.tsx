import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getCoachPageData } from "@/lib/platform-data";

export default async function CoachPage() {
  const { metrics, roster, sessions } = await getCoachPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Cockpit coach"
        description="Vue réelle des coachés, cohortes et sessions à venir, avec données chargées depuis Supabase."
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Coachés visibles</h3>
            <p>Les profils affichés ici viennent maintenant de la base ECCE.</p>
          </div>

          {roster.length ? (
            <div className="stack-list">
              {roster.map((item) => (
                <article className="list-row list-row-stretch" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.cohorts.length ? item.cohorts.join(", ") : "Sans cohorte"} · {item.status}
                    </p>
                  </div>

                  <div className="table-actions">
                    <Badge tone={item.status === "active" ? "success" : "warning"}>
                      {item.status}
                    </Badge>
                    {item.upcomingSession ? (
                      <Badge tone="accent">{item.upcomingSession}</Badge>
                    ) : (
                      <Badge tone="neutral">aucune session</Badge>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun coaché détecté pour l&apos;instant.</strong>
              <p>Ajoute un utilisateur avec le rôle `coachee` depuis l&apos;admin pour le voir ici.</p>
            </div>
          )}
        </div>

        <div className="panel panel-accent">
          <div className="panel-header">
            <h3>Sessions à venir</h3>
            <p>Ces créneaux proviennent de la table `coaching_sessions`.</p>
          </div>

          {sessions.length ? (
            <div className="stack-list">
              {sessions.map((session) => (
                <article className="list-row" key={`${session.name}-${session.date}`}>
                  <div>
                    <strong>{session.name}</strong>
                    <p>{session.date}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune session planifiée.</strong>
              <p>La table de séances est prête, il restera à ajouter l&apos;interface de planification.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
