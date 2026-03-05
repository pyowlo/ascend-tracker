"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAppContext } from "@/lib/app-context";
import { useAutomatedReminders } from "@/lib/use-automated-reminders";

interface DashboardShellProps {
  sectionLabel: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function DashboardShell({
  sectionLabel,
  title,
  subtitle,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const { hydrated, isAuthenticated, logout, theme, toggleTheme } = useAppContext();
  const { unreadCount } = useAutomatedReminders();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-[Inter,sans-serif] dark:bg-slate-900">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onLogout={handleLogout}
      />

      <main className="min-h-screen flex-1 p-4 sm:p-6 lg:ml-[220px]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-700 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium uppercase tracking-[0.07em] text-slate-400 dark:text-slate-500">
                Ascend Tracker
              </span>
              <span className="text-xs text-slate-300 dark:text-slate-600">/</span>
              <span className="text-xs font-semibold uppercase tracking-[0.07em] text-[#253b39] dark:text-teal-300">
                {sectionLabel}
              </span>
            </div>
            <h1 className="mb-1 text-[28px] font-extrabold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
            <Link
              href="/reminders"
              className="relative inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <BellRing className="h-4 w-4" />
              Reminders
              {unreadCount > 0 ? (
                <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <UserRound className="h-4 w-4" />
              Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden items-center gap-1 rounded-md bg-[#253b39] px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] lg:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
