
import { supabase } from "../services/supabase";
import { getAllRecipes } from "./user-recipes";

const listeners = new Set<(ids: string[]) => void>();

export async function getSavedRecipes(): Promise<string[]> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return [];

    const { data, error } = await supabase
      .from("saved_recipes")
      .select("recipe_id")
      .eq("user_id", user.id);

    if (error) throw error;

    const savedIds = (data ?? []).map(
      (row) => row.recipe_id as string
    );

    if (savedIds.length === 0) return [];

    const allRecipes = await getAllRecipes();
    const availableIds = new Set(
      allRecipes.map((recipe) => recipe.id)
    );

    const validIds = savedIds.filter((id) =>
      availableIds.has(id)
    );

  
    return validIds;
  } catch (error) {
    console.log("Error loading saved recipes:", error);
    return [];
  }
}

export function subscribeToSavedRecipes(
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

export async function toggleSavedRecipe(
  id: string
): Promise<string[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error("Please log in to save recipes.");
  }

  const current = await getSavedRecipes();
  const alreadySaved = current.includes(id);

  if (alreadySaved) {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("saved_recipes")
      .insert({
        user_id: user.id,
        recipe_id: id,
      });

    if (error) throw error;
  }

  const updated = alreadySaved
    ? current.filter((recipeId) => recipeId !== id)
    : [...current, id];

  notifyListeners(updated);

  return updated;
}
