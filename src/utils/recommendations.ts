
import { Recipe } from "../data/recipes";

export type RecommendationInputs = {
  recipes: Recipe[];
  likedIds: string[];
  savedIds: string[];
  favouriteCuisines: string[];
  following: string[];
};

const normalise = (value: string) => value.trim().toLowerCase();

function getCreatorName(creator: string) {
  return normalise(creator).replace(/^@/, "");
}

function getIngredientNames(recipe: Recipe) {
  return recipe.ingredients.map((ingredient) =>
    normalise(ingredient.name)
  );
}

function calculateScores({
  recipes,
  likedIds,
  savedIds,
  favouriteCuisines,
  following,
}: RecommendationInputs) {
  const likedRecipes = recipes.filter((recipe) =>
    likedIds.includes(recipe.id)
  );

  const savedRecipes = recipes.filter((recipe) =>
    savedIds.includes(recipe.id)
  );

  const likedCuisineCounts: Record<string, number> = {};
  const savedCuisineCounts: Record<string, number> = {};
  const likedIngredients: Record<string, number> = {};
  const savedIngredients: Record<string, number> = {};

  likedRecipes.forEach((recipe) => {
    const cuisine = normalise(recipe.cuisine);

    likedCuisineCounts[cuisine] =
      (likedCuisineCounts[cuisine] || 0) + 1;

    getIngredientNames(recipe).forEach((ingredient) => {
      likedIngredients[ingredient] =
        (likedIngredients[ingredient] || 0) + 1;
    });
  });

  savedRecipes.forEach((recipe) => {
    const cuisine = normalise(recipe.cuisine);

    savedCuisineCounts[cuisine] =
      (savedCuisineCounts[cuisine] || 0) + 1;

    getIngredientNames(recipe).forEach((ingredient) => {
      savedIngredients[ingredient] =
        (savedIngredients[ingredient] || 0) + 1;
    });
  });

  const likedCuisineSet = new Set(
    Object.keys(likedCuisineCounts)
  );

  const savedCuisineSet = new Set(
    Object.keys(savedCuisineCounts)
  );

  const favouriteCuisineSet = new Set(
    favouriteCuisines.map(normalise)
  );

  const followingSet = new Set(
    following.map(getCreatorName)
  );

  const scores: Record<string, number> = {};

  recipes.forEach((recipe) => {
    const cuisine = normalise(recipe.cuisine);
    const creator = getCreatorName(recipe.creator);
    const ingredients = getIngredientNames(recipe);

    let score = 0;

    if (favouriteCuisineSet.has(cuisine)) {
      score += 12;
    }

    if (likedCuisineSet.has(cuisine)) {
      score += Math.min(likedCuisineCounts[cuisine] * 5, 20);
    }

    if (savedCuisineSet.has(cuisine)) {
      score += Math.min(savedCuisineCounts[cuisine] * 3, 12);
    }

    ingredients.forEach((ingredient) => {
      if (likedIngredients[ingredient]) {
        score += Math.min(likedIngredients[ingredient] * 2, 6);
      }

      if (savedIngredients[ingredient]) {
        score += Math.min(savedIngredients[ingredient], 3);
      }
    });

    if (followingSet.has(creator)) {
      score += 15;
    }

    if (likedIds.includes(recipe.id)) {
      score -= 8;
    }

    if (savedIds.includes(recipe.id)) {
      score -= 5;
    }

    scores[recipe.id] = score;
  });

  return scores;
}

export function getRecommendedRecipes(
  inputs: RecommendationInputs
): Recipe[] {
  const scores = calculateScores(inputs);

  const sorted = [...inputs.recipes].sort((a, b) => {
    const difference =
      (scores[b.id] || 0) - (scores[a.id] || 0);

    if (difference !== 0) return difference;

    return a.title.localeCompare(b.title);
  });

  const familiarCuisines = new Set(
    inputs.favouriteCuisines.map(normalise)
  );

  inputs.recipes.forEach((recipe) => {
    if (
      inputs.likedIds.includes(recipe.id) ||
      inputs.savedIds.includes(recipe.id)
    ) {
      familiarCuisines.add(normalise(recipe.cuisine));
    }
  });

  const personalised = sorted.filter((recipe) =>
    familiarCuisines.has(normalise(recipe.cuisine))
  );

  const explore = sorted.filter(
    (recipe) =>
      !familiarCuisines.has(normalise(recipe.cuisine))
  );

  const result: Recipe[] = [];
  const usedIds = new Set<string>();

  while (result.length < sorted.length) {
    // Aim for 7 familiar recipes and 3 discovery recipes.
    const position = result.length % 10;

    const preferExplore =
      position === 2 ||
      position === 5 ||
      position === 8;

    const primary = preferExplore ? explore : personalised;
    const secondary = preferExplore ? personalised : explore;

    const recentCuisines = result
      .slice(-2)
      .map((recipe) => normalise(recipe.cuisine));

    const pick = (pool: Recipe[]) =>
      pool.find(
        (recipe) =>
          !usedIds.has(recipe.id) &&
          !recentCuisines.includes(normalise(recipe.cuisine))
      ) ??
      pool.find((recipe) => !usedIds.has(recipe.id));

    const next =
      pick(primary) ??
      pick(secondary) ??
      pick(sorted);

    if (!next) break;

    result.push(next);
    usedIds.add(next.id);
  }

  return result;
}
