import Link from "next/link";

import { CreateUserForm } from "@/app/(platform)/admin/forms";
import {
  AdminUserProfileForm,
  AdminUserRoleForm,
  AdminUserStatusForm
} from "@/app/(platform)/admin/users/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import type { AppRole, MembershipStatus } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getAdminUsersPageData } from "@/lib/platform-data";

function getRoleTone(role: AppRole) {
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

function getStatusTone(status: MembershipStatus) {
  switch (status) {
    case "active":
      return "success";
    case "invited":
      return "accent";
    default:
      return "warning";
  }
}

function buildUserHref({
  search,
  role,
  status,
  userId
}: {
  search: string;
  role: string;
  status: string;
  userId: string;
}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (role !== "all") {
    params.set("role", role);
  }

  if (status !== "all") {
    params.set("status", status);
  }

  params.set("user", userId);

  return `/admin/users?${params.toString()}`;
}

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{
    search?: string;
    role?: string;
    status?: string;
    user?: string;
  }>;
}) {
  const params = await searchParams;
  const { context, filters, metrics, users, selectedUser } = await getAdminUsersPageData({
    search: params.search,
    role: params.role,
    status: params.status,
    userId: params.user
  });

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Utilisateurs & accès"
        description="Workspace dédié pour gérer les profils ECCE, les statuts d'accès et l'extension des rôles sans alourdir le hub admin."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight admin-users-hero">
        <div className="admin-users-hero-copy">
          <span className="eyebrow">Administration des accès</span>
          <h3>Un cockpit utilisateur plus net pour les opérations sensibles.</h3>
          <p>
            Recherche rapide, lecture des rôles, édition du profil et contrôle des statuts sont maintenant regroupés au
            même endroit.
          </p>

          <div className="tag-row">
            <Badge tone="warning">{context.roles[0] ?? "admin"}</Badge>
            <Badge tone="neutral">{context.user.email ?? "email inconnu"}</Badge>
          </div>
        </div>

        <div className="admin-users-hero-side">
          <article>
            <strong>{users.length}</strong>
            <span>profil(s) dans cette vue</span>
          </article>
          <article>
            <strong>{selectedUser?.enabledNotificationCount ?? 0}/5</strong>
            <span>canaux actifs pour le profil sélectionné</span>
          </article>
          <article>
            <strong>{selectedUser?.assignmentLoad ?? 0}</strong>
            <span>assignation(s) visibles pour le profil ciblé</span>
          </article>
          <article>
            <strong>{selectedUser?.cohorts.length ?? 0}</strong>
            <span>cohorte(s) rattachée(s)</span>
          </article>
        </div>
      </section>

      <section className="admin-users-layout">
        <div className="admin-users-main">
          <section className="panel library-search-panel">
            <div className="library-search-head">
              <div>
                <span className="eyebrow">Filtrer la population</span>
                <h3>Recherche et filtres</h3>
                <p>Affiche uniquement les comptes utiles avant d&apos;ouvrir une fiche ou d&apos;appliquer un changement.</p>
              </div>

              <Link className="button button-secondary" href="/admin/users">
                Réinitialiser
              </Link>
            </div>

            <form className="admin-users-filter-form" method="get">
              <label className="conversation-search">
                <span>Recherche</span>
                <input defaultValue={filters.search} name="search" placeholder="Nom ou email" type="search" />
              </label>

              <label className="conversation-composer-field">
                <span>Rôle</span>
                <select defaultValue={filters.role} name="role">
                  <option value="all">Tous les rôles</option>
                  <option value="admin">admin</option>
                  <option value="professor">professor</option>
                  <option value="coach">coach</option>
                  <option value="coachee">coachee</option>
                </select>
              </label>

              <label className="conversation-composer-field">
                <span>Statut</span>
                <select defaultValue={filters.status} name="status">
                  <option value="all">Tous les statuts</option>
                  <option value="invited">invited</option>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </label>

              <div className="admin-users-filter-actions">
                <button className="button" type="submit">
                  Appliquer
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Liste opérable des utilisateurs</h3>
              <p>Chaque carte ouvre une fiche détaillée avec édition du profil, rôle et statut.</p>
            </div>

            {users.length ? (
              <div className="admin-users-list">
                {users.map((user) => (
                  <Link
                    className={cn("admin-user-card", selectedUser?.id === user.id && "is-active")}
                    href={buildUserHref({
                      search: filters.search,
                      role: filters.role,
                      status: filters.status,
                      userId: user.id
                    })}
                    key={user.id}
                  >
                    <div className="admin-user-card-head">
                      <div className="admin-user-card-copy">
                        <strong>{user.name}</strong>
                        <p>{user.email}</p>
                      </div>
                      <Badge tone={getStatusTone(user.status)}>{user.status}</Badge>
                    </div>

                    <div className="tag-row">
                      {user.roles.map((role) => (
                        <Badge key={`${user.id}-${role}`} tone={getRoleTone(role)}>
                          {role}
                        </Badge>
                      ))}
                      {user.isCurrentUser ? <Badge tone="neutral">compte courant</Badge> : null}
                    </div>

                    <div className="admin-user-card-meta">
                      <span>{user.assignmentLoad} assignation(s)</span>
                      <span>{user.cohorts.length ? `${user.cohorts.length} cohorte(s)` : "Sans cohorte"}</span>
                      <span>
                        {user.directCoacheeCount || user.cohortPortfolioCount
                          ? `${user.directCoacheeCount} coaché(s) · ${user.cohortPortfolioCount} cohorte(s)`
                          : "Pas de portefeuille coach"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>Aucun profil ne correspond à ces filtres.</strong>
                <p>Réinitialise la vue ou crée un nouveau compte ECCE depuis le panneau latéral.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="admin-users-detail">
          {selectedUser ? (
            <>
              <section className="panel panel-highlight admin-user-detail-hero">
                <div className="admin-user-card-copy">
                  <span className="eyebrow">Fiche sélectionnée</span>
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email}</p>
                  <p>{selectedUser.bio || "Aucune signature de profil pour l'instant."}</p>

                  <div className="tag-row">
                    <Badge tone={getStatusTone(selectedUser.status)}>{selectedUser.status}</Badge>
                    {selectedUser.roles.map((role) => (
                      <Badge key={`selected-${role}`} tone={getRoleTone(role)}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="admin-user-detail-metrics">
                  <article>
                    <strong>{selectedUser.timezone}</strong>
                    <span>fuseau personnel</span>
                  </article>
                  <article>
                    <strong>{selectedUser.createdAtLabel}</strong>
                    <span>créé le</span>
                  </article>
                  <article>
                    <strong>{selectedUser.enabledNotificationCount}/5</strong>
                    <span>canaux notifications actifs</span>
                  </article>
                  <article>
                    <strong>{selectedUser.assignmentLoad}</strong>
                    <span>assignation(s) directes + cohorte</span>
                  </article>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h3>Contexte d&apos;accès</h3>
                  <p>Repères utiles avant de modifier un compte, surtout sur les surfaces sensibles.</p>
                </div>

                <div className="organization-settings-reference-list">
                  <div>
                    <span className="eyebrow">Cohortes</span>
                    <strong>{selectedUser.cohorts.length ? selectedUser.cohorts.join(", ") : "Aucune cohorte"}</strong>
                  </div>
                  <div>
                    <span className="eyebrow">Portefeuille coach</span>
                    <strong>
                      {selectedUser.directCoacheeCount} coaché(s) direct(s) · {selectedUser.cohortPortfolioCount} cohorte(s)
                    </strong>
                  </div>
                  <div>
                    <span className="eyebrow">Compte courant</span>
                    <strong>{selectedUser.isCurrentUser ? "Oui" : "Non"}</strong>
                  </div>
                  <div>
                    <span className="eyebrow">Sécurité admin</span>
                    <strong>{selectedUser.isLastActiveAdmin ? "Dernier admin actif" : "Aucun blocage structurel"}</strong>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h3>Éditer le profil</h3>
                  <p>Nom affiché, bio et fuseau utilisés dans l&apos;agenda, la messagerie et les vues métier.</p>
                </div>

                <AdminUserProfileForm
                  defaultValues={{
                    userId: selectedUser.id,
                    firstName: selectedUser.firstName,
                    lastName: selectedUser.lastName,
                    timezone: selectedUser.timezone,
                    bio: selectedUser.bio
                  }}
                />
              </section>

              <section className="content-grid">
                <div className="panel">
                  <div className="panel-header">
                    <h3>Statut d&apos;accès</h3>
                    <p>Active, réinvite ou suspends un compte sans toucher à son historique.</p>
                  </div>

                  <AdminUserStatusForm
                    currentStatus={selectedUser.status}
                    isCurrentUser={selectedUser.isCurrentUser}
                    isLastActiveAdmin={selectedUser.isLastActiveAdmin}
                    userId={selectedUser.id}
                  />
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3>Étendre les rôles</h3>
                    <p>Ajoute un rôle complémentaire quand un même compte doit couvrir plusieurs espaces ECCE.</p>
                  </div>

                  <AdminUserRoleForm availableRoles={selectedUser.availableRoles} userId={selectedUser.id} />
                </div>
              </section>
            </>
          ) : (
            <section className="panel">
              <div className="empty-state">
                <strong>Aucune fiche sélectionnée.</strong>
                <p>Choisis un profil dans la liste ou ajuste les filtres pour faire apparaître une fiche.</p>
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-header">
              <h3>Créer un nouveau compte</h3>
              <p>Tu peux créer un accès sans quitter cette vue avant de le configurer plus finement.</p>
            </div>

            <CreateUserForm />
          </section>
        </aside>
      </section>
    </div>
  );
}
