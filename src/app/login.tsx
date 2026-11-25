
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useAuth } from "../utils/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(
        "Missing details",
        "Please enter your email and password."
      );
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await signIn(
        email,
        password
      );

      if (error) {
        Alert.alert(
          "Unable to log in",
          error.message
        );
        return;
      }

      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Connection error",
        "Please check your internet connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.logo}>
            yum<Text style={styles.orange}>.</Text>
          </Text>

          <Text style={styles.eyebrow}>
            WELCOME BACK
          </Text>

          <Text style={styles.title}>
            Your next craving awaits.
          </Text>

          <Text style={styles.subtitle}>
            Log in to save your favourites,
            follow creators and share recipes.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            EMAIL ADDRESS
          </Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#8A7E73"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!submitting}
          />

          <Text style={styles.label}>
            PASSWORD
          </Text>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#8A7E73"
            secureTextEntry
            autoComplete="current-password"
            editable={!submitting}
          />

          <Pressable
            style={[
              styles.primaryButton,
              submitting && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#1A120E" />
            ) : (
              <Text style={styles.primaryText}>
                Log in →
              </Text>
            )}
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.mutedText}>
              New to Yum?{" "}
            </Text>

            <Pressable
              onPress={() => router.replace("/signup")}
            >
              <Text style={styles.linkText}>
                Create an account
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.guestButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.guestText}>
              Continue exploring as a guest
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#17120F",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 55,
    paddingBottom: 35,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
  },
  backText: {
    color: "#D5A16B",
    fontSize: 14,
  },
  heading: {
    marginTop: 35,
    marginBottom: 38,
  },
  logo: {
    color: "#F5EBDD",
    fontSize: 52,
    fontWeight: "900",
    marginBottom: 35,
  },
  orange: {
    color: "#FF7048",
  },
  eyebrow: {
    color: "#D5A16B",
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "800",
  },
  title: {
    color: "#F5EBDD",
    fontSize: 31,
    fontWeight: "900",
    marginTop: 12,
    lineHeight: 38,
  },
  subtitle: {
    color: "#A99B8D",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  form: {
    gap: 12,
  },
  label: {
    color: "#D5A16B",
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: 12,
  },
  input: {
    backgroundColor: "#241C17",
    borderWidth: 1,
    borderColor: "#382B22",
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    color: "#F5EBDD",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#FF7048",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryText: {
    color: "#1A120E",
    fontSize: 15,
    fontWeight: "900",
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  mutedText: {
    color: "#A99B8D",
    fontSize: 13,
  },
  linkText: {
    color: "#FF7048",
    fontSize: 13,
    fontWeight: "800",
  },
  guestButton: {
    alignItems: "center",
    padding: 15,
    marginTop: 15,
  },
  guestText: {
    color: "#D5A16B",
    fontSize: 13,
  },
});
