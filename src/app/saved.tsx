
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import type { Recipe } from "../data/recipes";
import {
  addRecipeToCollection,
  createCollection,
  getCollections,
  type RecipeCollection,
} from "../utils/collections";
import {
  getSavedRecipes,
  subscribeToSavedRecipes,
} from "../utils/saved-recipes";
import { getAllRecipes } from "../utils/user-recipes";

export default function SavedScreen() {
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [collections, setCollections] = useState<RecipeCollection[]>([]);

  const [createModal, setCreateModal] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [selectedRecipe, setSelectedRecipe] =
    useState<Recipe | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [creatingCollection, setCreatingCollection] =
    useState(false);
  const [addingToCollection, setAddingToCollection] =
    useState(false);
  const [actionError, setActionError] = useState("");

  const createInProgress = useRef(false);
  const addInProgress = useRef(false);
  const loadVersion = useRef(0);

  const loadCollections = useCallback(async () => {
    const items = await getCollections();
    setCollections(items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const version = ++loadVersion.current;

      async function loadSaved() {
        setLoading(true);
        setLoadError(false);

        try {
          const [savedIds, allRecipes, collectionItems] =
            await Promise.all([
              getSavedRecipes(),
              getAllRecipes(),
              getCollections(),
            ]);

          if (!active || version !== loadVersion.current) {
            return;
          }

          const savedSet = new Set(savedIds);

          setSavedRecipes(
            allRecipes.filter((recipe) =>
              savedSet.has(recipe.id)
            )
          );

          setCollections(collectionItems);
          setHasLoaded(true);
        } catch (error) {
          if (!active || version !== loadVersion.current) {
            return;
          }

          console.log(
            "Could not load saved recipes:",
            error
          );
          setLoadError(true);
        } finally {
          if (active && version === loadVersion.current) {
            setLoading(false);
          }
        }
      }

      loadSaved();

      const unsubscribe = subscribeToSavedRecipes(
        async (savedIds) => {
          if (!active) return;

          const updateVersion = ++loadVersion.current;

          try {
            const allRecipes = await getAllRecipes();

            if (
              !active ||
              updateVersion !== loadVersion.current
            ) {
              return;
            }

            const savedSet = new Set(savedIds);

            setSavedRecipes(
              allRecipes.filter((recipe) =>
                savedSet.has(recipe.id)
              )
            );

            setLoadError(false);
          } catch (error) {
            if (
              !active ||
              updateVersion !== loadVersion.current
            ) {
              return;
            }

            console.log(
              "Could not refresh saved recipes:",
              error
            );
            setLoadError(true);
          }
        }
      );

      return () => {
        active = false;
        loadVersion.current++;
        unsubscribe();
      };
    }, [retryCount])
  );

  const retryLoading = () => {
    if (loading) return;
    setRetryCount((previous) => previous + 1);
  };

  const handleCreateCollection = async () => {
    const name = collectionName.trim();

    if (!name || createInProgress.current) return;

    createInProgress.current = true;
    setCreatingCollection(true);
    setActionError("");

    try {
      await createCollection(name);
      await loadCollections();

      setCollectionName("");
      setCreateModal(false);
    } catch (error) {
      console.log(
        "Could not create collection:",
        error
      );

      setActionError(
        "We couldn't create your collection. Please try again."
      );
    } finally {
      createInProgress.current = false;
      setCreatingCollection(false);
    }
  };

  const handleAddToCollection = async (
    collectionId: string
  ) => {
    if (!selectedRecipe || addInProgress.current) {
      return;
    }

    addInProgress.current = true;
    setAddingToCollection(true);
    setActionError("");

    try {
      await addRecipeToCollection(
        collectionId,
        selectedRecipe.id
      );

      await loadCollections();

      setSelectedRecipe(null);
      setPickerVisible(false);
    } catch (error) {
      console.log(
        "Could not add recipe to collection:",
        error
      );

      setActionError(
        "We couldn't add this recipe. Please try again."
      );
    } finally {
      addInProgress.current = false;
      setAddingToCollection(false);
    }
  };

  const openCreateModal = () => {
    setActionError("");
    setCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createInProgress.current) return;

    setCreateModal(false);
    setCollectionName("");
    setActionError("");
  };

  const closePicker = () => {
    if (addInProgress.current) return;

    setPickerVisible(false);
    setSelectedRecipe(null);
    setActionError("");
  };

  const initialLoading = loading && !hasLoaded;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            YOUR PERSONAL COLLECTION
          </Text>

          <Text style={styles.title}>
            Saved<Text style={styles.orange}>.</Text>
          </Text>

          <Text style={styles.subtitle}>
            Recipes to come back to, whenever you're hungry.
          </Text>
        </View>

        {/* INITIAL LOADING */}
        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color="#FF7048"
            />

            <Text style={styles.loadingTitle}>
              Opening your recipe box...
            </Text>

            <Text style={styles.loadingText}>
              Gathering your saved recipes and collections.
            </Text>
          </View>
        ) : (
          <>
            {/* REFRESH INDICATOR */}
            {loading && (
              <View style={styles.refreshNotice}>
                <ActivityIndicator
                  size="small"
                  color="#FF7048"
                />

                <Text style={styles.refreshText}>
                  Refreshing your saved recipes...
                </Text>
              </View>
            )}

            {/* LOADING ERROR */}
            {!loading && loadError && (
              <View style={styles.errorState}>
                <Text style={styles.emptyEmoji}>⚠️</Text>

                <Text style={styles.emptyTitle}>
                  Couldn't refresh your recipes
                </Text>

                <Text style={styles.emptyText}>
                  Something went wrong while loading your
                  saved recipes or collections. Check your
                  connection and try again.
                </Text>

                <Pressable
                  style={styles.exploreButton}
                  onPress={retryLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading saved recipes"
                >
                  <Text style={styles.exploreButtonText}>
                    Try again
                  </Text>
                </Pressable>
              </View>
            )}

            {/* COLLECTIONS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Your collections
              </Text>

              <Pressable
                style={styles.newCollectionButton}
                onPress={openCreateModal}
                accessibilityRole="button"
              >
                <Text style={styles.newCollectionText}>
                  + New
                </Text>
              </Pressable>
            </View>

            {collections.length === 0 ? (
              <Pressable
                style={styles.collectionEmpty}
                onPress={openCreateModal}
                accessibilityRole="button"
              >
                <Text style={styles.collectionEmptyIcon}>
                  ▤
                </Text>

                <Text style={styles.collectionEmptyTitle}>
                  Create your first collection
                </Text>

                <Text style={styles.collectionEmptyText}>
                  Organise recipes into folders that suit you.
                </Text>
              </Pressable>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.collectionScroll}
              >
                {collections.map((collection) => {
                  const firstRecipe = savedRecipes.find(
                    (recipe) =>
                      collection.recipeIds.includes(
                        recipe.id
                      )
                  );

                  return (
                    <Pressable
                      key={collection.id}
                      style={styles.collectionCard}
                      onPress={() =>
                        router.push(
                          `/collection/${collection.id}` as any
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${collection.name}`}
                    >
                      {firstRecipe ? (
                        <Image
                          source={{
                            uri: firstRecipe.image,
                          }}
                          style={styles.collectionImage}
                        />
                      ) : (
                        <View
                          style={
                            styles.collectionImagePlaceholder
                          }
                        >
                          <Text
                            style={styles.collectionFolder}
                          >
                            ▤
                          </Text>
                        </View>
                      )}

                      <Text
                        style={styles.collectionName}
                        numberOfLines={1}
                      >
                        {collection.name}
                      </Text>

                      <Text style={styles.collectionCount}>
                        {collection.recipeIds.length}{" "}
                        {collection.recipeIds.length === 1
                          ? "recipe"
                          : "recipes"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* SAVED RECIPES */}
            <View style={styles.countRow}>
              <Text style={styles.sectionTitle}>
                Your recipes
              </Text>

              <Text style={styles.count}>
                {savedRecipes.length} saved
              </Text>
            </View>

            {savedRecipes.length > 0 ? (
              savedRecipes.map((recipe) => (
                <View
                  key={recipe.id}
                  style={styles.recipeCard}
                >
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/recipe/[id]",
                        params: { id: recipe.id },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`View ${recipe.title}`}
                  >
                    <Image
                      source={{ uri: recipe.image }}
                      style={styles.recipeImage}
                    />
                  </Pressable>

                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeCuisine}>
                      {recipe.cuisine.toUpperCase()}
                    </Text>

                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/recipe/[id]",
                          params: { id: recipe.id },
                        })
                      }
                    >
                      <Text style={styles.recipeTitle}>
                        {recipe.title}
                      </Text>
                    </Pressable>

                    <Text style={styles.recipeCreator}>
                      {recipe.creator}
                    </Text>

                    <View style={styles.recipeFooter}>
                      <Text style={styles.time}>
                        {recipe.time}
                      </Text>

                      <Pressable
                        style={styles.addToCollectionButton}
                        onPress={() => {
                          setActionError("");
                          setSelectedRecipe(recipe);
                          setPickerVisible(true);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${recipe.title} to a collection`}
                      >
                        <Text
                          style={styles.addToCollectionText}
                        >
                          + Collection
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            ) : !loading && !loadError ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>
                  ♡
                </Text>

                <Text style={styles.emptyTitle}>
                  No saved recipes yet
                </Text>

                <Text style={styles.emptyText}>
                  Save recipes you love and they'll be
                  waiting here for you.
                </Text>

                <Pressable
                  style={styles.exploreButton}
                  onPress={() =>
                    router.push("/discover")
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.exploreButtonText}>
                    Explore recipes
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.bottomSpace} />
          </>
        )}
      </ScrollView>

      {/* CREATE COLLECTION MODAL */}
      <Modal
        visible={createModal}
        transparent
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              New collection
            </Text>

            <Text style={styles.modalSubtitle}>
              Give your collection a name.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Weeknight dinners"
              placeholderTextColor="#82766C"
              value={collectionName}
              onChangeText={setCollectionName}
              autoFocus
              maxLength={30}
              editable={!creatingCollection}
            />

            {!!actionError && (
              <Text style={styles.actionError}>
                {actionError}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[
                  styles.cancelButton,
                  creatingCollection &&
                    styles.disabledButton,
                ]}
                onPress={closeCreateModal}
                disabled={creatingCollection}
              >
                <Text style={styles.cancelText}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmButton,
                  (!collectionName.trim() ||
                    creatingCollection) &&
                    styles.disabledButton,
                ]}
                onPress={handleCreateCollection}
                disabled={
                  !collectionName.trim() ||
                  creatingCollection
                }
              >
                {creatingCollection ? (
                  <ActivityIndicator
                    size="small"
                    color="#17120F"
                  />
                ) : (
                  <Text style={styles.confirmText}>
                    Create
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD TO COLLECTION MODAL */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Add to collection
            </Text>

            <Text style={styles.modalSubtitle}>
              {selectedRecipe?.title}
            </Text>

            {!!actionError && (
              <Text style={styles.actionError}>
                {actionError}
              </Text>
            )}

            {addingToCollection && (
              <View style={styles.modalLoadingRow}>
                <ActivityIndicator
                  size="small"
                  color="#FF7048"
                />

                <Text style={styles.refreshText}>
                  Adding recipe...
                </Text>
              </View>
            )}

            {collections.length === 0 ? (
              <Text style={styles.noCollections}>
                Create a collection first.
              </Text>
            ) : (
              <ScrollView
                style={styles.collectionPickerScroll}
                keyboardShouldPersistTaps="handled"
              >
                {collections.map((collection) => {
                  const alreadyAdded =
                    selectedRecipe !== null &&
                    collection.recipeIds.includes(
                      selectedRecipe.id
                    );

                  return (
                    <Pressable
                      key={collection.id}
                      style={[
                        styles.collectionOption,
                        (addingToCollection ||
                          alreadyAdded) &&
                          styles.disabledButton,
                      ]}
                      disabled={
                        addingToCollection ||
                        alreadyAdded
                      }
                      onPress={() =>
                        handleAddToCollection(
                          collection.id
                        )
                      }
                    >
                      <Text
                        style={
                          styles.collectionOptionName
                        }
                      >
                        {collection.name}
                      </Text>

                      <Text
                        style={
                          styles.collectionOptionArrow
                        }
                      >
                        {alreadyAdded ? "✓" : "↗"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Pressable
              style={[
                styles.cancelButtonFull,
                addingToCollection &&
                  styles.disabledButton,
              ]}
              onPress={closePicker}
              disabled={addingToCollection}
            >
              <Text style={styles.cancelText}>
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        {[
          { icon: "⌂", label: "Home" },
          { icon: "⌕", label: "Discover" },
          { icon: "+", label: "Create" },
          { icon: "☆", label: "Saved" },
          { icon: "♙", label: "Profile" },
        ].map((item) => (
          <Pressable
            key={item.label}
            style={styles.navItem}
            onPress={() => {
              if (item.label === "Home") {
                router.replace("/");
              } else if (
                item.label === "Discover"
              ) {
                router.replace("/discover");
              } else if (item.label === "Create") {
                router.push("/create");
              } else if (item.label === "Profile") {
                router.replace("/profile");
              } else if (item.label === "Saved") {
                router.replace("/saved");
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
                  item.label === "Saved" &&
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
                  item.label === "Saved" &&
                    styles.activeLabel,
                ]}
              >
                {item.label}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#17120F",
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
  title: {
    color: "#F5EBDD",
    fontSize: 42,
    fontWeight: "bold",
    marginTop: 5,
  },
  orange: {
    color: "#FF7048",
  },
  subtitle: {
    color: "#A99B8D",
    fontSize: 13,
    marginTop: 5,
  },
  sectionHeader: {
    marginHorizontal: 20,
    marginTop: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#F5EBDD",
    fontSize: 21,
    fontWeight: "bold",
  },
  newCollectionButton: {
    backgroundColor: "#FF7048",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newCollectionText: {
    color: "#17120F",
    fontWeight: "bold",
    fontSize: 12,
  },
  collectionScroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 5,
  },
  collectionCard: {
    width: 145,
    marginRight: 12,
    backgroundColor: "#241C17",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#382B22",
    overflow: "hidden",
    paddingBottom: 12,
  },
  collectionImage: {
    width: "100%",
    height: 95,
  },
  collectionImagePlaceholder: {
    height: 95,
    backgroundColor: "#30241B",
    alignItems: "center",
    justifyContent: "center",
  },
  collectionFolder: {
    fontSize: 30,
    color: "#D5A16B",
  },
  collectionName: {
    color: "#F5EBDD",
    fontWeight: "bold",
    fontSize: 13,
    marginTop: 10,
    marginHorizontal: 10,
  },
  collectionCount: {
    color: "#A99B8D",
    fontSize: 10,
    marginTop: 5,
    marginHorizontal: 10,
  },
  collectionEmpty: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 20,
    backgroundColor: "#241C17",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#382B22",
  },
  collectionEmptyIcon: {
    color: "#D5A16B",
    fontSize: 26,
  },
  collectionEmptyTitle: {
    color: "#F5EBDD",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
  },
  collectionEmptyText: {
    color: "#A99B8D",
    fontSize: 11,
    marginTop: 5,
  },
  countRow: {
    marginHorizontal: 20,
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  count: {
    color: "#D5A16B",
    fontSize: 11,
  },
  recipeCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    overflow: "hidden",
  },
  recipeImage: {
    width: "100%",
    height: 180,
  },
  recipeInfo: {
    padding: 15,
  },
  recipeCuisine: {
    color: "#D5A16B",
    fontSize: 9,
    letterSpacing: 2,
  },
  recipeTitle: {
    color: "#F5EBDD",
    fontSize: 19,
    fontWeight: "bold",
    marginTop: 7,
  },
  recipeCreator: {
    color: "#A99B8D",
    fontSize: 11,
    marginTop: 5,
  },
  recipeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
  },
  time: {
    color: "#D5A16B",
    fontSize: 11,
  },
  addToCollectionButton: {
    borderWidth: 1,
    borderColor: "#D5A16B",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  addToCollectionText: {
    color: "#D5A16B",
    fontSize: 10,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 35,
    padding: 28,
    borderRadius: 18,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
  },
  emptyEmoji: {
    color: "#FF7048",
    fontSize: 50,
    marginBottom: 15,
  },
  emptyTitle: {
    color: "#F5EBDD",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  emptyText: {
    color: "#A99B8D",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  exploreButton: {
    backgroundColor: "#FF7048",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  exploreButtonText: {
    color: "#17120F",
    fontSize: 12,
    fontWeight: "bold",
  },
  loadingContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 65,
    gap: 12,
  },
  loadingTitle: {
    color: "#F5EBDD",
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 8,
  },
  loadingText: {
    color: "#A99B8D",
    fontSize: 12,
    textAlign: "center",
  },
  refreshNotice: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#241C17",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  refreshText: {
    color: "#D5A16B",
    fontSize: 11,
  },
  errorState: {
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
    borderRadius: 18,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#704432",
  },
  bottomSpace: {
    height: 20,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  modalCard: {
    backgroundColor: "#241C17",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#382B22",
    padding: 22,
  },
  modalTitle: {
    color: "#F5EBDD",
    fontSize: 20,
    fontWeight: "bold",
  },
  modalSubtitle: {
    color: "#A99B8D",
    fontSize: 12,
    marginTop: 7,
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: "#17120F",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 12,
    color: "#F5EBDD",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#30241B",
    borderRadius: 11,
    padding: 12,
    alignItems: "center",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#FF7048",
    borderRadius: 11,
    padding: 12,
    alignItems: "center",
  },
  cancelText: {
    color: "#F5EBDD",
    fontWeight: "bold",
    fontSize: 12,
  },
  confirmText: {
    color: "#17120F",
    fontWeight: "bold",
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionError: {
    color: "#FF9778",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  modalLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  noCollections: {
    color: "#A99B8D",
    marginVertical: 12,
    fontSize: 12,
  },
  collectionPickerScroll: {
    maxHeight: 260,
  },
  collectionOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#382B22",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  collectionOptionName: {
    color: "#F5EBDD",
    fontSize: 14,
  },
  collectionOptionArrow: {
    color: "#D5A16B",
    fontSize: 16,
  },
  cancelButtonFull: {
    backgroundColor: "#30241B",
    borderRadius: 11,
    padding: 12,
    alignItems: "center",
    marginTop: 18,
  },
});
