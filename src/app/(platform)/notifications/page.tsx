import { NotificationCommandCenter } from "@/components/notifications/realtime-notification-center";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { getNotificationsPageData } from "@/lib/platform-data";

export default async function NotificationsPage() {
  const { context, metrics, notifications } = await getNotificationsPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Notifications"
        description={`Centre live ECCE pour ${context.profile.first_name}, avec lecture rapide, actions directes et synchronisation temps réel.`}
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <NotificationCommandCenter
        initialNotifications={notifications}
        userId={context.user.id}
      />
    </div>
  );
}
