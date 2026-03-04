"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type ThemeMode = "light" | "dark";

type UserProfile = {
  name: string;
  email: string;
  role: string;
};

type AppContextValue = {
  hydrated: boolean;
  isAuthenticated: boolean;
  profile: UserProfile;
  theme: ThemeMode;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (next: Pick<UserProfile, "name" | "role">) => Promise<void>;
  toggleTheme: () => void;
};

const defaultProfile: UserProfile = {
  name: "User",
  email: "",
  role: "Admin",
};

const ROLE_KEY = "ascend_profile_role";
const THEME_KEY = "ascend_theme";

const AppContext = createContext<AppContextValue | null>(null);

function deriveNameFromEmail(email: string) {
  const local = email.split("@")[0] || "user";
  return local
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("Admin");
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const rawRole = localStorage.getItem(ROLE_KEY);
    const rawTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (rawRole) {
      setRole(rawRole);
    }
    if (rawTheme === "dark" || rawTheme === "light") {
      setTheme(rawTheme);
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setHydrated(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [hydrated, theme]);

  const profile: UserProfile = useMemo(() => {
    if (!user) {
      return { ...defaultProfile, role };
    }
    const email = user.email ?? "";
    return {
      name: user.displayName || deriveNameFromEmail(email) || defaultProfile.name,
      email,
      role,
    };
  }, [user, role]);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      isAuthenticated: !!user,
      profile,
      theme,
      login: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        await signOut(auth);
      },
      updateProfile: async (next) => {
        if (auth.currentUser) {
          await updateFirebaseProfile(auth.currentUser, {
            displayName: next.name,
          });
        }
        setRole(next.role || "Admin");
        localStorage.setItem(ROLE_KEY, next.role || "Admin");
      },
      toggleTheme: () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [hydrated, profile, theme, user]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}
