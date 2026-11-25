
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type { Recipe } from "../../data/recipes";
import {
    deleteCollection,
    getCollections,
    removeRecipeFromCollection,
    type RecipeCollection,
} from "../../utils/collections";
import { getAllRecipes } from "../../utils/user-recipes";

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [collection, setCollection] = useState<RecipeCollection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const loadCollection = useCallback(async () => {
    const allCollections = await getCollections();
    const found = allCollections.find((c) => c.id === id);

    setCollection(found || null);

    if (found) {
      const allRecipes = await getAllRecipes();
      setRecipes(allRecipes.filter((recipe) => found.recipeIds.includes(recipe.id)));
    } else {
      setRecipes([]);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadCollection();
    }, [loadCollection])
  );

  const handleRemoveRecipe = (recipeId: string) => {
    if (!collection) return;

    Alert.alert(
      "Remove recipe",
      "Remove this recipe from this collection?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeRecipeFromCollection(collection.id, recipeId);
            await loadCollection();
          },
        },
      ]
    );
  };

  const handleDeleteCollection = () => {
    if (!collection) return;

    Alert.alert(
      "Delete collection",
      `Delete "${collection.name}"? Your saved recipes won't be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCollection(collection.id);
            router.back();
          },
        },
      ]
    );
  };

  if (!collection) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.notFound}>Collection not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Saved</Text>
          </Pressable>

          <Text style={styles.eyebrow}>YOUR RECIPE FOLDER</Text>
          <Text style={styles.title}>
            {collection.name}<Text style={styles.orange}>.</Text>
          </Text>
          <Text style={styles.subtitle}>
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} in this collection
          </Text>
        </View>

        {recipes.length > 0 ? (
          recipes.map((recipe) => (
            <View key={recipe.id} style={styles.recipeCard}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/recipe/[id]",
                    params: { id: recipe.id },
                  })
                }
              >
                <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
              </Pressable>

              <View style={styles.recipeInfo}>
                <Text style={styles.recipeCuisine}>{recipe.cuisine.toUpperCase()}</Text>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/recipe/[id]",
                      params: { id: recipe.id },
                    })
                  }
                >
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                </Pressable>

                <Text style={styles.recipeCreator}>{recipe.creator}</Text>

                <View style={styles.recipeFooter}>
                  <Text style={styles.time}>{recipe.time}</Text>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => handleRemoveRecipe(recipe.id)}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>▤</Text>
            <Text style={styles.emptyTitle}>Nothing here just yet</Text>
            <Text style={styles.emptyText}>
              Go to Saved and add recipes to this collection.
            </Text>
            <Pressable
              style={styles.exploreButton}
              onPress={() => router.replace("/saved")}
            >
              <Text style={styles.exploreButtonText}>Go to Saved recipes</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.deleteCollectionButton} onPress={handleDeleteCollection}>
          <Text style={styles.deleteCollectionText}>Delete collection</Text>
        </Pressable>

        <View style={{ height: 35 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#17120F" },
  header: { paddingTop: 65, paddingHorizontal: 22, paddingBottom: 10 },
  backButton: { marginBottom: 28 },
  backText: { color: "#D5A16B", fontSize: 13 },
  eyebrow: {
    color: "#D5A16B",
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "700",
  },
  title: { color: "#F5EBDD", fontSize: 35, fontWeight: "bold", marginTop: 8 },
  orange: { color: "#FF7048" },
  subtitle: { color: "#A99B8D", fontSize: 13, marginTop: 8 },
  recipeCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    overflow: "hidden",
  },
  recipeImage: { width: "100%", height: 180 },
  recipeInfo: { padding: 15 },
  recipeCuisine: { color: "#D5A16B", fontSize: 9, letterSpacing: 2 },
  recipeTitle: { color: "#F5EBDD", fontSize: 19, fontWeight: "bold", marginTop: 7 },
  recipeCreator: { color: "#A99B8D", fontSize: 11, marginTop: 5 },
  recipeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
  },
  time: { color: "#D5A16B", fontSize: 11 },
  removeButton: {
    borderWidth: 1,
    borderColor: "#6B4535",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeText: { color: "#C58C72", fontSize: 10, fontWeight: "bold" },
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
  emptyIcon: { color: "#D5A16B", fontSize: 40, marginBottom: 15 },
  emptyTitle: { color: "#F5EBDD", fontSize: 18, fontWeight: "bold" },
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
  exploreButtonText: { color: "#17120F", fontSize: 12, fontWeight: "bold" },
  deleteCollectionButton: {
    marginHorizontal: 20,
    marginTop: 28,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6B4535",
    alignItems: "center",
  },
  deleteCollectionText: { color: "#C58C72", fontSize: 12, fontWeight: "bold" },
  notFound: { color: "#F5EBDD", fontSize: 18, margin: 30 },
});
