import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getDashboardPageData } from "@/lib/platform-data";

export default async function DashboardPage() {
  const { metrics, assignments, notifications, recentContents } = await getDashboardPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Dashboard coaché"
        description="Vue réelle des assignations, notifications et contenus publiés disponibles pour le coaché."
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Travaux et ressources assignés</h3>
            <p>Les assignations affichées ici viennent de `learning_assignments`.</p>
          </div>

          {assignments.length ? (
            <div className="stack-list">
              {assignments.map((item) => (
                <article className="timeline-card" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.due}</p>
                  </div>
                  <Badge tone={item.type === "quiz" ? "warning" : "accent"}>{item.type}</Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune assignation pour l&apos;instant.</strong>
              <p>Quand un contenu ou un quiz sera attribué, il apparaîtra ici automatiquement.</p>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Notifications récentes</h3>
            <p>Lecture en direct de la table `notifications`.</p>
          </div>

          {notifications.length ? (
            <div className="stack-list">
              {notifications.map((item) => (
                <article className="message-card" key={item.id}>
                  <span className="message-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body || "Notification système ECCE"}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune notification.</strong>
              <p>Les alertes de deadline et de feedback s&apos;afficheront ici.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Derniers contenus publiés</h3>
          <p>La bibliothèque publique de l&apos;organisation ECCE, chargée en temps réel.</p>
        </div>

        {recentContents.length ? (
          <div className="stack-list">
            {recentContents.map((content) => (
              <article className="list-row list-row-stretch" key={content.id}>
                <div>
                  <strong>{content.title}</strong>
                  <p>
                    {content.category || "Sans catégorie"} · {content.content_type}
                  </p>
                </div>
                <div className="table-actions">
                  {content.is_required ? <Badge tone="accent">obligatoire</Badge> : null}
                  <Badge tone="success">published</Badge>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun contenu publié pour le moment.</strong>
            <p>Crée un contenu publié depuis l&apos;admin pour l&apos;alimenter immédiatement.</p>
          </div>
        )}
      </section>
    </div>
  );
}
