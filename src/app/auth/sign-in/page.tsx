import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/auth/actions";
import { SignInForm } from "@/app/auth/sign-in/form";
import { Badge } from "@/components/ui/badge";
import {
  getAuthenticatedRedirectTarget,
  getCurrentUserContext,
  isSuspendedStatus
} from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function SignInPage() {
  const supabaseReady = isSupabaseConfigured();
  const { user, role, roles, profile } = await getCurrentUserContext();

  if (user) {
    if (!isSuspendedStatus(profile?.status)) {
      redirect(
        getAuthenticatedRedirectTarget({
          role,
          status: profile?.status ?? null
        })
      );
    }
  }

  return (
    <main className="auth-page auth-page-split">
      <section className="auth-showcase">
        <div className="auth-showcase-copy">
          <Badge tone={supabaseReady ? "success" : "warning"}>
            {supabaseReady ? "Supabase prêt" : "Configurer .env.local"}
          </Badge>
          <h1>Un point d&apos;entrée plus premium pour toute l&apos;équipe ECCE.</h1>
          <p>
            Connexion, redirection par rôle, première mise en route guidée et verrouillage propre
            des profils avant l&apos;entrée dans la plateforme.
          </p>
        </div>

        <div className="auth-showcase-grid">
          <article className="auth-value-card auth-value-card-accent">
            <strong>Connexion fluide</strong>
            <p>Le bon espace s&apos;ouvre automatiquement pour l&apos;admin, le coach, le professor ou le coaché.</p>
          </article>
          <article className="auth-value-card">
            <strong>Première connexion guidée</strong>
            <p>Les nouveaux comptes passent par un mini onboarding avant d&apos;activer leur espace de travail.</p>
          </article>
          <article className="auth-value-card">
            <strong>Accès maîtrisé</strong>
            <p>Les profils suspendus restent bloqués avec un message propre, sans casser le flux de session.</p>
          </article>
        </div>

        <div className="auth-metric-row">
          <div className="auth-metric-card">
            <strong>4 rôles</strong>
            <small>admin, professor, coach, coachee</small>
          </div>
          <div className="auth-metric-card">
            <strong>1 onboarding</strong>
            <small>activation du profil à la première connexion</small>
          </div>
          <div className="auth-metric-card">
            <strong>0 friction</strong>
            <small>route intelligente selon le statut réel du profil</small>
          </div>
        </div>

        <div className="auth-footnote auth-footnote-showcase">
          <span>Rôles prévus</span>
          <div className="tag-row">
            <Badge tone="neutral">admin</Badge>
            <Badge tone="accent">professor</Badge>
            <Badge tone="accent">coach</Badge>
            <Badge tone="neutral">coachee</Badge>
          </div>
        </div>
      </section>

      <section className="auth-card auth-card-premium">
        {isSuspendedStatus(profile?.status) ? (
          <>
            <div className="auth-card-copy">
              <Badge tone="warning">Accès suspendu</Badge>
              <h1>Ton espace ECCE est momentanément bloqué.</h1>
              <p>
                Le compte <strong>{user?.email ?? "utilisateur"}</strong> est actuellement suspendu.
                Déconnecte-toi puis contacte l&apos;équipe pédagogique pour réactiver l&apos;accès.
              </p>
            </div>

            <div className="auth-suspended-card">
              <div className="tag-row">
                {roles.map((currentRole) => (
                  <Badge key={currentRole} tone="warning">
                    {currentRole}
                  </Badge>
                ))}
              </div>

              <p>
                Cette protection évite d&apos;afficher la plateforme tant que le compte n&apos;est pas
                remis en état côté admin.
              </p>

              <form action={signOutAction}>
                <button className="button button-block" type="submit">
                  Me déconnecter
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <div className="auth-card-copy">
              <Badge tone="accent">Connexion ECCE</Badge>
              <h1>Entre dans ton espace en quelques secondes.</h1>
              <p>
                Le mot de passe transmis par l&apos;admin suffit. Si ton compte vient d&apos;être créé,
                ECCE t&apos;accueillera d&apos;abord avec une mise en route courte et guidée.
              </p>
            </div>

            <SignInForm />

            <Link className="button button-secondary button-block" href="/">
              Retour à la vision produit
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
