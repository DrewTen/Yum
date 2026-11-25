
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getFollowing, toggleFollow } from "../utils/following";

const BG = "#17120F";
const CARD = "#241C17";
const CREAM = "#F5EBDD";
const MUTED = "#A99B8D";
const ORANGE = "#FF7048";
const BORDER = "#382B22";

export default function FollowingListScreen() {
  const [creators, setCreators] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCreators = useCallback(async () => {
    const list = await getFollowing();
    setCreators(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCreators();
    }, [loadCreators])
  );

  async function handleUnfollow(name: string) {
    const updated = await toggleFollow(name);
    setCreators(updated);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Following</Text>
          <Text style={styles.subtitle}>YOUR FAVOURITE CREATORS</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Loading...</Text>
        </View>
      ) : creators.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>♡</Text>
          <Text style={styles.emptyTitle}>You're not following anyone yet</Text>
          <Text style={styles.muted}>
            Discover food creators and follow the ones whose recipes you love.
          </Text>

          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => router.push("/discover")}
          >
            <Text style={styles.discoverText}>Discover creators</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.countText}>
            {creators.length} {creators.length === 1 ? "CREATOR" : "CREATORS"}
          </Text>

          {creators.map((name) => (
            <View style={styles.creatorCard} key={name}>
              <TouchableOpacity
                style={styles.creatorInfo}
                onPress={() =>
                  router.push({
                    pathname: "/creator/[name]",
                    params: { name },
                  })
                }
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.nameColumn}>
                  <Text style={styles.creatorName}>{name}</Text>
                  <Text style={styles.creatorSubtitle}>Recipe creator</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.unfollowButton}
                onPress={() => handleUnfollow(name)}
              >
                <Text style={styles.unfollowText}>Following ✓</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: CREAM, fontSize: 30, marginTop: -3 },
  headerCenter: { alignItems: "center" },
  title: { color: CREAM, fontSize: 24, fontWeight: "800" },
  subtitle: { color: MUTED, fontSize: 9, letterSpacing: 2, marginTop: 5 },
  list: { paddingHorizontal: 18, paddingBottom: 30 },
  countText: {
    color: "#D5A16B",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "bold",
    marginBottom: 15,
  },
  creatorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 13,
    marginBottom: 12,
  },
  creatorInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#493528",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: CREAM, fontSize: 18, fontWeight: "800" },
  nameColumn: { flex: 1 },
  creatorName: { color: CREAM, fontSize: 14, fontWeight: "800" },
  creatorSubtitle: { color: MUTED, fontSize: 11, marginTop: 4 },
  unfollowButton: {
    backgroundColor: "#17120F",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  unfollowText: { color: CREAM, fontSize: 11, fontWeight: "700" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },
  emptyEmoji: { color: ORANGE, fontSize: 45, marginBottom: 18 },
  emptyTitle: {
    color: CREAM,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  muted: {
    color: MUTED,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  discoverButton: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 25,
    marginTop: 22,
  },
  discoverText: { color: BG, fontWeight: "800" },
});
