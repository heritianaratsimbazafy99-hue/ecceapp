import { CreateContentForm, CreateUserForm, AssignRoleForm } from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminPageData } from "@/lib/platform-data";

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

export default async function AdminPage() {
  const { metrics, users, userOptions, contents } = await getAdminPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Pilotage admin"
        description="Back-office réel ECCE pour créer des utilisateurs, attribuer des rôles et gérer les premiers contenus connectés à Supabase."
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="admin-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Créer un utilisateur</h3>
            <p>Création du compte Supabase, du profil ECCE et attribution du premier rôle.</p>
          </div>
          <CreateUserForm />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Attribuer un rôle</h3>
            <p>Ajoute un rôle complémentaire à un utilisateur déjà créé.</p>
          </div>
          <AssignRoleForm userOptions={userOptions} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Créer un contenu</h3>
          <p>Premier back-office branché sur `content_items` pour alimenter la bibliothèque réelle.</p>
        </div>
        <CreateContentForm />
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Utilisateurs ECCE</h3>
            <p>Vue réelle des profils et des rôles actuellement enregistrés.</p>
          </div>

          {users.length ? (
            <div className="data-table">
              <div className="table-head">
                <span>Utilisateur</span>
                <span>Statut</span>
                <span>Rôles</span>
              </div>
              {users.map((user) => (
                <article className="table-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <p>{user.email}</p>
                  </div>
                  <div>
                    <Badge tone={user.status === "active" ? "success" : "warning"}>
                      {user.status}
                    </Badge>
                  </div>
                  <div className="tag-row">
                    {user.roles.length ? (
                      user.roles.map((role) => (
                        <Badge key={`${user.id}-${role}`} tone={roleTone(role)}>
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge tone="neutral">sans rôle</Badge>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun utilisateur métier pour l&apos;instant.</strong>
              <p>Crée ton premier coach, coaché ou professeur depuis le formulaire ci-dessus.</p>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Contenus enregistrés</h3>
            <p>Les éléments créés ici apparaîtront ensuite dans la bibliothèque publique selon leur statut.</p>
          </div>

          {contents.length ? (
            <div className="stack-list">
              {contents.map((content) => (
                <article className="list-row" key={content.id}>
                  <div>
                    <strong>{content.title}</strong>
                    <p>
                      {content.category || "Sans catégorie"} · {content.content_type} ·{" "}
                      {content.estimated_minutes ? `${content.estimated_minutes} min` : "durée libre"}
                    </p>
                  </div>
                  <Badge tone={content.status === "published" ? "success" : "neutral"}>
                    {content.status}
                  </Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun contenu n&apos;a encore été créé.</strong>
              <p>Utilise le formulaire ci-dessus pour alimenter la bibliothèque ECCE.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
