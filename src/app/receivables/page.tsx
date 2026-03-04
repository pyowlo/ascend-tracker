"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { db } from "@/lib/firebase";
import { formatDateInPH, formatDateTimeInPH, getCurrentPHDateKey, getCurrentPHIsoString } from "@/lib/time";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type SaleStatus = "pending" | "delivered" | "returned";
type PaymentMethod = "cash" | "bank_transfer" | "pending_payment";

type PaymentEntry = {
  amount: number;
  method: "cash" | "bank_transfer";
  paidAt: string;
  note: string;
};

type ReceivableRow = {
  id: string;
  itemCode: string;
  itemName: string;
  total: number;
  paidAmount: number;
  balanceRemaining: number;
  paymentHistory: PaymentEntry[];
  saleDate: string;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  paymentDueDate: string;
  receivableNotes: string;
};

type DraftRow = {
  paymentDueDate: string;
  receivableNotes: string;
  paymentInput: string;
  paymentMethodInput: "cash" | "bank_transfer";
  paymentNoteInput: string;
  balanceAdjustInput: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function toPhMidnightMs(dateKey: string) {
  if (!dateKey) return 0;
  return Date.parse(`${dateKey}T00:00:00+08:00`);
}

function toDateKey(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function getAgingDays(saleDate: string, todayKey: string) {
  const start = toPhMidnightMs(toDateKey(saleDate));
  const today = toPhMidnightMs(todayKey);
  if (!start || !today) return 0;
  return Math.max(0, Math.floor((today - start) / 86_400_000));
}

function getAgingBucket(days: number) {
  if (days <= 7) return "0-7 days";
  if (days <= 14) return "8-14 days";
  return "15+ days";
}

export default function ReceivablesPage() {
  const todayKey = getCurrentPHDateKey();
  const [sales, setSales] = useState<ReceivableRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [bucketFilter, setBucketFilter] = useState<"all" | "0-7 days" | "8-14 days" | "15+ days">("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
              itemCode: String(data.itemCode ?? ""),
              itemName: String(data.itemName ?? ""),
              total: Number(data.total ?? 0),
              paidAmount: Number(data.paidAmount ?? 0),
              balanceRemaining: Number(data.balanceRemaining ?? Number(data.total ?? 0)),
              paymentHistory: Array.isArray(data.paymentHistory)
                ? (data.paymentHistory as PaymentEntry[])
                : [],
              saleDate: String(data.saleDate ?? ""),
              status: (normalizedStatus as SaleStatus) ?? "pending",
              paymentMethod: (data.paymentMethod as PaymentMethod) ?? "cash",
              customerName: String(data.customerName ?? ""),
              customerPhone: String(data.customerPhone ?? ""),
              paymentDueDate: String(data.paymentDueDate ?? ""),
              receivableNotes: String(data.receivableNotes ?? ""),
            };
          })
          .filter((row) => row.paymentMethod === "pending_payment")
          .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

        setSales(rows);
        setDrafts((prev) => {
          const next: Record<string, DraftRow> = {};
          rows.forEach((row) => {
            next[row.id] = prev[row.id] ?? {
              paymentDueDate: row.paymentDueDate,
              receivableNotes: row.receivableNotes,
              paymentInput: "",
              paymentMethodInput: "cash",
              paymentNoteInput: "",
              balanceAdjustInput: String(row.balanceRemaining),
            };
          });
          return next;
        });
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("Failed to load receivables from Firebase.");
      }
    );

    return () => unsubscribe();
  }, []);

  const enrichedRows = useMemo(() => {
    return sales.map((row) => {
      const agingDays = getAgingDays(row.saleDate, todayKey);
      const dueDate = drafts[row.id]?.paymentDueDate ?? row.paymentDueDate;
      const overdue = Boolean(dueDate) && dueDate < todayKey;
      const draftPaid = Number(drafts[row.id]?.paymentInput ?? "");
      return {
        ...row,
        agingDays,
        agingBucket: getAgingBucket(agingDays),
        overdue,
        paymentDueDate: dueDate,
        receivableNotes: drafts[row.id]?.receivableNotes ?? row.receivableNotes,
        pendingEntryAmount: Number.isNaN(draftPaid) ? 0 : draftPaid,
      };
    });
  }, [sales, drafts, todayKey]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedRows.filter((row) => {
      if (bucketFilter !== "all" && row.agingBucket !== bucketFilter) return false;
      if (showOverdueOnly && !row.overdue) return false;
      if (!q) return true;
      return (
        row.customerName.toLowerCase().includes(q) ||
        row.customerPhone.toLowerCase().includes(q) ||
        row.itemName.toLowerCase().includes(q) ||
        row.itemCode.toLowerCase().includes(q)
      );
    });
  }, [enrichedRows, bucketFilter, showOverdueOnly, searchQuery]);

  const metrics = useMemo(() => {
    const totalOutstanding = enrichedRows.reduce((sum, row) => sum + row.balanceRemaining, 0);
    const overdueRows = enrichedRows.filter((row) => row.overdue);
    const overdueAmount = overdueRows.reduce((sum, row) => sum + row.balanceRemaining, 0);
    const bucketCounts = enrichedRows.reduce(
      (acc, row) => {
        if (row.agingBucket === "0-7 days") acc.bucket0to7 += 1;
        else if (row.agingBucket === "8-14 days") acc.bucket8to14 += 1;
        else acc.bucket15plus += 1;
        return acc;
      },
      { bucket0to7: 0, bucket8to14: 0, bucket15plus: 0 }
    );
    return {
      totalOutstanding,
      overdueAmount,
      overdueCount: overdueRows.length,
      ...bucketCounts,
    };
  }, [enrichedRows]);

  const setDraft = (id: string, patch: Partial<DraftRow>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        paymentDueDate: prev[id]?.paymentDueDate ?? "",
        receivableNotes: prev[id]?.receivableNotes ?? "",
        paymentInput: prev[id]?.paymentInput ?? "",
        paymentMethodInput: prev[id]?.paymentMethodInput ?? "cash",
        paymentNoteInput: prev[id]?.paymentNoteInput ?? "",
        balanceAdjustInput: prev[id]?.balanceAdjustInput ?? "",
        ...patch,
      },
    }));
  };

  const saveRow = async (rowId: string) => {
    setSavingId(rowId);
    setError(null);
    try {
      const draft = drafts[rowId] ?? { paymentDueDate: "", receivableNotes: "" };
      await updateDoc(doc(db, "sales", rowId), {
        paymentDueDate: draft.paymentDueDate,
        receivableNotes: draft.receivableNotes.trim(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError("Failed to save receivable update.");
    } finally {
      setSavingId(null);
    }
  };

  const addPayment = async (row: ReceivableRow) => {
    const draft = drafts[row.id];
    const amount = Number(draft?.paymentInput ?? "");
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    if (amount > row.balanceRemaining) {
      setError("Payment exceeds remaining balance.");
      return;
    }

    setSavingId(row.id);
    setError(null);
    try {
      const method = draft?.paymentMethodInput ?? "cash";
      const note = (draft?.paymentNoteInput ?? "").trim();
      const history = Array.isArray(row.paymentHistory) ? row.paymentHistory : [];
      const nextHistory: PaymentEntry[] = [
        ...history,
        {
          amount,
          method,
          paidAt: getCurrentPHIsoString(),
          note,
        },
      ];
      const nextPaidAmount = row.paidAmount + amount;
      const nextRemaining = Math.max(row.total - nextPaidAmount, 0);
      await updateDoc(doc(db, "sales", row.id), {
        paidAmount: nextPaidAmount,
        balanceRemaining: nextRemaining,
        paymentHistory: nextHistory,
        paymentMethod: nextRemaining <= 0 ? method : "pending_payment",
        paymentSettledAt: nextRemaining <= 0 ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
      setDraft(row.id, {
        paymentInput: "",
        paymentNoteInput: "",
        balanceAdjustInput: String(nextRemaining),
      });
    } catch {
      setError("Failed to record payment.");
    } finally {
      setSavingId(null);
    }
  };

  const adjustBalance = async (row: ReceivableRow) => {
    const raw = drafts[row.id]?.balanceAdjustInput ?? "";
    const nextRemaining = Number(raw);
    if (Number.isNaN(nextRemaining) || nextRemaining < 0 || nextRemaining > row.total) {
      setError("Remaining balance must be between 0 and invoice total.");
      return;
    }

    setSavingId(row.id);
    setError(null);
    try {
      const nextPaidAmount = Math.max(row.total - nextRemaining, 0);
      const nextMethod: PaymentMethod = nextRemaining <= 0 ? "cash" : "pending_payment";
      await updateDoc(doc(db, "sales", row.id), {
        paidAmount: nextPaidAmount,
        balanceRemaining: nextRemaining,
        paymentMethod: nextMethod,
        paymentSettledAt: nextRemaining <= 0 ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError("Failed to adjust remaining balance.");
    } finally {
      setSavingId(null);
    }
  };

  const markAsPaid = async (rowId: string, method: "cash" | "bank_transfer") => {
    setSavingId(rowId);
    setError(null);
    try {
      const row = sales.find((sale) => sale.id === rowId);
      if (!row) throw new Error("row not found");
      await updateDoc(doc(db, "sales", rowId), {
        paidAmount: row.total,
        balanceRemaining: 0,
        paymentMethod: method,
        paymentSettledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError("Failed to mark receivable as paid.");
    } finally {
      setSavingId(null);
    }
  };

  const exportCsv = () => {
    const headers = [
      "Sale Date",
      "Customer Name",
      "Customer Phone",
      "Item Code",
      "Item Name",
      "Invoice Total (PHP)",
      "Invoice Total (Raw)",
      "Paid (PHP)",
      "Paid (Raw)",
      "Remaining (PHP)",
      "Remaining (Raw)",
      "Aging Days",
      "Aging Bucket",
      "Payment Due Date",
      "Overdue",
      "Status",
      "Notes",
    ];
    const rows = filteredRows.map((row) => [
      row.saleDate,
      row.customerName,
      row.customerPhone,
      row.itemCode,
      row.itemName,
      formatCurrency(row.total),
      String(row.total),
      formatCurrency(row.paidAmount),
      String(row.paidAmount),
      formatCurrency(row.balanceRemaining),
      String(row.balanceRemaining),
      String(row.agingDays),
      row.agingBucket,
      row.paymentDueDate,
      row.overdue ? "Yes" : "No",
      row.status,
      row.receivableNotes,
    ]);
    const summaryRows = [
      ["Outstanding Receivables Statement", todayKey],
      ["Records", String(filteredRows.length)],
      ["Outstanding Amount", formatCurrency(metrics.totalOutstanding)],
      ["Overdue Amount", formatCurrency(metrics.overdueAmount)],
      [],
    ];

    const csv = [...summaryRows, headers, ...rows].map((line) => line.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receivables-statement-${todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardShell
      sectionLabel="Receivables"
      title="Outstanding Receivables"
      subtitle="Track unpaid customer balances, aging, and follow-up notes"
    >
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          { label: "Outstanding Amount", value: formatCurrency(metrics.totalOutstanding) },
          { label: "Overdue Amount", value: formatCurrency(metrics.overdueAmount) },
          { label: "Overdue Invoices", value: metrics.overdueCount.toLocaleString("en-US") },
          {
            label: "Aging Buckets",
            value: `${metrics.bucket0to7} / ${metrics.bucket8to14} / ${metrics.bucket15plus}`,
            helper: "0-7 / 8-14 / 15+ days",
          },
        ].map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900">{card.value}</p>
            {"helper" in card ? <p className="mt-1 text-xs text-slate-500">{card.helper}</p> : null}
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Receivable Accounts</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
            />
            <select
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value as "all" | "0-7 days" | "8-14 days" | "15+ days")}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
            >
              <option value="all">All Buckets</option>
              <option value="0-7 days">0-7 days</option>
              <option value="8-14 days">8-14 days</option>
              <option value="15+ days">15+ days</option>
            </select>
            <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showOverdueOnly}
                onChange={(e) => setShowOverdueOnly(e.target.checked)}
              />
              Overdue only
            </label>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-md bg-gradient-to-r from-[#253b39] to-[#3a5a57] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
            >
              Export Statement
            </button>
          </div>
        </div>

        {error ? <p className="px-4 py-3 text-sm text-red-600">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left">
                {[
                  "Sale Date",
                  "Customer",
                  "Item",
                  "Invoice",
                  "Paid",
                  "Remaining",
                  "Aging",
                  "Due Date",
                  "Status",
                  "Payment Entry",
                  "Notes",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-sm text-slate-500">
                    Loading receivables...
                  </td>
                </tr>
              )}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-sm text-slate-500">
                    No outstanding receivables.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 transition-all duration-200 hover:bg-slate-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDateInPH(row.saleDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">{row.customerName || "Unknown Customer"}</div>
                      <div className="text-xs text-slate-500">{row.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">{row.itemName}</div>
                      <div className="text-xs text-slate-500">{row.itemCode}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {formatCurrency(row.total)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                      {formatCurrency(row.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-amber-700">
                      {formatCurrency(row.balanceRemaining)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div>{row.agingDays} day(s)</div>
                      <div className="text-xs text-slate-500">{row.agingBucket}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={row.paymentDueDate}
                        onChange={(e) => setDraft(row.id, { paymentDueDate: e.target.value })}
                        className="w-full min-w-[130px] rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] sm:w-[150px]"
                      />
                      {row.overdue ? <p className="mt-1 text-xs font-semibold text-red-600">Overdue</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          row.status === "delivered"
                            ? "bg-green-100 text-green-700"
                            : row.status === "returned"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex w-full min-w-[170px] flex-col gap-1.5 sm:w-[220px]">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={drafts[row.id]?.paymentInput ?? ""}
                          onChange={(e) => setDraft(row.id, { paymentInput: e.target.value })}
                          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                        />
                        <select
                          value={drafts[row.id]?.paymentMethodInput ?? "cash"}
                          onChange={(e) =>
                            setDraft(row.id, {
                              paymentMethodInput: e.target.value as "cash" | "bank_transfer",
                            })
                          }
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                        >
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                        <input
                          value={drafts[row.id]?.paymentNoteInput ?? ""}
                          onChange={(e) => setDraft(row.id, { paymentNoteInput: e.target.value })}
                          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={row.receivableNotes}
                        onChange={(e) => setDraft(row.id, { receivableNotes: e.target.value })}
                        rows={2}
                        className="w-full min-w-[180px] rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] sm:w-[240px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex w-full min-w-[170px] flex-col gap-1.5 sm:min-w-[180px]">
                        <button
                          type="button"
                          onClick={() => saveRow(row.id)}
                          disabled={savingId === row.id}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {savingId === row.id ? "Saving..." : "Save Notes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => addPayment(row)}
                          disabled={savingId === row.id}
                          className="rounded-md bg-[#253b39] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:opacity-60"
                        >
                          Add Payment
                        </button>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={drafts[row.id]?.balanceAdjustInput ?? ""}
                            onChange={(e) => setDraft(row.id, { balanceAdjustInput: e.target.value })}
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] sm:w-[110px]"
                          />
                          <button
                            type="button"
                            onClick={() => adjustBalance(row)}
                            disabled={savingId === row.id}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Set Balance
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => markAsPaid(row.id, "cash")}
                          disabled={savingId === row.id}
                          className="rounded-md bg-[#253b39] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:opacity-60"
                        >
                          Mark Paid (Cash)
                        </button>
                        <button
                          type="button"
                          onClick={() => markAsPaid(row.id, "bank_transfer")}
                          disabled={savingId === row.id}
                          className="rounded-md border border-[#253b39] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#253b39] transition-colors duration-200 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Mark Paid (Bank)
                        </button>
                        {row.paymentHistory.length > 0 ? (
                          <div className="mt-1 rounded border border-slate-200 bg-slate-50 p-2">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                              Payment History
                            </p>
                            <div className="max-h-24 overflow-auto">
                              {row.paymentHistory
                                .slice()
                                .reverse()
                                .map((entry, index) => (
                                  <p key={`${row.id}-ph-${index}`} className="text-[11px] text-slate-600">
                                    {formatDateTimeInPH(entry.paidAt)} | {entry.method === "bank_transfer" ? "Bank" : "Cash"} |{" "}
                                    {formatCurrency(Number(entry.amount ?? 0))}
                                    {entry.note ? ` | ${entry.note}` : ""}
                                  </p>
                                ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
