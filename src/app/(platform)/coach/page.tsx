import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { CoachRoster } from "@/components/platform/coach-roster";
import { MetricCard } from "@/components/platform/metric-card";
import { coachAlerts, coachRoster } from "@/lib/mock-data";

export default function CoachPage() {
  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Cockpit coach"
        description="Une vue conçue pour agir vite: détecter les retards, corriger, préparer les sessions et suivre les cohortes."
      />

      <section className="metric-grid">
        {coachAlerts.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} delta={metric.note} />
        ))}
      </section>

      <section className="content-grid">
        <CoachRoster items={coachRoster} />

        <div className="panel panel-accent">
          <div className="panel-header">
            <h3>Ce que je recommande pour la V1.5</h3>
            <p>Les éléments ci-dessous feront vraiment monter la valeur du produit côté coach.</p>
          </div>

          <div className="stack-list">
            <article className="list-row">
              <div>
                <strong>Fiche individuelle</strong>
                <p>Objectifs, blocages, prochaines actions, notes de session et feedbacks.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Score d&apos;engagement</strong>
                <p>Identifier en amont les coachés qui risquent de décrocher.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Vue par cohorte</strong>
                <p>Comparer rapidement progression, retards, évaluations et charge de correction.</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
