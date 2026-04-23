import Link from "next/link";

import { RealtimeConversationHub } from "@/components/messages/realtime-conversation-hub";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getMessagesPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildMessagesHref({
  lane,
  conversation
}: {
  lane?: string;
  conversation?: string | null;
}) {
  const searchParams = new URLSearchParams();

  if (lane && lane !== "all") {
    searchParams.set("lane", lane);
  }

  if (conversation) {
    searchParams.set("conversation", conversation);
  }

  const value = searchParams.toString();
  return value ? `/messages?${value}` : "/messages";
}

export default async function MessagesPage({
  searchParams
}: {
  searchParams: Promise<{
    lane?: string;
    conversation?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    context,
    messagingWorkspace,
    metrics,
    hero,
    pulse,
    filters,
    laneBreakdown,
    focusThread,
    priorityThreads,
    contactSpotlights,
    responsePlaybook
  } = await getMessagesPageData({
    lane: params.lane,
    conversationId: params.conversation
  });
  const viewerIsCoach = context.roles.includes("coach");
  const activeLaneBadge =
    filters.lane === "all"
      ? null
      : laneBreakdown.find((lane) => lane.id === filters.lane)?.label ?? null;

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Messages"
        description={
          viewerIsCoach
            ? "Command center premium pour piloter les fils coach/coachee, reprendre les conversations au bon moment et garder une relation claire."
            : "Command center premium pour suivre les échanges avec tes coachs, retrouver le bon contexte et agir sans friction."
        }
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight messages-command-hero">
        <div className="messages-command-copy">
          <span className="eyebrow">{hero.eyebrow}</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            {activeLaneBadge ? <Badge tone="accent">{activeLaneBadge}</Badge> : null}
            {focusThread ? <Badge tone={focusThread.tone}>{focusThread.laneLabel}</Badge> : null}
          </div>

          <div className="messages-actions">
            <Link className="button" href={focusThread ? buildMessagesHref({ conversation: focusThread.id }) : "#messages-hub"}>
              Ouvrir le fil focus
            </Link>
            <Link className="button button-secondary" href="/agenda">
              Ouvrir l&apos;agenda
            </Link>
            <Link className="button button-secondary" href="/notifications">
              Voir les notifications
            </Link>
          </div>
        </div>

        <div className="messages-command-side">
          <EngagementMeter
            band={pulse.band}
            bandLabel={pulse.bandLabel}
            caption={pulse.caption}
            score={pulse.score}
            trend={pulse.trend}
            trendLabel={pulse.trendLabel}
          />

          <div className="messages-lane-grid">
            {laneBreakdown.map((lane) => (
              <Link
                className={cn("messages-lane-card", lane.isActive && "is-active")}
                href={buildMessagesHref({
                  lane: filters.lane === lane.id ? "all" : lane.id,
                  conversation: filters.selectedConversationId
                })}
                key={lane.id}
              >
                <span>{lane.label}</span>
                <strong>{lane.count}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="messages-command-layout">
        <section className="panel library-search-panel">
          <div className="library-search-head">
            <div>
              <span className="eyebrow">Priorités inbox</span>
              <h3>Watchlist des fils à reprendre maintenant</h3>
              <p>
                La messagerie temps réel reste le moteur principal. Cette vue ajoute la lecture
                opératoire pour décider quel fil rouvrir en premier.
              </p>
            </div>

            <Link className="button button-secondary" href="/messages">
              Réinitialiser
            </Link>
          </div>

          <div className="tag-row">
            <Badge tone="neutral">{messagingWorkspace.contacts.length} contact(s) activables</Badge>
            <Badge tone="accent">{priorityThreads.length} fil(s) dans la watchlist</Badge>
            <Badge tone={pulse.band === "strong" ? "success" : pulse.band === "watch" ? "accent" : "warning"}>
              pulse {pulse.score}%
            </Badge>
          </div>

          <div className="messages-playbook-grid">
            {responsePlaybook.map((item) => (
              <article className="messages-playbook-card" key={item.title}>
                <Badge tone={item.tone}>{item.title}</Badge>
                <p>{item.body}</p>
                <Link className="inline-link" href={item.href}>
                  {item.cta}
                </Link>
              </article>
            ))}
          </div>

          {priorityThreads.length ? (
            <div className="messages-priority-list" id="messages-watchlist">
              {priorityThreads.map((thread) => (
                <Link
                  className={cn(
                    "messages-priority-card",
                    filters.selectedConversationId === thread.id && "is-active"
                  )}
                  href={buildMessagesHref({
                    lane: filters.lane === "all" ? undefined : filters.lane,
                    conversation: thread.id
                  })}
                  key={thread.id}
                >
                  <div className="messages-priority-copy">
                    <div className="messages-priority-topline">
                      <strong>{thread.counterpartName}</strong>
                      <Badge tone={thread.tone}>{thread.laneLabel}</Badge>
                    </div>
                    <p>{thread.nextAction}</p>
                    <small>
                      {thread.lastMessagePreview ?? "Aucun aperçu disponible"} · {thread.lastTouchpointLabel}
                    </small>
                  </div>

                  <div className="messages-priority-meta">
                    <span>{thread.recentMessageCount} msg</span>
                    <span>{thread.unreadCount} non lu(s)</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state-compact">
              <strong>Aucun fil dans cette vue.</strong>
              <p>Change la lane active ou réinitialise le filtre pour rouvrir toute l&apos;inbox.</p>
            </div>
          )}
        </section>

        <aside className="messages-side-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Fil focus</h3>
              <p>Le meilleur point d&apos;entrée pour reprendre la conversation maintenant.</p>
            </div>

            {focusThread ? (
              <>
                <div className="tag-row">
                  <Badge tone={focusThread.tone}>{focusThread.laneLabel}</Badge>
                  <Badge tone="neutral">{focusThread.lastTouchpointLabel}</Badge>
                </div>

                <div className="messages-focus-metrics">
                  <article>
                    <strong>{focusThread.unreadCount}</strong>
                    <span>non lu(s)</span>
                  </article>
                  <article>
                    <strong>{focusThread.recentMessageCount}</strong>
                    <span>message(s)</span>
                  </article>
                </div>

                <div className="messages-focus-copy">
                  <strong>{focusThread.counterpartName}</strong>
                  <p>{focusThread.nextAction}</p>
                  <small>{focusThread.lastMessagePreview ?? "Aucun aperçu disponible"}</small>
                </div>

                <Link className="button button-secondary button-small" href={buildMessagesHref({ conversation: focusThread.id })}>
                  Ouvrir la conversation
                </Link>
              </>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun fil focus.</strong>
                <p>La messagerie reste prête pour démarrer un premier échange dès qu&apos;un contact est disponible.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Contacts spotlight</h3>
              <p>Les personnes qui concentrent le plus de contexte ou de tension dans la vue active.</p>
            </div>

            {contactSpotlights.length ? (
              <div className="messages-contact-list">
                {contactSpotlights.map((contact) => (
                  <article className="messages-contact-item" key={contact.id}>
                    <div>
                      <strong>{contact.name}</strong>
                      <p>{contact.nextAction}</p>
                    </div>

                    <div className="messages-contact-meta">
                      <Badge tone={contact.tone}>{contact.laneLabel}</Badge>
                      <small>
                        {contact.threadCount} fil(s) · {contact.recentMessageCount} msg · {contact.lastTouchpointLabel}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun contact à afficher.</strong>
                <p>La vue active ne contient pas encore de conversation exploitable.</p>
              </div>
            )}
          </section>
        </aside>
      </section>

      <div id="messages-hub">
        <RealtimeConversationHub
          composerPlaceholder={
            viewerIsCoach
              ? "Envoie une relance, un feedback concret ou la prochaine action attendue."
              : "Pose une question, partage un blocage ou confirme ta prochaine étape."
          }
          contacts={messagingWorkspace.contacts}
          conversations={messagingWorkspace.conversations}
          description={
            viewerIsCoach
              ? "Toute ta relation coach/coachee dans une même vue : inbox, lecture rapide, contexte et réponses en direct."
              : "Une conversation plus claire avec tes coachs, pensée pour garder le bon rythme sans friction."
          }
          emptyBody={
            viewerIsCoach
              ? "Affecte d'abord un coaché à ton portefeuille pour ouvrir tes premiers fils."
              : "Dès qu'un coach sera rattaché à ton parcours, tu pourras échanger ici."
          }
          emptyTitle="Aucune conversation lancée."
          initialConversationId={messagingWorkspace.initialConversationId}
          initialMessages={messagingWorkspace.initialMessages}
          title="Inbox ECCE"
          userId={context.user.id}
          variant="page"
        />
      </div>
    </div>
  );
}
