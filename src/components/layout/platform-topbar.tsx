import Link from "next/link";
import type { ReactNode } from "react";

type PlatformTopbarProps = {
  actions?: ReactNode;
  title: string;
  description: string;
};

export function PlatformTopbar({ actions, title, description }: PlatformTopbarProps) {
  return (
    <header className="platform-topbar">
      <div>
        <span className="eyebrow">Vue produit ECCE</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="topbar-actions">
        {actions ?? (
          <>
            <Link className="button button-secondary" href="/notifications">
              Notifications
            </Link>
            <Link className="button" href="/account">
              Mon compte
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
