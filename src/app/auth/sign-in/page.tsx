import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function SignInPage() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card-copy">
          <Badge tone={supabaseReady ? "success" : "warning"}>
            {supabaseReady ? "Supabase prêt" : "Configurer .env.local"}
          </Badge>
          <h1>Connexion ECCE</h1>
          <p>
            Cette page servira de point d&apos;entrée pour l&apos;authentification Supabase
            avec redirection selon le rôle de l&apos;utilisateur.
          </p>
        </div>

        <form className="auth-form">
          <label>
            Email
            <input placeholder="coach@ecce.school" type="email" />
          </label>
          <label>
            Mot de passe
            <input placeholder="••••••••" type="password" />
          </label>

          <button className="button" type="button">
            Continuer
          </button>
        </form>

        <div className="auth-footnote">
          <span>Rôles prévus</span>
          <div className="tag-row">
            <Badge tone="neutral">admin</Badge>
            <Badge tone="accent">professor</Badge>
            <Badge tone="accent">coach</Badge>
            <Badge tone="neutral">coachee</Badge>
          </div>
        </div>

        <Link className="button button-secondary button-block" href="/">
          Retour à la vision produit
        </Link>
      </div>
    </main>
  );
}
