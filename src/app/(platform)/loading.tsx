export default function PlatformLoading() {
  return (
    <div className="page-shell">
      <section className="route-state route-state-platform" aria-live="polite" aria-busy="true">
        <div className="route-state-card">
          <span className="eyebrow">Chargement ECCE</span>
          <h1>On prépare ton workspace.</h1>
          <p>Les données de rôle, notifications, messages et progression arrivent dans quelques instants.</p>

          <div className="route-state-skeleton-grid" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    </div>
  );
}
