
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

import { Recipe } from "../../data/recipes";
import { supabase } from "../../services/supabase";
import {
    getOwnedRecipe,
    updateUserRecipe,
} from "../../utils/user-recipes";

const INGREDIENT_UNITS = [
  "tablespoons", "tablespoon", "teaspoons", "teaspoon", "tbsp", "tsp",
  "kilograms", "kilogram", "grams", "gram", "kg", "g",
  "millilitres", "millilitre", "milliliters", "milliliter", "ml",
  "litres", "litre", "liters", "liter", "l",
  "cups", "cup", "ounces", "ounce", "oz", "pounds", "pound", "lbs", "lb",
  "pinches", "pinch", "cloves", "clove", "slices", "slice",
  "pieces", "piece", "cans", "can", "packs", "pack",
];

function parseAmount(value: string): number | null {
  const text = value.trim();

  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);

  if (mixed) {
    const denominator = Number(mixed[3]);

    return denominator > 0
      ? Number(mixed[1]) + Number(mixed[2]) / denominator
      : null;
  }

  const fraction = text.match(/^(\d+)\/(\d+)$/);

  if (fraction) {
    const denominator = Number(fraction[2]);

    return denominator > 0
      ? Number(fraction[1]) / denominator
      : null;
  }

  const number = Number(text);

  return Number.isFinite(number) && number > 0
    ? number
    : null;
}

function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "1";

  const whole = Math.floor(amount);
  const remainder = amount - whole;

  const fractions = [
    { value: 0.125, label: "1/8" },
    { value: 0.25, label: "1/4" },
    { value: 1 / 3, label: "1/3" },
    { value: 0.375, label: "3/8" },
    { value: 0.5, label: "1/2" },
    { value: 0.625, label: "5/8" },
    { value: 2 / 3, label: "2/3" },
    { value: 0.75, label: "3/4" },
    { value: 0.875, label: "7/8" },
  ];

  const fraction = fractions.find(
    (item) => Math.abs(remainder - item.value) < 0.005
  );

  if (fraction) {
    return whole > 0
      ? `${whole} ${fraction.label}`
      : fraction.label;
  }

  return String(Number(amount.toFixed(3)));
}

function parseIngredient(
  value: string
): Recipe["ingredients"][number] {
  const text = value.trim();

  let amount = 1;
  let remaining = text;
  let unit = "";

  const quantityMatch = text.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/
  );

  if (quantityMatch) {
    const parsed = parseAmount(quantityMatch[1]);

    if (parsed !== null) {
      amount = parsed;
      remaining = text
        .slice(quantityMatch[0].length)
        .trim();
    }
  }

  const lower = remaining.toLowerCase();

  for (const possibleUnit of [...INGREDIENT_UNITS].sort(
    (a, b) => b.length - a.length
  )) {
    if (!lower.startsWith(possibleUnit)) continue;

    const afterUnit = remaining.slice(
      possibleUnit.length
    );

    if (
      afterUnit.length === 0 ||
      /^[\s.,]/.test(afterUnit)
    ) {
      unit = remaining.slice(
        0,
        possibleUnit.length
      );

      remaining = afterUnit.trim();
      break;
    }
  }

  if (unit) {
    remaining = remaining
      .replace(/^of\s+/i, "")
      .trim();
  }

  return {
    amount,
    unit,
    name: remaining || text,
  };
}

function ingredientToText(
  ingredient: Recipe["ingredients"][number]
): string {
  // Recover fractions incorrectly saved by the old editor.
  if (
    ingredient.amount === 1 &&
    !ingredient.unit &&
    /^\d+\/\d+\s+/.test(ingredient.name.trim())
  ) {
    return ingredient.name.trim();
  }

  return [
    formatAmount(ingredient.amount),
    ingredient.unit,
    ingredient.name,
  ]
    .filter((part) => part !== "")
    .join(" ");
}

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [originalRecipe, setOriginalRecipe] =
    useState<Recipe | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [time, setTime] = useState("");
  const [servings, setServings] = useState("2");
  const [image, setImage] = useState("");

  const [ingredients, setIngredients] =
    useState<string[]>([""]);

  const [instructions, setInstructions] =
    useState<string[]>([""]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadRecipe() {
      try {
        if (!id) {
          throw new Error("Missing recipe ID.");
        }

        const recipe = await getOwnedRecipe(id);

        if (!active) return;

        if (!recipe) {
          Alert.alert(
            "Recipe unavailable",
            "This recipe could not be found, or you do not have permission to edit it.",
            [
              {
                text: "Go back",
                onPress: () => router.back(),
              },
            ]
          );

          return;
        }

        setOriginalRecipe(recipe);
        setTitle(recipe.title);
        setDescription(recipe.description);
        setCuisine(recipe.cuisine);
        setTime(recipe.time.replace(/[^\d.]/g, ""));
        setServings(String(recipe.servings));
        setImage(recipe.image);

        setIngredients(
          recipe.ingredients.length > 0
            ? recipe.ingredients.map(ingredientToText)
            : [""]
        );

        setInstructions(
          recipe.instructions.length > 0
            ? [...recipe.instructions]
            : [""]
        );
      } catch (error) {
        console.log(
          "Error loading recipe for editing:",
          error
        );

        if (active) {
          Alert.alert(
            "Something went wrong",
            "Couldn't load the recipe. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecipe();

    return () => {
      active = false;
    };
  }, [id]);

  const pickImage = async () => {
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

      if (
        !result.canceled &&
        result.assets.length > 0
      ) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Error selecting image:", error);

      Alert.alert(
        "Something went wrong",
        "Couldn't select your photo."
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

    const fileName = `recipe-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${supportedExtension}`;

    const path = `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from("recipe-images")
      .upload(path, imageData, {
        contentType: contentTypes[supportedExtension],
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(path);

    return {
      url: data.publicUrl,
      path,
    };
  };

  const saveChanges = async () => {
    if (saving || !originalRecipe) return;

    const ingredientList = ingredients.filter(
      (item) => item.trim() !== ""
    );

    const instructionList = instructions
      .map((item) => item.trim())
      .filter((item) => item !== "");

    if (!title.trim()) {
      Alert.alert(
        "Missing title",
        "Enter a recipe name."
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Missing description",
        "Enter a recipe description."
      );
      return;
    }

    if (!cuisine.trim()) {
      Alert.alert(
        "Missing cuisine",
        "Enter a cuisine."
      );
      return;
    }

    const minutes = Number(time);

    if (
      !time.trim() ||
      !Number.isFinite(minutes) ||
      minutes <= 0
    ) {
      Alert.alert(
        "Invalid time",
        "Enter a valid cooking time."
      );
      return;
    }

    const servingCount = Number(servings);

    if (
      !Number.isInteger(servingCount) ||
      servingCount <= 0
    ) {
      Alert.alert(
        "Invalid servings",
        "Enter a positive whole number."
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

    setSaving(true);

    let newImagePath: string | null = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("You must be logged in.");
      }

      let imageUrl = originalRecipe.image;

      if (
        image &&
        !image.startsWith("https://") &&
        !image.startsWith("http://")
      ) {
        const uploaded = await uploadRecipeImage(
          image,
          user.id
        );

        imageUrl = uploaded.url;
        newImagePath = uploaded.path;
      }


      const updatedRecipe: Recipe = {
        ...originalRecipe,
        title: title.trim(),
        description: description.trim(),
        cuisine: cuisine.trim(),
        time: `${minutes} min`,
        servings: servingCount,
        image: imageUrl,
        ingredients: ingredientList.map(parseIngredient),
        instructions: instructionList,
      };

      await updateUserRecipe(updatedRecipe);

      Alert.alert(
        "Recipe updated!",
        "Your changes have been saved successfully.",
        [
          {
            text: "View recipe",
            onPress: () => {
              router.replace({
                pathname: "/recipe/[id]",
                params: { id: originalRecipe.id },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.log("Error saving recipe:", error);

      if (newImagePath) {
        const { error: cleanupError } =
          await supabase.storage
            .from("recipe-images")
            .remove([newImagePath]);

        if (cleanupError) {
          console.log(
            "Error cleaning up uploaded image:",
            cleanupError
          );
        }
      }

      Alert.alert(
        "Couldn't save changes",
        "Please try again. Your original recipe has not been changed."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          color="#FF7048"
          size="large"
        />
        <Text style={styles.loadingText}>
          Loading your recipe...
        </Text>
      </View>
    );
  }

  if (!originalRecipe) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>
          Recipe unavailable
        </Text>

        <Text style={styles.emptyText}>
          You can only edit recipes you've published.
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            style={styles.headerBack}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.headerBackText}>
              ← Back
            </Text>
          </Pressable>

          <Text style={styles.eyebrow}>
            MAKE IT EVEN BETTER
          </Text>

          <Text style={styles.pageTitle}>
            Edit
            <Text style={styles.orange}>.</Text>
          </Text>

          <Text style={styles.subtitle}>
            Update your recipe and share your improvements.
          </Text>
        </View>

        <Pressable
          style={styles.photoBox}
          onPress={pickImage}
          disabled={saving}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.photo}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>
                ＋
              </Text>

              <Text style={styles.photoTitle}>
                Add a recipe photo
              </Text>
            </View>
          )}

          <View style={styles.photoOverlay}>
            <Text style={styles.photoOverlayText}>
              Change photo
            </Text>
          </View>
        </Pressable>

        <View style={styles.form}>
          <Text style={styles.label}>
            RECIPE NAME
          </Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Recipe name"
            placeholderTextColor="#85776B"
            editable={!saving}
          />

          <Text style={styles.label}>
            DESCRIPTION
          </Text>

          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your recipe"
            placeholderTextColor="#85776B"
            multiline
            editable={!saving}
          />

          <Text style={styles.label}>
            CUISINE
          </Text>

          <TextInput
            style={styles.input}
            value={cuisine}
            onChangeText={setCuisine}
            placeholder="e.g. Italian"
            placeholderTextColor="#85776B"
            editable={!saving}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>
                TIME (MINUTES)
              </Text>

              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor="#85776B"
                editable={!saving}
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
                keyboardType="numeric"
                placeholder="2"
                placeholderTextColor="#85776B"
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Ingredients
            </Text>

            <Text style={styles.helper}>
              Amount, unit and name
            </Text>
          </View>

          {ingredients.map((ingredient, index) => (
            <View
              key={index}
              style={styles.listRow}
            >
              <Text style={styles.listNumber}>
                {index + 1}
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.listInput,
                ]}
                value={ingredient}
                onChangeText={(value) =>
                  setIngredients((old) =>
                    old.map((item, i) =>
                      i === index ? value : item
                    )
                  )
                }
                placeholder="e.g. 200 g pasta"
                placeholderTextColor="#85776B"
                editable={!saving}
              />

              {ingredients.length > 1 && (
                <Pressable
                  onPress={() =>
                    setIngredients((old) =>
                      old.filter(
                        (_, i) => i !== index
                      )
                    )
                  }
                  disabled={saving}
                  accessibilityLabel={`Remove ingredient ${index + 1}`}
                >
                  <Text style={styles.removeText}>
                    ×
                  </Text>
                </Pressable>
              )}
            </View>
          ))}

          <Pressable
            style={styles.addButton}
            onPress={() =>
              setIngredients((old) => [
                ...old,
                "",
              ])
            }
            disabled={saving}
          >
            <Text style={styles.addButtonText}>
              ＋ Add ingredient
            </Text>
          </Pressable>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Method
            </Text>

            <Text style={styles.helper}>
              Step by step
            </Text>
          </View>

          {instructions.map(
            (instruction, index) => (
              <View
                key={index}
                style={styles.listRow}
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
                    setInstructions((old) =>
                      old.map((item, i) =>
                        i === index
                          ? value
                          : item
                      )
                    )
                  }
                  placeholder={`Describe step ${index + 1}...`}
                  placeholderTextColor="#85776B"
                  multiline
                  editable={!saving}
                />

                {instructions.length > 1 && (
                  <Pressable
                    onPress={() =>
                      setInstructions((old) =>
                        old.filter(
                          (_, i) => i !== index
                        )
                      )
                    }
                    disabled={saving}
                    accessibilityLabel={`Remove step ${index + 1}`}
                  >
                    <Text style={styles.removeText}>
                      ×
                    </Text>
                  </Pressable>
                )}
              </View>
            )
          )}

          <Pressable
            style={styles.addButton}
            onPress={() =>
              setInstructions((old) => [
                ...old,
                "",
              ])
            }
            disabled={saving}
          >
            <Text style={styles.addButtonText}>
              ＋ Add step
            </Text>
          </Pressable>

          <View style={styles.saveSection}>
            <Text style={styles.saveHeading}>
              Happy with your changes?
            </Text>

            <Text style={styles.saveDescription}>
              Your updated recipe will appear on Yum
              with its existing likes and comments.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed &&
                  !saving &&
                  styles.pressed,
                saving && styles.disabled,
              ]}
              onPress={saveChanges}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save recipe changes"
            >
              {saving ? (
                <View
                  style={
                    styles.saveButtonContent
                  }
                >
                  <ActivityIndicator
                    color="#1A120E"
                    size="small"
                  />

                  <Text
                    style={styles.saveButtonText}
                  >
                    Saving...
                  </Text>
                </View>
              ) : (
                <Text
                  style={styles.saveButtonText}
                >
                  Save Changes
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#17120F",
  },

  center: {
    flex: 1,
    backgroundColor: "#17120F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingText: {
    color: "#A99B8D",
    marginTop: 16,
    fontSize: 13,
  },

  emptyTitle: {
    color: "#F5EBDD",
    fontSize: 22,
    fontWeight: "bold",
  },

  emptyText: {
    color: "#A99B8D",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 22,
  },

  backButton: {
    backgroundColor: "#FF7048",
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 13,
  },

  backButtonText: {
    color: "#1A120E",
    fontWeight: "bold",
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 22,
  },

  headerBack: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    marginBottom: 20,
  },

  headerBackText: {
    color: "#F5EBDD",
    fontSize: 14,
    fontWeight: "600",
  },

  eyebrow: {
    color: "#D5A16B",
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "700",
  },

  pageTitle: {
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
    marginTop: 6,
    lineHeight: 20,
  },

  photoBox: {
    marginHorizontal: 20,
    marginTop: 25,
    height: 210,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#382B22",
    backgroundColor: "#241C17",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  photoIcon: {
    color: "#FF7048",
    fontSize: 40,
  },

  photoTitle: {
    color: "#F5EBDD",
    fontSize: 15,
    fontWeight: "bold",
  },

  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingVertical: 12,
    alignItems: "center",
  },

  photoOverlayText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  form: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
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

  sectionHeading: {
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

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },

  listNumber: {
    color: "#D5A16B",
    width: 22,
    fontSize: 12,
    fontWeight: "bold",
  },

  listInput: {
    flex: 1,
  },

  instructionInput: {
    flex: 1,
    minHeight: 65,
    textAlignVertical: "top",
  },

  removeText: {
    color: "#FF7048",
    fontSize: 25,
    paddingHorizontal: 5,
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

  saveSection: {
    marginTop: 34,
    paddingTop: 25,
    borderTopWidth: 1,
    borderTopColor: "#382B22",
  },

  saveHeading: {
    color: "#F5EBDD",
    fontSize: 22,
    fontWeight: "bold",
  },

  saveDescription: {
    color: "#A99B8D",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 22,
  },

  saveButton: {
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

  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  saveButtonText: {
    color: "#1A120E",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  pressed: {
    opacity: 0.85,
  },

  disabled: {
    opacity: 0.6,
  },

  cancelButton: {
    alignItems: "center",
    paddingVertical: 18,
  },

  cancelText: {
    color: "#A99B8D",
    fontSize: 13,
    fontWeight: "600",
  },
});
