export type Ingredient = {
  amount: number;
  unit: string;
  name: string;
};

export type Recipe = {
  id: string;
  title: string;
  creator: string;
  time: string;
  cuisine: string;
  image: string;
  description: string;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
};

export const recipes: Recipe[] = [];