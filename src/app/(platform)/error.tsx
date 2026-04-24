"use client";

import Link from "next/link";

export default function PlatformError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="route-state route-state-platform" aria-live="polite">
      <div className="route-state-card">
        <span className="eyebrow">Incident workspace</span>
        <h1>Cette vue n&apos;a pas pu se charger.</h1>
        <p>
          La session reste active. Réessaie d&apos;abord, puis reviens au dashboard si le problème persiste.
        </p>

        {error.digest ? <small>Référence technique : {error.digest}</small> : null}

        <div className="route-state-actions">
          <button className="button" onClick={reset} type="button">
            Réessayer
          </button>
          <Link className="button button-secondary" href="/dashboard">
            Retour dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
