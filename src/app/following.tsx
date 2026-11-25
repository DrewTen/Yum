
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Recipe } from "../data/recipes";
import { getFollowing } from "../utils/following";
import { getAllRecipes } from "../utils/user-recipes";

const BG = "#17120F";
const CARD = "#241C17";
const CREAM = "#F5EBDD";
const MUTED = "#A99B8D";
const ORANGE = "#FF7048";
const BORDER = "#382B22";

export default function FollowingFeedScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      const [allRecipes, followingList] = await Promise.all([
        getAllRecipes(),
        getFollowing(),
      ]);

      const filtered = allRecipes.filter((recipe) =>
        followingList.some(
          (name) => name.toLowerCase() === recipe.creator.toLowerCase()
        )
      );

      setRecipes(filtered);
      setFollowing(followingList);
    } catch (error) {
      console.log("Error loading following feed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Following</Text>
          <Text style={styles.subtitle}>RECIPES FROM YOUR CREATORS</Text>
        </View>

        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => router.push("/following-list")}
        >
          <Text style={styles.manageButtonText}>List</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Loading your feed...</Text>
        </View>
      ) : following.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>👋</Text>
          <Text style={styles.emptyTitle}>Your feed starts here</Text>
          <Text style={styles.emptyText}>
            Follow creators you love and their recipes will show up here.
          </Text>

          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => router.push("/discover")}
          >
            <Text style={styles.discoverButtonText}>Discover creators</Text>
          </TouchableOpacity>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🍳</Text>
          <Text style={styles.emptyTitle}>No recipes just yet</Text>
          <Text style={styles.emptyText}>
            The creators you follow haven't published any recipes yet.
          </Text>
          <TouchableOpacity
            style={styles.manageButtonLarge}
            onPress={() => router.push("/following-list")}
          >
            <Text style={styles.manageButtonLargeText}>Manage Following</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feed}
        >
          {recipes.map((recipe) => (
            <View key={recipe.id} style={styles.post}>
              {/* Creator row */}
              <TouchableOpacity
                style={styles.creatorRow}
                onPress={() =>
                  router.push({
                    pathname: "/creator/[name]",
                    params: { name: recipe.creator },
                  })
                }
              >
                <View style={styles.creatorAvatar}>
                  <Text style={styles.creatorInitial}>
                    {recipe.creator.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View>
                  <Text style={styles.creatorName}>{recipe.creator}</Text>
                  <Text style={styles.creatorCaption}>Recipe creator</Text>
                </View>
              </TouchableOpacity>

              {/* Recipe image */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: "/recipe/[id]",
                    params: { id: recipe.id },
                  })
                }
              >
                <Image source={{ uri: recipe.image }} style={styles.postImage} />
              </TouchableOpacity>

              {/* Recipe details */}
              <TouchableOpacity
                style={styles.recipeDetails}
                onPress={() =>
                  router.push({
                    pathname: "/recipe/[id]",
                    params: { id: recipe.id },
                  })
                }
              >
                <Text style={styles.recipeTitle}>{recipe.title}</Text>
                <Text style={styles.recipeDescription} numberOfLines={2}>
                  {recipe.description}
                </Text>

                <View style={styles.recipeMeta}>
                  <Text style={styles.metaText}>⏱ {recipe.time}</Text>
                  <Text style={styles.metaText}>🍽 {recipe.cuisine}</Text>
                </View>

                <View style={styles.viewRecipe}>
                  <Text style={styles.viewRecipeText}>View recipe →</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: CREAM, fontSize: 30, marginTop: -3 },
  headerCenter: { alignItems: "center" },
  title: { color: CREAM, fontSize: 24, fontWeight: "800" },
  subtitle: { color: MUTED, fontSize: 9, letterSpacing: 2, marginTop: 5 },
  manageButton: {
    width: 46,
    height: 40,
    borderRadius: 13,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  manageButtonText: { color: ORANGE, fontSize: 11, fontWeight: "800" },
  feed: { paddingHorizontal: 15, paddingBottom: 30 },
  post: {
    backgroundColor: CARD,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  creatorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#493528",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  creatorInitial: { color: CREAM, fontSize: 17, fontWeight: "800" },
  creatorName: { color: CREAM, fontSize: 14, fontWeight: "800" },
  creatorCaption: { color: MUTED, fontSize: 11, marginTop: 3 },
  postImage: { width: "100%", height: 280, backgroundColor: BORDER },
  recipeDetails: { padding: 16 },
  recipeTitle: { color: CREAM, fontSize: 19, fontWeight: "800" },
  recipeDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  recipeMeta: { flexDirection: "row", gap: 18, marginTop: 12 },
  metaText: { color: MUTED, fontSize: 12 },
  viewRecipe: {
    alignSelf: "flex-start",
    backgroundColor: ORANGE,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 15,
  },
  viewRecipeText: { color: BG, fontWeight: "800", fontSize: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },
  emptyEmoji: { fontSize: 45, marginBottom: 18 },
  emptyTitle: {
    color: CREAM,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  emptyText: { color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 21 },
  discoverButton: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 25,
    marginTop: 22,
  },
  discoverButtonText: { color: BG, fontWeight: "800" },
  manageButtonLarge: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: ORANGE,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  manageButtonLargeText: { color: ORANGE, fontWeight: "800", fontSize: 12 },
});
