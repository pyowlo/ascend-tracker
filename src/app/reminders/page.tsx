"use client";

import React from "react";
import Link from "next/link";
import { BellRing, Clock3, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useAutomatedReminders } from "@/lib/use-automated-reminders";

function severityStyle(severity: "critical" | "warning" | "info") {
  if (severity === "critical") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function SeverityIcon({ severity }: { severity: "critical" | "warning" | "info" }) {
  if (severity === "critical") return <ShieldAlert className="h-4 w-4" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

export default function RemindersPage() {
  const { reminders, unreadCount, loading, dismissForToday, snoozeOneDay, clearAllDismissals } =
    useAutomatedReminders();

  return (
    <DashboardShell
      sectionLabel="Reminders"
      title="Automated Reminders"
      subtitle="Daily operational alerts for deliveries, receivables, schedules, and stock risk"
    >
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Active Alerts</p>
          <p className="mt-2 text-4xl font-extrabold text-slate-900">{unreadCount}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Reminder Mode</p>
          <p className="mt-2 text-xl font-bold text-slate-900">Live Firebase Monitoring</p>
          <p className="mt-1 text-xs text-slate-500">Auto-updates from sales, inventory, schedules</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Actions</p>
          <button
            type="button"
            onClick={clearAllDismissals}
            className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
          >
            Reset Hidden Reminders
          </button>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-2xl font-bold text-slate-900">Reminder Queue</h2>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Loading reminders...
            </div>
          ) : reminders.length === 0 ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-center">
              <div className="mx-auto mb-2 w-fit rounded-full bg-emerald-100 p-3 text-emerald-700">
                <BellRing className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-emerald-800">No active reminders right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <article
                  key={reminder.id}
                  className={`rounded-md border p-4 ${severityStyle(reminder.severity)}`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em]">
                        <SeverityIcon severity={reminder.severity} />
                        {reminder.severity}
                      </div>
                      <h3 className="text-base font-bold">{reminder.title}</h3>
                      <p className="mt-1 text-sm">{reminder.message}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={reminder.actionHref}
                        className="rounded-md bg-[#253b39] px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130]"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => dismissForToday(reminder.id)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
                      >
                        Dismiss Today
                      </button>
                      <button
                        type="button"
                        onClick={() => snoozeOneDay(reminder.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        Snooze 1 Day
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
