import Link from "next/link";

import { AssignmentCommandBoard } from "@/components/assignments/assignment-command-board";
import { LearnerProgressNudge } from "@/components/dashboard/learner-progress-nudge";
import { LearnerDashboardSpotlight } from "@/components/dashboard/learner-dashboard-spotlight";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MessagingPreviewPanel } from "@/components/messages/messaging-preview-panel";
import { NotificationPreviewPanel } from "@/components/notifications/notification-preview-panel";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getDashboardPageData } from "@/lib/platform-data";

export default async function DashboardPage() {
  const {
    profileName,
    cohortLabels,
    metrics,
    engagement,
    coachCount,
    publishedContentCount,
    publishedQuizCount,
    assignments,
    notifications,
    upcomingSessions,
    badges,
    messagingWorkspace,
    recentContents,
    recentAttempts
  } =
    await getDashboardPageData();

  return (
    <div className="page-shell">
      <LearnerProgressNudge
        engagement={engagement}
        latestBadge={
          badges[0]
            ? {
                id: badges[0].id,
                title: badges[0].title,
                awardedAtIso: badges[0].awardedAtIso
              }
            : null
        }
      />

      <PlatformTopbar
        title="Dashboard coaché"
        description="Un dashboard plus premium pour suivre tes missions, tes séances, tes ressources et ta progression sans friction."
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <LearnerDashboardSpotlight
        coachCount={coachCount}
        cohortLabels={cohortLabels}
        engagement={engagement}
        focusAssignment={assignments[0] ?? null}
        nextSession={upcomingSessions[0] ?? null}
        profileName={profileName}
        publishedContentCount={publishedContentCount}
        publishedQuizCount={publishedQuizCount}
      />

      <AssignmentCommandBoard
        description="Une lecture plus nette des missions en cours, avec urgence, état d’avancement et accès direct à l’action."
        emptyBody="Quand un contenu ou un quiz sera attribué, il apparaîtra ici automatiquement."
        emptyTitle="Aucune assignation pour l'instant."
        items={assignments}
        mode="learner"
        title="Mes missions en cours"
      />

      <section className="content-grid dashboard-focus-grid">
        <NotificationPreviewPanel
          description="Le dashboard montre maintenant un aperçu plus léger, et le centre live complet se trouve dans la page dédiée."
          notifications={notifications}
          title="Notifications récentes"
        />

        <div className="dashboard-side-stack">
          <div className="panel dashboard-session-panel">
            <div className="panel-header">
              <h3>Mes sessions à venir</h3>
              <p>Les séances planifiées par le coach remontent ici avec leur lien visio.</p>
            </div>

            {upcomingSessions.length ? (
              <div className="dashboard-session-list">
                {upcomingSessions.map((session) => (
                  <article className="dashboard-session-card" key={session.id}>
                    <div className="tag-row">
                      <Badge tone="accent">{session.emphasis}</Badge>
                      {session.videoLink ? <Badge tone="success">lien prêt</Badge> : <Badge tone="neutral">lien à venir</Badge>}
                    </div>
                    <strong>Séance de coaching</strong>
                    <p>{session.date}</p>
                    {session.videoLink ? (
                      <Link className="button button-secondary button-small" href={session.videoLink} target="_blank">
                        Rejoindre
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucune séance planifiée.</strong>
                <p>Quand ton coach ajoutera une session, elle apparaîtra ici automatiquement.</p>
              </div>
            )}
          </div>

          <div className="panel panel-highlight dashboard-badge-panel">
            <div className="panel-header">
              <h3>Mes badges</h3>
              <p>Les jalons débloqués s&apos;affichent ici pour valoriser ta progression.</p>
            </div>

            {badges.length ? (
              <div className="stack-list">
                {badges.map((badge) => (
                  <article className="badge-card" key={badge.id}>
                    <div className="badge-card-icon" aria-hidden="true">
                      {badge.icon === "spark" ? "*" : "+"}
                    </div>
                    <div>
                      <strong>{badge.title}</strong>
                      <p>{badge.description}</p>
                      <small>{badge.awardedAt}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun badge débloqué.</strong>
                <p>Complète un quiz validé pour commencer à enrichir ton palmarès ECCE.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {messagingWorkspace ? (
        <section id="coach-messages">
          <MessagingPreviewPanel
            conversations={messagingWorkspace.conversations}
            contactsCount={messagingWorkspace.contacts.length}
            description="L’inbox complète a été déplacée vers une page dédiée pour garder ce dashboard plus rapide et plus lisible."
            emptyBody="Quand un coach te répondra ou qu’un fil sera lancé, l’aperçu apparaîtra ici."
            emptyTitle="Pas encore de conversation."
            title="Aperçu de messagerie"
          />
        </section>
      ) : null}

      <section className="content-grid dashboard-learning-grid">
        <div className="panel dashboard-content-panel">
          <div className="panel-header">
            <h3>Ressources du moment</h3>
            <p>Une sélection rapide de contenus publiés pour continuer à avancer sans quitter ton dashboard.</p>
          </div>

          {recentContents.length ? (
            <div className="dashboard-resource-grid">
              {recentContents.map((content) => (
                <article className="collection-card dashboard-resource-card" key={content.id}>
                  <div className="tag-row">
                    <Badge tone="accent">{content.content_type}</Badge>
                    {content.is_required ? <Badge tone="warning">obligatoire</Badge> : null}
                  </div>
                  <strong>{content.title}</strong>
                  <p>{content.summary}</p>
                  <small>{content.meta}</small>
                  <div className="assignment-card-footer">
                    <Link
                      className="button button-secondary button-small"
                      href={content.href}
                      target={content.href.startsWith("http") ? "_blank" : undefined}
                    >
                      Ouvrir
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun contenu publié pour le moment.</strong>
              <p>Crée un contenu publié depuis l&apos;admin pour l&apos;alimenter immédiatement.</p>
            </div>
          )}
        </div>

        <div className="panel dashboard-attempt-panel">
          <div className="panel-header">
            <h3>Mes derniers résultats</h3>
            <p>Les tentatives de quiz soumises apparaissent ici avec un rendu plus lisible.</p>
          </div>

          {recentAttempts.length ? (
            <div className="dashboard-attempt-list">
              {recentAttempts.map((attempt) => (
                <article className="dashboard-attempt-card" key={attempt.id}>
                  <div>
                    <strong>{attempt.title}</strong>
                    <p>{attempt.meta}</p>
                  </div>
                  <Badge tone={attempt.tone}>{attempt.score}</Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun résultat pour l&apos;instant.</strong>
              <p>Passe un quiz pour voir ici ton historique de tentatives.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
