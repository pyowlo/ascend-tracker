"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { useAppContext } from "@/lib/app-context";

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, login } = useAppContext();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [hydrated, isAuthenticated, router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/invalid-credential") {
          setError("Invalid email or password.");
        } else if (err.code === "auth/configuration-not-found") {
          setError(
            "Email/Password auth is not enabled in Firebase. Enable it in Firebase Console > Authentication > Sign-in method > Email/Password."
          );
        } else if (err.code === "auth/invalid-email") {
          setError("Invalid email format.");
        } else {
          setError(`Authentication failed (${err.code}).`);
        }
      } else {
        setError("Authentication failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-[Inter,sans-serif] dark:bg-slate-900">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sign in to access Ascend Tracker.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-[#253b39] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Please wait..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
