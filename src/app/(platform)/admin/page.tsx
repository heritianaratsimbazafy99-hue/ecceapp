import Link from "next/link";

import { AssignRoleForm, CreateUserForm } from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminOverviewPageData } from "@/lib/platform-data";

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

function getStatusTone(status: string) {
  switch (status) {
    case "active":
      return "success";
    case "invited":
      return "accent";
    default:
      return "warning";
  }
}

export default async function AdminPage() {
  const {
    auditEnabled,
    auditMessage,
    branding,
    hero,
    learnerAlerts,
    latestAudit,
    metrics,
    priorityActions,
    recentAuditEvents,
    recentUsers,
    studioCards,
    systemPulse,
    userOptions
  } = await getAdminOverviewPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Hub admin"
        description="Centre de commandement ECCE pour lire les urgences réelles, arbitrer les studios et piloter la plateforme sans naviguer à l’aveugle."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight admin-command-hero">
        <div className="admin-command-copy">
          <span className="eyebrow">Command center</span>
          <h3>{hero.title}, un cockpit admin enfin branché sur l’état réel de la plateforme.</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{hero.subtitle}</Badge>
            <Badge tone="accent">{branding.defaultTimezone}</Badge>
            <Badge tone={branding.allowCoachSelfSchedule ? "success" : "warning"}>
              {branding.allowCoachSelfSchedule ? "auto-planification coach active" : "auto-planification coach coupée"}
            </Badge>
          </div>

          <div className="admin-command-actions">
            <Link className="button" href="/admin/learners">
              Ouvrir learner ops
            </Link>
            <Link className="button button-secondary" href="/admin/audit">
              Ouvrir l&apos;audit
            </Link>
            <Link className="button button-secondary" href="/admin/settings">
              Ouvrir les réglages
            </Link>
          </div>
        </div>

        <div className="admin-command-side">
          <EngagementMeter
            band={
              metrics[1]?.value && Number.parseInt(metrics[1].value.replace("%", ""), 10) >= 75
                ? "strong"
                : metrics[1]?.value && Number.parseInt(metrics[1].value.replace("%", ""), 10) >= 45
                  ? "watch"
                  : "risk"
            }
            bandLabel={
              metrics[1]?.value && Number.parseInt(metrics[1].value.replace("%", ""), 10) >= 75
                ? "Pilotage stable"
                : metrics[1]?.value && Number.parseInt(metrics[1].value.replace("%", ""), 10) >= 45
                  ? "Pilotage à surveiller"
                  : "Pilotage à renforcer"
            }
            caption={`${systemPulse.roleCounts.coachee} coaché(s) · ${systemPulse.roleCounts.coach} coach(s)`}
            score={Number.parseInt(metrics[1]?.value.replace("%", "") ?? "0", 10) || 0}
            trend={systemPulse.learnersWithoutCoach > 0 || systemPulse.overdueAssignments > 0 ? "down" : "steady"}
            trendLabel={
              systemPulse.learnersWithoutCoach > 0 || systemPulse.overdueAssignments > 0
                ? `${systemPulse.learnersWithoutCoach} sans coach · ${systemPulse.overdueAssignments} deadline(s) en retard`
                : "système globalement sous contrôle"
            }
          />

          <div className="admin-command-metrics">
            <article>
              <strong>{systemPulse.invitedUsers}</strong>
              <span>invitation(s) en attente</span>
            </article>
            <article>
              <strong>{systemPulse.suspendedUsers}</strong>
              <span>accès suspendus</span>
            </article>
            <article>
              <strong>{systemPulse.learnersWithoutCoach}</strong>
              <span>coaché(s) sans coach</span>
            </article>
            <article>
              <strong>{systemPulse.learnersWithoutCohort}</strong>
              <span>coaché(s) sans cohorte</span>
            </article>
          </div>
        </div>
      </section>

      <section className="admin-command-layout">
        <section className="panel">
          <div className="panel-header">
            <h3>Priorités immédiates</h3>
            <p>Les actions qui bougent le plus la plateforme maintenant, construites à partir des vraies tensions du système.</p>
          </div>

          <div className="admin-priority-list">
            {priorityActions.map((action) => (
              <article className="admin-priority-card" key={action.id}>
                <div className="tag-row">
                  <Badge tone={action.tone}>{action.title}</Badge>
                </div>
                <p>{action.description}</p>
                <Link className="button button-secondary button-small" href={action.href}>
                  {action.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <aside className="admin-command-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Dernier signal d&apos;audit</h3>
              <p>Une trace courte du dernier changement sensible avant d&apos;ouvrir le journal complet.</p>
            </div>

            {latestAudit ? (
              <div className="admin-audit-spotlight">
                <Badge tone="accent">{latestAudit.categoryLabel}</Badge>
                <strong>{latestAudit.summary}</strong>
                <p>
                  {latestAudit.actorName} · {latestAudit.createdAtFull}
                </p>
                <Link className="button button-secondary button-small" href="/admin/audit">
                  Voir le journal
                </Link>
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>{auditEnabled ? "Aucun événement récent." : "Audit non disponible."}</strong>
                <p>{auditEnabled ? "Le flux se remplira à la prochaine action sensible." : auditMessage ?? "Table d'audit manquante."}</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Organisation</h3>
              <p>Raccourci vers le branding et les paramètres structurants déjà branchés dans ECCE.</p>
            </div>

            <div className="admin-command-org-card">
              <strong>{branding.displayName}</strong>
              <p>{branding.platformTagline}</p>
              <div className="tag-row">
                <Badge tone="neutral">{branding.slug}</Badge>
                {branding.supportEmail ? <Badge tone="success">{branding.supportEmail}</Badge> : <Badge tone="warning">support à définir</Badge>}
              </div>
            </div>
          </section>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header-rich">
          <div>
            <h3>Studios ECCE</h3>
            <p>Chaque domaine remonte maintenant son état réel directement dans le hub pour éviter les allers-retours inutiles.</p>
          </div>

          <div className="messaging-inline-stats">
            <article>
              <strong>{studioCards.length}</strong>
              <span>studios reliés</span>
            </article>
            <article>
              <strong>{systemPulse.roleCounts.admin}</strong>
              <span>admin(s)</span>
            </article>
            <article>
              <strong>{systemPulse.roleCounts.professor}</strong>
              <span>professor(s)</span>
            </article>
            <article>
              <strong>{systemPulse.roleCounts.coach}</strong>
              <span>coach(s)</span>
            </article>
          </div>
        </div>

        <div className="admin-studio-grid">
          {studioCards.map((studio) => (
            <Link className="admin-studio-card" href={studio.href} key={studio.href}>
              <div className="tag-row">
                <Badge tone={studio.tone}>{studio.eyebrow}</Badge>
              </div>
              <strong>{studio.title}</strong>
              <p>{studio.description}</p>
              <span className="admin-studio-status">{studio.status}</span>
              <div className="admin-studio-meta">
                {studio.highlights.map((highlight) => (
                  <span key={`${studio.href}-${highlight}`}>{highlight}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Derniers profils visibles</h3>
            <p>Lecture rapide des accès récemment présents dans l&apos;organisation avant d&apos;ouvrir le workspace utilisateurs.</p>
          </div>

          {recentUsers.length ? (
            <div className="stack-list">
              {recentUsers.map((user) => (
                <article className="list-row list-row-stretch" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <p>{user.email}</p>
                  </div>
                  <div className="tag-row">
                    <Badge tone={getStatusTone(user.status)}>{user.status}</Badge>
                    {user.roles.map((role) => (
                      <Badge key={`${user.id}-${role}`} tone={getRoleTone(role)}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun profil visible.</strong>
              <p>Crée les premiers accès ECCE pour activer la vue utilisateurs.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Coachés à surveiller</h3>
            <p>Les signaux faibles les plus utiles à garder en tête avant d&apos;ouvrir learner ops.</p>
          </div>

          {learnerAlerts.length ? (
            <div className="stack-list">
              {learnerAlerts.map((learner) => (
                <article className="list-row list-row-stretch" key={learner.id}>
                  <div>
                    <strong>{learner.name}</strong>
                    <p>
                      {learner.lastActivityLabel} · {learner.nextFocus}
                    </p>
                    <p>
                      {learner.coachCount} coach(s) · {learner.cohortCount} cohorte(s)
                    </p>
                  </div>
                  <div className="list-row-meta">
                    <Badge tone={learner.band === "risk" ? "warning" : "accent"}>{learner.bandLabel}</Badge>
                    <strong>{learner.score}%</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun signal faible.</strong>
              <p>La population visible remonte actuellement une dynamique saine.</p>
            </div>
          )}
        </section>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Créer un utilisateur</h3>
            <p>Création du compte Supabase, du profil ECCE et du rôle initial avec onboarding guidé à la première connexion.</p>
          </div>
          <CreateUserForm />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Attribuer un rôle</h3>
            <p>Étends un accès existant sans repasser par tout le flux de création, directement depuis le hub.</p>
          </div>
          <AssignRoleForm userOptions={userOptions} />
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Audit récent</h3>
          <p>Les derniers événements sensibles visibles depuis le hub, sans basculer immédiatement dans la page d&apos;audit complète.</p>
        </div>

        {recentAuditEvents.length ? (
          <div className="admin-audit-feed">
            {recentAuditEvents.map((event) => (
              <article className="admin-audit-row" key={event.id}>
                <div>
                  <strong>{event.summary}</strong>
                  <p>
                    {event.actorName} · {event.createdAtFull}
                  </p>
                </div>
                <Badge tone="accent">{event.categoryLabel}</Badge>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>{auditEnabled ? "Aucun événement récent." : "Audit non initialisé."}</strong>
            <p>{auditEnabled ? "Les prochains changements sensibles remonteront ici." : auditMessage ?? "Table d'audit manquante."}</p>
          </div>
        )}
      </section>
    </div>
  );
}
