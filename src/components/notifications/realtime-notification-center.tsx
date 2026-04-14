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

function useRealtimeNotifications(userId: string, initialNotifications: NotificationItem[] = []) {
  const initialRef = useRef(sortNotifications(initialNotifications));
  const [notifications, setNotifications] = useState(() => initialRef.current);
  const [liveToast, setLiveToast] = useState<NotificationItem | null>(null);
  const timeoutRef = useRef<number | null>(null);

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
        .limit(8);

      if (!isMounted) {
        return;
      }

      setNotifications(sortNotifications((data ?? []) as NotificationItem[]));
    }

    void loadNotifications();

    const channel = supabase
      .channel(`notifications:${userId}`)
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
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item
      )
    );

    const supabase = createSupabaseBrowserClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .is("read_at", null);
  }

  return {
    notifications,
    unreadCount,
    liveToast,
    markAsRead
  };
}

export function LiveNotificationFeed({
  initialNotifications,
  userId
}: {
  initialNotifications: NotificationItem[];
  userId: string;
}) {
  const { notifications, liveToast, markAsRead } = useRealtimeNotifications(
    userId,
    initialNotifications
  );

  return (
    <div className="stack-list">
      {liveToast ? (
        <div className="notification-live-banner">
          <strong>Nouvelle notification</strong>
          <p>{liveToast.title}</p>
        </div>
      ) : null}

      {notifications.length ? (
        notifications.map((item) => (
          <article className="message-card message-card-rich" key={item.id}>
            <span className={cn("message-dot", item.read_at && "is-muted")} />
            <div className="message-copy">
              <strong>{item.title}</strong>
              <p>{item.body || "Notification système ECCE"}</p>
              <small>{formatDate(item.created_at)}</small>
            </div>
            <div className="table-actions">
              {item.deeplink ? (
                <Link
                  className="button button-secondary button-small"
                  href={item.deeplink}
                  onClick={() => {
                    if (!item.read_at) {
                      void markAsRead(item.id);
                    }
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
        ))
      ) : (
        <div className="empty-state">
          <strong>Aucune notification.</strong>
          <p>Les alertes de deadline et de feedback s&apos;afficheront ici en temps réel.</p>
        </div>
      )}
    </div>
  );
}

export function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount, liveToast, markAsRead } = useRealtimeNotifications(userId);
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
            <strong>Flux live</strong>
            <span>{unreadCount} non lue(s)</span>
          </div>

          {notifications.length ? (
            <div className="notification-panel-list">
              {notifications.slice(0, 6).map((item) => (
                <article className="notification-panel-item" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body || "Notification système ECCE"}</p>
                    <small>{formatDate(item.created_at)}</small>
                  </div>
                  <div className="table-actions">
                    {item.deeplink ? (
                      <Link
                        className="inline-link"
                        href={item.deeplink}
                        onClick={() => {
                          if (!item.read_at) {
                            void markAsRead(item.id);
                          }
                          setOpen(false);
                        }}
                      >
                        Ouvrir
                      </Link>
                    ) : null}
                    {!item.read_at ? (
                      <button
                        className="inline-link button-reset"
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
          ) : (
            <div className="empty-state">
              <strong>Aucune notification.</strong>
              <p>Les prochains événements arriveront ici en temps réel.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
