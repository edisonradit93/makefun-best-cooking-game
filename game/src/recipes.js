export const INGREDIENTS = {
  bun: {
    id: 'bun',
    name: 'Brioche Buns',
    shortName: 'Bun',
    prep: 'ready',
    color: '#d88934',
    accentColor: '#f6cf8a',
    layerOrder: 1,
  },
  patty: {
    id: 'patty',
    name: 'Wagyu Patty',
    shortName: 'Wagyu',
    prep: 'grill',
    cookTime: 4.4,
    burnTime: 8.8,
    color: '#a83333',
    accentColor: '#692018',
    layerOrder: 2,
  },
  cheddar: {
    id: 'cheddar',
    name: 'Aged Cheddar',
    shortName: 'Cheddar',
    prep: 'ready',
    color: '#f5a623',
    accentColor: '#ffd466',
    layerOrder: 3,
  },
  onion: {
    id: 'onion',
    name: 'Caramelized Onion',
    shortName: 'Onion',
    prep: 'grill',
    cookTime: 3.8,
    burnTime: 8.0,
    color: '#a55186',
    accentColor: '#c97b38',
    layerOrder: 4,
  },
  tomato: {
    id: 'tomato',
    name: 'Vine Tomato',
    shortName: 'Tomato',
    prep: 'chop',
    chopTime: 1.5,
    color: '#e53935',
    accentColor: '#ff8a80',
    layerOrder: 5,
  },
  lettuce: {
    id: 'lettuce',
    name: 'Crisp Lettuce',
    shortName: 'Lettuce',
    prep: 'chop',
    chopTime: 1.3,
    color: '#52b947',
    accentColor: '#a6e582',
    layerOrder: 6,
  },
  pasta: {
    id: 'pasta',
    name: 'Fresh Pasta',
    shortName: 'Pasta',
    prep: 'grill',
    cookTime: 4.0,
    burnTime: 8.4,
    color: '#f2c94c',
    accentColor: '#fff0a8',
    layerOrder: 2,
  },
  butter: {
    id: 'butter',
    name: 'Garlic Butter',
    shortName: 'Butter',
    prep: 'ready',
    color: '#ffe066',
    accentColor: '#fff7cc',
    layerOrder: 3,
  },
  basil: {
    id: 'basil',
    name: 'Fresh Basil',
    shortName: 'Basil',
    prep: 'chop',
    chopTime: 1.2,
    color: '#2e8b57',
    accentColor: '#6bd195',
    layerOrder: 6,
  },
  truffle: {
    id: 'truffle',
    name: 'Truffle Sauce',
    shortName: 'Truffle',
    prep: 'ready',
    color: '#6e4e37',
    accentColor: '#c49b66',
    layerOrder: 7,
  },
};

export const INGREDIENT_LIST = Object.values(INGREDIENTS);

export const RECIPES = [
  {
    id: 'ember_wagyu',
    name: 'Ember Wagyu Burger',
    shortName: 'Wagyu Burger',
    category: 'burger',
    price: 34,
    duration: 48,
    ingredients: ['bun', 'patty', 'cheddar', 'lettuce'],
    accentColor: '#e85d24',
  },
  {
    id: 'truffle_bistro',
    name: 'Truffle Bistro Burger',
    shortName: 'Truffle Burger',
    category: 'burger',
    price: 42,
    duration: 54,
    ingredients: ['bun', 'patty', 'onion', 'truffle'],
    accentColor: '#c49b66',
  },
  {
    id: 'caprese_melt',
    name: 'Artisan Caprese Melt',
    shortName: 'Caprese Melt',
    category: 'burger',
    price: 30,
    duration: 44,
    ingredients: ['bun', 'cheddar', 'tomato', 'basil'],
    accentColor: '#e53935',
  },
  {
    id: 'garlic_tagliatelle',
    name: 'Garlic Butter Tagliatelle',
    shortName: 'Garlic Pasta',
    category: 'pasta',
    price: 38,
    duration: 50,
    ingredients: ['pasta', 'butter', 'tomato', 'basil'],
    accentColor: '#f2c94c',
  },
  {
    id: 'truffle_wagyu_pasta',
    name: 'Truffle Wagyu Pasta',
    shortName: 'Wagyu Pasta',
    category: 'pasta',
    price: 46,
    duration: 58,
    ingredients: ['pasta', 'patty', 'onion', 'truffle'],
    accentColor: '#a83333',
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export function isItemReadyForAssembly(item) {
  if (!item || item.kind !== 'ingredient') return false;
  const spec = INGREDIENTS[item.id];
  if (!spec) return false;
  if (spec.prep === 'ready') return true;
  if (spec.prep === 'chop') return item.state === 'chopped';
  if (spec.prep === 'grill') return item.state === 'seared' || item.state === 'perfect';
  return false;
}

export function getNeededPrepHint(item) {
  if (!item || item.kind !== 'ingredient') return '';
  const spec = INGREDIENTS[item.id];
  if (!spec) return '';
  if (item.state === 'burned') return 'Burned! Toss in Trash [Q]';
  if (spec.prep === 'chop' && item.state !== 'chopped') {
    return `Chop ${spec.shortName} on Prep Board!`;
  }
  if (spec.prep === 'grill' && item.state === 'raw') {
    return `Cook ${spec.shortName} on Grill!`;
  }
  return '';
}

export function findCandidateRecipes(stack) {
  const ids = stack.map((entry) => entry.id);
  return RECIPES.filter((recipe) => ids.every((id) => recipe.ingredients.includes(id)));
}

export function canAddToAssembly(stack, item) {
  if (!isItemReadyForAssembly(item)) return false;
  if (stack.some((entry) => entry.id === item.id)) return false;
  const candidateIds = [...stack.map((entry) => entry.id), item.id];
  return RECIPES.some((recipe) =>
    candidateIds.every((id) => recipe.ingredients.includes(id)),
  );
}

export function findCompletedRecipe(stack) {
  if (!stack || stack.length === 0) return null;
  const ids = stack.map((entry) => entry.id);
  return (
    RECIPES.find(
      (recipe) =>
        recipe.ingredients.length === ids.length &&
        recipe.ingredients.every((req) => ids.includes(req)),
    ) || null
  );
}

export function sortStackForDisplay(stack) {
  return [...stack].sort((a, b) => {
    const oa = INGREDIENTS[a.id]?.layerOrder ?? 5;
    const ob = INGREDIENTS[b.id]?.layerOrder ?? 5;
    return oa - ob;
  });
}

export function hasPerfectGrillQuality(stack) {
  let hasGrilled = false;
  let allPerfect = true;
  for (const entry of stack) {
    const spec = INGREDIENTS[entry.id];
    if (spec && spec.prep === 'grill') {
      hasGrilled = true;
      if (entry.state !== 'perfect') {
        allPerfect = false;
      }
    }
  }
  return hasGrilled && allPerfect;
}

export function calculateStarRating(revenue, servedCount, missedCount) {
  const effective = revenue - missedCount * 12;
  if (effective >= 260 && servedCount >= 6) {
    return { stars: 5, verdict: 'Michelin Star Rush Master!' };
  }
  if (effective >= 190 && servedCount >= 5) {
    return { stars: 4, verdict: 'Executive Bistro Chef!' };
  }
  if (effective >= 120 && servedCount >= 3) {
    return { stars: 3, verdict: 'Solid Dinner Service!' };
  }
  if (effective >= 55 || servedCount >= 2) {
    return { stars: 2, verdict: 'Busy Kitchen Apprentice' };
  }
  return { stars: 1, verdict: 'Keep Firing Those Grills!' };
}
