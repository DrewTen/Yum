import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Recipe } from "../data/recipes";
import { supabase } from "../services/supabase";
import { addUserRecipe } from "../utils/user-recipes";

const DEFAULT_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1000&q=90";

type Ingredient = Recipe["ingredients"][number];

// Convert quantities such as 2, 0.5, 1/2 and 1 1/2 into numbers.
function parseAmount(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const decimal = Number(trimmed);

  if (Number.isFinite(decimal) && decimal > 0) {
    return decimal;
  }

  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);

  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    if (denominator > 0) {
      return numerator / denominator;
    }
  }

  const mixedMatch = trimmed.match(
    /^(\d+)\s+(\d+)\/(\d+)$/
  );

  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const numerator = Number(mixedMatch[2]);
    const denominator = Number(mixedMatch[3]);

    if (denominator > 0) {
      return whole + numerator / denominator;
    }
  }

  return null;
}

const INGREDIENT_UNITS = new Set([
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "mg",
  "ml",
  "l",
  "litre",
  "litres",
  "liter",
  "liters",
  "tsp",
  "teaspoon",
  "teaspoons",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "cup",
  "cups",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "pinch",
  "pinches",
  "clove",
  "cloves",
  "slice",
  "slices",
  "piece",
  "pieces",
  "handful",
  "handfuls",
  "bunch",
  "bunches",
  "can",
  "cans",
  "tin",
  "tins",
  "packet",
  "packets",
  "pack",
  "packs",
]);

// Recognise units attached directly to quantities, e.g. 200g.
const ATTACHED_UNITS = [...INGREDIENT_UNITS].sort(
  (a, b) => b.length - a.length
);

function parseIngredient(value: string): Ingredient {
  const trimmed = value.trim();

  let amount = 1;
  let remaining = trimmed;
  let unit = "";

  // Recognise numbers, fractions and mixed numbers at the start.
  const quantityMatch = trimmed.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/
  );

  if (quantityMatch) {
    const parsedAmount = parseAmount(quantityMatch[1]);

    if (parsedAmount !== null) {
      amount = parsedAmount;
      remaining = trimmed
        .slice(quantityMatch[0].length)
        .trim();
    }
  }

  // Detect a unit even when there is no space after the quantity.
  // Examples: 200g, 500ml, 2tbsp.
  const lowerRemaining = remaining.toLowerCase();

  for (const possibleUnit of ATTACHED_UNITS) {
    if (!lowerRemaining.startsWith(possibleUnit)) {
      continue;
    }

    const afterUnit = remaining.slice(possibleUnit.length);

    // A unit must be followed by whitespace, punctuation,
    // or the end of the text to avoid matching part of a word.
    if (
      afterUnit.length === 0 ||
      /^[\s.,]/.test(afterUnit)
    ) {
      unit = remaining.slice(0, possibleUnit.length);
      remaining = afterUnit.trim();
      break;
    }
  }

  // Remove unnecessary "of" after the unit.
  // Example: 200g of flour -> flour.
  if (unit && /^of\s+/i.test(remaining)) {
    remaining = remaining.replace(/^of\s+/i, "").trim();
  }

  return {
    amount,
    unit,
    name: remaining || trimmed,
  };
}

export default function CreateScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [time, setTime] = useState("");
  const [servings, setServings] = useState("2");
  const [image, setImage] = useState("");

  const [ingredients, setIngredients] = useState<string[]>([
    "",
  ]);

  const [instructions, setInstructions] = useState<string[]>([
    "",
  ]);

  const [publishing, setPublishing] = useState(false);
  const [publishStage, setPublishStage] = useState("");

  const publishingRef = useRef(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCuisine("");
    setTime("");
    setServings("2");
    setImage("");
    setIngredients([""]);
    setInstructions([""]);
  };

  const pickImage = async () => {
    if (publishingRef.current) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow Yum to access your photos."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

      if (!result.canceled && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Image picker error:", error);

      Alert.alert(
        "Oops",
        "Couldn't select your photo. Please try again."
      );
    }
  };

  const uploadRecipeImage = async (
    imageUri: string,
    userId: string
  ): Promise<{ url: string; path: string }> => {
    const file = new File(imageUri);
    const imageData = await file.arrayBuffer();

    const extension = imageUri
      .split("?")[0]
      .split(".")
      .pop()
      ?.toLowerCase();

    const supportedExtension =
      extension === "png" ||
      extension === "webp" ||
      extension === "heic" ||
      extension === "heif"
        ? extension
        : "jpg";

    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
      heif: "image/heif",
    };

    const fileName =
      `recipe-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${supportedExtension}`;

    const filePath = `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from("recipe-images")
      .upload(filePath, imageData, {
        contentType: contentTypes[supportedExtension],
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      path: filePath,
    };
  };

  const addIngredient = () => {
    if (publishingRef.current) return;

    setIngredients((current) => [...current, ""]);
  };

  const removeIngredient = (index: number) => {
    if (publishingRef.current) return;

    setIngredients((current) => {
      const updated = current.filter(
        (_, itemIndex) => itemIndex !== index
      );

      return updated.length > 0 ? updated : [""];
    });
  };

  const updateIngredient = (
    index: number,
    value: string
  ) => {
    setIngredients((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? value : item
      )
    );
  };

  const addInstruction = () => {
    if (publishingRef.current) return;

    setInstructions((current) => [...current, ""]);
  };

  const removeInstruction = (index: number) => {
    if (publishingRef.current) return;

    setInstructions((current) => {
      const updated = current.filter(
        (_, itemIndex) => itemIndex !== index
      );

      return updated.length > 0 ? updated : [""];
    });
  };

  const updateInstruction = (
    index: number,
    value: string
  ) => {
    setInstructions((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? value : item
      )
    );
  };

  const publishRecipe = async () => {
    if (publishingRef.current) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedCuisine = cuisine.trim();

    const ingredientList = ingredients
      .map((item) => item.trim())
      .filter(Boolean);

    const instructionList = instructions
      .map((item) => item.trim())
      .filter(Boolean);

    if (!trimmedTitle) {
      Alert.alert(
        "Missing title",
        "Give your recipe a name first."
      );
      return;
    }

    if (!trimmedDescription) {
      Alert.alert(
        "Missing description",
        "Add a description of your recipe."
      );
      return;
    }

    if (!trimmedCuisine) {
      Alert.alert(
        "Missing cuisine",
        "Enter the cuisine type."
      );
      return;
    }

    const minutes = Number(time.trim());

    if (
      !time.trim() ||
      !Number.isInteger(minutes) ||
      minutes <= 0
    ) {
      Alert.alert(
        "Invalid cooking time",
        "Enter a positive whole number of minutes."
      );
      return;
    }

    const servingCount = Number(servings.trim());

    if (
      !servings.trim() ||
      !Number.isInteger(servingCount) ||
      servingCount <= 0
    ) {
      Alert.alert(
        "Invalid servings",
        "Enter a positive whole number of servings."
      );
      return;
    }

    if (ingredientList.length === 0) {
      Alert.alert(
        "Missing ingredients",
        "Add at least one ingredient."
      );
      return;
    }

    if (instructionList.length === 0) {
      Alert.alert(
        "Missing instructions",
        "Add at least one cooking step."
      );
      return;
    }

    const parsedIngredients =
      ingredientList.map(parseIngredient);

    publishingRef.current = true;
    setPublishing(true);
    setPublishStage("Checking your account...");

    let uploadedImagePath: string | null = null;

    let currentStage:
      | "authentication"
      | "profile"
      | "image"
      | "database" = "authentication";

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        Alert.alert(
          "Login required",
          "Please log in to publish a recipe."
        );
        return;
      }

      currentStage = "profile";
      setPublishStage("Preparing your recipe...");

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

      if (profileError) throw profileError;

      const username =
        profile?.username ||
        `user_${user.id.slice(0, 8)}`;

      let publicImage = DEFAULT_RECIPE_IMAGE;

      if (image) {
        if (
          image.startsWith("https://") ||
          image.startsWith("http://")
        ) {
          publicImage = image;
        } else {
          currentStage = "image";
          setPublishStage("Uploading your photo...");

          const uploaded = await uploadRecipeImage(
            image,
            user.id
          );

          publicImage = uploaded.url;
          uploadedImagePath = uploaded.path;
        }
      }

      currentStage = "database";
      setPublishStage("Publishing your recipe...");

      const newRecipe: Recipe = {
        id: `user-${user.id}-${Date.now()}`,
        title: trimmedTitle,
        creator: `@${username.replace(/^@/, "")}`,
        time: `${minutes} min`,
        cuisine: trimmedCuisine,
        image: publicImage,
        description: trimmedDescription,
        servings: servingCount,
        ingredients: parsedIngredients,
        instructions: instructionList,
      };

      await addUserRecipe(newRecipe);

      resetForm();

      Alert.alert(
        "Recipe published! 🍽️",
        "Your recipe is now available on Yum.",
        [
          {
            text: "View recipe",
            onPress: () =>
              router.push({
                pathname: "/recipe/[id]",
                params: { id: newRecipe.id },
              }),
          },
          {
            text: "Discover",
            onPress: () =>
              router.replace("/discover"),
          },
        ]
      );
    } catch (error) {
      console.log(
        "SUPABASE RECIPE PUBLISH ERROR:",
        error
      );

      if (uploadedImagePath) {
        try {
          const { error: cleanupError } =
            await supabase.storage
              .from("recipe-images")
              .remove([uploadedImagePath]);

          if (cleanupError) {
            console.log(
              "Could not clean up uploaded image:",
              cleanupError
            );
          }
        } catch (cleanupError) {
          console.log(
            "Image cleanup failed:",
            cleanupError
          );
        }
      }

      if (currentStage === "image") {
        Alert.alert(
          "Photo upload failed",
          "Your photo couldn't be uploaded. Check your connection and try again. Your recipe details have been kept."
        );
      } else if (currentStage === "database") {
        Alert.alert(
          "Couldn't publish recipe",
          "Your recipe couldn't be saved to Yum. Please try again. Your recipe details have been kept."
        );
      } else {
        Alert.alert(
          "Something went wrong",
          "We couldn't prepare your recipe for publishing. Please try again."
        );
      }
    } finally {
      publishingRef.current = false;
      setPublishing(false);
      setPublishStage("");
    }
  };

   return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            SHARE SOMETHING DELICIOUS
          </Text>

          <Text style={styles.title}>
            Create<Text style={styles.orange}>.</Text>
          </Text>

          <Text style={styles.subtitle}>
            Your kitchen. Your recipe. Your story.
          </Text>
        </View>

        {/* Recipe photo */}
        <Pressable
          style={styles.photoBox}
          onPress={pickImage}
          disabled={publishing}
        >
          {image ? (
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: image }}
                style={styles.photo}
              />

              <View style={styles.changePhotoBadge}>
                <Text style={styles.changePhotoText}>
                  ✎ Change photo
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>＋</Text>

              <Text style={styles.photoTitle}>
                Add food photo
              </Text>

              <Text style={styles.photoSubtitle}>
                Tap to choose from your gallery
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.form}>
          {/* Recipe name */}
          <Text style={styles.label}>RECIPE NAME</Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Creamy garlic pasta"
            placeholderTextColor="#85776B"
            editable={!publishing}
            maxLength={120}
          />

          {/* Description */}
          <Text style={styles.label}>DESCRIPTION</Text>

          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell us what makes it special..."
            placeholderTextColor="#85776B"
            multiline
            editable={!publishing}
          />

          {/* Cuisine */}
          <Text style={styles.label}>CUISINE</Text>

          <TextInput
            style={styles.input}
            value={cuisine}
            onChangeText={setCuisine}
            placeholder="e.g. Italian, Korean, Mexican"
            placeholderTextColor="#85776B"
            editable={!publishing}
          />

          {/* Cooking time and servings */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>
                TIME (MINUTES)
              </Text>

              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor="#85776B"
                editable={!publishing}
              />
            </View>

            <View style={styles.half}>
              <Text style={styles.label}>
                SERVINGS
              </Text>

              <TextInput
                style={styles.input}
                value={servings}
                onChangeText={setServings}
                keyboardType="number-pad"
                placeholder="2"
                placeholderTextColor="#85776B"
                editable={!publishing}
              />
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              Ingredients
            </Text>

            <Text style={styles.helper}>
              Amount, unit and ingredient
            </Text>
          </View>

          <Text style={styles.sectionHint}>
            Examples: 2 eggs, 1/2 cup milk, 200g flour
          </Text>

          {ingredients.map((ingredient, index) => (
            <View
              key={`ingredient-${index}`}
              style={styles.listRow}
            >
              <Text style={styles.listNumber}>
                {index + 1}
              </Text>

              <TextInput
                style={[styles.input, styles.listInput]}
                value={ingredient}
                onChangeText={(value) =>
                  updateIngredient(index, value)
                }
                placeholder="e.g. 2 cups flour"
                placeholderTextColor="#85776B"
                editable={!publishing}
              />

              <Pressable
                style={[
                  styles.removeButton,
                  publishing && styles.disabled,
                ]}
                onPress={() => removeIngredient(index)}
                disabled={publishing}
                accessibilityRole="button"
                accessibilityLabel={`Remove ingredient ${index + 1}`}
              >
                <Text style={styles.removeButtonText}>
                  ×
                </Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            style={styles.addButton}
            onPress={addIngredient}
            disabled={publishing}
          >
            <Text style={styles.addButtonText}>
              ＋ Add ingredient
            </Text>
          </Pressable>

          {/* Cooking instructions */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              Method
            </Text>

            <Text style={styles.helper}>
              Step by step
            </Text>
          </View>

          <Text style={styles.sectionHint}>
            Add each cooking instruction as a separate step.
          </Text>

          {instructions.map((instruction, index) => (
            <View
              key={`instruction-${index}`}
              style={[
                styles.listRow,
                styles.instructionRow,
              ]}
            >
              <Text style={styles.listNumber}>
                {index + 1}
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.instructionInput,
                ]}
                value={instruction}
                onChangeText={(value) =>
                  updateInstruction(index, value)
                }
                placeholder={`Describe step ${index + 1}...`}
                placeholderTextColor="#85776B"
                multiline
                editable={!publishing}
              />

              <Pressable
                style={[
                  styles.removeButton,
                  publishing && styles.disabled,
                ]}
                onPress={() => removeInstruction(index)}
                disabled={publishing}
                accessibilityRole="button"
                accessibilityLabel={`Remove step ${index + 1}`}
              >
                <Text style={styles.removeButtonText}>
                  ×
                </Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            style={styles.addButton}
            onPress={addInstruction}
            disabled={publishing}
          >
            <Text style={styles.addButtonText}>
              ＋ Add step
            </Text>
          </Pressable>

          {/* Publish */}
          <View style={styles.publishSection}>
            <Text style={styles.publishHeading}>
              Ready to share?
            </Text>

            <Text style={styles.publishDescription}>
              Your recipe will be available for everyone
              to discover and enjoy.
            </Text>

            {publishing && (
              <View style={styles.publishProgress}>
                <ActivityIndicator
                  color="#FF7048"
                  size="small"
                />

                <Text style={styles.publishProgressText}>
                  {publishStage || "Publishing..."}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.publishButton,
                pressed &&
                  !publishing &&
                  styles.publishPressed,
                publishing && styles.disabled,
              ]}
              onPress={publishRecipe}
              disabled={publishing}
              accessibilityRole="button"
              accessibilityLabel="Publish recipe"
            >
              <View style={styles.publishButtonContent}>
                {publishing ? (
                  <ActivityIndicator
                    color="#1A120E"
                    size="small"
                  />
                ) : (
                  <Text style={styles.publishIcon}>
                    ↑
                  </Text>
                )}

                <Text style={styles.publishText}>
                  {publishing
                    ? "Publishing..."
                    : "Publish Recipe"}
                </Text>
              </View>
            </Pressable>

            <Text style={styles.footerNote}>
              🌐 Publicly visible on Yum
            </Text>
          </View>
        </View>
      </ScrollView>

      <CreateBottomNav />
    </View>
  );
}

// Bottom navigation
function CreateBottomNav() {
  const items = [
    { icon: "⌂", label: "Home" },
    { icon: "⌕", label: "Discover" },
    { icon: "+", label: "Create" },
    { icon: "☆", label: "Saved" },
    { icon: "♙", label: "Profile" },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          style={styles.navItem}
          onPress={() => {
            if (item.label === "Home") {
              router.replace("/");
            } else if (item.label === "Discover") {
              router.replace("/discover");
            } else if (item.label === "Saved") {
              router.replace("/saved");
            } else if (item.label === "Profile") {
              router.replace("/profile");
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
                item.label === "Create" &&
                  styles.createIcon,
                item.label === "Create" &&
                  styles.activeIcon,
              ]}
            >
              {item.icon}
            </Text>
          </View>

          {item.label !== "Create" && (
            <Text style={styles.navLabel}>
              {item.label}
            </Text>
          )}
        </Pressable>
      ))}
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

  // Recipe photo
  photoBox: {
    marginHorizontal: 20,
    marginTop: 25,
    height: 210,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#382B22",
  },

  photoContainer: {
    flex: 1,
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  photoPlaceholder: {
    flex: 1,
    backgroundColor: "#241C17",
    alignItems: "center",
    justifyContent: "center",
  },

  photoIcon: {
    color: "#FF7048",
    fontSize: 40,
  },

  photoTitle: {
    color: "#F5EBDD",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
  },

  photoSubtitle: {
    color: "#A99B8D",
    fontSize: 11,
    marginTop: 5,
  },

  changePhotoBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(23,18,15,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  changePhotoText: {
    color: "#F5EBDD",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Form
  form: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
  },

  label: {
    color: "#D5A16B",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    marginTop: 17,
    marginBottom: 9,
  },

  input: {
    backgroundColor: "#241C17",
    borderColor: "#382B22",
    borderWidth: 1,
    borderRadius: 13,
    color: "#F5EBDD",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 13,
  },

  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  half: {
    flex: 1,
  },

  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 10,
  },

  sectionTitle: {
    color: "#F5EBDD",
    fontSize: 20,
    fontWeight: "bold",
  },

  helper: {
    color: "#A99B8D",
    fontSize: 10,
  },

  sectionHint: {
    color: "#82766C",
    fontSize: 11,
    marginBottom: 5,
    lineHeight: 17,
  },

  // Ingredient and instruction rows
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  instructionRow: {
    alignItems: "flex-start",
  },

  listNumber: {
    color: "#D5A16B",
    width: 20,
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },

  listInput: {
    flex: 1,
  },

  instructionInput: {
    flex: 1,
    minHeight: 65,
    textAlignVertical: "top",
  },

  removeButton: {
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#30201D",
    borderWidth: 1,
    borderColor: "#59372D",
    borderRadius: 10,
  },

  removeButtonText: {
    color: "#FF9778",
    fontSize: 23,
    fontWeight: "400",
    lineHeight: 27,
  },

  addButton: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 5,
  },

  addButtonText: {
    color: "#FF7048",
    fontSize: 12,
    fontWeight: "700",
  },

  // Publishing
  publishSection: {
    marginTop: 34,
    paddingTop: 25,
    borderTopWidth: 1,
    borderTopColor: "#382B22",
  },

  publishHeading: {
    color: "#F5EBDD",
    fontSize: 22,
    fontWeight: "bold",
  },

  publishDescription: {
    color: "#A99B8D",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 22,
  },

  publishProgress: {
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#49372B",
    borderRadius: 12,
    padding: 13,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  publishProgressText: {
    color: "#D5A16B",
    fontSize: 12,
    fontWeight: "600",
  },

  publishButton: {
    backgroundColor: "#FF7048",
    borderRadius: 16,
    minHeight: 58,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF8A68",
  },

  publishButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  publishIcon: {
    color: "#1A120E",
    fontSize: 23,
    fontWeight: "bold",
    lineHeight: 25,
  },

  publishText: {
    color: "#1A120E",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  publishPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  disabled: {
    opacity: 0.6,
  },

  footerNote: {
    color: "#A99B8D",
    fontSize: 11,
    textAlign: "center",
    marginTop: 15,
  },

  // Bottom navigation
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
});