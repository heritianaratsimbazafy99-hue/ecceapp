"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  deeplink?: string | null;
};

type NotificationFilter = "all" | "unread" | "actionable";

function sortNotifications(items: NotificationItem[]) {
  return [...items].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function normalizeNotification(payload: Partial<NotificationItem> & { id: string }) {
  return {
    id: payload.id,
    title: payload.title ?? "Notification ECCE",
    body: payload.body ?? null,
    created_at: payload.created_at ?? new Date().toISOString(),
    read_at: payload.read_at ?? null,
    deeplink: payload.deeplink ?? null
  };
}

function upsertNotification(current: NotificationItem[], next: NotificationItem) {
  const map = new Map(current.map((item) => [item.id, item]));
  map.set(next.id, next);
  return sortNotifications(Array.from(map.values()));
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateString));
}

function formatRelativeTime(dateString: string) {
  const formatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  const deltaInMinutes = Math.round((new Date(dateString).getTime() - Date.now()) / (60 * 1000));
  const absoluteMinutes = Math.abs(deltaInMinutes);

  if (absoluteMinutes < 60) {
    return formatter.format(deltaInMinutes, "minute");
  }

  const deltaInHours = Math.round(deltaInMinutes / 60);
  if (Math.abs(deltaInHours) < 24) {
    return formatter.format(deltaInHours, "hour");
  }

  const deltaInDays = Math.round(deltaInHours / 24);
  return formatter.format(deltaInDays, "day");
}

function getNotificationEyebrow(item: NotificationItem) {
  if (!item.read_at && item.deeplink) {
    return "Action prioritaire";
  }

  if (!item.read_at) {
    return "À lire";
  }

  if (item.deeplink) {
    return "Action archivée";
  }

  return "Information";
}

function filterNotifications(items: NotificationItem[], filter: NotificationFilter) {
  switch (filter) {
    case "unread":
      return items.filter((item) => !item.read_at);
    case "actionable":
      return items.filter((item) => Boolean(item.deeplink));
    default:
      return items;
  }
}

function useRealtimeNotifications(userId: string, initialNotifications: NotificationItem[] = []) {
  const initialRef = useRef(sortNotifications(initialNotifications));
  const [notifications, setNotifications] = useState(() => initialRef.current);
  const [liveToast, setLiveToast] = useState<NotificationItem | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const channelNameRef = useRef(
    `notifications:${userId}:${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isMounted = true;

    async function loadNotifications() {
      if (initialRef.current.length) {
        return;
      }

      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, created_at, read_at, deeplink")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(24);

      if (!isMounted) {
        return;
      }

      setNotifications(sortNotifications((data ?? []) as NotificationItem[]));
    }

    void loadNotifications();

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          const next = normalizeNotification(payload.new as NotificationItem);
          setNotifications((current) => upsertNotification(current, next));
          setLiveToast(next);

          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = window.setTimeout(() => {
            setLiveToast(null);
          }, 3500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          const next = normalizeNotification(payload.new as NotificationItem);
          setNotifications((current) => upsertNotification(current, next));
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  async function markAsRead(notificationId: string) {
    const readAt = new Date().toISOString();

    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, read_at: item.read_at ?? readAt } : item))
    );

    const supabase = createSupabaseBrowserClient();
    await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", notificationId)
      .is("read_at", null);
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);

    if (!unreadIds.length) {
      return;
    }

    const readAt = new Date().toISOString();

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at ?? readAt
      }))
    );

    const supabase = createSupabaseBrowserClient();
    await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .in("id", unreadIds)
      .is("read_at", null);
  }

  return {
    notifications,
    unreadCount,
    liveToast,
    markAsRead,
    markAllAsRead
  };
}

function NotificationStreamList({
  items,
  markAsRead,
  variant = "compact",
  onNavigate,
  emptyBody,
  emptyTitle
}: {
  items: NotificationItem[];
  markAsRead: (notificationId: string) => Promise<void>;
  variant?: "compact" | "page";
  onNavigate?: () => void;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (!items.length) {
    return (
      <div className="empty-state">
        <strong>{emptyTitle}</strong>
        <p>{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className={cn("notification-feed-list", variant === "page" && "is-page")}>
      {items.map((item) => (
        <article
          className={cn(
            "notification-feed-card",
            !item.read_at && "is-unread",
            item.deeplink && "is-actionable"
          )}
          key={item.id}
        >
          <div className="notification-feed-card-mark" aria-hidden="true">
            {item.deeplink ? "->" : "*"}
          </div>
          <div className="notification-feed-card-copy">
            <div className="notification-feed-card-topline">
              <span>{getNotificationEyebrow(item)}</span>
              <small>{formatRelativeTime(item.created_at)}</small>
            </div>
            <strong>{item.title}</strong>
            <p>{item.body || "Notification système ECCE"}</p>
            <small>{formatDate(item.created_at)}</small>
          </div>
          <div className="notification-feed-card-actions">
            {item.deeplink ? (
              <Link
                className="button button-secondary button-small"
                href={item.deeplink}
                onClick={() => {
                  if (!item.read_at) {
                    void markAsRead(item.id);
                  }
                  onNavigate?.();
                }}
              >
                Ouvrir
              </Link>
            ) : null}
            {!item.read_at ? (
              <button
                className="button button-secondary button-small"
                onClick={() => void markAsRead(item.id)}
                type="button"
              >
                Marquer lue
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function LiveNotificationFeed({
  initialNotifications,
  userId
}: {
  initialNotifications: NotificationItem[];
  userId: string;
}) {
  const { notifications, liveToast, markAsRead } = useRealtimeNotifications(userId, initialNotifications);

  return (
    <div className="stack-list">
      {liveToast ? (
        <div className="notification-live-banner">
          <strong>Nouvelle notification</strong>
          <p>{liveToast.title}</p>
        </div>
      ) : null}

      <NotificationStreamList
        emptyBody="Les alertes de deadline et de feedback s'afficheront ici en temps réel."
        emptyTitle="Aucune notification."
        items={notifications}
        markAsRead={markAsRead}
      />
    </div>
  );
}

export function NotificationCommandCenter({
  initialNotifications,
  userId
}: {
  initialNotifications: NotificationItem[];
  userId: string;
}) {
  const { notifications, unreadCount, liveToast, markAsRead, markAllAsRead } = useRealtimeNotifications(
    userId,
    initialNotifications
  );
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const actionableCount = useMemo(
    () => notifications.filter((item) => Boolean(item.deeplink)).length,
    [notifications]
  );
  const filteredNotifications = useMemo(
    () => filterNotifications(notifications, filter),
    [filter, notifications]
  );

  return (
    <section className="notification-command-center">
      <div className="notification-command-hero">
        <div>
          <span className="eyebrow">Centre live ECCE</span>
          <h3>Une seule vue pour ce qui mérite vraiment ton attention.</h3>
          <p>
            Les deadlines, messages, feedbacks et événements importants arrivent ici en direct, avec
            un tri plus clair entre lecture rapide et actions à ouvrir.
          </p>
        </div>

        <div className="notification-command-stats">
          <article>
            <strong>{notifications.length}</strong>
            <small>événements récents</small>
          </article>
          <article>
            <strong>{unreadCount}</strong>
            <small>encore à lire</small>
          </article>
          <article>
            <strong>{actionableCount}</strong>
            <small>ouvrent une action</small>
          </article>
        </div>
      </div>

      {liveToast ? (
        <div className="notification-live-banner notification-live-banner-page">
          <strong>Nouvel événement détecté</strong>
          <p>{liveToast.title}</p>
        </div>
      ) : null}

      <div className="notification-command-toolbar">
        <div className="notification-filter-tabs">
          {[
            { id: "all", label: "Tout", count: notifications.length },
            { id: "unread", label: "Non lues", count: unreadCount },
            { id: "actionable", label: "À ouvrir", count: actionableCount }
          ].map((item) => (
            <button
              className={cn("notification-filter-tab", filter === item.id && "is-active")}
              key={item.id}
              onClick={() => setFilter(item.id as NotificationFilter)}
              type="button"
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </button>
          ))}
        </div>

        <div className="table-actions">
          <button
            className="button button-secondary button-small"
            disabled={!unreadCount}
            onClick={() => void markAllAsRead()}
            type="button"
          >
            Tout marquer comme lu
          </button>
        </div>
      </div>

      <NotificationStreamList
        emptyBody="Quand une nouvelle activité ECCE arrivera, elle sera affichée ici automatiquement."
        emptyTitle="Aucune notification pour ce filtre."
        items={filteredNotifications}
        markAsRead={markAsRead}
        variant="page"
      />
    </section>
  );
}

export function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount, liveToast, markAsRead, markAllAsRead } = useRealtimeNotifications(userId);
  const [open, setOpen] = useState(false);

  return (
    <div className="notification-shell">
      <button
        aria-expanded={open}
        className={cn("notification-bell", unreadCount > 0 && "has-unread")}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>Notifications</span>
        <strong>{unreadCount}</strong>
      </button>

      {liveToast ? (
        <div className="notification-toast" role="status">
          <strong>{liveToast.title}</strong>
          <p>{liveToast.body || "Nouvelle activité ECCE"}</p>
        </div>
      ) : null}

      {open ? (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <div>
              <strong>Flux live</strong>
              <span>{unreadCount} non lue(s)</span>
            </div>
            <div className="table-actions">
              <button
                className="inline-link button-reset"
                disabled={!unreadCount}
                onClick={() => void markAllAsRead()}
                type="button"
              >
                Tout lire
              </button>
              <Link className="inline-link" href="/notifications" onClick={() => setOpen(false)}>
                Voir tout
              </Link>
            </div>
          </div>

          <NotificationStreamList
            emptyBody="Les prochains événements arriveront ici en temps réel."
            emptyTitle="Aucune notification."
            items={notifications.slice(0, 6)}
            markAsRead={markAsRead}
            onNavigate={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
