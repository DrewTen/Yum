
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

export default function SignupScreen() {
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup() {
    if (
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        "Missing details",
        "Please complete all fields."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password too short",
        "Please use at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords don't match",
        "Please check your passwords."
      );
      return;
    }

    setSubmitting(true);

    try {
      const {
        error,
        needsEmailConfirmation,
      } = await signUp(email, password);

      if (error) {
        Alert.alert(
          "Unable to create account",
          error.message
        );
        return;
      }

      if (needsEmailConfirmation) {
        Alert.alert(
          "Check your email",
          "We've sent you a confirmation email. Open the link to verify your account, then return to Yum and log in.",
          [
            {
              text: "Go to login",
              onPress: () =>
                router.replace("/login"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Welcome to Yum!",
          "Your account has been created.",
          [
            {
              text: "Start exploring",
              onPress: () =>
                router.replace("/"),
            },
          ]
        );
      }
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
            JOIN THE COMMUNITY
          </Text>

          <Text style={styles.title}>
            Good food starts here.
          </Text>

          <Text style={styles.subtitle}>
            Create an account to collect recipes,
            discover new favourites and share
            your cooking.
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
            placeholder="Create a password"
            placeholderTextColor="#8A7E73"
            secureTextEntry
            autoComplete="new-password"
            editable={!submitting}
          />

          <Text style={styles.label}>
            CONFIRM PASSWORD
          </Text>

          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
            placeholderTextColor="#8A7E73"
            secureTextEntry
            editable={!submitting}
          />

          <Pressable
            style={[
              styles.primaryButton,
              submitting && styles.disabledButton,
            ]}
            onPress={handleSignup}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#1A120E" />
            ) : (
              <Text style={styles.primaryText}>
                Create account →
              </Text>
            )}
          </Pressable>

          <View style={styles.loginRow}>
            <Text style={styles.mutedText}>
              Already have an account?{" "}
            </Text>

            <Pressable
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.linkText}>
                Log in
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.guestButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.guestText}>
              Explore Yum without an account
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
    marginTop: 25,
    marginBottom: 28,
  },
  logo: {
    color: "#F5EBDD",
    fontSize: 48,
    fontWeight: "900",
    marginBottom: 25,
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
    fontSize: 30,
    fontWeight: "900",
    marginTop: 12,
  },
  subtitle: {
    color: "#A99B8D",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 12,
  },
  form: {
    gap: 10,
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
    height: 52,
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
  loginRow: {
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
