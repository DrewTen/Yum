
import { router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import RecipeImage from "../components/recipe-image";
import { Recipe } from "../data/recipes";
import { searchApiRecipes } from "../services/recipe-api";
import {
  getUserProfile,
  UserProfile,
} from "../utils/user-profiles";
import {
  getAllRecipes,
  getMyRecipes,
  rememberSearchRecipes,
} from "../utils/user-recipes";

const mainCuisines = [
  { name: "All", flag: "🍽️" },
  { name: "Korean", flag: "🇰🇷" },
  { name: "Japanese", flag: "🇯🇵" },
  { name: "Italian", flag: "🇮🇹" },
  { name: "Mexican", flag: "🇲🇽" },
  { name: "Thai", flag: "🇹🇭" },
  { name: "Chinese", flag: "🇨🇳" },
  { name: "Mediterranean", flag: "🫒" },
  { name: "Middle Eastern", flag: "🥙" },
  { name: "French", flag: "🇫🇷" },
];

const cuisineFlags: Record<string, string> = {
  American: "🇺🇸",
  British: "🇬🇧",
  Canadian: "🇨🇦",
  Croatian: "🇭🇷",
  Dutch: "🇳🇱",
  Egyptian: "🇪🇬",
  Filipino: "🇵🇭",
  Greek: "🇬🇷",
  Indian: "🇮🇳",
  Irish: "🇮🇪",
  Jamaican: "🇯🇲",
  Malaysian: "🇲🇾",
  Moroccan: "🇲🇦",
  Polish: "🇵🇱",
  Portuguese: "🇵🇹",
  Russian: "🇷🇺",
  Spanish: "🇪🇸",
  Turkish: "🇹🇷",
  Ukrainian: "🇺🇦",
  Vietnamese: "🇻🇳",
  International: "🌍",
  Unknown: "🌍",
};

function getSearchScore(
  recipe: Recipe,
  query: string
): number {
  const search = query.trim().toLowerCase();
  if (!search) return 0;

  const title = recipe.title.toLowerCase();
  const cuisine = recipe.cuisine.toLowerCase();
  const ingredients = recipe.ingredients.map(
    (ingredient) => ingredient.name.toLowerCase()
  );

  if (title === search) return 100;
  if (title.startsWith(search)) return 90;
  if (title.includes(search)) return 80;
  if (ingredients.some((item) => item === search)) return 70;
  if (ingredients.some((item) => item.includes(search))) return 60;
  if (cuisine === search) return 50;

  return 0;
}

export default function DiscoverScreen() {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [myRecipeIds, setMyRecipeIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [showMoreCuisines, setShowMoreCuisines] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [apiResults, setApiResults] = useState<Recipe[]>([]);
  const [searchingApi, setSearchingApi] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [searchRetryCount, setSearchRetryCount] = useState(0);

  const requestNumber = useRef(0);
  const searchQuery = searchText.trim();

  // Refresh whenever Discover gains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadDiscover() {
        setLoading(true);
        setLoadError(false);

        try {
          // Recipe loading is the essential request.
          // Profile loading should not prevent browsing.
          const items = await getAllRecipes();

          if (!active) return;
          setAllRecipes(items);

          const [profileResult, myRecipesResult] =
            await Promise.allSettled([
              getUserProfile(),
              getMyRecipes(),
            ]);

          if (!active) return;

          if (profileResult.status === "fulfilled") {
            setUserProfile(profileResult.value);
          } else {
            setUserProfile(null);
          }

          if (myRecipesResult.status === "fulfilled") {
            setMyRecipeIds(
              myRecipesResult.value.map((recipe) => recipe.id)
            );
          } else {
            setMyRecipeIds([]);
          }
        } catch (error) {
          if (!active) return;

          console.log("Could not load Discover:", error);
          setLoadError(true);
        } finally {
          if (active) setLoading(false);
        }
      }

      loadDiscover();

      return () => {
        active = false;
      };
    }, [retryCount])
  );

  // Debounced live recipe search.
  useEffect(() => {
    const currentRequest = ++requestNumber.current;

    if (!searchQuery) {
      setApiResults([]);
      setSearchingApi(false);
      setApiError(false);
      return;
    }

    setSearchingApi(true);
    setApiError(false);
    setApiResults([]);

    const timer = setTimeout(async () => {
      try {
        const results = await searchApiRecipes(searchQuery);

        if (currentRequest !== requestNumber.current) return;

        // Cache results for recipe detail navigation.
        try {
          await rememberSearchRecipes(results);
        } catch (cacheError) {
          console.log(
            "Could not cache search results:",
            cacheError
          );
        }

        if (currentRequest !== requestNumber.current) return;

        setApiResults(results);
      } catch (error) {
        if (currentRequest !== requestNumber.current) return;

        console.log("Live recipe search failed:", error);
        setApiError(true);
      } finally {
        if (currentRequest === requestNumber.current) {
          setSearchingApi(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      requestNumber.current++;
    };
  }, [searchQuery, searchRetryCount]);

  const combinedRecipes = useMemo(() => {
    if (!searchQuery) return allRecipes;

    return Array.from(
      new Map(
        [...allRecipes, ...apiResults].map((recipe) => [
          recipe.id,
          recipe,
        ])
      ).values()
    );
  }, [allRecipes, apiResults, searchQuery]);

  const additionalCuisines = useMemo(() => {
    const mainNames = new Set(
      mainCuisines.map((item) => item.name.toLowerCase())
    );

    const cuisineNames = new Map<string, string>();

    for (const recipe of combinedRecipes) {
      const name = recipe.cuisine.trim();
      if (!name || mainNames.has(name.toLowerCase())) continue;

      const key = name.toLowerCase();
      if (!cuisineNames.has(key)) {
        cuisineNames.set(key, name);
      }
    }

    return Array.from(cuisineNames.values())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        name,
        flag: cuisineFlags[name] || "🌍",
      }));
  }, [combinedRecipes]);

  const selectedIsAdditional = additionalCuisines.some(
    (item) => item.name === selectedCuisine
  );

  const filteredRecipes = useMemo(() => {
    const matches = combinedRecipes.filter(
      (recipe) =>
        selectedCuisine === "All" ||
        recipe.cuisine.toLowerCase() ===
          selectedCuisine.toLowerCase()
    );

    if (!searchQuery) return matches;

    return matches
      .map((recipe) => ({
        recipe,
        score: getSearchScore(recipe, searchQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.recipe);
  }, [combinedRecipes, searchQuery, selectedCuisine]);

  const myRecipeIdSet = useMemo(
    () => new Set(myRecipeIds),
    [myRecipeIds]
  );

  const avatarIsPhoto =
    userProfile?.avatar?.startsWith("file://") ||
    userProfile?.avatar?.startsWith("content://") ||
    userProfile?.avatar?.startsWith("https://") ||
    userProfile?.avatar?.startsWith("http://");

  const openRecipe = (id: string) => {
    router.push({
      pathname: "/recipe/[id]",
      params: { id },
    });
  };

  const resetFilters = () => {
    setSearchText("");
    setSelectedCuisine("All");
  };

  const retryLoading = () => {
    if (loading) return;
    setRetryCount((previous) => previous + 1);
  };

  const retrySearch = () => {
    if (searchingApi || !searchQuery) return;
    setSearchRetryCount((previous) => previous + 1);
  };

  const showInitialLoading =
    loading && allRecipes.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            EXPLORE THE WORLD
          </Text>

          <Text style={styles.title}>
            Discover<Text style={styles.orange}>.</Text>
          </Text>

          <Text style={styles.subtitle}>
            A little inspiration for your next craving.
          </Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            placeholder="Recipes, cuisines, ingredients..."
            placeholderTextColor="#8A7E73"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            returnKeyType="search"
          />

          {searchingApi ? (
            <ActivityIndicator
              size="small"
              color="#FF7048"
            />
          ) : !!searchText ? (
            <Pressable
              onPress={() => setSearchText("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearSearch}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {/* LIVE SEARCH STATUS */}
        {!!searchQuery && (
          <View style={styles.apiStatus}>
            {searchingApi ? (
              <View style={styles.inlineStatus}>
                <ActivityIndicator
                  size="small"
                  color="#D5A16B"
                />
                <Text style={styles.apiStatusText}>
                  Searching for more recipes online...
                </Text>
              </View>
            ) : apiError ? (
              <View style={styles.searchErrorRow}>
                <Text style={styles.apiErrorText}>
                  Online search unavailable.
                  Showing available recipes.
                </Text>

                <Pressable
                  onPress={retrySearch}
                  style={styles.smallRetryButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.smallRetryText}>
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.apiStatusText}>
                ✓ Live recipe search complete
              </Text>
            )}
          </View>
        )}

        {/* CUISINE FILTERS */}
        <View style={styles.cuisineHeading}>
          <Text style={styles.sectionTitle}>
            Explore cuisines
          </Text>

          {selectedCuisine !== "All" && (
            <Pressable
              onPress={() => setSelectedCuisine("All")}
            >
              <Text style={styles.clearFilter}>
                Clear
              </Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cuisineRow}
        >
          {mainCuisines.map((cuisine) => {
            const selected =
              selectedCuisine === cuisine.name;

            return (
              <Pressable
                key={cuisine.name}
                onPress={() =>
                  setSelectedCuisine(cuisine.name)
                }
                style={[
                  styles.cuisineChip,
                  selected && styles.selectedChip,
                ]}
              >
                <Text style={styles.cuisineFlag}>
                  {cuisine.flag}
                </Text>

                <Text
                  style={[
                    styles.cuisineName,
                    selected && styles.selectedName,
                  ]}
                >
                  {cuisine.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* MORE CUISINES */}
        {additionalCuisines.length > 0 && (
          <View style={styles.moreCuisinesSection}>
            <Pressable
              style={[
                styles.moreCuisinesButton,
                selectedIsAdditional &&
                  styles.moreCuisinesButtonActive,
              ]}
              onPress={() =>
                setShowMoreCuisines((previous) => !previous)
              }
              accessibilityRole="button"
              accessibilityLabel={
                showMoreCuisines
                  ? "Hide additional cuisines"
                  : "Show additional cuisines"
              }
            >
              <View style={styles.moreCuisinesLeft}>
                <Text style={styles.moreCuisinesIcon}>
                  🌍
                </Text>

                <View>
                  <Text style={styles.moreCuisinesTitle}>
                    {selectedIsAdditional
                      ? selectedCuisine
                      : "More cuisines"}
                  </Text>

                  <Text style={styles.moreCuisinesSubtitle}>
                    {additionalCuisines.length} more to explore
                  </Text>
                </View>
              </View>

              <Text style={styles.moreCuisinesArrow}>
                {showMoreCuisines ? "⌃" : "⌄"}
              </Text>
            </Pressable>

            {showMoreCuisines && (
              <View style={styles.additionalCuisineGrid}>
                {additionalCuisines.map((cuisine) => {
                  const selected =
                    selectedCuisine === cuisine.name;

                  return (
                    <Pressable
                      key={cuisine.name}
                      style={[
                        styles.additionalCuisineChip,
                        selected &&
                          styles.additionalCuisineSelected,
                      ]}
                      onPress={() =>
                        setSelectedCuisine(cuisine.name)
                      }
                    >
                      <Text style={styles.additionalCuisineFlag}>
                        {cuisine.flag}
                      </Text>

                      <Text
                        style={[
                          styles.additionalCuisineText,
                          selected &&
                            styles.additionalCuisineTextSelected,
                        ]}
                      >
                        {cuisine.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* POPULAR SEARCHES */}
        {!searchText && selectedCuisine === "All" && (
          <View style={styles.suggestionWrap}>
            <Text style={styles.suggestionHeading}>
              POPULAR SEARCHES
            </Text>

            <View style={styles.suggestionRow}>
              {[
                "Chicken",
                "Pasta",
                "Rice",
                "Avocado",
              ].map((term) => (
                <Pressable
                  key={term}
                  onPress={() => setSearchText(term)}
                  style={styles.suggestion}
                >
                  <Text style={styles.suggestionText}>
                    {term}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* RESULTS HEADER */}
        <View style={styles.resultsHeader}>
          <View style={styles.resultsHeading}>
            <Text style={styles.eyebrow}>
              {searchQuery
                ? "SEARCH RESULTS"
                : "SOMETHING DELICIOUS"}
            </Text>

            <Text style={styles.sectionTitle}>
              {selectedCuisine !== "All"
                ? `${selectedCuisine} recipes`
                : searchQuery
                  ? "Found for you"
                  : "Explore recipes"}
            </Text>
          </View>

          <Text style={styles.resultCount}>
            {showInitialLoading
              ? "Loading..."
              : `${filteredRecipes.length} dishes`}
          </Text>
        </View>

        {/* BACKGROUND REFRESH */}
        {loading && allRecipes.length > 0 && (
          <View style={styles.refreshNotice}>
            <ActivityIndicator
              size="small"
              color="#FF7048"
            />
            <Text style={styles.refreshText}>
              Refreshing recipes...
            </Text>
          </View>
        )}

        {/* INITIAL LOADING */}
        {showInitialLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color="#FF7048"
            />

            <Text style={styles.loadingTitle}>
              Preparing your menu...
            </Text>

            <Text style={styles.loadingText}>
              Finding something delicious for you.
            </Text>
          </View>
        )}

        {/* LOAD ERROR */}
        {!loading && loadError && (
          <View style={styles.errorState}>
            <Text style={styles.emptyEmoji}>⚠️</Text>

            <Text style={styles.emptyTitle}>
              Couldn't refresh recipes
            </Text>

            <Text style={styles.emptyText}>
              We couldn't load the latest recipes.
              Check your connection and try again.
              {allRecipes.length > 0
                ? " You can still browse the recipes already loaded."
                : ""}
            </Text>

            <Pressable
              style={styles.resetButton}
              onPress={retryLoading}
              accessibilityRole="button"
              accessibilityLabel="Retry loading recipes"
            >
              <Text style={styles.resetText}>
                Try again
              </Text>
            </Pressable>
          </View>
        )}

        {/* RECIPE CARDS */}
        {!showInitialLoading &&
          filteredRecipes.map((recipe, index) => {
            const ownRecipe =
              myRecipeIdSet.has(recipe.id);

            return (
              <Pressable
                key={recipe.id}
                style={styles.recipeCard}
                onPress={() => openRecipe(recipe.id)}
                accessibilityRole="button"
                accessibilityLabel={`View ${recipe.title}`}
              >
                <View style={styles.imageWrap}>
                  <RecipeImage
                    uri={recipe.image}
                    style={styles.recipeImage}
                  />

                  <Text style={styles.imageCuisine}>
                    {recipe.cuisine.toUpperCase()}
                  </Text>

                </View>

                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeNumber}>
                    {String(index + 1).padStart(2, "0")}{" "}
                    / YUM DISCOVERY
                  </Text>

                  <Text style={styles.recipeTitle}>
                    {recipe.title}
                  </Text>

                  <Text
                    style={styles.description}
                    numberOfLines={2}
                  >
                    {recipe.description}
                  </Text>

                  <View style={styles.creatorRow}>
                    <View style={styles.creatorAvatar}>
                      {ownRecipe &&
                      avatarIsPhoto &&
                      userProfile ? (
                        <RecipeImage
                          uri={userProfile.avatar}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.creatorEmoji}>
                          {ownRecipe
                            ? userProfile?.avatar || "🍳"
                            : "🍽️"}
                        </Text>
                      )}
                    </View>

                    <View style={styles.creatorInfo}>
                      <Text style={styles.recipeCreator}>
                        {recipe.creator}
                      </Text>

                      {ownRecipe && (
                        <Text style={styles.youLabel}>
                          YOUR RECIPE
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.recipeFooter}>
                    <Text style={styles.time}>
                      ◷ {recipe.time}
                    </Text>

                    <Text style={styles.arrow}>
                      ↗
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

        {/* EMPTY RESULTS */}
        {!loading &&
          !searchingApi &&
          !loadError &&
          filteredRecipes.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>
                {searchQuery ? "🔎" : "🍽️"}
              </Text>

              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? "No matching recipes"
                  : selectedCuisine !== "All"
                    ? "Nothing in this cuisine yet"
                    : "Nothing on the menu"}
              </Text>

              <Text style={styles.emptyText}>
                {searchQuery
                  ? apiError
                    ? "Online search is unavailable. Try again or change your search."
                    : "Try another ingredient, recipe name or cuisine."
                  : selectedCuisine !== "All"
                    ? "Try exploring a different cuisine."
                    : "No recipes are available right now."}
              </Text>

              <Pressable
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetText}>
                  Reset filters
                </Text>
              </Pressable>
            </View>
          )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        {[
          { icon: "⌂", label: "Home" },
          { icon: "⌕", label: "Discover" },
          { icon: "+", label: "Create" },
          { icon: "☆", label: "Saved" },
          { icon: "♙", label: "Profile" },
        ].map((item) => (
          <Pressable
            key={item.label}
            style={styles.navItem}
            onPress={() => {
              if (item.label === "Home") {
                router.replace("/");
              } else if (item.label === "Discover") {
                router.replace("/discover");
              } else if (item.label === "Create") {
                router.push("/create");
              } else if (item.label === "Saved") {
                router.push("/saved");
              } else {
                router.push("/profile");
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
                  item.label === "Discover" &&
                    styles.activeIcon,
                  item.label === "Create" &&
                    styles.createIcon,
                ]}
              >
                {item.icon}
              </Text>
            </View>

            {item.label !== "Create" && (
              <Text
                style={[
                  styles.navLabel,
                  item.label === "Discover" &&
                    styles.activeLabel,
                ]}
              >
                {item.label}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
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
    letterSpacing: 2.5,
    fontWeight: "800",
  },
  title: {
    color: "#F5EBDD",
    fontSize: 42,
    fontWeight: "900",
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
  searchBox: {
    marginHorizontal: 20,
    marginTop: 23,
    marginBottom: 12,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  searchIcon: {
    color: "#D5A16B",
    fontSize: 24,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#F5EBDD",
    fontSize: 12,
  },
  clearSearch: {
    color: "#D5A16B",
    fontSize: 16,
    paddingLeft: 10,
  },
  apiStatus: {
    marginHorizontal: 23,
    marginBottom: 16,
  },
  inlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  apiStatusText: {
    color: "#D5A16B",
    fontSize: 10,
  },
  apiErrorText: {
    color: "#FF9778",
    fontSize: 10,
    flex: 1,
  },
  searchErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smallRetryButton: {
    borderWidth: 1,
    borderColor: "#FF7048",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  smallRetryText: {
    color: "#FF7048",
    fontSize: 11,
    fontWeight: "bold",
  },
  cuisineHeading: {
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#F5EBDD",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 12,
  },
  clearFilter: {
    color: "#FF7048",
    fontSize: 11,
  },
  cuisineRow: {
    paddingHorizontal: 20,
    gap: 9,
    paddingBottom: 8,
  },
  cuisineChip: {
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    alignItems: "center",
  },
  selectedChip: {
    backgroundColor: "#FF7048",
    borderColor: "#FF7048",
  },
  cuisineFlag: {
    fontSize: 21,
    marginBottom: 5,
  },
  cuisineName: {
    color: "#E8DCCB",
    fontSize: 10,
  },
  selectedName: {
    color: "#1A120E",
    fontWeight: "900",
  },
  moreCuisinesSection: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  moreCuisinesButton: {
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moreCuisinesButtonActive: {
    borderColor: "#FF7048",
  },
  moreCuisinesLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moreCuisinesIcon: {
    fontSize: 24,
  },
  moreCuisinesTitle: {
    color: "#F5EBDD",
    fontSize: 13,
    fontWeight: "800",
  },
  moreCuisinesSubtitle: {
    color: "#A99B8D",
    fontSize: 10,
    marginTop: 3,
  },
  moreCuisinesArrow: {
    color: "#D5A16B",
    fontSize: 23,
  },
  additionalCuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 12,
  },
  additionalCuisineChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 7,
  },
  additionalCuisineSelected: {
    backgroundColor: "#FF7048",
    borderColor: "#FF7048",
  },
  additionalCuisineFlag: {
    fontSize: 16,
  },
  additionalCuisineText: {
    color: "#E8DCCB",
    fontSize: 11,
    fontWeight: "600",
  },
  additionalCuisineTextSelected: {
    color: "#1A120E",
    fontWeight: "900",
  },
  suggestionWrap: {
    marginHorizontal: 20,
    marginTop: 18,
  },
  suggestionHeading: {
    color: "#D5A16B",
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: "900",
    marginBottom: 9,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestion: {
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  suggestionText: {
    color: "#E8DCCB",
    fontSize: 10,
  },
  resultsHeader: {
    marginTop: 27,
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  resultsHeading: {
    flex: 1,
  },
  resultCount: {
    color: "#A99B8D",
    fontSize: 10,
    marginBottom: 13,
  },
  recipeCard: {
    marginHorizontal: 20,
    marginTop: 13,
    borderRadius: 18,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
    backgroundColor: "#382B22",
  },
  recipeImage: {
    width: "100%",
    height: 190,
  },
  imageCuisine: {
    position: "absolute",
    bottom: 10,
    left: 10,
    color: "#F5EBDD",
    fontSize: 9,
    fontWeight: "900",
    backgroundColor: "rgba(16,13,10,0.8)",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  recipeInfo: {
    padding: 15,
  },
  recipeNumber: {
    color: "#D5A16B",
    fontSize: 9,
    letterSpacing: 1.5,
  },
  recipeTitle: {
    color: "#F5EBDD",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 7,
  },
  description: {
    color: "#A99B8D",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  creatorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#382B22",
    borderWidth: 1,
    borderColor: "#49372B",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  creatorEmoji: {
    fontSize: 16,
  },
  creatorInfo: {
    marginLeft: 9,
  },
  recipeCreator: {
    color: "#A99B8D",
    fontSize: 11,
  },
  youLabel: {
    color: "#D5A16B",
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: "900",
    marginTop: 3,
  },
  recipeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
  },
  time: {
    color: "#D5A16B",
    fontSize: 11,
  },
  arrow: {
    color: "#D5A16B",
    fontSize: 20,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
    gap: 12,
  },
  loadingTitle: {
    color: "#F5EBDD",
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 6,
  },
  loadingText: {
    color: "#A99B8D",
    fontSize: 12,
    textAlign: "center",
  },
  refreshNotice: {
    marginHorizontal: 20,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#241C17",
    borderRadius: 12,
  },
  refreshText: {
    color: "#D5A16B",
    fontSize: 11,
  },
  errorState: {
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 18,
    padding: 25,
    borderRadius: 18,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#704432",
  },
  emptyState: {
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 35,
    padding: 25,
    borderRadius: 18,
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#F5EBDD",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: "#A99B8D",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  resetButton: {
    backgroundColor: "#FF7048",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 18,
  },
  resetText: {
    color: "#1A120E",
    fontSize: 12,
    fontWeight: "900",
  },
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
  activeLabel: {
    color: "#FFF5E8",
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
