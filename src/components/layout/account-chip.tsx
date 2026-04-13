import { signOutAction } from "@/app/auth/actions";

type AccountChipProps = {
  email: string;
  role: string;
  name: string;
};

export function AccountChip({ email, role, name }: AccountChipProps) {
  return (
    <div className="account-chip">
      <div>
        <strong>{name}</strong>
        <p>
          {email} · {role}
        </p>
      </div>

      <form action={signOutAction}>
        <button className="button button-secondary button-small" type="submit">
          Déconnexion
        </button>
      </form>
    </div>
  );
}
