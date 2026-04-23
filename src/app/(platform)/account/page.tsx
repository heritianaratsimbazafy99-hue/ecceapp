import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAccountPageData } from "@/lib/account";

import {
  AccountNotificationPreferencesForm,
  AccountProfileForm
} from "@/app/(platform)/account/forms";

function getRoleTone(role: string) {
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

export default async function AccountPage() {
  const { context, branding, metrics, notificationPreferences } = await getAccountPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Mon compte"
        description="Garde ton profil à jour et pilote les notifications réellement utiles sans dépendre du seul onboarding."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight account-settings-hero">
        <div className="account-settings-hero-copy">
          <span className="eyebrow">Compte actif</span>
          <h3>
            {context.profile.first_name} {context.profile.last_name}
          </h3>
          <p>
            Ton espace {branding.shortName} peut maintenant être ajusté sans repasser par le flux
            de première connexion.
          </p>

          <div className="tag-row">
            {context.roles.map((role) => (
              <Badge key={role} tone={getRoleTone(role)}>
                {role}
              </Badge>
            ))}
            <Badge tone="neutral">{context.user.email ?? "email inconnu"}</Badge>
          </div>
        </div>

        <div className="account-settings-hero-side">
          <article>
            <strong>{branding.displayName}</strong>
            <span>organisation active</span>
          </article>
          <article>
            <strong>{context.profile.status}</strong>
            <span>statut du profil</span>
          </article>
          <article>
            <strong>{branding.supportEmail ?? "support non défini"}</strong>
            <span>contact support</span>
          </article>
          <article>
            <strong>{context.profile.timezone}</strong>
            <span>fuseau personnel</span>
          </article>
        </div>
      </section>

      <section className="account-settings-grid">
        <div className="account-settings-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Identité personnelle</h3>
              <p>Nom affiché, bio courte et fuseau utilisé dans les pages, les sessions et les échanges.</p>
            </div>

            <AccountProfileForm
              defaultValues={{
                firstName: context.profile.first_name,
                lastName: context.profile.last_name,
                timezone: context.profile.timezone,
                bio: context.profile.bio ?? ""
              }}
            />
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Préférences de notifications</h3>
              <p>Choisis les signaux qui méritent d&apos;arriver dans ton centre live et coupe le reste.</p>
            </div>

            <AccountNotificationPreferencesForm preferences={notificationPreferences} />
          </section>
        </div>

        <aside className="account-settings-aside">
          <section className="panel">
            <div className="panel-header">
              <h3>Ce qui change réellement</h3>
              <p>Ces réglages ne sont pas cosmétiques: le moteur de notifications les respecte déjà.</p>
            </div>

            <div className="stack-list">
              <article className="list-row list-row-stretch">
                <div>
                  <strong>Messagerie</strong>
                  <p>Tu peux couper les alertes de nouveaux messages sans désactiver le hub temps réel.</p>
                </div>
                <Badge tone={notificationPreferences.allowMessageNotifications ? "success" : "warning"}>
                  {notificationPreferences.allowMessageNotifications ? "actif" : "coupé"}
                </Badge>
              </article>

              <article className="list-row list-row-stretch">
                <div>
                  <strong>Parcours & assignations</strong>
                  <p>Les annonces de parcours, cohortes et deadlines suivent maintenant ta préférence.</p>
                </div>
                <Badge tone={notificationPreferences.allowLearningNotifications ? "success" : "warning"}>
                  {notificationPreferences.allowLearningNotifications ? "actif" : "coupé"}
                </Badge>
              </article>

              <article className="list-row list-row-stretch">
                <div>
                  <strong>Relectures & corrections</strong>
                  <p>Très utile pour les coachs et admins qui veulent garder uniquement les alertes critiques.</p>
                </div>
                <Badge tone={notificationPreferences.allowReviewNotifications ? "success" : "warning"}>
                  {notificationPreferences.allowReviewNotifications ? "actif" : "coupé"}
                </Badge>
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Support</h3>
              <p>Repère rapide si tu dois faire remonter un problème de plateforme ou d&apos;accès.</p>
            </div>

            <div className="organization-settings-reference-list">
              <div>
                <span className="eyebrow">Organisation</span>
                <strong>{branding.displayName}</strong>
              </div>
              <div>
                <span className="eyebrow">Email support</span>
                <strong>{branding.supportEmail ?? "Aucun email défini"}</strong>
              </div>
              <div>
                <span className="eyebrow">Téléphone</span>
                <strong>{branding.supportPhone ?? "Aucun numéro défini"}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
