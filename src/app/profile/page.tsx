"use client";

import React from "react";
import { FirebaseError } from "firebase/app";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useAppContext } from "@/lib/app-context";

export default function ProfilePage() {
  const { profile, updateProfile } = useAppContext();
  const [form, setForm] = React.useState({ name: profile.name, role: profile.role });
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm({ name: profile.name, role: profile.role });
  }, [profile.name, profile.role]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);
    setSaving(true);
    try {
      await updateProfile(form);
      setNotice("Profile updated.");
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(`Failed to update profile (${err.code}).`);
      } else {
        setError("Failed to update profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      sectionLabel="Profile"
      title="Edit Profile"
      subtitle="Update your account information"
    >
      <section className="max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Profile Details</h2>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Email
            <input
              type="email"
              value={profile.email}
              disabled
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Role
            <input
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#253b39] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>
    </DashboardShell>
  );
}

