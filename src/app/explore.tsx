
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import RecipeImage from "../components/recipe-image";
import { Recipe } from "../data/recipes";
import { getFavouriteCuisines } from "../utils/favourite-cuisines";
import { getFollowing } from "../utils/following";
import {
  getLikedRecipes,
  toggleLikedRecipe,
} from "../utils/liked-recipes";
import { getRecommendedRecipes } from "../utils/recommendations";
import {
  getSavedRecipes,
  toggleSavedRecipe,
} from "../utils/saved-recipes";
import { getAllRecipes } from "../utils/user-recipes";

const COLORS = {
  background: "#110E0C",
  surface: "#211A16",
  orange: "#FF7952",
  cream: "#FFF2E2",
  muted: "#C5B8AE",
  white: "#FFFFFF",
};

export default function ExploreScreen() {
  const [displayedRecipes, setDisplayedRecipes] =
    useState<Recipe[]>([]);

  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [feedHeight, setFeedHeight] = useState(600);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadRecipes() {
        try {
          setLoading(true);
          setError(false);

          const [
            recipes,
            likes,
            saves,
            cuisines,
            creators,
          ] = await Promise.all([
            getAllRecipes(),
            getLikedRecipes(),
            getSavedRecipes(),
            getFavouriteCuisines(),
            getFollowing(),
          ]);

          if (!active) return;

          const recommended = getRecommendedRecipes({
            recipes,
            likedIds: likes,
            savedIds: saves,
            favouriteCuisines: cuisines,
            following: creators,
          });

          setDisplayedRecipes(recommended);
          setLikedIds(likes);
          setSavedIds(saves);
          setActiveIndex(0);
        } catch (err) {
          console.log("Explore loading error:", err);

          if (active) {
            setError(true);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadRecipes();

      return () => {
        active = false;
      };
    }, [])
  );

  const handleLike = async (id: string) => {
    try {
      const updated = await toggleLikedRecipe(id);
      setLikedIds(updated);
    } catch {
      Alert.alert(
        "Oops!",
        "Unable to update your likes."
      );
    }
  };

  const handleSave = async (id: string) => {
    try {
      const updated = await toggleSavedRecipe(id);
      setSavedIds(updated);
    } catch {
      Alert.alert(
        "Oops!",
        "Unable to save this recipe."
      );
    }
  };

  const openRecipe = (id: string) => {
    router.push({
      pathname: "/recipe/[id]",
      params: { id },
    });
  };

  // FIX: index is optional in React Native's ViewToken type.
  // This callback accepts the FlatList visibility information
  // without needing to import ViewToken.
  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{
        index?: number | null;
      }>;
    }) => {
      const visibleItem = viewableItems[0];

      if (
        visibleItem &&
        typeof visibleItem.index === "number"
      ) {
        setActiveIndex(visibleItem.index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const renderRecipe = ({
    item,
    index,
  }: {
    item: Recipe;
    index: number;
  }) => {
    const liked = likedIds.includes(item.id);
    const saved = savedIds.includes(item.id);

    return (
      <View
        style={[
          styles.recipePage,
          { height: feedHeight },
        ]}
      >
        {/* FULL-SCREEN RECIPE IMAGE */}
        <RecipeImage
          uri={item.image}
          style={styles.recipeImage}
        />

        {/* LIGHT TOP OVERLAY */}
        <View
          pointerEvents="none"
          style={styles.topOverlay}
        />

        {/* COMPACT BOTTOM OVERLAY */}
        <View
          pointerEvents="none"
          style={styles.bottomOverlay}
        />

        {/* TOP LABELS */}
        <View style={styles.topContent}>
          <View style={styles.cuisineBadge}>
            <Text style={styles.cuisineText}>
              🌍 {item.cuisine}
            </Text>
          </View>

          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              {index + 1} / {displayedRecipes.length}
            </Text>
          </View>
        </View>

        {/* FLOATING ACTION BUTTONS */}
        <View style={styles.sideActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
            accessibilityRole="button"
            accessibilityLabel={
              liked
                ? `Unlike ${item.title}`
                : `Like ${item.title}`
            }
            accessibilityState={{
              selected: liked,
            }}
          >
            <View style={styles.actionCircle}>
              <Text
                style={[
                  styles.actionIcon,
                  liked && styles.activeIcon,
                ]}
              >
                {liked ? "♥" : "♡"}
              </Text>
            </View>

            <Text style={styles.actionText}>
              {liked ? "Liked" : "Like"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => handleSave(item.id)}
            accessibilityRole="button"
            accessibilityLabel={
              saved
                ? `Remove ${item.title} from saved recipes`
                : `Save ${item.title}`
            }
            accessibilityState={{
              selected: saved,
            }}
          >
            <View style={styles.actionCircle}>
              <Text
                style={[
                  styles.actionIcon,
                  saved && styles.activeIcon,
                ]}
              >
                {saved ? "★" : "☆"}
              </Text>
            </View>

            <Text style={styles.actionText}>
              {saved ? "Saved" : "Save"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => openRecipe(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.title} recipe`}
          >
            <View style={styles.actionCircle}>
              <Text style={styles.recipeActionIcon}>
                ☰
              </Text>
            </View>

            <Text style={styles.actionText}>
              Recipe
            </Text>
          </Pressable>
        </View>

        {/* RECIPE INFORMATION */}
        <View style={styles.recipeInformation}>
          <Text
            style={styles.creator}
            numberOfLines={1}
          >
            {item.creator}
          </Text>

          <Text
            style={styles.recipeTitle}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text
            style={styles.description}
            numberOfLines={2}
          >
            {item.description}
          </Text>

          <View style={styles.recipeMeta}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>
                ⏱ {item.time}
              </Text>
            </View>

            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>
                🍽 {item.servings} servings
              </Text>
            </View>
          </View>

          {/* FULL RECIPE BUTTON */}
          <Pressable
            style={styles.viewRecipeButton}
            onPress={() => openRecipe(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`View full recipe for ${item.title}`}
          >
            <Text style={styles.viewRecipeText}>
              View full recipe
            </Text>

            <Text style={styles.viewRecipeArrow}>
              →
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            yum<Text style={styles.orangeDot}>.</Text>
          </Text>

          <Text style={styles.headerSubtitle}>
            DISCOVER
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* FEED */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator
            size="large"
            color={COLORS.orange}
          />

          <Text style={styles.loadingText}>
            Finding your next favourite...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyEmoji}>
            ⚠️
          </Text>

          <Text style={styles.emptyTitle}>
            Could not load recipes
          </Text>

          <Text style={styles.emptyText}>
            Go back and try opening the feed again.
          </Text>
        </View>
      ) : displayedRecipes.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyEmoji}>
            🍽️
          </Text>

          <Text style={styles.emptyTitle}>
            No recipes yet
          </Text>

          <Text style={styles.emptyText}>
            Add some recipes to start discovering.
          </Text>
        </View>
      ) : (
        <View
          style={styles.feedContainer}
          onLayout={(event) => {
            const height =
              event.nativeEvent.layout.height;

            if (
              height > 0 &&
              Math.abs(height - feedHeight) > 1
            ) {
              setFeedHeight(height);
            }
          }}
        >
          <FlatList
            data={displayedRecipes}
            renderItem={renderRecipe}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={
              onViewableItemsChanged
            }
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={2}
            maxToRenderPerBatch={3}
            windowSize={3}
            removeClippedSubviews={false}
            getItemLayout={(_, index) => ({
              length: feedHeight,
              offset: feedHeight * index,
              index,
            })}
          />

          {/* SWIPE HINT */}
          {activeIndex === 0 &&
            displayedRecipes.length > 1 && (
              <View
                style={styles.swipeHint}
                pointerEvents="none"
              >
                <Text style={styles.swipeHintText}>
                  ↑ Swipe for more
                </Text>
              </View>
            )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    backgroundColor: COLORS.background,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: COLORS.cream,
    fontSize: 36,
    lineHeight: 40,
  },

  headerCenter: {
    alignItems: "center",
  },

  headerTitle: {
    color: COLORS.cream,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -1,
  },

  orangeDot: {
    color: COLORS.orange,
  },

  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },

  headerSpacer: {
    width: 40,
  },

  feedContainer: {
    flex: 1,
    overflow: "hidden",
  },

  recipePage: {
    width: "100%",
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },

  recipeImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },

  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: "rgba(17,14,12,0.18)",
  },

  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 235,
    backgroundColor: "rgba(17,14,12,0.58)",
  },

  topContent: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cuisineBadge: {
    backgroundColor: "rgba(17,14,12,0.65)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
  },

  cuisineText: {
    color: COLORS.cream,
    fontSize: 11,
    fontWeight: "800",
  },

  progressBadge: {
    backgroundColor: "rgba(17,14,12,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
  },

  progressText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: "700",
  },

  sideActions: {
    position: "absolute",
    right: 12,
    bottom: 250,
    alignItems: "center",
    gap: 13,
},

  actionButton: {
    alignItems: "center",
    width: 54,
  },

  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(17,14,12,0.58)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  actionIcon: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: "600",
  },

  recipeActionIcon: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "600",
  },

  activeIcon: {
    color: COLORS.orange,
  },

  actionText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 4,
  },

  recipeInformation: {
    position: "absolute",
    left: 18,
    right: 78,

    // FIX: Move the entire information area upwards.
    // Keeps the orange button clear of the bottom edge.
    bottom: 58,
  },

  creator: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
  },

  recipeTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 29,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowRadius: 5,
  },

  description: {
    color: COLORS.cream,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowRadius: 4,
  },

  recipeMeta: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
  },

  metaBadge: {
    backgroundColor: "rgba(17,14,12,0.5)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  metaText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
  },

  viewRecipeButton: {
    marginTop: 12,
    backgroundColor: COLORS.orange,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewRecipeText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: "900",
  },

  viewRecipeArrow: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: "900",
  },

  swipeHint: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    backgroundColor: "rgba(17,14,12,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },

  swipeHintText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: "700",
  },

  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingText: {
    color: COLORS.muted,
    marginTop: 15,
    fontSize: 13,
  },

  emptyEmoji: {
    fontSize: 40,
  },

  emptyTitle: {
    color: COLORS.cream,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 15,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
