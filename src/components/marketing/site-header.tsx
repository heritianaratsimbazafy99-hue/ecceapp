import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">ECCE</span>
        <span className="brand-copy">
          <strong>Coaching Platform</strong>
          <small>parcours, évaluation, accompagnement</small>
        </span>
      </Link>

      <nav className="site-nav" aria-label="Navigation principale">
        <Link href="#produit">Produit</Link>
        <Link href="#experience">Expérience</Link>
        <Link href="#roadmap">Roadmap</Link>
        <Link href="/dashboard">Aperçu app</Link>
      </nav>

      <Link className="button button-secondary" href="/auth/sign-in">
        Entrer dans la plateforme
      </Link>
    </header>
  );
}
