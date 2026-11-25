import { useState } from "react";
import {
    Image,
    ImageStyle,
    StyleProp,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Props = {
  uri: string;
  style?: StyleProp<ImageStyle>;
};

export default function RecipeImage({ uri, style }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed || !uri) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.emoji}>🍽️</Text>
        <Text style={styles.brand}>yum.</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#382B22",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  emoji: {
    fontSize: 36,
  },
  brand: {
    color: "#D5A16B",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5,
    letterSpacing: 2,
  },
});