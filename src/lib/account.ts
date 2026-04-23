import { cache } from "react";

import { requireAuthenticatedUser } from "@/lib/auth";
import { getOrganizationBrandingById } from "@/lib/organization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type NotificationPreferenceRow = {
  organization_id: string;
  user_id: string;
  allow_learning_notifications: boolean;
  allow_message_notifications: boolean;
  allow_review_notifications: boolean;
  allow_reward_notifications: boolean;
  allow_session_notifications: boolean;
};

export type NotificationKind =
  | "learning"
  | "message"
  | "review"
  | "reward"
  | "session"
  | "system";

export type AccountNotificationPreferences = {
  allowLearningNotifications: boolean;
  allowMessageNotifications: boolean;
  allowReviewNotifications: boolean;
  allowRewardNotifications: boolean;
  allowSessionNotifications: boolean;
};

export const DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES: AccountNotificationPreferences = {
  allowLearningNotifications: true,
  allowMessageNotifications: true,
  allowReviewNotifications: true,
  allowRewardNotifications: true,
  allowSessionNotifications: true
};

function isMissingNotificationPreferencesTableError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /user_notification_preferences/i.test(error.message ?? "")
  );
}

function buildNotificationPreferences(
  row?: NotificationPreferenceRow | null
): AccountNotificationPreferences {
  return {
    allowLearningNotifications:
      row?.allow_learning_notifications ??
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES.allowLearningNotifications,
    allowMessageNotifications:
      row?.allow_message_notifications ??
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES.allowMessageNotifications,
    allowReviewNotifications:
      row?.allow_review_notifications ??
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES.allowReviewNotifications,
    allowRewardNotifications:
      row?.allow_reward_notifications ??
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES.allowRewardNotifications,
    allowSessionNotifications:
      row?.allow_session_notifications ??
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES.allowSessionNotifications
  };
}

export function isNotificationKindEnabled(
  kind: NotificationKind | null | undefined,
  preferences: AccountNotificationPreferences
) {
  switch (kind) {
    case "learning":
      return preferences.allowLearningNotifications;
    case "message":
      return preferences.allowMessageNotifications;
    case "review":
      return preferences.allowReviewNotifications;
    case "reward":
      return preferences.allowRewardNotifications;
    case "session":
      return preferences.allowSessionNotifications;
    default:
      return true;
  }
}

export async function getNotificationPreferencesByUserIds(input: {
  organizationId: string;
  userIds: string[];
}) {
  const userIds = Array.from(new Set(input.userIds.filter(Boolean)));

  if (!userIds.length) {
    return new Map<string, AccountNotificationPreferences>();
  }

  try {
    const admin = createSupabaseAdminClient();
    const preferenceResult = await admin
      .from("user_notification_preferences")
      .select(
        "organization_id, user_id, allow_learning_notifications, allow_message_notifications, allow_review_notifications, allow_reward_notifications, allow_session_notifications"
      )
      .eq("organization_id", input.organizationId)
      .in("user_id", userIds);

    if (preferenceResult.error) {
      if (isMissingNotificationPreferencesTableError(preferenceResult.error)) {
        return new Map<string, AccountNotificationPreferences>();
      }

      throw new Error(preferenceResult.error.message);
    }

    return new Map(
      ((preferenceResult.data ?? []) as NotificationPreferenceRow[]).map((row) => [
        row.user_id,
        buildNotificationPreferences(row)
      ])
    );
  } catch {
    return new Map<string, AccountNotificationPreferences>();
  }
}

export const getAccountPageData = cache(async () => {
  const context = await requireAuthenticatedUser();
  const organizationId = context.profile.organization_id;
  const branding = await getOrganizationBrandingById(organizationId);
  const preferenceMap = await getNotificationPreferencesByUserIds({
    organizationId,
    userIds: [context.user.id]
  });

  const notificationPreferences =
    preferenceMap.get(context.user.id) ?? DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES;

  return {
    context,
    branding,
    notificationPreferences,
    metrics: [
      {
        label: "Rôle principal",
        value: context.role ?? "membre",
        delta: `${context.roles.length} rôle(s) actif(s)`
      },
      {
        label: "Fuseau personnel",
        value: context.profile.timezone,
        delta: "affiche quiz, deadlines et séances"
      },
      {
        label: "Support organisation",
        value: branding.supportEmail ?? "non défini",
        delta: branding.displayName
      },
      {
        label: "Alertes actives",
        value: String(
          Object.values(notificationPreferences).filter(Boolean).length
        ),
        delta: "préférences de notifications"
      }
    ]
  };
});
