export type ActivityType = "like" | "comment" | "follow";

export type Activity = {
  id: string;
  type: ActivityType;
  actor: string;
  recipeId?: string;
  creator?: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export async function getActivities(): Promise<Activity[]> {
  return [];
}

export function subscribeToActivities(
  callback: (activities: Activity[]) => void
) {
  callback([]);

  return () => {};
}

export async function addActivity(
  activity: Omit<Activity, "id" | "createdAt" | "read">
): Promise<Activity> {
  return {
    ...activity,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

export async function markActivityAsRead(
  id: string
): Promise<Activity[]> {
  return [];
}

export async function markAllActivitiesAsRead(): Promise<Activity[]> {
  return [];
}

export async function getUnreadActivityCount(): Promise<number> {
  return 0;
}

export async function clearActivities(): Promise<void> {
  return;
}