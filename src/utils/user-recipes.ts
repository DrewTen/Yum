
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Recipe, recipes } from "../data/recipes";
import { getApiRecipesByLetter } from "../services/recipe-api";
import { supabase } from "../services/supabase";

const API_RECIPES_KEY = "yum_api_recipes_cache";
const API_CACHE_TIME_KEY = "yum_api_recipes_cache_time";
const SEARCH_RECIPES_KEY = "yum_api_search_recipes";

const CACHE_DURATION = 6 * 60 * 60 * 1000;
const API_LETTERS = ["b", "c", "p"];

let pendingApiRequest: Promise<Recipe[]> | null = null;

type CachedRecipes = {
  recipes: Recipe[];
  timestamp: number;
};

type RecipeRow = {
  id: string;
  user_id: string;
  title: string;
  creator: string;
  description: string;
  cuisine: string;
  cooking_time: string;
  servings: number;
  image_url: string;
  ingredients: Recipe["ingredients"];
  instructions: Recipe["instructions"];
};

const RECIPE_COLUMNS =
  "id, user_id, title, creator, description, cuisine, cooking_time, servings, image_url, ingredients, instructions";

function uniqueRecipes(items: Recipe[]): Recipe[] {
  return Array.from(
    new Map(
      items.map((recipe) => [recipe.id, recipe])
    ).values()
  );
}

function fixApiRecipeDescription(recipe: Recipe): Recipe {
  if (!recipe.id.startsWith("mealdb-")) {
    return recipe;
  }

  const oldDescription = recipe.description.match(
    /^(.+?) recipe from (.+)\.$/i
  );

  if (!oldDescription) return recipe;

  const category = oldDescription[1].toLowerCase();
  const cuisine = oldDescription[2];

  return {
    ...recipe,
    description: `${cuisine} ${category} recipe.`,
  };
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    creator: row.creator,
    description: row.description,
    cuisine: row.cuisine,
    time: row.cooking_time,
    servings: row.servings,
    image: row.image_url,
    ingredients: row.ingredients,
    instructions: row.instructions,
  };
}

// Public published recipes, for Discover and other public screens.
export async function getUserRecipes(): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase
      .from("recipes")
      .select(RECIPE_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ((data ?? []) as RecipeRow[]).map(rowToRecipe);
  } catch (error) {
    console.log(
      "Error loading published recipes:",
      error
    );
    return [];
  }
}

// Only recipes published by the signed-in account.
export async function getMyRecipes(): Promise<Recipe[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return [];

  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as RecipeRow[]).map(rowToRecipe);
}

// Fetch a recipe only when it belongs to the current user.
export async function getOwnedRecipe(
  id: string
): Promise<Recipe | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return null;

  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  return data ? rowToRecipe(data as RecipeRow) : null;
}

// Update an existing recipe without changing its owner.
export async function updateUserRecipe(
  recipe: Recipe
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error(
      "You must be logged in to edit recipes."
    );
  }

  const { data, error } = await supabase
    .from("recipes")
    .update({
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      cooking_time: recipe.time,
      servings: recipe.servings,
      image_url: recipe.image,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
    })
    .eq("id", recipe.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Recipe not found or you do not have permission to edit it."
    );
  }
}

// Delete a recipe belonging to the current account.
export async function deleteUserRecipe(
  id: string
): Promise<{ photoCleanupFailed: boolean }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error(
      "You must be logged in to delete recipes."
    );
  }

  const { data: owned, error: lookupError } =
    await supabase
      .from("recipes")
      .select("id, image_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

  if (lookupError) throw lookupError;

  if (!owned) {
    throw new Error(
      "Recipe not found or you do not have permission to delete it."
    );
  }

  const { data: deleted, error: deleteError } =
    await supabase
      .from("recipes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

  if (deleteError) throw deleteError;

  if (!deleted) {
    throw new Error(
      "The recipe could not be deleted."
    );
  }

  // Remove only an image in this user's storage folder.
  const { data: publicBucket } = supabase.storage
    .from("recipe-images")
    .getPublicUrl("");

  const bucketPrefix =
    publicBucket.publicUrl.split("/recipe-images/")[0] +
    "/recipe-images/";

  const imageUrl: string = owned.image_url || "";

  let path = "";

  if (imageUrl.startsWith(bucketPrefix)) {
    try {
      path = decodeURIComponent(
        imageUrl
          .slice(bucketPrefix.length)
          .split("?")[0]
      );
    } catch (error) {
      console.log(
        "Could not decode recipe image path:",
        error
      );
    }
  }

  if (
    path &&
    path.startsWith(`${user.id}/`) &&
    !path.includes("..")
  ) {
    const { error: storageError } =
      await supabase.storage
        .from("recipe-images")
        .remove([path]);

    if (storageError) {
      console.log(
        "Recipe deleted but image cleanup failed:",
        storageError
      );

      return { photoCleanupFailed: true };
    }
  }

  return { photoCleanupFailed: false };
}

async function getCachedApiRecipes(): Promise<CachedRecipes> {
  try {
    const [storedRecipes, storedTime] =
      await Promise.all([
        AsyncStorage.getItem(API_RECIPES_KEY),
        AsyncStorage.getItem(API_CACHE_TIME_KEY),
      ]);

    const parsed: unknown = storedRecipes
      ? JSON.parse(storedRecipes)
      : [];

    const cachedRecipes = Array.isArray(parsed)
      ? (parsed as Recipe[]).map(
          fixApiRecipeDescription
        )
      : [];

    const timestamp = storedTime
      ? Number(storedTime)
      : 0;

    return {
      recipes: cachedRecipes,
      timestamp: Number.isFinite(timestamp)
        ? timestamp
        : 0,
    };
  } catch (error) {
    console.log("Error reading API cache:", error);

    return {
      recipes: [],
      timestamp: 0,
    };
  }
}

export async function getSearchRecipes(): Promise<Recipe[]> {
  try {
    const stored = await AsyncStorage.getItem(
      SEARCH_RECIPES_KEY
    );

    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    return Array.isArray(parsed)
      ? (parsed as Recipe[]).map(
          fixApiRecipeDescription
        )
      : [];
  } catch (error) {
    console.log("Error reading search recipes:", error);
    return [];
  }
}

export async function rememberSearchRecipes(
  newRecipes: Recipe[]
): Promise<void> {
  if (newRecipes.length === 0) return;

  const existingRecipes = await getSearchRecipes();

  const combined = uniqueRecipes([
    ...newRecipes.map(fixApiRecipeDescription),
    ...existingRecipes,
  ]);

  await AsyncStorage.setItem(
    SEARCH_RECIPES_KEY,
    JSON.stringify(combined.slice(0, 100))
  );
}

async function downloadApiRecipes(): Promise<Recipe[]> {
  const results = await Promise.allSettled(
    API_LETTERS.map((letter) =>
      getApiRecipesByLetter(letter)
    )
  );

  const downloadedRecipes: Recipe[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      downloadedRecipes.push(...result.value);
    } else {
      console.log(
        "One recipe API request failed:",
        result.reason
      );
    }
  }

  const unique = uniqueRecipes(
    downloadedRecipes.map(fixApiRecipeDescription)
  );

  if (unique.length === 0) {
    throw new Error(
      "No recipes could be downloaded from the API."
    );
  }

  return unique;
}

export async function getApiRecipes(): Promise<Recipe[]> {
  const cached = await getCachedApiRecipes();

  const cacheIsFresh =
    cached.recipes.length > 0 &&
    Date.now() - cached.timestamp < CACHE_DURATION;

  if (cacheIsFresh) return cached.recipes;
  if (pendingApiRequest) return pendingApiRequest;

  pendingApiRequest = (async () => {
    try {
      console.log(
        "Yum: downloading API recipes..."
      );

      const apiRecipes =
        await downloadApiRecipes();

      try {
        await Promise.all([
          AsyncStorage.setItem(
            API_RECIPES_KEY,
            JSON.stringify(apiRecipes)
          ),
          AsyncStorage.setItem(
            API_CACHE_TIME_KEY,
            Date.now().toString()
          ),
        ]);
      } catch (cacheError) {
        console.log(
          "Could not cache API recipes:",
          cacheError
        );
      }

      console.log(
        `Yum: loaded ${apiRecipes.length} API recipes.`
      );

      return apiRecipes;
    } catch (error) {
      console.log(
        "Yum: API unavailable, using cached recipes.",
        error
      );

      return cached.recipes;
    }
  })();

  try {
    return await pendingApiRequest;
  } finally {
    pendingApiRequest = null;
  }
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const [
    userRecipes,
    apiRecipes,
    searchRecipes,
  ] = await Promise.all([
    getUserRecipes(),
    getApiRecipes(),
    getSearchRecipes(),
  ]);

  return uniqueRecipes([
    ...userRecipes,
    ...recipes,
    ...apiRecipes,
    ...searchRecipes,
  ]).map(fixApiRecipeDescription);
}

export async function addUserRecipe(
  recipe: Recipe
): Promise<void> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      throw new Error(
        "You must be logged in to publish recipes."
      );
    }

    const { error } = await supabase
      .from("recipes")
      .insert({
        id: recipe.id,
        user_id: user.id,
        title: recipe.title,
        creator: recipe.creator,
        description: recipe.description,
        cuisine: recipe.cuisine,
        cooking_time: recipe.time,
        servings: recipe.servings,
        image_url: recipe.image,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
      });

    if (error) throw error;
  } catch (error) {
    console.log(
      "Error publishing recipe:",
      error
    );
    throw error;
  }
}
