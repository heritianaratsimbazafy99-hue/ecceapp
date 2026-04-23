import Link from "next/link";

import { heroMetrics } from "@/lib/mock-data";

type HeroProps = {
  displayName: string;
  marketingHeadline: string;
  marketingSubheadline: string;
  shortName: string;
};

export function Hero({
  displayName,
  marketingHeadline,
  marketingSubheadline,
  shortName
}: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">Plateforme {shortName}</span>
        <h1>{marketingHeadline}</h1>
        <p>{marketingSubheadline}</p>

        <div className="hero-actions">
          <Link className="button" href="/dashboard">
            Voir le dashboard
          </Link>
          <Link className="button button-secondary" href="/library">
            Explorer la bibliothèque
          </Link>
        </div>
      </div>

      <div className="hero-panel">
        <div className="hero-panel-header">
          <span>Vue consolidée {shortName}</span>
          <span>coaché + coach + admin</span>
        </div>

        <div className="hero-metrics">
          {heroMetrics.map((metric) => (
            <article className="hero-metric-card" key={metric.label}>
              <strong>{metric.value}</strong>
              <p>{metric.label}</p>
            </article>
          ))}
        </div>

        <div className="hero-preview">
          <div className="preview-column">
            <span>Coaché</span>
            <strong>Continuer le module 3</strong>
            <small>{displayName} · quiz à rendre demain</small>
          </div>
          <div className="preview-column">
            <span>Coach</span>
            <strong>5 alertes prioritaires</strong>
            <small>3 feedbacks à traiter</small>
          </div>
          <div className="preview-column">
            <span>Admin</span>
            <strong>72% de complétion</strong>
            <small>contenus les plus utiles</small>
          </div>
        </div>
      </div>
    </section>
  );
}
