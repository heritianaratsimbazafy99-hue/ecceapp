export default function AuthLoading() {
  return (
    <main className="auth-page">
      <section className="auth-card auth-card-premium route-state-card" aria-live="polite" aria-busy="true">
        <span className="eyebrow">Connexion ECCE</span>
        <h1>On sécurise l&apos;accès.</h1>
        <p>La session, le statut du profil et la redirection de rôle sont en cours de vérification.</p>

        <div className="route-state-skeleton-grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
