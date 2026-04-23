import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/auth/onboarding/form";
import { Badge } from "@/components/ui/badge";
import {
  getAuthenticatedRedirectTarget,
  getCurrentUserContext,
  isSuspendedStatus,
  requiresOnboarding
} from "@/lib/auth";

function getRoleHighlights(roles: string[]) {
  if (roles.includes("admin")) {
    return [
      "Hub admin allégé avec accès aux studios dédiés.",
      "Pilotage des cohortes, des coachs et des affectations.",
      "Création centralisée des contenus, quiz et assignations."
    ];
  }

  if (roles.includes("coach")) {
    return [
      "Cockpit coach centré sur les coachés et cohortes attribués.",
      "Sessions, relances, notes et rendus visibles depuis un seul espace.",
      "Messagerie et notifications live sans bruit inutile."
    ];
  }

  if (roles.includes("professor")) {
    return [
      "Workspace professor avec vue d'ensemble pédagogique.",
      "Lecture des cohortes, signaux d'engagement et quiz structurants.",
      "Accès à la bibliothèque et aux notifications métier."
    ];
  }

  return [
    "Dashboard coaché plus premium et plus clair.",
    "Bibliothèque, quiz, assignations et sessions regroupés dans le même flux.",
    "Messagerie et notifications visibles au bon moment."
  ];
}

export default async function OnboardingPage() {
  const { user, profile, role, roles } = await getCurrentUserContext();

  if (!user || !profile) {
    redirect("/auth/sign-in");
  }

  if (isSuspendedStatus(profile.status)) {
    redirect("/auth/sign-in");
  }

  if (!requiresOnboarding(profile.status)) {
    redirect(
      getAuthenticatedRedirectTarget({
        role,
        status: profile.status
      })
    );
  }

  const displayName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user.email ?? "Membre ECCE";
  const roleHighlights = getRoleHighlights(roles);

  return (
    <main className="auth-page onboarding-page">
      <section className="auth-showcase onboarding-showcase">
        <div className="auth-showcase-copy">
          <Badge tone="accent">Première connexion</Badge>
          <h1>Bienvenue {displayName}, on finalise ton espace avant de te lancer.</h1>
          <p>
            Deux minutes suffisent pour activer ton profil, ajuster le fuseau horaire et rendre ton
            espace ECCE cohérent pour les séances, les deadlines et la collaboration.
          </p>
        </div>

        <div className="auth-showcase-grid">
          {roleHighlights.map((item) => (
            <article className="auth-value-card" key={item}>
              <strong>Ce qui s&apos;ouvre juste après</strong>
              <p>{item}</p>
            </article>
          ))}
        </div>

        <div className="auth-footnote auth-footnote-showcase">
          <span>Rôles détectés</span>
          <div className="tag-row">
            {roles.map((currentRole) => (
              <Badge key={currentRole} tone="accent">
                {currentRole}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="auth-card auth-card-premium onboarding-card">
        <div className="auth-card-copy">
          <Badge tone="success">Activation du profil</Badge>
          <h1>Dernière étape avant l&apos;ouverture du workspace.</h1>
          <p>
            Ton compte est encore marqué <strong>invited</strong>. Une fois ces informations
            enregistrées, ECCE t&apos;enverra directement sur la bonne interface métier.
          </p>
        </div>

        <div className="onboarding-checklist">
          <div className="onboarding-checklist-item">
            <strong>1. Vérifier ton identité</strong>
            <p>Prénom, nom et bio courte pour personnaliser les échanges.</p>
          </div>
          <div className="onboarding-checklist-item">
            <strong>2. Régler le temps</strong>
            <p>Le fuseau horaire permet d&apos;afficher correctement quiz, deadlines et sessions.</p>
          </div>
          <div className="onboarding-checklist-item">
            <strong>3. Débloquer l&apos;espace</strong>
            <p>Le statut passe à actif puis la navigation s&apos;ouvre automatiquement.</p>
          </div>
        </div>

        <OnboardingForm
          defaultValues={{
            bio: profile.bio ?? "",
            firstName: profile.first_name,
            lastName: profile.last_name,
            timezone: profile.timezone ?? "Indian/Antananarivo"
          }}
        />
      </section>
    </main>
  );
}
