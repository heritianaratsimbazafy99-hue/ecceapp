export default function PlatformLoading() {
  return (
    <div className="page-shell">
      <section className="route-state route-state-platform route-state-inline" aria-live="polite" aria-busy="true">
        <div className="route-state-card route-state-card-compact">
          <div className="route-state-inline-head">
            <div>
              <span className="eyebrow">Chargement ECCE</span>
              <h1>La vue arrive.</h1>
            </div>
            <span className="route-state-spinner" aria-hidden="true" />
          </div>

          <p>On synchronise les dernières données utiles sans masquer ton workspace.</p>
          <div className="route-state-progress" aria-hidden="true">
            <span />
          </div>
        </div>
      </section>
    </div>
  );
}
