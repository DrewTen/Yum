
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Recipe } from "../../data/recipes";
import { getFollowing, toggleFollow } from "../../utils/following";
import { getUserProfile } from "../../utils/user-profiles";
import { getAllRecipes } from "../../utils/user-recipes";

const BG = "#17120F";
const CARD = "#241C17";
const CREAM = "#F5EBDD";
const MUTED = "#A99B8D";
const ORANGE = "#FF7048";
const BORDER = "#382B22";

export default function CreatorProfileScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const creatorName = name || "Creator";

  const [creatorRecipes, setCreatorRecipes] = useState<Recipe[]>([]);
  const [following, setFollowing] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [avatar, setAvatar] = useState("🍳");
  const [bio, setBio] = useState("Sharing my favourite things to cook.");
  const [username, setUsername] = useState("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const [allRecipes, followingList, myProfile] = await Promise.all([
        getAllRecipes(),
        getFollowing(),
        getUserProfile(),
      ]);

      const matchingRecipes = allRecipes.filter(
        (recipe) =>
          recipe.creator.toLowerCase() === creatorName.toLowerCase()
      );

      setCreatorRecipes(matchingRecipes);

      setFollowing(
        followingList.some(
          (name) => name.toLowerCase() === creatorName.toLowerCase()
        )
      );

      const ownProfile =
        creatorName.toLowerCase() === myProfile.displayName.toLowerCase();

      setIsOwnProfile(ownProfile);

      if (ownProfile) {
        setAvatar(myProfile.avatar || "🍳");
        setBio(myProfile.bio || "");
        setUsername(myProfile.username || "");
        setFollowingCount(followingList.length);
      } else {
        setAvatar(creatorName.charAt(0).toUpperCase());
        setBio("Sharing my favourite things to cook.");
        setUsername(creatorName.toLowerCase().replace(/\s/g, ""));
        setFollowingCount(0);
      }
    } catch (error) {
      console.log("Error loading creator profile:", error);
    } finally {
      setLoading(false);
    }
  }, [creatorName]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  async function handleFollow() {
    try {
      const updated = await toggleFollow(creatorName);
      setFollowing(
        updated.some(
          (name) => name.toLowerCase() === creatorName.toLowerCase()
        )
      );
    } catch (error) {
      console.log("Error following creator:", error);
    }
  }

  function isImageUri(value: string) {
    return (
      value.startsWith("file://") ||
      value.startsWith("content://") ||
      value.startsWith("http://") ||
      value.startsWith("https://")
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading creator...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CREATOR</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Creator information */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {isImageUri(avatar) ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{avatar}</Text>
            )}
          </View>

          <Text style={styles.displayName}>{creatorName}</Text>
          <Text style={styles.username}>@{username}</Text>
          <Text style={styles.bio}>{bio}</Text>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{creatorRecipes.length}</Text>
              <Text style={styles.statLabel}>Recipes</Text>
            </View>

            {isOwnProfile && (
              <>
                <View style={styles.statDivider} />

                <TouchableOpacity
                  style={styles.stat}
                  activeOpacity={0.7}
                  onPress={() => router.push("/following-list")}
                >
                  <Text style={styles.statNumber}>{followingCount}</Text>
                  <Text style={styles.statLabel}>Following ›</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Follow button */}
          {!isOwnProfile && (
            <TouchableOpacity
              style={[styles.followButton, following && styles.followingButton]}
              onPress={handleFollow}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.followButtonText,
                  following && styles.followingButtonText,
                ]}
              >
                {following ? "Following ✓" : "+ Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recipes */}
        <View style={styles.recipeSection}>
          <Text style={styles.sectionTitle}>RECIPES</Text>

          {creatorRecipes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>No recipes yet</Text>
            </View>
          ) : (
            <View style={styles.recipeGrid}>
              {creatorRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.recipeCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/recipe/[id]",
                      params: { id: recipe.id },
                    })
                  }
                >
                  <Image
                    source={{ uri: recipe.image }}
                    style={styles.recipeImage}
                  />
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeTitle} numberOfLines={2}>
                      {recipe.title}
                    </Text>
                    <Text style={styles.recipeTime}>{recipe.time}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loading: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: CREAM },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
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
  headerTitle: {
    color: MUTED,
    letterSpacing: 3,
    fontSize: 12,
    fontWeight: "700",
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: CARD,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 16,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarEmoji: { color: CREAM, fontSize: 36 },
  displayName: { color: CREAM, fontSize: 26, fontWeight: "800" },
  username: { color: MUTED, fontSize: 14, marginTop: 4 },
  bio: {
    color: CREAM,
    fontSize: 14,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 21,
    maxWidth: 300,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 20,
  },
  stat: { alignItems: "center", paddingHorizontal: 24 },
  statNumber: { color: CREAM, fontSize: 20, fontWeight: "800" },
  statLabel: { color: MUTED, fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 32, backgroundColor: BORDER },
  followButton: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 36,
    minWidth: 160,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  followButtonText: { color: BG, fontWeight: "800", fontSize: 14 },
  followingButtonText: { color: CREAM },
  recipeSection: { paddingHorizontal: 18, paddingBottom: 40 },
  sectionTitle: {
    color: CREAM,
    fontWeight: "800",
    letterSpacing: 2,
    fontSize: 13,
    marginBottom: 16,
  },
  recipeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  recipeCard: {
    width: "48.5%",
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
  },
  recipeImage: { width: "100%", height: 155, backgroundColor: BORDER },
  recipeInfo: { padding: 11 },
  recipeTitle: {
    color: CREAM,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  recipeTime: { color: MUTED, fontSize: 12, marginTop: 6 },
  emptyState: { paddingVertical: 40, alignItems: "center" },
  emptyEmoji: { fontSize: 32, marginBottom: 12 },
  emptyText: { color: MUTED, fontSize: 14 },
});
