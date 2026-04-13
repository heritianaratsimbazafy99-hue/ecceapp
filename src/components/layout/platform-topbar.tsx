import Link from "next/link";

type PlatformTopbarProps = {
  title: string;
  description: string;
};

export function PlatformTopbar({ title, description }: PlatformTopbarProps) {
  return (
    <header className="platform-topbar">
      <div>
        <span className="eyebrow">Vue produit ECCE</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="topbar-actions">
        <Link className="button button-secondary" href="/auth/sign-in">
          Configurer l&apos;accès
        </Link>
      </div>
    </header>
  );
}
