import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile } from "./user-profiles";

export type RecipeComment = {
  id: string;
  recipeId: string;
  text: string;
  displayName: string;
  username: string;
  avatar: string;
  createdAt: number;
};

const COMMENTS_KEY = "yum_recipe_comments";

async function getAllComments(): Promise<RecipeComment[]> {
  try {
    const stored = await AsyncStorage.getItem(COMMENTS_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.log("Error loading comments:", error);
    return [];
  }
}

async function saveAllComments(comments: RecipeComment[]): Promise<void> {
  await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
}

export async function getRecipeComments(
  recipeId: string
): Promise<RecipeComment[]> {
  const comments = await getAllComments();

  return comments
    .filter((comment) => comment.recipeId === recipeId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function addRecipeComment(
  recipeId: string,
  text: string,
  profile: UserProfile
): Promise<RecipeComment[]> {
  const comments = await getAllComments();

  const newComment: RecipeComment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    recipeId,
    text: text.trim(),
    displayName: profile.displayName,
    username: profile.username,
    avatar: profile.avatar,
    createdAt: Date.now(),
  };

  const updated = [...comments, newComment];
  await saveAllComments(updated);

  return updated
    .filter((comment) => comment.recipeId === recipeId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteRecipeComment(
  recipeId: string,
  commentId: string
): Promise<RecipeComment[]> {
  const comments = await getAllComments();

  const updated = comments.filter(
    (comment) =>
      !(comment.recipeId === recipeId && comment.id === commentId)
  );

  await saveAllComments(updated);

  return updated
    .filter((comment) => comment.recipeId === recipeId)
    .sort((a, b) => a.createdAt - b.createdAt);
}