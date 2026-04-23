import Link from "next/link";

import { AssignRoleForm, CreateUserForm } from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminOverviewPageData } from "@/lib/platform-data";

function roleTone(role: string) {
  switch (role) {
    case "admin":
      return "warning";
    case "coach":
      return "accent";
    case "professor":
      return "success";
    default:
      return "neutral";
  }
}

const studios = [
  {
    href: "/admin/users",
    title: "Utilisateurs & accès",
    description: "Piloter les profils, les statuts invited/active/suspended et les rôles depuis une vue dédiée."
  },
  {
    href: "/admin/audit",
    title: "Journal d'audit",
    description: "Relire les changements sensibles sur les accès, le catalogue et les opérations admin sans perdre l'historique."
  },
  {
    href: "/admin/learners",
    title: "Parcours coachés",
    description: "Relances, cohortes, portefeuilles coach et visibilité pédagogique."
  },
  {
    href: "/admin/settings",
    title: "Réglages organisation",
    description: "Branding, support, fuseau par défaut et paramètres structurants de la plateforme."
  },
  {
    href: "/admin/programs",
    title: "Studio parcours",
    description: "Structurer des programmes, les découper en modules et les activer par coaché ou cohorte."
  },
  {
    href: "/admin/content",
    title: "Studio contenus",
    description: "Créer, publier et organiser les ressources sans surcharger le hub admin."
  },
  {
    href: "/admin/quizzes",
    title: "Studio quiz",
    description: "Créer les quiz, enrichir les questions et piloter le catalogue d'évaluation."
  },
  {
    href: "/admin/assignments",
    title: "Assignations",
    description: "Planifier les deadlines, cibler utilisateurs ou cohortes et suivre les échéances."
  }
];

export default async function AdminPage() {
  const { metrics, users, userOptions } = await getAdminOverviewPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Hub admin"
        description="Point d'entrée allégé pour piloter ECCE, avec studios dédiés pour les opérations lourdes."
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel panel-highlight">
          <div className="panel-header">
            <h3>Studios et opérations</h3>
            <p>Chaque domaine métier dispose maintenant de sa page dédiée pour fluidifier l&apos;administration.</p>
          </div>

          <div className="admin-link-grid">
            {studios.map((studio) => (
              <Link className="admin-link-card" href={studio.href} key={studio.href}>
                <span className="eyebrow">ECCE</span>
                <strong>{studio.title}</strong>
                <p>{studio.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel">
        <div className="panel-header">
          <h3>Derniers utilisateurs</h3>
          <p>Accès rapide aux profils actifs, aux rôles et à la montée en charge de l&apos;organisation.</p>
        </div>

        <div className="topbar-actions">
          <Link className="button button-secondary button-small" href="/admin/users">
            Ouvrir le workspace utilisateurs
          </Link>
        </div>

          {users.length ? (
            <div className="stack-list">
              {users.slice(0, 6).map((user) => (
                <article className="list-row list-row-stretch" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <p>{user.email}</p>
                  </div>
                  <div className="tag-row">
                    <Badge tone={user.status === "active" ? "success" : "warning"}>{user.status}</Badge>
                    {user.roles.map((role) => (
                      <Badge key={`${user.id}-${role}`} tone={roleTone(role)}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun utilisateur métier pour l&apos;instant.</strong>
              <p>Commence par créer les premiers accès ECCE ci-dessous.</p>
            </div>
          )}
        </div>
      </section>

      <section className="admin-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Créer un utilisateur</h3>
            <p>Création du compte Supabase, du profil ECCE et du rôle initial avec onboarding guidé à la première connexion.</p>
          </div>
          <CreateUserForm />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Attribuer un rôle</h3>
            <p>Étends un accès existant sans repasser par tout le flux de création.</p>
          </div>
          <AssignRoleForm userOptions={userOptions} />
        </div>
      </section>
    </div>
  );
}
