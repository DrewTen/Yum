import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";

const FOLLOWING_KEY = "yum_following";

const normalizeName = (name: string) =>
  name.trim().toLowerCase();

async function getFollowingKey(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.user) {
    return null;
  }

  return `${FOLLOWING_KEY}_${data.session.user.id}`;
}

async function readFollowing(key: string): Promise<string[]> {
  const stored = await AsyncStorage.getItem(key);
  const parsed = stored ? JSON.parse(stored) : [];

  if (!Array.isArray(parsed)) return [];

  const unique = new Map<string, string>();

  parsed.forEach((name) => {
    if (typeof name === "string" && name.trim()) {
      const key = normalizeName(name);

      if (!unique.has(key)) {
        unique.set(key, name.trim());
      }
    }
  });

  return Array.from(unique.values());
}

export async function getFollowing(): Promise<string[]> {
  try {
    const key = await getFollowingKey();

    if (!key) return [];

    return await readFollowing(key);
  } catch (error) {
    console.log("Error loading following list:", error);
    return [];
  }
}

export async function isFollowing(
  creator: string
): Promise<boolean> {
  const following = await getFollowing();

  return following.some(
    (name) => normalizeName(name) === normalizeName(creator)
  );
}

export async function toggleFollow(
  creator: string
): Promise<string[]> {
  const key = await getFollowingKey();

  if (!key) return [];

  const cleanedName = creator.trim();
  const current = await readFollowing(key);

  if (!cleanedName) return current;

  const alreadyFollowing = current.some(
    (name) => normalizeName(name) === normalizeName(cleanedName)
  );

  const updated = alreadyFollowing
    ? current.filter(
        (name) => normalizeName(name) !== normalizeName(cleanedName)
      )
    : [...current, cleanedName];

  await AsyncStorage.setItem(key, JSON.stringify(updated));

  return updated;
}