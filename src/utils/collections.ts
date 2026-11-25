
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";
import { getAllRecipes } from "./user-recipes";

export type RecipeCollection = {
  id: string;
  name: string;
  recipeIds: string[];
  createdAt: string;
};

const COLLECTIONS_KEY = "yum_collections";

async function getAccountKey(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  if (!user) {
    throw new Error(
      "Please log in to manage collections."
    );
  }

  return `${COLLECTIONS_KEY}_${user.id}`;
}

async function readCollections(): Promise<RecipeCollection[]> {
  const key = await getAccountKey();
  const stored = await AsyncStorage.getItem(key);

  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (item): item is RecipeCollection =>
      item !== null &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      Array.isArray(item.recipeIds) &&
      typeof item.createdAt === "string"
  );
}

async function saveCollections(
  collections: RecipeCollection[]
): Promise<void> {
  const key = await getAccountKey();

  await AsyncStorage.setItem(
    key,
    JSON.stringify(collections)
  );
}

export async function getCollections(): Promise<RecipeCollection[]> {
  try {
    const collections = await readCollections();

    if (collections.length === 0) return [];

    const allRecipes = await getAllRecipes();

    const availableIds = new Set(
      allRecipes.map((recipe) => recipe.id)
    );

    // Filter unavailable recipes for display.
    // Do not permanently erase them here: an API
    // or network failure could make a recipe
    // temporarily unavailable.
    return collections.map((collection) => ({
      ...collection,
      recipeIds: collection.recipeIds.filter((id) =>
        availableIds.has(id)
      ),
    }));
  } catch (error) {
    console.log("Error loading collections:", error);

    // Do not return stale counts if validation fails.
    return [];
  }
}

export async function createCollection(
  name: string
): Promise<RecipeCollection> {
  const collections = await readCollections();

  const newCollection: RecipeCollection = {
    id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    name: name.trim(),
    recipeIds: [],
    createdAt: new Date().toISOString(),
  };

  await saveCollections([
    newCollection,
    ...collections,
  ]);

  return newCollection;
}

export async function deleteCollection(
  id: string
): Promise<void> {
  const collections = await readCollections();

  await saveCollections(
    collections.filter(
      (collection) => collection.id !== id
    )
  );
}

export async function addRecipeToCollection(
  collectionId: string,
  recipeId: string
): Promise<void> {
  const collections = await readCollections();

  const updated = collections.map((collection) =>
    collection.id === collectionId
      ? {
          ...collection,
          recipeIds: collection.recipeIds.includes(recipeId)
            ? collection.recipeIds
            : [...collection.recipeIds, recipeId],
        }
      : collection
  );

  await saveCollections(updated);
}

export async function removeRecipeFromCollection(
  collectionId: string,
  recipeId: string
): Promise<void> {
  const collections = await readCollections();

  const updated = collections.map((collection) =>
    collection.id === collectionId
      ? {
          ...collection,
          recipeIds: collection.recipeIds.filter(
            (id) => id !== recipeId
          ),
        }
      : collection
  );

  await saveCollections(updated);
}

// Explicitly remove a recipe from every collection
// belonging to the signed-in account.
export async function removeRecipeFromAllCollections(
  recipeId: string
): Promise<void> {
  const collections = await readCollections();

  const updated = collections.map((collection) => ({
    ...collection,
    recipeIds: collection.recipeIds.filter(
      (id) => id !== recipeId
    ),
  }));

  await saveCollections(updated);
}
