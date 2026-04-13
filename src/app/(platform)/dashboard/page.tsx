import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { DeadlineList } from "@/components/platform/deadline-list";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import {
  dashboardMetrics,
  deadlineItems,
  learningTimeline,
  messageHighlights
} from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Dashboard coaché"
        description="Vue pensée pour la progression, les prochaines actions et la visibilité sur les retours du coach."
      />

      <section className="metric-grid">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Continuer maintenant</h3>
            <p>La plateforme reprendra automatiquement le dernier point de progression.</p>
          </div>

          <div className="stack-list">
            {learningTimeline.map((item) => (
              <article className="timeline-card" key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.meta}</p>
                </div>
                <Badge tone="accent">{item.status}</Badge>
              </article>
            ))}
          </div>
        </div>

        <DeadlineList items={deadlineItems} />
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Fil d&apos;activité utile</h3>
            <p>Conçu pour limiter le bruit et ne montrer que les événements utiles au coaché.</p>
          </div>

          <div className="stack-list">
            {messageHighlights.map((message) => (
              <article className="message-card" key={message}>
                <span className="message-dot" />
                <p>{message}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel panel-accent">
          <div className="panel-header">
            <h3>Fiche de progression</h3>
            <p>Fonction clé recommandée pour ECCE.</p>
          </div>

          <div className="stack-list">
            <article className="list-row">
              <div>
                <strong>Objectif du mois</strong>
                <p>Maîtriser le cadre d&apos;une première séance complète.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Blocage repéré</strong>
                <p>Difficulté à formaliser une offre claire pendant les exercices.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Prochaine action</strong>
                <p>Soumettre la fiche de positionnement avant jeudi soir.</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
