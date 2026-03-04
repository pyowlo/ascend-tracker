"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { db } from "@/lib/firebase";
import { getCurrentPHDateKey } from "@/lib/time";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

type SaleStatus = "pending" | "delivered" | "returned";
type PaymentMethod = "cash" | "bank_transfer" | "pending_payment";

type DeliverySale = {
  id: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  total: number;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  deliveryDate: string;
  deliveryTime: string;
  linkedScheduleId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
};

type DeliveryBucket = "overdue" | "today" | "upcoming" | "unscheduled";

type RescheduleDraft = {
  deliveryDate: string;
  deliveryTime: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function toPhMs(dateKey: string, timeValue: string) {
  if (!dateKey) return 0;
  const safeTime = timeValue && /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : "00:00";
  return Date.parse(`${dateKey}T${safeTime}:00+08:00`);
}

function addDaysDateKey(dateKey: string, days: number) {
  if (!dateKey) return "";
  const ms = Date.parse(`${dateKey}T00:00:00+08:00`);
  if (Number.isNaN(ms)) return "";
  const next = new Date(ms + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(next);
}

function paymentLabel(value: PaymentMethod) {
  if (value === "bank_transfer") return "Bank Transfer";
  if (value === "pending_payment") return "Pending Payment";
  return "Cash";
}

function getBucket(row: DeliverySale, todayKey: string): DeliveryBucket {
  if (!row.deliveryDate) return "unscheduled";
  if (row.deliveryDate < todayKey) return "overdue";
  if (row.deliveryDate > todayKey) return "upcoming";
  return "today";
}

export default function DeliveriesPage() {
  const todayKey = getCurrentPHDateKey();
  const [sales, setSales] = useState<DeliverySale[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RescheduleDraft>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "sales")),
      (snapshot) => {
        const rows = snapshot.docs
          .map((entry) => {
            const data = entry.data();
            const normalizedStatus = data.status === "pending_payment" ? "pending" : data.status;
            return {
              id: entry.id,
              itemName: String(data.itemName ?? ""),
              itemCode: String(data.itemCode ?? ""),
              quantity: Number(data.quantity ?? 0),
              total: Number(data.total ?? 0),
              status: (normalizedStatus as SaleStatus) ?? "pending",
              paymentMethod: (data.paymentMethod as PaymentMethod) ?? "cash",
              deliveryDate: String(data.deliveryDate ?? ""),
              deliveryTime: String(data.deliveryTime ?? ""),
              linkedScheduleId: String(data.linkedScheduleId ?? ""),
              customerName: String(data.customerName ?? ""),
              customerPhone: String(data.customerPhone ?? ""),
              customerAddress: String(data.customerAddress ?? ""),
            };
          })
          .filter((row) => row.status === "pending")
          .sort((a, b) => toPhMs(a.deliveryDate, a.deliveryTime) - toPhMs(b.deliveryDate, b.deliveryTime));

        setSales(rows);
        setDrafts((prev) => {
          const next: Record<string, RescheduleDraft> = {};
          rows.forEach((row) => {
            next[row.id] = prev[row.id] ?? {
              deliveryDate: row.deliveryDate || todayKey,
              deliveryTime: row.deliveryTime || "09:00",
            };
          });
          return next;
        });
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("Failed to load delivery board from Firebase.");
      }
    );
    return () => unsubscribe();
  }, [todayKey]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((row) => {
      return (
        row.itemName.toLowerCase().includes(q) ||
        row.itemCode.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q) ||
        row.customerPhone.toLowerCase().includes(q)
      );
    });
  }, [sales, searchQuery]);

  const board = useMemo(() => {
    const buckets: Record<DeliveryBucket, DeliverySale[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      unscheduled: [],
    };
    filtered.forEach((row) => {
      buckets[getBucket(row, todayKey)].push(row);
    });
    return buckets;
  }, [filtered, todayKey]);

  const metrics = useMemo(() => {
    const pendingCount = filtered.length;
    const overdueCount = board.overdue.length;
    const dueTodayCount = board.today.length;
    const upcomingCount = board.upcoming.length;
    const pendingPaymentCount = filtered.filter((row) => row.paymentMethod === "pending_payment").length;
    return { pendingCount, overdueCount, dueTodayCount, upcomingCount, pendingPaymentCount };
  }, [board, filtered]);

  const setDraft = (id: string, patch: Partial<RescheduleDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        deliveryDate: prev[id]?.deliveryDate ?? todayKey,
        deliveryTime: prev[id]?.deliveryTime ?? "09:00",
        ...patch,
      },
    }));
  };

  const syncScheduleToDone = async (sale: DeliverySale) => {
    if (sale.linkedScheduleId) {
      await updateDoc(doc(db, "schedules", sale.linkedScheduleId), {
        status: "done",
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const matchQuery = query(collection(db, "schedules"), where("saleId", "==", sale.id));
    const snapshot = await getDocs(matchQuery);
    for (const scheduleDoc of snapshot.docs) {
      await updateDoc(doc(db, "schedules", scheduleDoc.id), {
        status: "done",
        updatedAt: serverTimestamp(),
      });
    }
  };

  const markDelivered = async (sale: DeliverySale) => {
    setActiveId(sale.id);
    setError(null);
    try {
      await updateDoc(doc(db, "sales", sale.id), {
        status: "delivered",
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await syncScheduleToDone(sale);
    } catch {
      setError("Failed to mark delivery as completed.");
    } finally {
      setActiveId(null);
    }
  };

  const reschedule = async (sale: DeliverySale, toTomorrow = false) => {
    const draft = drafts[sale.id] ?? {
      deliveryDate: sale.deliveryDate || todayKey,
      deliveryTime: sale.deliveryTime || "09:00",
    };
    const nextDate = toTomorrow ? addDaysDateKey(todayKey, 1) : draft.deliveryDate;
    const nextTime = draft.deliveryTime || "09:00";
    if (!nextDate) {
      setError("Delivery date is required.");
      return;
    }

    setActiveId(sale.id);
    setError(null);
    try {
      await updateDoc(doc(db, "sales", sale.id), {
        deliveryDate: nextDate,
        deliveryTime: nextTime,
        status: "pending",
        updatedAt: serverTimestamp(),
      });

      if (sale.linkedScheduleId) {
        await updateDoc(doc(db, "schedules", sale.linkedScheduleId), {
          scheduleDate: nextDate,
          scheduleTime: nextTime,
          status: "pending",
          updatedAt: serverTimestamp(),
        });
      } else {
        const scheduleRef = await addDoc(collection(db, "schedules"), {
          title: `Deliver ${sale.itemName}`,
          scheduleDate: nextDate,
          scheduleTime: nextTime,
          notes: `Customer: ${sale.customerName} | Phone: ${sale.customerPhone} | Address: ${sale.customerAddress} | Sale ID: ${sale.id}`,
          status: "pending",
          source: "sales",
          saleId: sale.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "sales", sale.id), {
          linkedScheduleId: scheduleRef.id,
          updatedAt: serverTimestamp(),
        });
      }

      setDraft(sale.id, { deliveryDate: nextDate, deliveryTime: nextTime });
    } catch {
      setError("Failed to reschedule delivery.");
    } finally {
      setActiveId(null);
    }
  };

  return (
    <DashboardShell
      sectionLabel="Delivery Board"
      title="Delivery Board"
      subtitle="Track pending deliveries by urgency and complete fulfillment faster"
    >
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {[
          { label: "Pending Deliveries", value: metrics.pendingCount.toLocaleString("en-US") },
          { label: "Overdue", value: metrics.overdueCount.toLocaleString("en-US") },
          { label: "Due Today", value: metrics.dueTodayCount.toLocaleString("en-US") },
          { label: "Upcoming", value: metrics.upcomingCount.toLocaleString("en-US") },
          { label: "Pending Payment", value: metrics.pendingPaymentCount.toLocaleString("en-US") },
        ].map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {[
          { key: "overdue", label: "Overdue", accent: "border-red-200 bg-red-50/40" },
          { key: "today", label: "Today", accent: "border-amber-200 bg-amber-50/40" },
          { key: "upcoming", label: "Upcoming", accent: "border-blue-200 bg-blue-50/40" },
          { key: "unscheduled", label: "Unscheduled", accent: "border-slate-200 bg-slate-50/50" },
        ].map((column) => {
          const rows = board[column.key as DeliveryBucket];
          return (
            <article
              key={column.key}
              className={`min-h-[460px] rounded-lg border p-3 shadow-sm ${column.accent}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-slate-700">{column.label}</h2>
                <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {rows.length}
                </span>
              </div>

              {loading ? (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-500">
                  Loading...
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-500">
                  No deliveries.
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((sale) => {
                    const draft = drafts[sale.id] ?? {
                      deliveryDate: sale.deliveryDate || todayKey,
                      deliveryTime: sale.deliveryTime || "09:00",
                    };
                    return (
                      <div key={sale.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="mb-2">
                          <p className="text-sm font-bold text-slate-900">{sale.itemName}</p>
                          <p className="text-xs text-slate-500">
                            {sale.itemCode} | Qty {sale.quantity}
                          </p>
                        </div>

                        <div className="mb-2 text-xs text-slate-600">
                          <p className="font-semibold text-slate-800">{sale.customerName || "Unknown Customer"}</p>
                          <p>{sale.customerPhone || "-"}</p>
                          <p>{sale.customerAddress || "-"}</p>
                        </div>

                        <div className="mb-2 flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {formatCurrency(sale.total)}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              sale.paymentMethod === "pending_payment"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {paymentLabel(sale.paymentMethod)}
                          </span>
                        </div>

                        <div className="mb-3 grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={draft.deliveryDate}
                            onChange={(e) => setDraft(sale.id, { deliveryDate: e.target.value })}
                            className="rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                          />
                          <input
                            type="time"
                            value={draft.deliveryTime}
                            onChange={(e) => setDraft(sale.id, { deliveryTime: e.target.value })}
                            className="rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                          />
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => markDelivered(sale)}
                            disabled={activeId === sale.id}
                            className="rounded bg-[#253b39] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:opacity-60"
                          >
                            {activeId === sale.id ? "Saving..." : "Mark Delivered"}
                          </button>
                          <button
                            type="button"
                            onClick={() => reschedule(sale, false)}
                            disabled={activeId === sale.id}
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Save Schedule
                          </button>
                          <button
                            type="button"
                            onClick={() => reschedule(sale, true)}
                            disabled={activeId === sale.id}
                            className="rounded border border-[#253b39] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#253b39] transition-colors duration-200 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Move Tomorrow
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </DashboardShell>
  );
}
