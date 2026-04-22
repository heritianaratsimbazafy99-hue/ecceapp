import { RealtimeConversationHub } from "@/components/messages/realtime-conversation-hub";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { getMessagesPageData } from "@/lib/platform-data";

export default async function MessagesPage() {
  const { context, messagingWorkspace, metrics } = await getMessagesPageData();
  const viewerIsCoach = context.roles.includes("coach");

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Messages"
        description={
          viewerIsCoach
            ? "Une inbox ECCE plus premium pour suivre les coachés, relancer au bon moment et garder un fil clair."
            : "Une inbox plus nette pour échanger avec tes coachs, sans perdre le contexte du parcours."
        }
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

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
  );
}
