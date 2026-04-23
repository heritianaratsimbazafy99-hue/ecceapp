import Link from "next/link";

import { NotificationBell } from "@/components/notifications/realtime-notification-center";
import { signOutAction } from "@/app/auth/actions";

type AccountChipProps = {
  email: string;
  role: string;
  name: string;
  userId: string;
};

export function AccountChip({ email, role, name, userId }: AccountChipProps) {
  return (
    <div className="account-chip">
      <div>
        <strong>{name}</strong>
        <p>
          {email} · {role}
        </p>
      </div>

      <div className="account-chip-actions">
        <NotificationBell userId={userId} />

        <Link className="button button-secondary button-small" href="/account">
          Mon compte
        </Link>

        <form action={signOutAction}>
          <button className="button button-secondary button-small" type="submit">
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  );
}
