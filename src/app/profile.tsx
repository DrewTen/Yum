import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { Recipe } from "../data/recipes";
import { useAuth } from "../utils/auth";
import {
    cuisineOptions,
    getFavouriteCuisines,
    saveFavouriteCuisines,
} from "../utils/favourite-cuisines";
import { getLikedRecipes } from "../utils/liked-recipes";
import { getSavedRecipes } from "../utils/saved-recipes";
import {
    getUserProfile,
    saveUserProfile,
    UserProfile,
} from "../utils/user-profiles";
import {
    getAllRecipes,
    getMyRecipes,
} from "../utils/user-recipes";

export default function ProfileScreen() {
  const { user, loading: authLoading, signOut } = useAuth();

  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
  const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [favouriteCuisines, setFavouriteCuisines] =
    useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [editingCuisines, setEditingCuisines] = useState(false);
  const [activeTab, setActiveTab] =
    useState<"my" | "liked">("my");

  const [profileOwnerId, setProfileOwnerId] =
    useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [cuisineError, setCuisineError] = useState(false);
  const requestVersion = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const accountId = user?.id ?? null;
      const version = ++requestVersion.current;
      let active = true;

      if (!accountId) {
        setProfileOwnerId(null);
        setProfile(null);
        setDraft(null);
        setMyRecipes([]);
        setLikedRecipes([]);
        setSavedCount(0);
        setFavouriteCuisines([]);
        setProfileLoading(false);
        setProfileError(false);
        setEditing(false);
        setEditingCuisines(false);

        return () => {
          active = false;
          requestVersion.current++;
        };
      }

      // Prevent another account's profile from appearing.
      if (profileOwnerId !== accountId) {
        setProfileOwnerId(null);
        setProfile(null);
        setDraft(null);
        setMyRecipes([]);
        setLikedRecipes([]);
        setSavedCount(0);
        setFavouriteCuisines([]);
        setEditing(false);
        setEditingCuisines(false);
      }

      setProfileLoading(true);
      setProfileError(false);

      async function loadProfile() {
        try {
          const [
            userProfile,
            recipes,
            saved,
            likedIds,
            allRecipes,
            cuisines,
          ] = await Promise.all([
            getUserProfile(),
            getMyRecipes(),
            getSavedRecipes(),
            getLikedRecipes(),
            getAllRecipes(),
            getFavouriteCuisines(),
          ]);

          if (!active || version !== requestVersion.current) {
            return;
          }

          if (!userProfile) {
            throw new Error("Profile data unavailable");
          }

          setProfile(userProfile);

          // Preserve unsaved edits during a refresh.
          setDraft((current) =>
            profileOwnerId === accountId && editing && current
              ? current
              : userProfile
          );

          setMyRecipes(recipes);
          setSavedCount(saved.length);
          setFavouriteCuisines(cuisines);

          const likedSet = new Set(likedIds);

          setLikedRecipes(
            allRecipes.filter((recipe) =>
              likedSet.has(recipe.id)
            )
          );

          setProfileOwnerId(accountId);
          setProfileError(false);
        } catch (error) {
          console.log("Error loading profile screen:", error);

          if (active && version === requestVersion.current) {
            setProfileError(true);
          }
        } finally {
          if (active && version === requestVersion.current) {
            setProfileLoading(false);
          }
        }
      }

      loadProfile();

      return () => {
        active = false;
        requestVersion.current++;
      };
    }, [user?.id, retryCount])
  );

  const handleSignOut = () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out of Yum?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            setSigningOut(true);

            try {
              const { error } = await signOut();

              if (error) {
                Alert.alert(
                  "Couldn't log out",
                  error.message
                );
              } else {
                setEditing(false);
                setEditingCuisines(false);
                setProfileOwnerId(null);
                setProfile(null);
                setDraft(null);
              }
            } catch {
              Alert.alert(
                "Connection error",
                "Please try again."
              );
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handlePickAvatar = async () => {
    if (!profile || savingAvatar) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow Yum to access your photos."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const updatedProfile = {
        ...profile,
        avatar: result.assets[0].uri,
      };

      setSavingAvatar(true);

      await saveUserProfile(updatedProfile);

      setProfile(updatedProfile);
      setDraft((current) =>
        current
          ? { ...current, avatar: updatedProfile.avatar }
          : updatedProfile
      );

      Alert.alert(
        "Success",
        "Profile photo updated!"
      );
    } catch {
      Alert.alert(
        "Oops",
        "Couldn't update your profile photo."
      );
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!draft || savingProfile) return;

    if (
      !draft.displayName.trim() ||
      !draft.username.trim()
    ) {
      Alert.alert(
        "Missing details",
        "Please enter a name and username."
      );
      return;
    }

    const updatedProfile = {
      ...draft,
      displayName: draft.displayName.trim(),
      username: draft.username.trim().replace(/^@/, ""),
      bio: draft.bio.trim(),
    };

    setSavingProfile(true);

    try {
      await saveUserProfile(updatedProfile);

      setProfile(updatedProfile);
      setDraft(updatedProfile);
      setEditing(false);

      Alert.alert(
        "Success",
        "Your profile has been saved!"
      );
    } catch {
      Alert.alert(
        "Oops",
        "Couldn't save your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCuisineToggle = async (cuisine: string) => {
    const updated = favouriteCuisines.includes(cuisine)
      ? favouriteCuisines.filter(
          (item) => item !== cuisine
        )
      : [...favouriteCuisines, cuisine];

    setFavouriteCuisines(updated);

    try {
      await saveFavouriteCuisines(updated);
      setCuisineError(false);
    } catch {
      setFavouriteCuisines(favouriteCuisines);
      setCuisineError(true);

      Alert.alert(
        "Oops",
        "Couldn't save your favourite cuisines."
      );
    }
  };

  const cancelEditing = () => {
    setDraft(profile);
    setEditing(false);
  };

  // Loading authentication state.
  if (authLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loading}>
          Checking your account...
        </Text>
      </View>
    );
  }

  // Guest profile screen.
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <ScrollView
          contentContainerStyle={styles.guestContent}
        >
          <Text style={styles.eyebrow}>
            YOUR YUM SPACE
          </Text>

          <Text style={styles.pageTitle}>
            Profile
            <Text style={styles.orange}>.</Text>
          </Text>

          <View style={styles.guestCard}>
            <Text style={styles.guestEmoji}>
              🍳
            </Text>

            <Text style={styles.guestTitle}>
              Make Yum yours.
            </Text>

            <Text style={styles.guestDescription}>
              Create an account to save recipes, follow
              creators and share your own cooking.
            </Text>

            <Pressable
              style={styles.guestPrimaryButton}
              onPress={() => router.push("/signup")}
            >
              <Text style={styles.guestPrimaryText}>
                Create an account →
              </Text>
            </Pressable>

            <Pressable
              style={styles.guestSecondaryButton}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.guestSecondaryText}>
                Log in
              </Text>
            </Pressable>

            <Text style={styles.guestNote}>
              You can still browse and discover recipes
              without an account.
            </Text>
          </View>
        </ScrollView>

        <ProfileBottomNav />
      </View>
    );
  }

  // Loading or error state for the signed-in account.
  if (
    profileOwnerId !== user.id ||
    !profile ||
    !draft
  ) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.loadState}>
          {profileLoading ? (
            <>
              <ActivityIndicator
                size="large"
                color="#FF7048"
              />

              <Text style={styles.loading}>
                Loading profile...
              </Text>
            </>
          ) : (
            <View style={styles.loadErrorCard}>
              <Text style={styles.loadErrorTitle}>
                Couldn't load your profile
              </Text>

              <Text style={styles.loadErrorText}>
                Please check your connection and try again.
              </Text>

              <Pressable
                style={styles.retryButton}
                onPress={() =>
                  setRetryCount((count) => count + 1)
                }
              >
                <Text style={styles.retryText}>
                  Try again
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <ProfileBottomNav />
      </View>
    );
  }

  const avatarIsPhoto =
    profile.avatar?.startsWith("file://") ||
    profile.avatar?.startsWith("content://") ||
    profile.avatar?.startsWith("https://") ||
    profile.avatar?.startsWith("http://");

  const displayedRecipes =
    activeTab === "my" ? myRecipes : likedRecipes;

  // Logged-in profile screen.
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            YOUR YUM SPACE
          </Text>

          <View style={styles.topRow}>
            <Text style={styles.pageTitle}>
              Profile
              <Text style={styles.orange}>.</Text>
            </Text>

            {!editing && (
              <Pressable
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editButtonText}>
                  Edit profile
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {profileLoading && (
          <View style={styles.refreshRow}>
            <ActivityIndicator
              color="#FF7048"
              size="small"
            />
            <Text style={styles.refreshText}>
              Refreshing your profile...
            </Text>
          </View>
        )}

        {profileError && !profileLoading && (
          <View style={styles.inlineError}>
            <Text style={styles.loadErrorText}>
              Some profile information couldn't be refreshed.
            </Text>

            <Pressable
              onPress={() =>
                setRetryCount((count) => count + 1)
              }
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        )}

        {/* Supabase account details */}
        <View style={styles.accountCard}>
          <View style={styles.accountInfo}>
            <Text style={styles.accountLabel}>
              SIGNED IN AS
            </Text>

            <Text
              style={styles.accountEmail}
              numberOfLines={1}
            >
              {user.email ?? "Yum member"}
            </Text>
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            <Text style={styles.logoutText}>
              {signingOut
                ? "Logging out..."
                : "Log out"}
            </Text>
          </Pressable>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <Pressable
            onPress={handlePickAvatar}
            style={styles.avatar}
            disabled={savingAvatar}
          >
            {savingAvatar ? (
              <ActivityIndicator
                color="#FF7048"
              />
            ) : avatarIsPhoto ? (
              <Image
                source={{ uri: profile.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {profile.avatar || "🍳"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handlePickAvatar}
            disabled={savingAvatar}
          >
            <Text style={styles.avatarHint}>
              {savingAvatar
                ? "Saving photo..."
                : "✦ Tap to change photo"}
            </Text>
          </Pressable>

          {!editing ? (
            <>
              <Text style={styles.displayName}>
                {profile.displayName}
              </Text>

              <Text style={styles.username}>
                @{profile.username}
              </Text>

              <Text style={styles.bio}>
                {profile.bio || "No bio yet."}
              </Text>
            </>
          ) : (
            <View style={styles.editForm}>
              <Text style={styles.fieldLabel}>
                DISPLAY NAME
              </Text>

              <TextInput
                style={styles.input}
                value={draft.displayName}
                onChangeText={(text) =>
                  setDraft({
                    ...draft,
                    displayName: text,
                  })
                }
                placeholder="Your name"
                placeholderTextColor="#82766C"
              />

              <Text style={styles.fieldLabel}>
                USERNAME
              </Text>

              <TextInput
                style={styles.input}
                value={draft.username}
                onChangeText={(text) =>
                  setDraft({
                    ...draft,
                    username: text.replace(/^@/, ""),
                  })
                }
                placeholder="username"
                placeholderTextColor="#82766C"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>
                BIO
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                ]}
                value={draft.bio}
                onChangeText={(text) =>
                  setDraft({
                    ...draft,
                    bio: text,
                  })
                }
                placeholder="Tell us about your food..."
                placeholderTextColor="#82766C"
                multiline
                maxLength={150}
              />

              <View style={styles.editActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={cancelEditing}
                >
                  <Text style={styles.cancelText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.saveProfileButton}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  <Text style={styles.saveProfileText}>
                    {savingProfile
                      ? "Saving..."
                      : "Save changes"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Recipe statistics */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {myRecipes.length}
            </Text>
            <Text style={styles.statLabel}>
              Recipes
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {savedCount}
            </Text>
            <Text style={styles.statLabel}>
              Saved
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {likedRecipes.length}
            </Text>
            <Text style={styles.statLabel}>
              Liked
            </Text>
          </View>
        </View>

        {/* Favourite cuisines */}
        <View style={styles.cuisineSection}>
          <View style={styles.cuisineHeader}>
            <View>
              <Text style={styles.cuisineEyebrow}>
                YOUR TASTE
              </Text>

              <Text style={styles.cuisineTitle}>
                Favourite cuisines
              </Text>
            </View>

            <Pressable
              style={styles.cuisineEditButton}
              onPress={() =>
                setEditingCuisines(!editingCuisines)
              }
            >
              <Text style={styles.cuisineEditText}>
                {editingCuisines
                  ? "Done"
                  : "✎ Edit"}
              </Text>
            </Pressable>
          </View>

          {editingCuisines && (
            <Text style={styles.cuisineHint}>
              Select all the cuisines you love.
            </Text>
          )}

          {cuisineError && (
            <Text style={styles.cuisineError}>
              Your last cuisine change wasn't saved.
              Please try again.
            </Text>
          )}

          <View style={styles.cuisineGrid}>
            {cuisineOptions.map((cuisine) => {
              const selected =
                favouriteCuisines.includes(cuisine);

              if (!editingCuisines && !selected) {
                return null;
              }

              return (
                <Pressable
                  key={cuisine}
                  style={[
                    styles.cuisineChip,
                    selected &&
                      styles.cuisineChipSelected,
                  ]}
                  onPress={() =>
                    handleCuisineToggle(cuisine)
                  }
                  disabled={!editingCuisines}
                >
                  <Text
                    style={[
                      styles.cuisineChipText,
                      selected &&
                        styles.cuisineChipTextSelected,
                    ]}
                  >
                    {selected ? "✓ " : ""}
                    {cuisine}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!editingCuisines &&
            favouriteCuisines.length === 0 && (
              <Pressable
                style={styles.addCuisinesButton}
                onPress={() =>
                  setEditingCuisines(true)
                }
              >
                <Text style={styles.addCuisinesText}>
                  + Add your favourite cuisines
                </Text>
              </Pressable>
            )}

          {editingCuisines && (
            <Text style={styles.cuisineFooter}>
              Your selections save automatically.
            </Text>
          )}
        </View>

        {/* My Recipes / Liked tabs */}
        <View style={styles.recipeSection}>
          <View style={styles.tabsRow}>
            <Pressable
              style={[
                styles.tabButton,
                activeTab === "my" &&
                  styles.activeTab,
              ]}
              onPress={() => setActiveTab("my")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "my" &&
                    styles.activeTabText,
                ]}
              >
                My Recipes
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabButton,
                activeTab === "liked" &&
                  styles.activeTab,
              ]}
              onPress={() => setActiveTab("liked")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "liked" &&
                    styles.activeTabText,
                ]}
              >
                ♥ Liked
              </Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === "my"
                ? "My recipes"
                : "Liked recipes"}
            </Text>

            {activeTab === "my" && (
              <Pressable
                onPress={() =>
                  router.push("/create")
                }
              >
                <Text style={styles.addRecipe}>
                  + Create
                </Text>
              </Pressable>
            )}
          </View>

          {displayedRecipes.length > 0 ? (
            <View style={styles.recipeGrid}>
              {displayedRecipes.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  style={styles.recipeTile}
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

                  <Text
                    style={styles.recipeName}
                    numberOfLines={2}
                  >
                    {recipe.title}
                  </Text>

                  <Text style={styles.recipeTime}>
                    {recipe.time}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>
                {activeTab === "my"
                  ? "🍽️"
                  : "♡"}
              </Text>

              <Text style={styles.emptyTitle}>
                {activeTab === "my"
                  ? "Your kitchen is waiting"
                  : "No liked recipes yet"}
              </Text>

              <Text style={styles.emptyText}>
                {activeTab === "my"
                  ? "Recipes you publish will appear here."
                  : "Recipes you heart will appear here."}
              </Text>

              <Pressable
                style={styles.createRecipeButton}
                onPress={() =>
                  activeTab === "my"
                    ? router.push("/create")
                    : router.push("/discover")
                }
              >
                <Text style={styles.createRecipeText}>
                  {activeTab === "my"
                    ? "Create your first recipe"
                    : "Discover recipes"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <ProfileBottomNav />
    </View>
  );
}
// Shared navigation for guests and logged-in users.
function ProfileBottomNav() {
  const items = [
    { icon: "⌂", label: "Home" },
    { icon: "⌕", label: "Discover" },
    { icon: "+", label: "Create" },
    { icon: "☆", label: "Saved" },
    { icon: "♙", label: "Profile" },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          style={styles.navItem}
          onPress={() => {
            if (item.label === "Home") {
              router.replace("/");
            } else if (item.label === "Discover") {
              router.replace("/discover");
            } else if (item.label === "Create") {
              router.push("/create");
            } else if (item.label === "Saved") {
              router.replace("/saved");
            } else {
              router.replace("/profile");
            }
          }}
        >
          <View
            style={[
              styles.navIconWrap,
              item.label === "Create" &&
                styles.createButton,
            ]}
          >
            <Text
              style={[
                styles.navIcon,
                item.label === "Profile" &&
                  styles.activeIcon,
                item.label === "Create" &&
                  styles.createIcon,
              ]}
            >
              {item.icon}
            </Text>
          </View>

          {item.label !== "Create" && (
            <Text
              style={[
                styles.navLabel,
                item.label === "Profile" &&
                  styles.activeLabel,
              ]}
            >
              {item.label}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#17120F",
  },

  loading: {
    color: "#F5EBDD",
    textAlign: "center",
    marginTop: 16,
  },

  loadState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadErrorCard: {
    width: "100%",
    padding: 24,
    backgroundColor: "#241C17",
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#49372B",
  },

  loadErrorTitle: {
    color: "#F5EBDD",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  loadErrorText: {
    color: "#A99B8D",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },

  retryButton: {
    marginTop: 18,
    backgroundColor: "#FF7048",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  retryText: {
    color: "#FF7048",
    fontSize: 12,
    fontWeight: "bold",
  },

  refreshRow: {
    marginHorizontal: 20,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  refreshText: {
    color: "#D5A16B",
    fontSize: 11,
  },

  inlineError: {
    marginHorizontal: 20,
    marginTop: 15,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#241C17",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  cuisineError: {
    color: "#FF9778",
    fontSize: 11,
    marginBottom: 10,
  },

  header: {
    paddingTop: 65,
    paddingHorizontal: 22,
  },

  eyebrow: {
    color: "#D5A16B",
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "700",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pageTitle: {
    color: "#F5EBDD",
    fontSize: 42,
    fontWeight: "bold",
    marginTop: 5,
  },

  orange: {
    color: "#FF7048",
  },

  editButton: {
    backgroundColor: "#30251D",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#49372B",
  },

  editButtonText: {
    color: "#D5A16B",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Supabase account section
  accountCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  accountInfo: {
    flex: 1,
  },

  accountLabel: {
    color: "#D5A16B",
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "bold",
  },

  accountEmail: {
    color: "#F5EBDD",
    fontSize: 12,
    marginTop: 6,
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: "#FF7048",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  logoutText: {
    color: "#FF7048",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Guest profile
  guestContent: {
    flexGrow: 1,
    paddingTop: 65,
    paddingHorizontal: 22,
  },

  guestCard: {
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 20,
    padding: 25,
    marginTop: 30,
    alignItems: "center",
  },

  guestEmoji: {
    fontSize: 55,
    marginBottom: 18,
  },

  guestTitle: {
    color: "#F5EBDD",
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
  },

  guestDescription: {
    color: "#A99B8D",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 25,
  },

  guestPrimaryButton: {
    backgroundColor: "#FF7048",
    borderRadius: 13,
    padding: 15,
    width: "100%",
    alignItems: "center",
  },

  guestPrimaryText: {
    color: "#17120F",
    fontWeight: "bold",
    fontSize: 14,
  },

  guestSecondaryButton: {
    borderWidth: 1,
    borderColor: "#D5A16B",
    borderRadius: 13,
    padding: 15,
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },

  guestSecondaryText: {
    color: "#D5A16B",
    fontWeight: "bold",
    fontSize: 14,
  },

  guestNote: {
    color: "#82766C",
    fontSize: 11,
    textAlign: "center",
    marginTop: 22,
    lineHeight: 17,
  },

  // Profile details
  profileCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 22,
    borderRadius: 20,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    alignItems: "center",
  },

  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "#382B22",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D5A16B",
    marginBottom: 8,
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 43,
  },

  avatarHint: {
    color: "#D5A16B",
    fontSize: 10,
    marginBottom: 12,
  },

  displayName: {
    color: "#F5EBDD",
    fontSize: 22,
    fontWeight: "bold",
  },

  username: {
    color: "#D5A16B",
    fontSize: 12,
    marginTop: 5,
  },

  bio: {
    color: "#A99B8D",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 12,
  },

  editForm: {
    width: "100%",
    marginTop: 5,
  },

  fieldLabel: {
    color: "#D5A16B",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 7,
  },

  input: {
    backgroundColor: "#17120F",
    color: "#F5EBDD",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 13,
  },

  bioInput: {
    height: 90,
    textAlignVertical: "top",
  },

  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  cancelButton: {
    flex: 1,
    padding: 13,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#49372B",
  },

  cancelText: {
    color: "#A99B8D",
    fontWeight: "bold",
    fontSize: 12,
  },

  saveProfileButton: {
    flex: 1,
    padding: 13,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#FF7048",
  },

  saveProfileText: {
    color: "#17120F",
    fontWeight: "bold",
    fontSize: 12,
  },

  // Statistics
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 18,
    gap: 10,
  },

  statBox: {
    flex: 1,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 16,
    alignItems: "center",
    padding: 14,
  },

  statNumber: {
    color: "#FF7048",
    fontSize: 24,
    fontWeight: "bold",
  },

  statLabel: {
    color: "#A99B8D",
    fontSize: 11,
    marginTop: 5,
  },

  // Favourite cuisines
  cuisineSection: {
    marginHorizontal: 20,
    marginTop: 26,
    padding: 18,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 18,
  },

  cuisineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  cuisineEyebrow: {
    color: "#D5A16B",
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: "bold",
  },

  cuisineTitle: {
    color: "#F5EBDD",
    fontSize: 19,
    fontWeight: "bold",
    marginTop: 5,
  },

  cuisineEditButton: {
    backgroundColor: "#30251D",
    borderWidth: 1,
    borderColor: "#49372B",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 15,
  },

  cuisineEditText: {
    color: "#FF7048",
    fontSize: 11,
    fontWeight: "bold",
  },

  cuisineHint: {
    color: "#A99B8D",
    fontSize: 11,
    marginBottom: 12,
  },

  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  cuisineChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#17120F",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 20,
  },

  cuisineChipSelected: {
    backgroundColor: "#FF7048",
    borderColor: "#FF7048",
  },

  cuisineChipText: {
    color: "#B7A99A",
    fontSize: 11,
    fontWeight: "600",
  },

  cuisineChipTextSelected: {
    color: "#17120F",
    fontWeight: "bold",
  },

  cuisineFooter: {
    color: "#82766C",
    fontSize: 10,
    marginTop: 12,
  },

  addCuisinesButton: {
    borderWidth: 1,
    borderColor: "#49372B",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },

  addCuisinesText: {
    color: "#D5A16B",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Recipe tabs and grid
  recipeSection: {
    marginHorizontal: 20,
    marginTop: 30,
  },

  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#241C17",
    borderRadius: 13,
    padding: 4,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#382B22",
  },

  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },

  activeTab: {
    backgroundColor: "#FF7048",
  },

  tabText: {
    color: "#A99B8D",
    fontSize: 12,
    fontWeight: "bold",
  },

  activeTabText: {
    color: "#17120F",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  sectionTitle: {
    color: "#F5EBDD",
    fontSize: 21,
    fontWeight: "bold",
  },

  addRecipe: {
    color: "#FF7048",
    fontSize: 12,
    fontWeight: "bold",
  },

  recipeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  recipeTile: {
    width: "48%",
    marginBottom: 12,
  },

  recipeImage: {
    width: "100%",
    height: 145,
    borderRadius: 14,
  },

  recipeName: {
    color: "#F5EBDD",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 8,
  },

  recipeTime: {
    color: "#D5A16B",
    fontSize: 10,
    marginTop: 4,
  },

  emptyState: {
    alignItems: "center",
    padding: 25,
    backgroundColor: "#241C17",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#382B22",
  },

  emptyEmoji: {
    fontSize: 38,
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#F5EBDD",
    fontSize: 16,
    fontWeight: "bold",
  },

  emptyText: {
    color: "#A99B8D",
    fontSize: 12,
    marginTop: 7,
    textAlign: "center",
  },

  createRecipeButton: {
    backgroundColor: "#FF7048",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },

  createRecipeText: {
    color: "#17120F",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Bottom navigation
  bottomNav: {
    height: 76,
    backgroundColor: "#100D0A",
    borderTopWidth: 1,
    borderTopColor: "#30251D",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 8,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navIconWrap: {
    width: 34,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  navIcon: {
    fontSize: 22,
    color: "#8B8178",
  },

  activeIcon: {
    color: "#FF7048",
  },

  navLabel: {
    fontSize: 9,
    color: "#82766C",
    marginTop: 2,
  },

  activeLabel: {
    color: "#FFF5E8",
  },

  createButton: {
    width: 48,
    height: 36,
    backgroundColor: "#FF7048",
    borderRadius: 13,
  },

  createIcon: {
    fontSize: 29,
    color: "#1A120E",
  },
});