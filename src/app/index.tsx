
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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

type FeedMode = "For You" | "Explore";

const COLORS = {
  background: "#110E0C",
  surface: "#211A16",
  surfaceLight: "#30251F",
  border: "#403027",
  cream: "#FFF2E2",
  orange: "#FF7952",
  gold: "#E5B17A",
  muted: "#B3A399",
  white: "#FFFFFF",
};

export default function HomeScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [favouriteCuisines, setFavouriteCuisines] =
    useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [feedMode, setFeedMode] = useState<FeedMode>("For You");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          setLoading(true);
          setError(false);

          const [all, likes, saves, cuisines, creators] =
            await Promise.all([
              getAllRecipes(),
              getLikedRecipes(),
              getSavedRecipes(),
              getFavouriteCuisines(),
              getFollowing(),
            ]);

          if (!active) return;

          setRecipes(all);
          setLikedIds(likes);
          setSavedIds(saves);
          setFavouriteCuisines(cuisines);
          setFollowing(creators);
        } catch (err) {
          console.log("Home loading error:", err);
          if (active) setError(true);
        } finally {
          if (active) setLoading(false);
        }
      }

      load();

      return () => {
        active = false;
      };
    }, [])
  );

  const forYou = useMemo(
    () =>
      getRecommendedRecipes({
        recipes,
        likedIds,
        savedIds,
        favouriteCuisines,
        following,
      }),
    [recipes, likedIds, savedIds, favouriteCuisines, following]
  );

  const explore = useMemo(
    () =>
      [...recipes].sort((a, b) =>
        a.title.localeCompare(b.title)
      ),
    [recipes]
  );

  const feed = feedMode === "For You" ? forYou : explore;

  const featuredRecipe = feed[0];
  const gridRecipes = feed.slice(1);

  const leftColumn = gridRecipes.filter(
    (_, index) => index % 2 === 0
  );

  const rightColumn = gridRecipes.filter(
    (_, index) => index % 2 !== 0
  );

  const handleLike = async (id: string) => {
    try {
      const updated = await toggleLikedRecipe(id);
      setLikedIds(updated);
    } catch {
      Alert.alert("Oops!", "Could not update your likes.");
    }
  };

  const handleSave = async (id: string) => {
    try {
      const updated = await toggleSavedRecipe(id);
      setSavedIds(updated);
    } catch {
      Alert.alert("Oops!", "Could not save this recipe.");
    }
  };

  const openRecipe = (id: string) => {
    router.push({
      pathname: "/recipe/[id]",
      params: { id },
    });
  };

  const openSwipeFeed = () => {
    router.push("/explore");
  };

  const RecipeCard = ({
    recipe,
    index,
  }: {
    recipe: Recipe;
    index: number;
  }) => {
    const liked = likedIds.includes(recipe.id);
    const saved = savedIds.includes(recipe.id);

    const imageHeight =
      index % 3 === 0 ? 215 : index % 3 === 1 ? 175 : 195;

    return (
      <View style={styles.recipeCard}>
        <Pressable
          onPress={() => openRecipe(recipe.id)}
          accessibilityRole="button"
          accessibilityLabel={`View ${recipe.title} recipe`}
        >
          <View style={styles.cardImageContainer}>
            <RecipeImage
              uri={recipe.image}
              style={[
                styles.cardImage,
                { height: imageHeight },
              ]}
            />

            <View style={styles.cuisineBadge}>
              <Text style={styles.cuisineBadgeText}>
                {recipe.cuisine}
              </Text>
            </View>

            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>
                {recipe.time}
              </Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {recipe.title}
            </Text>

            <Text style={styles.cardCreator} numberOfLines={1}>
              by {recipe.creator}
            </Text>
          </View>
        </Pressable>

        <View style={styles.cardActions}>
          <Pressable
            onPress={() => handleLike(recipe.id)}
            style={styles.cardActionButton}
            accessibilityRole="button"
            accessibilityLabel={
              liked
                ? `Unlike ${recipe.title}`
                : `Like ${recipe.title}`
            }
          >
            <Text
              style={[
                styles.actionIcon,
                liked && styles.activeAction,
              ]}
            >
              {liked ? "♥" : "♡"}
            </Text>
            <Text style={styles.actionLabel}>
              {liked ? "Liked" : "Like"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleSave(recipe.id)}
            style={styles.cardActionButton}
            accessibilityRole="button"
            accessibilityLabel={
              saved
                ? `Remove ${recipe.title} from saved recipes`
                : `Save ${recipe.title}`
            }
          >
            <Text
              style={[
                styles.actionIcon,
                saved && styles.activeAction,
              ]}
            >
              {saved ? "★" : "☆"}
            </Text>
            <Text style={styles.actionLabel}>
              {saved ? "Saved" : "Save"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const navigationItems = [
    { label: "Home", icon: "⌂", path: "/" },
    { label: "Discover", icon: "⌕", path: "/discover" },
    { label: "Create", icon: "+", path: "/create" },
    { label: "Saved", icon: "☆", path: "/saved" },
    { label: "Profile", icon: "♙", path: "/profile" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>
              YOUR WORLD OF FOOD
            </Text>

            <Text style={styles.logo}>
              yum<Text style={styles.logoDot}>.</Text>
            </Text>
          </View>

          <Pressable
            style={styles.searchButton}
            onPress={() => router.push("/discover")}
            accessibilityRole="button"
            accessibilityLabel="Search recipes"
          >
            <Text style={styles.searchIcon}>⌕</Text>
          </Pressable>
        </View>

        {/* WELCOME */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            What are we craving?
          </Text>

          <Text style={styles.welcomeSubtitle}>
            A whole world of flavours is waiting for you.
          </Text>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.quickActions}>
          <Pressable
            style={styles.quickAction}
            onPress={() => router.push("/discover")}
            accessibilityRole="button"
            accessibilityLabel="Explore cuisines"
          >
            <Text style={styles.quickEmoji}>🌍</Text>
            <Text style={styles.quickTitle}>
              Explore cuisines
            </Text>
            <Text style={styles.quickDescription}>
              Taste the world
            </Text>
          </Pressable>

          <Pressable
            style={styles.quickAction}
            onPress={() => router.push("/create")}
            accessibilityRole="button"
            accessibilityLabel="Share a recipe"
          >
            <Text style={styles.quickEmoji}>👩‍🍳</Text>
            <Text style={styles.quickTitle}>
              Share a recipe
            </Text>
            <Text style={styles.quickDescription}>
              Inspire others
            </Text>
          </Pressable>
        </View>

        {/* NEW: SWIPEABLE DISCOVERY SHORTCUT */}
        <Pressable
          style={styles.swipeDiscoveryCard}
          onPress={openSwipeFeed}
          accessibilityRole="button"
          accessibilityLabel="Open swipeable recipe discovery feed"
          accessibilityHint="Browse personalised recipes by swiping vertically"
        >
          <View style={styles.swipeIconContainer}>
            <Text style={styles.swipeIcon}>▶</Text>
          </View>

          <View style={styles.swipeTextContainer}>
            <Text style={styles.swipeEyebrow}>
              A NEW WAY TO DISCOVER
            </Text>

            <Text style={styles.swipeTitle}>
              Swipe to Discover
            </Text>

            <Text style={styles.swipeSubtitle}>
              One recipe at a time. Endless inspiration.
            </Text>
          </View>

          <Text style={styles.swipeArrow}>→</Text>
        </Pressable>

        {/* FOLLOWING SHORTCUT */}
        <Pressable
          style={styles.followingCard}
          onPress={() => router.push("/following")}
          accessibilityRole="button"
          accessibilityLabel="Open following feed"
        >
          <View style={styles.followingLeft}>
            <Text style={styles.followingEmoji}>♡</Text>

            <View style={styles.followingText}>
              <Text style={styles.followingTitle}>
                Your Following Feed
              </Text>

              <Text style={styles.followingSubtitle}>
                See what your favourite creators are cooking
              </Text>
            </View>
          </View>

          <Text style={styles.followingArrow}>→</Text>
        </Pressable>

        {/* FEED SELECTION */}
        <View style={styles.feedSwitcher}>
          {(["For You", "Explore"] as FeedMode[]).map(
            (mode) => (
              <Pressable
                key={mode}
                onPress={() => setFeedMode(mode)}
                style={[
                  styles.feedTab,
                  feedMode === mode && styles.feedTabActive,
                ]}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: feedMode === mode,
                }}
              >
                <Text
                  style={[
                    styles.feedTabText,
                    feedMode === mode &&
                      styles.feedTabTextActive,
                  ]}
                >
                  {mode === "For You"
                    ? "✦ For You"
                    : "🌍 Explore"}
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* RECOMMENDATION MESSAGE */}
        <View style={styles.recommendationMessage}>
          <Text style={styles.recommendationIcon}>✦</Text>

          <Text style={styles.recommendationText}>
            {feedMode === "For You"
              ? "Made for your taste, with a little adventure mixed in."
              : "Step outside your comfort zone. Discover something new."}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={COLORS.orange}
            />
            <Text style={styles.loadingText}>
              Finding something delicious...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>⚠️</Text>
            <Text style={styles.emptyTitle}>
              Something went wrong
            </Text>
            <Text style={styles.emptyDescription}>
              Please reopen this screen to try again.
            </Text>
          </View>
        ) : feed.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>
              No recipes yet
            </Text>
            <Text style={styles.emptyDescription}>
              Start sharing recipes to fill your feed.
            </Text>
          </View>
        ) : (
          <>
            {/* FEATURED RECIPE */}
            {featuredRecipe && (
              <Pressable
                style={styles.featuredCard}
                onPress={() =>
                  openRecipe(featuredRecipe.id)
                }
                accessibilityRole="button"
                accessibilityLabel={`View featured recipe ${featuredRecipe.title}`}
              >
                <RecipeImage
                  uri={featuredRecipe.image}
                  style={styles.featuredImage}
                />

                <View style={styles.featuredOverlay}>
                  <View style={styles.featuredLabel}>
                    <Text style={styles.featuredLabelText}>
                      ✦ YOUR YUM PICK
                    </Text>
                  </View>

                  <Text
                    style={styles.featuredTitle}
                    numberOfLines={2}
                  >
                    {featuredRecipe.title}
                  </Text>

                  <Text style={styles.featuredDetails}>
                    {featuredRecipe.cuisine} · {featuredRecipe.time}
                  </Text>

                  <Text style={styles.featuredLink}>
                    View recipe →
                  </Text>
                </View>
              </Pressable>
            )}

            {/* RECIPE GRID */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionText}>
                <Text style={styles.sectionEyebrow}>
                  MADE TO INSPIRE
                </Text>

                <Text style={styles.sectionTitle}>
                  Discover your next bite
                </Text>
              </View>

              <Text style={styles.recipeCount}>
                {feed.length} recipes
              </Text>
            </View>

            <View style={styles.recipeGrid}>
              <View style={styles.gridColumn}>
                {leftColumn.map((recipe, index) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    index={index * 2}
                  />
                ))}
              </View>

              <View style={styles.gridColumn}>
                {rightColumn.map((recipe, index) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    index={index * 2 + 1}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerEmoji}>🍊</Text>

          <Text style={styles.footerTitle}>
            Stay curious. Stay hungry.
          </Text>

          <Text style={styles.footerSubtitle}>
            There's always something new to taste.
          </Text>
        </View>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNavigation}>
        {navigationItems.map((item) => {
          const isHome = item.label === "Home";
          const isCreate = item.label === "Create";

          return (
            <Pressable
              key={item.label}
              style={styles.navigationItem}
              onPress={() => {
                if (isHome) {
                  router.replace("/");
                } else {
                  router.push(item.path as any);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View
                style={[
                  styles.navigationIconContainer,
                  isCreate && styles.createNavigationButton,
                ]}
              >
                <Text
                  style={[
                    styles.navigationIcon,
                    isHome && styles.navigationActive,
                    isCreate && styles.createNavigationIcon,
                  ]}
                >
                  {item.icon}
                </Text>
              </View>

              {!isCreate && (
                <Text
                  style={[
                    styles.navigationLabel,
                    isHome && styles.navigationActive,
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 25,
  },

  header: {
    marginTop: 55,
    marginHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerSubtitle: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.2,
  },

  logo: {
    color: COLORS.cream,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -2,
  },

  logoDot: {
    color: COLORS.orange,
  },

  searchButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  searchIcon: {
    color: COLORS.cream,
    fontSize: 30,
  },

  welcomeSection: {
    marginHorizontal: 22,
    marginTop: 26,
    marginBottom: 20,
  },

  welcomeTitle: {
    color: COLORS.cream,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  welcomeSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 7,
    lineHeight: 20,
  },

  quickActions: {
    flexDirection: "row",
    marginHorizontal: 20,
    gap: 12,
  },

  quickAction: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },

  quickEmoji: {
    fontSize: 25,
    marginBottom: 12,
  },

  quickTitle: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: "800",
  },

  quickDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },

  // NEW SWIPE DISCOVERY CARD
  swipeDiscoveryCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 17,
    backgroundColor: "#3B241C",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.orange,
    flexDirection: "row",
    alignItems: "center",
  },

  swipeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  swipeIcon: {
    color: COLORS.background,
    fontSize: 21,
    fontWeight: "900",
  },

  swipeTextContainer: {
    flex: 1,
  },

  swipeEyebrow: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  swipeTitle: {
    color: COLORS.cream,
    fontSize: 17,
    fontWeight: "900",
  },

  swipeSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
    lineHeight: 15,
  },

  swipeArrow: {
    color: COLORS.orange,
    fontSize: 24,
    marginLeft: 8,
  },

  followingCard: {
    marginHorizontal: 20,
    marginTop: 13,
    padding: 15,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  followingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  followingEmoji: {
    color: COLORS.orange,
    fontSize: 28,
    marginRight: 13,
  },

  followingText: {
    flex: 1,
  },

  followingTitle: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: "800",
  },

  followingSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  followingArrow: {
    color: COLORS.orange,
    fontSize: 22,
    marginLeft: 8,
  },

  feedSwitcher: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 26,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 5,
  },

  feedTab: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },

  feedTabActive: {
    backgroundColor: COLORS.orange,
  },

  feedTabText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },

  feedTabTextActive: {
    color: COLORS.background,
    fontWeight: "900",
  },

  recommendationMessage: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 23,
    marginTop: 14,
    marginBottom: 19,
  },

  recommendationIcon: {
    color: COLORS.gold,
    fontSize: 15,
    marginRight: 9,
  },

  recommendationText: {
    color: COLORS.gold,
    fontSize: 11,
    flex: 1,
    lineHeight: 17,
  },

  featuredCard: {
    marginHorizontal: 20,
    height: 285,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    marginBottom: 28,
  },

  featuredImage: {
    width: "100%",
    height: "100%",
  },

  featuredOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: "rgba(17,14,12,0.85)",
  },

  featuredLabel: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.orange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },

  featuredLabelText: {
    color: COLORS.background,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  featuredTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "900",
  },

  featuredDetails: {
    color: COLORS.gold,
    fontSize: 12,
    marginTop: 7,
  },

  featuredLink: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 12,
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 17,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  sectionText: {
    flex: 1,
  },

  sectionEyebrow: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
  },

  sectionTitle: {
    color: COLORS.cream,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 5,
    maxWidth: 240,
  },

  recipeCount: {
    color: COLORS.muted,
    fontSize: 10,
    marginBottom: 3,
  },

  recipeGrid: {
    flexDirection: "row",
    paddingHorizontal: 14,
    alignItems: "flex-start",
  },

  gridColumn: {
    flex: 1,
    paddingHorizontal: 5,
  },

  recipeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardImageContainer: {
    position: "relative",
    backgroundColor: COLORS.surfaceLight,
  },

  cardImage: {
    width: "100%",
  },

  cuisineBadge: {
    position: "absolute",
    top: 9,
    left: 8,
    backgroundColor: "rgba(17,14,12,0.85)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: "65%",
  },

  cuisineBadgeText: {
    color: COLORS.cream,
    fontSize: 9,
    fontWeight: "800",
  },

  timeBadge: {
    position: "absolute",
    top: 9,
    right: 8,
    backgroundColor: "rgba(17,14,12,0.85)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },

  timeBadgeText: {
    color: COLORS.cream,
    fontSize: 9,
    fontWeight: "700",
  },

  cardContent: {
    padding: 11,
  },

  cardTitle: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },

  cardCreator: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 7,
  },

  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
  },

  cardActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  actionIcon: {
    color: COLORS.muted,
    fontSize: 19,
  },

  activeAction: {
    color: COLORS.orange,
  },

  actionLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
  },

  loadingContainer: {
    paddingVertical: 65,
    alignItems: "center",
  },

  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 15,
  },

  emptyContainer: {
    marginHorizontal: 20,
    padding: 35,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    alignItems: "center",
  },

  emptyEmoji: {
    fontSize: 36,
  },

  emptyTitle: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 13,
  },

  emptyDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },

  footer: {
    alignItems: "center",
    paddingVertical: 35,
  },

  footerEmoji: {
    fontSize: 30,
  },

  footerTitle: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },

  footerSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },

  bottomNavigation: {
    height: 76,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 8,
  },

  navigationItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navigationIconContainer: {
    width: 42,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  navigationIcon: {
    color: COLORS.muted,
    fontSize: 23,
  },

  navigationLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
  },

  navigationActive: {
    color: COLORS.orange,
  },

  createNavigationButton: {
    width: 48,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.orange,
  },

  createNavigationIcon: {
    color: COLORS.background,
    fontSize: 29,
    fontWeight: "500",
  },
});
