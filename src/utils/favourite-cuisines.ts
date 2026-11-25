
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";

const FAVOURITE_CUISINES_KEY = "yum_favourite_cuisines";

export const cuisineOptions = [
  "Korean",
  "Japanese",
  "Italian",
  "Mexican",
  "Thai",
  "Chinese",
  "Indian",
  "Mediterranean",
  "American",
  "French",
  "Vietnamese",
  "Greek",
] as const;

// Every account gets a separate storage key.
async function getAccountKey(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  if (!user) {
    throw new Error(
      "You must be logged in to manage favourite cuisines."
    );
  }

  return `${FAVOURITE_CUISINES_KEY}_${user.id}`;
}

export async function getFavouriteCuisines(): Promise<string[]> {
  try {
    const key = await getAccountKey();
    const stored = await AsyncStorage.getItem(key);

    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string =>
            typeof item === "string"
        )
      : [];
  } catch (error) {
    console.log("Error loading favourite cuisines:", error);
    return [];
  }
}

export async function saveFavouriteCuisines(
  cuisines: string[]
): Promise<void> {
  const key = await getAccountKey();

  await AsyncStorage.setItem(
    key,
    JSON.stringify(cuisines)
  );
}
