"use client";

import Link from "next/link";

export default function AuthError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card auth-card-premium route-state-card" aria-live="polite">
        <span className="eyebrow">Connexion interrompue</span>
        <h1>Impossible d&apos;ouvrir l&apos;écran d&apos;accès.</h1>
        <p>La vérification de session a échoué avant l&apos;affichage. Tu peux relancer la page ou revenir à l&apos;accueil.</p>

        <div className="route-state-actions">
          <button className="button" onClick={reset} type="button">
            Réessayer
          </button>
          <Link className="button button-secondary" href="/">
            Retour accueil
          </Link>
        </div>
      </section>
    </main>
  );
}
