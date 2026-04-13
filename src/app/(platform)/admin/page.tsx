import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";

const adminMetrics = [
  { label: "Coachés actifs", value: "148", delta: "12 nouvelles activations ce mois-ci" },
  { label: "Complétion moyenne", value: "72%", delta: "progression stable sur 30 jours" },
  { label: "Contenus publiés", value: "64", delta: "9 nouvelles ressources en préparation" },
  { label: "Retards critiques", value: "11", delta: "cohortes à relancer aujourd'hui" }
];

export default function AdminPage() {
  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Pilotage admin"
        description="Vue globale de la plateforme pour suivre l'adoption, la qualité pédagogique et la charge opérationnelle."
      />

      <section className="metric-grid">
        {adminMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Indicateurs à suivre dès la V1</h3>
            <p>Des métriques simples pour piloter la plateforme sans attendre une couche analytics avancée.</p>
          </div>

          <div className="stack-list">
            <article className="list-row">
              <div>
                <strong>Taux de complétion par module</strong>
                <p>Identifier les étapes de parcours où les coachés décrochent le plus.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Qualité perçue des contenus</strong>
                <p>Mesurer les ressources jugées utiles ou à améliorer par les coachés.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Charge de correction</strong>
                <p>Anticiper la pression opérationnelle sur les coachs et professeurs.</p>
              </div>
            </article>
          </div>
        </div>

        <div className="panel panel-accent">
          <div className="panel-header">
            <h3>Recommandation structurelle</h3>
            <p>Le bon choix pour ECCE est de piloter la plateforme comme un produit d&apos;accompagnement.</p>
          </div>

          <div className="stack-list">
            <article className="list-row">
              <div>
                <strong>Dashboard par rôle</strong>
                <p>Chaque rôle voit immédiatement ce qu&apos;il doit faire, sans surcharge cognitive.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Un moteur d&apos;assignation</strong>
                <p>Pour cibler contenus, quiz et deadlines par cohorte, groupe ou individu.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Historique d&apos;activité</strong>
                <p>Pour comprendre qui a publié, corrigé, modifié ou commenté chaque objet métier.</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
