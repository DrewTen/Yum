
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type {
    AuthError,
    Session,
    User,
} from "@supabase/supabase-js";

import { supabase } from "../services/supabase";

type AuthResult = {
  error: AuthError | null;
  needsEmailConfirmation?: boolean;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLoggedIn: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string
  ) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          console.log(
            "Error loading Supabase session:",
            error.message
          );
        }

        setSession(data.session);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;

        console.log(
          "Error restoring session:",
          error
        );

        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (active) {
          setSession(nextSession);
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(
    email: string,
    password: string
  ): Promise<AuthResult> {
    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    return { error };
  }

  async function signUp(
    email: string,
    password: string
  ): Promise<AuthResult> {
    const { data, error } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

    return {
      error,
      needsEmailConfirmation:
        !error && !data.session,
    };
  }

  async function signOut(): Promise<AuthResult> {
    const { error } = await supabase.auth.signOut();

    return { error };
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isLoggedIn: !!session?.user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
