
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    Activity,
    getActivities,
    markActivityAsRead,
    markAllActivitiesAsRead,
    subscribeToActivities,
} from "../utils/activity";

import type { Recipe } from "../data/recipes";
import { getAllRecipes } from "../utils/user-recipes";
const BG = "#17120F";
const CARD = "#241C17";
const BORDER = "#382B22";
const CREAM = "#F5EBDD";
const ORANGE = "#FF7048";
const MUTED = "#A99B8D";

export default function ActivityScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [activityData, recipeData] = await Promise.all([
        getActivities(),
        getAllRecipes(),
      ]);

      setActivities(activityData);
      setRecipes(recipeData);
    } catch (error) {
      console.log("Error loading activity screen:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();

      const unsubscribe = subscribeToActivities((updated) => {
        setActivities(updated);
      });

      return unsubscribe;
    }, [loadData])
  );

  const unreadCount = activities.filter((item) => !item.read).length;

  async function handleMarkAllRead() {
    const updated = await markAllActivitiesAsRead();
    setActivities(updated);
  }

  async function handleActivityPress(activity: Activity) {
    if (!activity.read) {
      await markActivityAsRead(activity.id);
    }

    if (activity.recipeId) {
      router.push({
        pathname: "/recipe/[id]",
        params: { id: activity.recipeId },
      });
      return;
    }

    if (activity.creator) {
      router.push({
        pathname: "/creator/[name]",
        params: { name: activity.creator },
      });
    }
  }

  function getActivityIcon(type: Activity["type"]) {
    if (type === "like") return "♥";
    if (type === "comment") return "💬";
    if (type === "follow") return "＋";
    return "•";
  }

  function getActivityLabel(type: Activity["type"]) {
    if (type === "like") return "LIKED YOUR RECIPE";
    if (type === "comment") return "COMMENTED ON YOUR RECIPE";
    if (type === "follow") return "STARTED FOLLOWING YOU";
    return "ACTIVITY";
  }

  function getRecipeTitle(recipeId?: string) {
    if (!recipeId) return undefined;

    return recipes.find((recipe) => recipe.id === recipeId)?.title;
  }

  function getTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const difference = Math.max(0, now.getTime() - date.getTime());

    const minutes = Math.floor(difference / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }

  function renderActivity(activity: Activity) {
    const recipeTitle = getRecipeTitle(activity.recipeId);

    return (
      <TouchableOpacity
        key={activity.id}
        activeOpacity={0.8}
        onPress={() => handleActivityPress(activity)}
        style={[
          styles.activityCard,
          !activity.read && styles.unreadCard,
        ]}
      >
        <View style={styles.activityTop}>
          <View style={styles.activityIcon}>
            <Text style={styles.iconText}>
              {getActivityIcon(activity.type)}
            </Text>
          </View>

          <View style={styles.activityContent}>
            <Text style={styles.activityLabel}>
              {getActivityLabel(activity.type)}
            </Text>

            <Text style={styles.activityMessage}>
              <Text style={styles.actor}>{activity.actor}</Text>
              {" "}
              {activity.message}
            </Text>

            {recipeTitle && (
              <Text style={styles.recipeReference}>
                🍽️ {recipeTitle}
              </Text>
            )}

            <Text style={styles.timeText}>
              {getTimeAgo(activity.createdAt)}
            </Text>
          </View>

          {!activity.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Activity</Text>
          {unreadCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Read all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 52 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>YOUR LATEST ACTIVITY</Text>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading activity...</Text>
          </View>
        ) : activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>✦</Text>
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptyDescription}>
              Your activity will appear here when events are added to Yum.
            </Text>

            <TouchableOpacity
              style={styles.discoverButton}
              onPress={() => router.push("/discover")}
            >
              <Text style={styles.discoverButtonText}>Explore recipes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activities.map(renderActivity)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
  },
  backText: {
    color: CREAM,
    fontSize: 36,
    fontWeight: "300",
    marginTop: -5,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: CREAM,
    fontSize: 24,
    fontWeight: "700",
  },
  countBadge: {
    backgroundColor: ORANGE,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: {
    color: BG,
    fontSize: 11,
    fontWeight: "800",
  },
  markAllText: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 50,
  },
  subtitle: {
    color: MUTED,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 18,
  },
  activityCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  unreadCard: {
    borderColor: "#65432F",
    backgroundColor: "#2B2119",
  },
  activityTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#38291F",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },
  iconText: {
    color: ORANGE,
    fontSize: 20,
    fontWeight: "700",
  },
  activityContent: {
    flex: 1,
  },
  activityLabel: {
    color: MUTED,
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: "700",
    marginBottom: 7,
  },
  activityMessage: {
    color: CREAM,
    fontSize: 14,
    lineHeight: 21,
  },
  actor: {
    fontWeight: "800",
    color: CREAM,
  },
  recipeReference: {
    color: "#D5A16B",
    fontSize: 12,
    marginTop: 8,
  },
  timeText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
    marginLeft: 8,
    marginTop: 5,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
    paddingHorizontal: 25,
  },
  emptyEmoji: {
    color: ORANGE,
    fontSize: 34,
    marginBottom: 18,
  },
  emptyTitle: {
    color: CREAM,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
  },
  emptyDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 22,
  },
  discoverButton: {
    borderWidth: 1,
    borderColor: ORANGE,
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  discoverButtonText: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: "700",
  },
});
