"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { db, schedulesCollectionRef } from "@/lib/firebase";
import { PH_TIME_ZONE, getCurrentPHDateKey } from "@/lib/time";
import {
  addDoc,
  deleteDoc,
  FirestoreError,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type ScheduleStatus = "pending" | "done";

type ScheduleEntry = {
  id: string;
  title: string;
  scheduleDate: string;
  scheduleTime: string;
  notes: string;
  status: ScheduleStatus;
};

type ScheduleForm = {
  title: string;
  scheduleDate: string;
  scheduleTime: string;
  notes: string;
};

const emptyForm: ScheduleForm = {
  title: "",
  scheduleDate: "",
  scheduleTime: "09:00",
  notes: "",
};

const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function toDateTimeMs(dateValue: string, timeValue: string) {
  if (!dateValue) return 0;
  const safeTime = timeValue && /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : "00:00";
  return Date.parse(`${dateValue}T${safeTime}:00+08:00`);
}

function monthLabel(anchor: Date) {
  return anchor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: PH_TIME_ZONE,
  });
}

function timeLabel(value: string) {
  const ms = toDateTimeMs("2000-01-01", value || "00:00");
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: PH_TIME_ZONE,
  });
}

function dateLongLabel(dateKey: string) {
  return fromDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: PH_TIME_ZONE,
  });
}

function buildCalendarGrid(anchorDate: Date) {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const days: Date[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export default function CalendarPage() {
  const todayKey = getCurrentPHDateKey();
  const [calendarAnchor, setCalendarAnchor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [form, setForm] = useState<ScheduleForm>({ ...emptyForm, scheduleDate: todayKey });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(schedulesCollectionRef),
      (snapshot) => {
        setError(null);
        const rows = snapshot.docs
          .map((docEntry) => {
            const data = docEntry.data();
            return {
              id: docEntry.id,
              title: String(data.title ?? ""),
              scheduleDate: String(data.scheduleDate ?? ""),
              scheduleTime: String(data.scheduleTime ?? "00:00"),
              notes: String(data.notes ?? ""),
              status: (data.status as ScheduleStatus) ?? "pending",
            };
          })
          .sort(
            (a, b) =>
              toDateTimeMs(a.scheduleDate, a.scheduleTime) -
              toDateTimeMs(b.scheduleDate, b.scheduleTime)
          );
        setSchedules(rows);
        setLoading(false);
      },
      (snapshotError: FirestoreError) => {
        setError(
          `Failed to load schedules from Firebase (${snapshotError.code}).`
        );
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setForm((prev) => ({ ...prev, scheduleDate: selectedDay }));
  }, [selectedDay]);

  const calendarDays = useMemo(() => buildCalendarGrid(calendarAnchor), [calendarAnchor]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    schedules.forEach((entry) => {
      const bucket = map.get(entry.scheduleDate) ?? [];
      bucket.push(entry);
      map.set(entry.scheduleDate, bucket);
    });
    map.forEach((bucket) =>
      bucket.sort((a, b) => toDateTimeMs(a.scheduleDate, a.scheduleTime) - toDateTimeMs(b.scheduleDate, b.scheduleTime))
    );
    return map;
  }, [schedules]);

  const selectedDaySchedules = useMemo(() => {
    return (scheduleMap.get(selectedDay) ?? []).slice().sort((a, b) => {
      return toDateTimeMs(a.scheduleDate, a.scheduleTime) - toDateTimeMs(b.scheduleDate, b.scheduleTime);
    });
  }, [scheduleMap, selectedDay]);

  const nowMs = Date.now();
  const pendingToday = schedules.filter((row) => row.status === "pending" && row.scheduleDate === todayKey).length;
  const upcoming = schedules.filter(
    (row) => row.status === "pending" && toDateTimeMs(row.scheduleDate, row.scheduleTime) > nowMs
  ).length;
  const past = schedules.filter(
    (row) => row.status === "done" || toDateTimeMs(row.scheduleDate, row.scheduleTime) < nowMs
  ).length;

  const submitSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Schedule title is required.");
      return;
    }
    if (!form.scheduleDate) {
      setError("Schedule date is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        scheduleDate: form.scheduleDate,
        scheduleTime: form.scheduleTime || "09:00",
        notes: form.notes.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "schedules", editingId), payload);
      } else {
        await addDoc(schedulesCollectionRef, {
          ...payload,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }

      setEditingId(null);
      setForm({ ...emptyForm, scheduleDate: selectedDay });
    } catch {
      setError("Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry: ScheduleEntry) => {
    setEditingId(entry.id);
    setSelectedDay(entry.scheduleDate);
    setForm({
      title: entry.title,
      scheduleDate: entry.scheduleDate,
      scheduleTime: entry.scheduleTime,
      notes: entry.notes,
    });
    setError(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, scheduleDate: selectedDay });
    setError(null);
  };

  const toggleDone = async (entry: ScheduleEntry) => {
    setError(null);
    try {
      await updateDoc(doc(db, "schedules", entry.id), {
        status: entry.status === "pending" ? "done" : "pending",
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError("Failed to update schedule status.");
    }
  };

  const removeSchedule = async (entry: ScheduleEntry) => {
    const confirmed = window.confirm("Delete this schedule?");
    if (!confirmed) return;

    setError(null);
    try {
      await deleteDoc(doc(db, "schedules", entry.id));
      if (editingId === entry.id) {
        resetForm();
      }
    } catch {
      setError("Failed to delete schedule.");
    }
  };

  return (
    <DashboardShell
      sectionLabel="Calendar"
      title="Schedule Calendar"
      subtitle="Google-calendar style monthly view with daily schedule management"
    >
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          { label: "All Schedules", value: schedules.length.toLocaleString("en-US") },
          { label: "Pending Today", value: pendingToday.toLocaleString("en-US") },
          { label: "Upcoming", value: upcoming.toLocaleString("en-US") },
          { label: "Past / Done", value: past.toLocaleString("en-US") },
        ].map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="text-xl font-bold text-slate-900">{monthLabel(calendarAnchor)}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCalendarAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setCalendarAnchor(new Date())}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCalendarAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {weekLabels.map((label) => (
                  <div key={label} className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
              const dateKey = toDateKey(day);
              const dayRows = scheduleMap.get(dateKey) ?? [];
              const inCurrentMonth = day.getMonth() === calendarAnchor.getMonth();
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDay;
              const pendingCount = dayRows.filter((row) => row.status === "pending").length;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDay(dateKey)}
                  className={`min-h-[132px] border-b border-r border-slate-200 p-2 text-left transition-all duration-200 hover:bg-slate-50 ${
                    isSelected ? "bg-[#253b39]/8" : "bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? "bg-[#253b39] text-white" : "text-slate-700"
                      } ${!inCurrentMonth ? "opacity-40" : ""}`}
                    >
                      {day.getDate()}
                    </span>
                    {pendingCount > 0 ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        {pendingCount}
                      </span>
                    ) : null}
                  </div>

                  <div className={`${!inCurrentMonth ? "opacity-50" : ""}`}>
                    {dayRows.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className={`mb-1 truncate rounded px-1.5 py-1 text-[11px] ${
                          item.status === "done"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                        title={`${timeLabel(item.scheduleTime)} - ${item.title}`}
                      >
                        {timeLabel(item.scheduleTime)} {item.title}
                      </div>
                    ))}
                    {dayRows.length > 2 ? (
                      <p className="text-[11px] font-medium text-slate-500">+{dayRows.length - 2} more</p>
                    ) : null}
                  </div>
                </button>
              );
                })}
              </div>
            </div>
          </div>
        </article>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-lg font-bold text-slate-900">{dateLongLabel(selectedDay)}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {selectedDaySchedules.length} schedule{selectedDaySchedules.length === 1 ? "" : "s"} on this day
              </p>
            </div>
            <div className="max-h-[280px] space-y-2 overflow-auto p-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading schedules...</p>
              ) : selectedDaySchedules.length === 0 ? (
                <p className="text-sm text-slate-500">No schedules on this day.</p>
              ) : (
                selectedDaySchedules.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-slate-200 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          entry.status === "done"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {entry.status === "done" ? "Done" : "Pending"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{timeLabel(entry.scheduleTime)}</p>
                    {entry.notes ? <p className="mt-1 text-xs text-slate-500">{entry.notes}</p> : null}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-xs font-semibold text-[#253b39] underline underline-offset-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleDone(entry)}
                        className="text-xs font-semibold text-slate-700 underline underline-offset-2"
                      >
                        {entry.status === "done" ? "Mark Pending" : "Mark Done"}
                      </button>
                      <button
                        onClick={() => removeSchedule(entry)}
                        className="text-xs font-semibold text-red-600 underline underline-offset-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Schedule" : "Add Schedule"}
              </h3>
            </div>
            <form onSubmit={submitSchedule} className="space-y-3 p-4">
              <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-[#253b39]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Date
                  <input
                    type="date"
                    value={form.scheduleDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, scheduleDate: e.target.value }))}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-[#253b39]"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Time
                  <input
                    type="time"
                    value={form.scheduleTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, scheduleTime: e.target.value }))}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-[#253b39]"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-[#253b39]"
                />
              </label>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[#253b39] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </form>
          </section>
        </aside>
      </section>
    </DashboardShell>
  );
}
