
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Recipe } from "../../data/recipes";
import { supabase } from "../../services/supabase";
import {
  addRecipeToCollection,
  getCollections,
  RecipeCollection,
} from "../../utils/collections";
import {
  getLikedRecipes,
  toggleLikedRecipe,
} from "../../utils/liked-recipes";
import {
  addRecipeComment,
  deleteRecipeComment,
  getRecipeComments,
  RecipeComment,
} from "../../utils/recipe-comments";
import {
  getSavedRecipes,
  toggleSavedRecipe,
} from "../../utils/saved-recipes";
import {
  getUserProfile,
  UserProfile,
} from "../../utils/user-profiles";
import {
  deleteUserRecipe,
  getAllRecipes,
} from "../../utils/user-recipes";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [recipe, setRecipe] = useState<Recipe | undefined>();
  const [isOwner, setIsOwner] = useState(false);
  const [deletingRecipe, setDeletingRecipe] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [servings, setServings] = useState(2);

  const [userProfile, setUserProfile] =
    useState<UserProfile | null>(null);

  const [comments, setComments] =
    useState<RecipeComment[]>([]);

  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [collectionModalVisible, setCollectionModalVisible] =
    useState(false);

  const [collections, setCollections] =
    useState<RecipeCollection[]>([]);

  const [addingToCollection, setAddingToCollection] =
    useState(false);

  // Refresh the recipe after returning from editing.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          const { data: row, error } = await supabase
            .from("recipes")
            .select("user_id")
            .eq("id", id)
            .maybeSingle();

          if (error) throw error;

          if (active) {
            setIsOwner(
              !!user && !!row && row.user_id === user.id
            );
          }

          const items = await getAllRecipes();

          const found = items.find(
            (item) => item.id === id
          );

          if (active) {
            setRecipe(found);

            if (found) {
              setServings(found.servings || 2);
            }
          }
        } catch (error) {
          console.log("Error refreshing recipe:", error);

          if (active) {
            setIsOwner(false);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [id])
  );

  useEffect(() => {
    let active = true;

    getSavedRecipes().then((ids) => {
      if (active) setIsSaved(ids.includes(id));
    });

    getLikedRecipes().then((ids) => {
      if (active) setIsLiked(ids.includes(id));
    });

    getUserProfile().then((profile) => {
      if (active) setUserProfile(profile);
    });

    getRecipeComments(id).then((items) => {
      if (active) setComments(items);
    });

    return () => {
      active = false;
    };
  }, [id]);

  const handleDeleteRecipe = () => {
    if (!recipe || !isOwner || deletingRecipe) return;

    const recipeId = recipe.id;

    Alert.alert(
      "Delete recipe?",
      "This permanently deletes your published recipe. This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Recipe",
          style: "destructive",
          onPress: async () => {
            setDeletingRecipe(true);

            try {
              const result = await deleteUserRecipe(recipeId);

              router.replace("/discover");

              if (result.photoCleanupFailed) {
                Alert.alert(
                  "Recipe deleted",
                  "Your recipe was deleted, but its photo could not be removed from storage."
                );
              }
            } catch (error) {
              console.log("Error deleting recipe:", error);

              Alert.alert(
                "Couldn't delete recipe",
                "Please try again. Your recipe may still be available."
              );
            } finally {
              setDeletingRecipe(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    try {
      const result = await toggleSavedRecipe(id);
      setIsSaved(result.includes(id));
    } catch (error) {
      console.log("SUPABASE SAVE ERROR:", error);

      Alert.alert(
        "Oops",
        "Couldn't update your saved recipes."
      );
    }
  };

  const handleLike = async () => {
    try {
      const result = await toggleLikedRecipe(id);
      setIsLiked(result.includes(id));
    } catch {
      Alert.alert(
        "Oops",
        "Couldn't update your likes."
      );
    }
  };

  const handleOpenCollections = async () => {
    try {
      const items = await getCollections();

      setCollections(items);
      setCollectionModalVisible(true);
    } catch {
      Alert.alert(
        "Oops",
        "Couldn't load your collections."
      );
    }
  };

  const handleAddToCollection = async (
    collectionId: string
  ) => {
    try {
      setAddingToCollection(true);

      await addRecipeToCollection(collectionId, id);

      setCollectionModalVisible(false);

      Alert.alert(
        "Added!",
        "Recipe added to your collection."
      );
    } catch {
      Alert.alert(
        "Oops",
        "Couldn't add this recipe to the collection."
      );
    } finally {
      setAddingToCollection(false);
    }
  };

  const handlePostComment = async () => {
    const trimmed = commentText.trim();

    if (!trimmed) return;

    if (!userProfile) {
      Alert.alert(
        "Oops",
        "Your profile hasn't loaded yet. Try again."
      );
      return;
    }

    try {
      setPostingComment(true);

      const updated = await addRecipeComment(
        id,
        trimmed,
        userProfile
      );

      setComments(updated);
      setCommentText("");
    } catch {
      Alert.alert(
        "Oops",
        "Couldn't post your comment. Please try again."
      );
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      "Delete comment",
      "Are you sure you want to delete this comment?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await deleteRecipeComment(
                id,
                commentId
              );

              setComments(updated);
            } catch {
              Alert.alert(
                "Oops",
                "Couldn't delete this comment."
              );
            }
          },
        },
      ]
    );
  };

  const formatCommentDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();

    const isToday =
      date.toDateString() === today.toDateString();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isYesterday =
      date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return `Today · ${time}`;
    if (isYesterday) return `Yesterday · ${time}`;

    return `${date.toLocaleDateString()} · ${time}`;
  };

  const isOwnComment = (comment: RecipeComment) => {
    if (!userProfile) return false;

    return (
      comment.username
        .trim()
        .toLowerCase()
        .replace(/^@/, "") ===
      userProfile.username
        .trim()
        .toLowerCase()
        .replace(/^@/, "")
    );
  };

  const avatarIsPhoto = (avatar?: string) =>
    !!avatar &&
    (avatar.startsWith("file://") ||
      avatar.startsWith("content://") ||
      avatar.startsWith("https://") ||
      avatar.startsWith("http://"));

  const handleCreatorPress = () => {
    if (!recipe?.creator) return;

    router.push({
      pathname: "/creator/[name]",
      params: { name: recipe.creator },
    });
  };

  if (!recipe) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.loadingText}>
          Loading recipe...
        </Text>
      </View>
    );
  }

  const scale = servings / (recipe.servings || 2);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={{ uri: recipe.image }}
            style={styles.heroImage}
          />

          <View style={styles.heroOverlay} />

          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <Pressable
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveText}>
              {isSaved ? "♥ Saved" : "♡ Save"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.likeButton}
            onPress={handleLike}
          >
            <Text style={styles.likeButtonText}>
              {isLiked ? "♥ Liked" : "♡ Like"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.collectionButton}
            onPress={handleOpenCollections}
          >
            <Text style={styles.collectionButtonText}>
              ＋ Collection
            </Text>
          </Pressable>

          <View style={styles.heroInfo}>
            <Text style={styles.cuisine}>
              {recipe.cuisine.toUpperCase()}
            </Text>

            <Text style={styles.title}>
              {recipe.title}
            </Text>

            <Pressable
              onPress={handleCreatorPress}
              hitSlop={8}
            >
              <Text style={styles.creator}>
                {recipe.creator} ↗
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            {recipe.description}
          </Text>

          {isOwner && (
            <Pressable
              style={styles.editRecipeButton}
              onPress={() =>
                router.push({
                  pathname: "/edit-recipe/[id]",
                  params: { id: recipe.id },
                })
              }
            >
              <Text style={styles.editRecipeText}>
                ✎ Edit Recipe
              </Text>

              <Text style={styles.editRecipeArrow}>
                ↗
              </Text>
            </Pressable>
          )}

          {isOwner && (
            <Pressable
              style={[
                styles.deleteRecipeButton,
                deletingRecipe &&
                  styles.deleteRecipeDisabled,
              ]}
              onPress={handleDeleteRecipe}
              disabled={deletingRecipe}
              accessibilityRole="button"
              accessibilityLabel="Delete recipe"
            >
              <Text style={styles.deleteRecipeText}>
                {deletingRecipe
                  ? "Deleting Recipe..."
                  : "Delete Recipe"}
              </Text>
            </Pressable>
          )}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>
                TIME
              </Text>

              <Text style={styles.statValue}>
                {recipe.time}
              </Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statLabel}>
                SERVINGS
              </Text>

              <Text style={styles.statValue}>
                {servings}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Ingredients
            </Text>

            <View style={styles.servingControls}>
              <Pressable
                style={styles.adjust}
                onPress={() =>
                  setServings((s) => Math.max(1, s - 1))
                }
              >
                <Text style={styles.adjustText}>
                  −
                </Text>
              </Pressable>

              <Text style={styles.servingText}>
                {servings}
              </Text>

              <Pressable
                style={styles.adjust}
                onPress={() =>
                  setServings((s) => s + 1)
                }
              >
                <Text style={styles.adjustText}>
                  ＋
                </Text>
              </Pressable>
            </View>
          </View>

          {recipe.ingredients.map((ingredient, index) => (
            <View
              style={styles.ingredientRow}
              key={index}
            >
              <View style={styles.dot} />

              <Text style={styles.ingredientText}>
                {Number(
                  (ingredient.amount * scale).toFixed(2)
                )}{" "}
                {ingredient.unit} {ingredient.name}
              </Text>
            </View>
          ))}

          <Text
            style={[
              styles.sectionTitle,
              {
                marginTop: 30,
                marginBottom: 15,
              },
            ]}
          >
            Method
          </Text>

          {recipe.instructions.map((step, index) => (
            <View
              style={styles.stepRow}
              key={index}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
              </View>

              <Text style={styles.stepText}>
                {step}
              </Text>
            </View>
          ))}

          <View style={styles.commentsSection}>
            <View style={styles.commentsHeading}>
              <View>
                <Text style={styles.commentsEyebrow}>
                  THE COMMUNITY
                </Text>

                <Text style={styles.sectionTitle}>
                  Comments
                </Text>
              </View>

              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountText}>
                  {comments.length}
                </Text>
              </View>
            </View>

            <View style={styles.commentComposer}>
              <View style={styles.composerAvatar}>
                {avatarIsPhoto(userProfile?.avatar) ? (
                  <Image
                    source={{
                      uri: userProfile!.avatar,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarEmoji}>
                    {userProfile?.avatar || "🍳"}
                  </Text>
                )}
              </View>

              <View style={styles.composerContent}>
                <Text style={styles.composerUsername}>
                  @{userProfile?.username || "yumuser"}
                </Text>

                <TextInput
                  style={styles.commentInput}
                  placeholder="Share your thoughts about this recipe..."
                  placeholderTextColor="#8A7E73"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />

                <View style={styles.composerFooter}>
                  <Text style={styles.characterCount}>
                    {commentText.length}/500
                  </Text>

                  <Pressable
                    style={[
                      styles.postButton,
                      (!commentText.trim() ||
                        postingComment) &&
                        styles.postButtonDisabled,
                    ]}
                    onPress={handlePostComment}
                    disabled={
                      !commentText.trim() ||
                      postingComment
                    }
                  >
                    <Text style={styles.postButtonText}>
                      {postingComment
                        ? "Posting..."
                        : "Post ↗"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsEmoji}>
                  💬
                </Text>

                <Text style={styles.emptyCommentsTitle}>
                  No comments yet
                </Text>

                <Text style={styles.emptyCommentsText}>
                  Be the first to share what you think
                  about this recipe.
                </Text>
              </View>
            ) : (
              comments.map((comment) => {
                const ownComment =
                  isOwnComment(comment);

                return (
                  <View
                    style={styles.commentItem}
                    key={comment.id}
                  >
                    <View style={styles.commentAvatar}>
                      {avatarIsPhoto(comment.avatar) ? (
                        <Image
                          source={{
                            uri: comment.avatar,
                          }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarEmoji}>
                          {comment.avatar || "🍳"}
                        </Text>
                      )}
                    </View>

                    <View style={styles.commentBody}>
                      <View style={styles.commentTopRow}>
                        <View style={styles.commentAuthor}>
                          <Text
                            style={
                              styles.commentDisplayName
                            }
                          >
                            {comment.displayName}
                          </Text>

                          <Text
                            style={styles.commentUsername}
                          >
                            @
                            {comment.username.replace(
                              /^@/,
                              ""
                            )}
                          </Text>
                        </View>

                        {ownComment && (
                          <Pressable
                            onPress={() =>
                              handleDeleteComment(
                                comment.id
                              )
                            }
                            hitSlop={8}
                          >
                            <Text
                              style={styles.deleteComment}
                            >
                              Delete
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      <Text style={styles.commentText}>
                        {comment.text}
                      </Text>

                      <Text style={styles.commentDate}>
                        {formatCommentDate(
                          comment.createdAt
                        )}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <Pressable
            style={styles.bottomLike}
            onPress={handleLike}
          >
            <Text style={styles.bottomLikeText}>
              {isLiked
                ? "♥ Liked this recipe"
                : "♡ Like this recipe"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.bottomSave}
            onPress={handleSave}
          >
            <Text style={styles.bottomSaveText}>
              {isSaved
                ? "♥ Saved to your collection"
                : "♡ Save this recipe"}
            </Text>
          </Pressable>

          <View style={{ height: 35 }} />
        </View>
      </ScrollView>

      <Modal
        visible={collectionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setCollectionModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.collectionModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  ORGANISE YOUR RECIPES
                </Text>

                <Text style={styles.modalTitle}>
                  Add to collection
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setCollectionModalVisible(false)
                }
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {collections.length === 0 ? (
              <View style={styles.noCollections}>
                <Text style={styles.noCollectionsEmoji}>
                  📚
                </Text>

                <Text style={styles.noCollectionsTitle}>
                  No collections yet
                </Text>

                <Text style={styles.noCollectionsText}>
                  Create a collection first to organise
                  your favourite recipes.
                </Text>

                <Pressable
                  style={styles.createCollectionButton}
                  onPress={() => {
                    setCollectionModalVisible(false);
                    router.push("/saved");
                  }}
                >
                  <Text
                    style={
                      styles.createCollectionButtonText
                    }
                  >
                    Go to Saved →
                  </Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                style={styles.collectionList}
                showsVerticalScrollIndicator={false}
              >
                {collections.map((collection) => (
                  <Pressable
                    key={collection.id}
                    style={styles.collectionOption}
                    onPress={() =>
                      handleAddToCollection(
                        collection.id
                      )
                    }
                    disabled={addingToCollection}
                  >
                    <View style={styles.collectionIcon}>
                      <Text
                        style={styles.collectionIconText}
                      >
                        📁
                      </Text>
                    </View>

                    <View
                      style={styles.collectionOptionInfo}
                    >
                      <Text
                        style={styles.collectionOptionName}
                      >
                        {collection.name}
                      </Text>

                      <Text
                        style={styles.collectionOptionCount}
                      >
                        {collection.recipeIds.length} recipes
                      </Text>
                    </View>

                    <Text
                      style={styles.collectionOptionArrow}
                    >
                      {addingToCollection ? "..." : "＋"}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#17120F",
  },

  hero: {
    height: 430,
    justifyContent: "flex-end",
  },

  heroImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },

  heroOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(10,8,6,0.38)",
  },

  backButton: {
    position: "absolute",
    top: 55,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: "rgba(30,26,22,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: "#FFF8EE",
    fontSize: 23,
  },

  saveButton: {
    position: "absolute",
    top: 55,
    right: 20,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(30,26,22,0.75)",
  },

  saveText: {
    color: "#FFF8EE",
    fontSize: 12,
    fontWeight: "bold",
  },

  likeButton: {
    position: "absolute",
    top: 105,
    right: 20,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(30,26,22,0.75)",
  },

  likeButtonText: {
    color: "#FF7048",
    fontSize: 12,
    fontWeight: "bold",
  },

  collectionButton: {
    position: "absolute",
    top: 155,
    right: 20,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(30,26,22,0.75)",
  },

  collectionButtonText: {
    color: "#D5A16B",
    fontSize: 12,
    fontWeight: "bold",
  },

  heroInfo: {
    paddingHorizontal: 22,
    paddingBottom: 25,
  },

  cuisine: {
    color: "#D5A16B",
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "bold",
  },

  title: {
    color: "#FFF7EA",
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 8,
  },

  creator: {
    color: "#E4D7C6",
    fontSize: 12,
    marginTop: 8,
  },

  content: {
    padding: 22,
  },

  description: {
    color: "#C2B4A4",
    fontSize: 13,
    lineHeight: 21,
  },

  editRecipeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#30251D",
    borderColor: "#FF7048",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginTop: 20,
  },

  editRecipeText: {
    color: "#FF7048",
    fontSize: 13,
    fontWeight: "bold",
  },

  editRecipeArrow: {
    color: "#FF7048",
    fontSize: 18,
  },

  deleteRecipeButton: {
    borderWidth: 1,
    borderColor: "#8C4741",
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 12,
  },

  deleteRecipeText: {
    color: "#FF9B90",
    fontSize: 13,
    fontWeight: "bold",
  },

  deleteRecipeDisabled: {
    opacity: 0.5,
  },

  stats: {
    flexDirection: "row",
    backgroundColor: "#241C17",
    borderRadius: 15,
    marginTop: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#382B22",
  },

  stat: {
    flex: 1,
    padding: 16,
  },

  statLabel: {
    color: "#D5A16B",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "bold",
  },

  statValue: {
    color: "#F5EBDD",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 7,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  sectionTitle: {
    color: "#F5EBDD",
    fontSize: 22,
    fontWeight: "bold",
  },

  servingControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  adjust: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#30251D",
    alignItems: "center",
    justifyContent: "center",
  },

  adjustText: {
    color: "#FF7048",
    fontSize: 17,
    fontWeight: "bold",
  },

  servingText: {
    color: "#F5EBDD",
    fontWeight: "bold",
    fontSize: 14,
  },

  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#30251D",
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF7048",
    marginRight: 12,
  },

  ingredientText: {
    color: "#E8DCCB",
    fontSize: 13,
    flex: 1,
  },

  stepRow: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 13,
  },

  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FF7048",
    alignItems: "center",
    justifyContent: "center",
  },

  stepNumberText: {
    color: "#1A120E",
    fontSize: 11,
    fontWeight: "bold",
  },

  stepText: {
    color: "#C2B4A4",
    fontSize: 13,
    lineHeight: 21,
    flex: 1,
    paddingTop: 5,
  },

  commentsSection: {
    marginTop: 35,
    paddingTop: 25,
    borderTopWidth: 1,
    borderTopColor: "#382B22",
  },

  commentsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  commentsEyebrow: {
    color: "#D5A16B",
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: "bold",
    marginBottom: 6,
  },

  commentCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#30251D",
    borderWidth: 1,
    borderColor: "#49372B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  commentCountText: {
    color: "#D5A16B",
    fontSize: 12,
    fontWeight: "bold",
  },

  commentComposer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 16,
    padding: 13,
    marginBottom: 22,
  },

  composerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#382B22",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 11,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarEmoji: {
    fontSize: 18,
  },

  composerContent: {
    flex: 1,
  },

  composerUsername: {
    color: "#D5A16B",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },

  commentInput: {
    minHeight: 65,
    color: "#F5EBDD",
    fontSize: 13,
    lineHeight: 20,
    textAlignVertical: "top",
    padding: 0,
  },

  composerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  characterCount: {
    color: "#8A7E73",
    fontSize: 10,
  },

  postButton: {
    backgroundColor: "#FF7048",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },

  postButtonDisabled: {
    opacity: 0.45,
  },

  postButtonText: {
    color: "#1A120E",
    fontSize: 11,
    fontWeight: "bold",
  },

  emptyComments: {
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
  },

  emptyCommentsEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },

  emptyCommentsTitle: {
    color: "#F5EBDD",
    fontSize: 15,
    fontWeight: "bold",
  },

  emptyCommentsText: {
    color: "#A99B8D",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 7,
  },

  commentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 22,
  },

  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#382B22",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 11,
  },

  commentBody: {
    flex: 1,
  },

  commentTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  commentAuthor: {
    flex: 1,
  },

  commentDisplayName: {
    color: "#F5EBDD",
    fontSize: 12,
    fontWeight: "bold",
  },

  commentUsername: {
    color: "#A99B8D",
    fontSize: 10,
    marginTop: 3,
  },

  deleteComment: {
    color: "#D58A73",
    fontSize: 10,
    paddingLeft: 10,
  },

  commentText: {
    color: "#D8CABB",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },

  commentDate: {
    color: "#8A7E73",
    fontSize: 10,
    marginTop: 9,
  },

  bottomLike: {
    backgroundColor: "#241C17",
    borderColor: "#382B22",
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    marginTop: 15,
    alignItems: "center",
  },

  bottomLikeText: {
    color: "#FF7048",
    fontSize: 13,
    fontWeight: "bold",
  },

  bottomSave: {
    backgroundColor: "#241C17",
    borderColor: "#FF7048",
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
    alignItems: "center",
  },

  bottomSaveText: {
    color: "#FF7048",
    fontSize: 13,
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 22,
  },

  collectionModal: {
    backgroundColor: "#241C17",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#382B22",
    padding: 20,
    maxHeight: "75%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  modalEyebrow: {
    color: "#D5A16B",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "bold",
    marginBottom: 6,
  },

  modalTitle: {
    color: "#F5EBDD",
    fontSize: 22,
    fontWeight: "bold",
  },

  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#382B22",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    color: "#F5EBDD",
    fontSize: 16,
  },

  collectionList: {
    maxHeight: 400,
  },

  collectionOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#30251D",
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#49372B",
  },

  collectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#382B22",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  collectionIconText: {
    fontSize: 19,
  },

  collectionOptionInfo: {
    flex: 1,
  },

  collectionOptionName: {
    color: "#F5EBDD",
    fontSize: 14,
    fontWeight: "bold",
  },

  collectionOptionCount: {
    color: "#A99B8D",
    fontSize: 11,
    marginTop: 5,
  },

  collectionOptionArrow: {
    color: "#FF7048",
    fontSize: 20,
    fontWeight: "bold",
  },

  noCollections: {
    alignItems: "center",
    paddingVertical: 20,
  },

  noCollectionsEmoji: {
    fontSize: 35,
    marginBottom: 12,
  },

  noCollectionsTitle: {
    color: "#F5EBDD",
    fontSize: 16,
    fontWeight: "bold",
  },

  noCollectionsText: {
    color: "#A99B8D",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 20,
  },

  createCollectionButton: {
    backgroundColor: "#FF7048",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  createCollectionButtonText: {
    color: "#1A120E",
    fontWeight: "bold",
    fontSize: 12,
  },

  loadingText: {
    color: "#F5EBDD",
    textAlign: "center",
    marginTop: 40,
  },
});
