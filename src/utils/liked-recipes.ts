
import { supabase } from "../services/supabase";
import { getAllRecipes } from "./user-recipes";

const listeners = new Set<(ids: string[]) => void>();

export async function getLikedRecipes(): Promise<string[]> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return [];

    const { data, error } = await supabase
      .from("liked_recipes")
      .select("recipe_id")
      .eq("user_id", user.id);

    if (error) throw error;

    const likedIds = (data ?? []).map(
      (row) => row.recipe_id as string
    );

    if (likedIds.length === 0) return [];

    const allRecipes = await getAllRecipes();
    const availableIds = new Set(
      allRecipes.map((recipe) => recipe.id)
    );

    const validIds = likedIds.filter((id) =>
      availableIds.has(id)
    );

    return validIds;
  } catch (error) {
    console.log("Error loading liked recipes:", error);
    return [];
  }
}

export function subscribeToLikedRecipes(
  callback: (ids: string[]) => void
) {
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners(ids: string[]) {
  listeners.forEach((callback) => callback(ids));
}

export async function toggleLikedRecipe(
  id: string
): Promise<string[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error("Please log in to like recipes.");
  }

  const current = await getLikedRecipes();
  const alreadyLiked = current.includes(id);

  if (alreadyLiked) {
    const { error } = await supabase
      .from("liked_recipes")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("liked_recipes")
      .insert({
        user_id: user.id,
        recipe_id: id,
      });

    if (error) throw error;
  }

  const updated = alreadyLiked
    ? current.filter((recipeId) => recipeId !== id)
    : [...current, id];

  notifyListeners(updated);

  return updated;
}
