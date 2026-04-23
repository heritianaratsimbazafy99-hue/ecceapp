import Link from "next/link";

type SiteHeaderProps = {
  brandMark: string;
  displayName: string;
  platformTagline: string;
};

export function SiteHeader({ brandMark, displayName, platformTagline }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">{brandMark}</span>
        <span className="brand-copy">
          <strong>{displayName}</strong>
          <small>{platformTagline}</small>
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
