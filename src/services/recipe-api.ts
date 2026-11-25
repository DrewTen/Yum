
import { Ingredient, Recipe } from "../data/recipes";

// TheMealDB public development API.
// Key "1" is provided for educational testing.
const API_BASE_URL =
  "https://www.themealdb.com/api/json/v1/1";

// The fields returned for each meal.
type MealDBMeal = {
  idMeal: string;
  strMeal: string;
  strArea: string | null;
  strCategory: string | null;
  strMealThumb: string | null;
  strInstructions: string | null;
  strTags: string | null;
  [key: string]: string | null;
};

type MealDBResponse = {
  meals: MealDBMeal[] | null;
};

// Fetch data from the API and check for errors.
async function fetchMeals(
  endpoint: string
): Promise<MealDBMeal[]> {
  const response = await fetch(
    `${API_BASE_URL}/${endpoint}`
  );

  if (!response.ok) {
    throw new Error(
      `Recipe API request failed: ${response.status}`
    );
  }

  const data: MealDBResponse = await response.json();

  if (!data || !Array.isArray(data.meals)) {
    return [];
  }

  return data.meals;
}

// TheMealDB stores ingredients in numbered fields.
// Convert them into Yum's Ingredient array.
function convertIngredients(
  meal: MealDBMeal
): Ingredient[] {
  const ingredients: Ingredient[] = [];

  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();

    if (!name) {
      continue;
    }

    // Extract a number when the measure begins with one.
    // Preserve the remaining text as the unit.
    const match = measure?.match(
      /^(\d+(?:\.\d+)?|\d+\/\d+)\s*(.*)$/
    );

    let amount = 1;
    let unit = measure || "";

    if (match) {
      const numberText = match[1];
      const remainder = match[2];

      if (numberText.includes("/")) {
        const [numerator, denominator] =
          numberText.split("/").map(Number);

        if (denominator !== 0) {
          amount = numerator / denominator;
        }
      } else {
        amount = Number(numberText);
      }

      unit = remainder;
    }

    ingredients.push({
      amount,
      unit,
      name,
    });
  }

  return ingredients;
}

// Convert API cooking instructions into separate steps.
function convertInstructions(
  instructions: string | null
): string[] {
  if (!instructions?.trim()) {
    return ["Instructions are not available."];
  }

  // Some recipes separate steps with new lines.
  const paragraphs = instructions
    .split(/\r?\n+/)
    .map((step) => step.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs;
  }

  // Other recipes contain one long paragraph.
  // Split it into sentences for easier reading.
  return instructions
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((step) => step.trim())
    .filter(Boolean);
}

// Convert TheMealDB's meal structure into Yum's Recipe.
export function convertMealToRecipe(
  meal: MealDBMeal
): Recipe {
  const ingredients = convertIngredients(meal);
  const instructions = convertInstructions(
    meal.strInstructions
  );

  return {
    // Prefix IDs to avoid conflicts with local recipes.
    id: `mealdb-${meal.idMeal}`,

    title: meal.strMeal,

    // API recipes are credited to their source.
    creator: "TheMealDB",

    // TheMealDB does not provide cooking time.
    time: "Not specified",

    cuisine: meal.strArea || "International",

    image: meal.strMealThumb || "",

    description: meal.strCategory
      ? `${meal.strCategory} recipe from ${
          meal.strArea || "around the world"
        }.`
      : "Discover a delicious new recipe.",

    // TheMealDB does not provide serving quantities.
    // Default to 1 until we support unknown servings.
    servings: 1,

    ingredients,
    instructions,
  };
}

// Search recipes by name.
// Example: searchApiRecipes("chicken")
export async function searchApiRecipes(
  query: string
): Promise<Recipe[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const meals = await fetchMeals(
    `search.php?s=${encodeURIComponent(trimmedQuery)}`
  );

  return meals.map(convertMealToRecipe);
}

// Fetch all recipes beginning with a letter.
// Useful for filling Yum's discovery feed.
export async function getApiRecipesByLetter(
  letter: string
): Promise<Recipe[]> {
  const cleanLetter = letter.trim().toLowerCase();

  if (!/^[a-z]$/.test(cleanLetter)) {
    return [];
  }

  const meals = await fetchMeals(
    `search.php?f=${cleanLetter}`
  );

  return meals.map(convertMealToRecipe);
}

// Fetch one complete recipe using its API ID.
// Example: getApiRecipeById("mealdb-52771")
export async function getApiRecipeById(
  recipeId: string
): Promise<Recipe | null> {
  const mealId = recipeId.replace(/^mealdb-/, "");

  if (!/^\d+$/.test(mealId)) {
    return null;
  }

  const meals = await fetchMeals(
    `lookup.php?i=${mealId}`
  );

  if (meals.length === 0) {
    return null;
  }

  return convertMealToRecipe(meals[0]);
}
