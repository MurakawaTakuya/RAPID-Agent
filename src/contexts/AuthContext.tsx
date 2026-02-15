"use client";

import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  User,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        try {
          // トークン取得
          const token = await user.getIdToken();

          // ユーザー情報をDBに保存/更新
          await fetch("/api/user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: user.email,
              displayName: user.displayName,
              photoUrl: user.photoURL,
            }),
          });
        } catch (error) {
          console.error("Error syncing user to DB:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      console.error("Firebase is not configured");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("ログインしました");
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("ログインに失敗しました");
    }
  };

  const signOut = async () => {
    if (!auth) {
      console.error("Firebase is not configured");
      return;
    }
    try {
      await firebaseSignOut(auth);
      toast.success("ログアウトしました");
    } catch (error) {
      console.error("Sign-out error:", error);
      toast.error("ログアウトに失敗しました");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
