
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";

export type UserProfile = {
  displayName: string;
  username: string;
  bio: string;
  avatar: string;
};

const DEFAULT_PROFILE: UserProfile = {
  displayName: "Your Name",
  username: "yumuser",
  bio: "Cooking my way through life, one recipe at a time. 🍜",
  avatar: "🍳",
};

// Profile pictures remain local until we add Supabase Storage.
const avatarKey = (userId: string) => `yum_avatar_${userId}`;

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      return { ...DEFAULT_PROFILE };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("username, display_name, bio, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    // Recover a missing profile row if necessary.
    if (!data) {
      const newProfile = {
        id: user.id,
        username: `user_${user.id.slice(0, 8)}`,
        display_name:
          user.email?.split("@")[0] || "Yum user",
        bio: "",
      };

      const { error: insertError } = await supabase
        .from("profiles")
        .insert(newProfile);

      if (insertError) throw insertError;

      return {
        displayName: newProfile.display_name,
        username: newProfile.username,
        bio: newProfile.bio,
        avatar: "🍳",
      };
    }

    const localAvatar = await AsyncStorage.getItem(
      avatarKey(user.id)
    );

    return {
      displayName: data.display_name || DEFAULT_PROFILE.displayName,
      username: data.username || DEFAULT_PROFILE.username,
      bio: data.bio || "",
      avatar: localAvatar || data.avatar_url || "🍳",
    };
  } catch (error) {
    console.log("Error loading Supabase profile:", error);
    throw error;
  }
}

export async function saveUserProfile(
  profile: UserProfile
): Promise<void> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      throw new Error("You must be logged in to edit your profile.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.displayName,
        username: profile.username,
        bio: profile.bio,
      })
      .eq("id", user.id)
      .select("id")
      .single();

    if (error) throw error;

    // Keep avatar photos on this device for now.
    await AsyncStorage.setItem(
      avatarKey(user.id),
      profile.avatar
    );
  } catch (error) {
    console.log("Error saving Supabase profile:", error);
    throw error;
  }
}
