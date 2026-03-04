"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { db } from "@/lib/firebase";
import { getCurrentPHDateKey, getCurrentPHMonthKey } from "@/lib/time";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type ExpenseCategory =
  | "Inventory Purchase"
  | "Shipping"
  | "Marketing"
  | "Utilities"
  | "Operations"
  | "Miscellaneous";

type ExpenseEntry = {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: string;
  notes: string;
  createdAtMs: number;
};

type SaleEntry = {
  id: string;
  saleDate: string;
  itemName: string;
  quantity: number;
  total: number;
  status: "pending" | "delivered" | "returned";
};

type ExpenseForm = {
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  paymentMethod: string;
  notes: string;
};

const emptyForm: ExpenseForm = {
  expenseDate: getCurrentPHDateKey(),
  category: "Operations",
  description: "",
  amount: "",
  paymentMethod: "Cash",
  notes: "",
};

const monthKeyNow = getCurrentPHMonthKey();

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

function isSameMonth(dateValue: string, monthKey: string) {
  return dateValue.slice(0, 7) === monthKey;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [monthFilter, setMonthFilter] = useState(monthKeyNow);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "expenses")),
      (snapshot) => {
        const rows = snapshot.docs
          .map((entry) => {
            const data = entry.data();
            const createdAtMs =
              data.createdAt && typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : Date.now();
            return {
              id: entry.id,
              expenseDate: String(data.expenseDate ?? ""),
              category: (data.category as ExpenseCategory) ?? "Operations",
              description: String(data.description ?? ""),
              amount: Number(data.amount ?? 0),
              paymentMethod: String(data.paymentMethod ?? "Cash"),
              notes: String(data.notes ?? ""),
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setExpenses(rows);
        setLoading(false);
      },
      () => {
        setError("Failed to load expenses.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "sales")),
      (snapshot) => {
        const rows = snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            saleDate: String(data.saleDate ?? ""),
            itemName: String(data.itemName ?? ""),
            quantity: Number(data.quantity ?? 0),
            total: Number(data.total ?? 0),
            status: (data.status as "pending" | "delivered" | "returned") ?? "pending",
          };
        });
        setSales(rows);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return expenses.filter((row) => {
      if (!isSameMonth(row.expenseDate, monthFilter)) return false;
      if (!q) return true;
      return (
        row.description.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [expenses, searchQuery, monthFilter]);

  const statement = useMemo(() => {
    const monthlyExpenses = expenses.filter((row) => isSameMonth(row.expenseDate, monthFilter));
    const monthlySales = sales.filter((row) => isSameMonth(row.saleDate, monthFilter));
    const deliveredSales = monthlySales.filter((row) => row.status === "delivered");
    const totalExpense = monthlyExpenses.reduce((sum, row) => sum + row.amount, 0);
    const totalSales = deliveredSales.reduce((sum, row) => sum + row.total, 0);
    const net = totalSales - totalExpense;
    return {
      totalExpense,
      totalSales,
      net,
      monthlyExpenses,
      monthlySales,
    };
  }, [expenses, sales, monthFilter]);

  const resetForm = () => {
    setForm({ ...emptyForm, expenseDate: form.expenseDate || emptyForm.expenseDate });
    setEditingId(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const amount = Number(form.amount);
    if (!form.expenseDate || !form.description.trim() || Number.isNaN(amount) || amount <= 0) {
      setError("Complete required expense fields.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        expenseDate: form.expenseDate,
        category: form.category,
        description: form.description.trim(),
        amount,
        paymentMethod: form.paymentMethod.trim() || "Cash",
        notes: form.notes.trim(),
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, "expenses", editingId), payload);
      } else {
        await addDoc(collection(db, "expenses"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch {
      setError("Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: ExpenseEntry) => {
    setEditingId(row.id);
    setForm({
      expenseDate: row.expenseDate,
      category: row.category,
      description: row.description,
      amount: String(row.amount),
      paymentMethod: row.paymentMethod,
      notes: row.notes,
    });
    setError(null);
  };

  const removeExpense = async (id: string) => {
    if (!window.confirm("Delete this expense record?")) return;
    try {
      await deleteDoc(doc(db, "expenses", id));
    } catch {
      setError("Failed to delete expense.");
    }
  };

  const downloadMonthlyStatement = () => {
    const rows: string[][] = [];
    rows.push(["Ascend Tracker Monthly Statement"]);
    rows.push(["Month", monthFilter]);
    rows.push([]);
    rows.push(["SUMMARY"]);
    rows.push(["Total Delivered Sales (PHP)", formatCurrency(statement.totalSales)]);
    rows.push(["Total Delivered Sales (Raw)", String(statement.totalSales)]);
    rows.push(["Total Expenses (PHP)", formatCurrency(statement.totalExpense)]);
    rows.push(["Total Expenses (Raw)", String(statement.totalExpense)]);
    rows.push(["Net (PHP)", formatCurrency(statement.net)]);
    rows.push(["Net (Raw)", String(statement.net)]);
    rows.push([]);
    rows.push(["SALES RECORDS"]);
    rows.push(["Date", "Item", "Quantity", "Status", "Total (PHP)", "Total (Raw)"]);
    statement.monthlySales.forEach((sale) => {
      rows.push([
        sale.saleDate.slice(0, 10),
        sale.itemName,
        String(sale.quantity),
        sale.status,
        formatCurrency(sale.total),
        String(sale.total),
      ]);
    });
    rows.push([]);
    rows.push(["EXPENSE RECORDS"]);
    rows.push([
      "Date",
      "Category",
      "Description",
      "Payment Method",
      "Amount (PHP)",
      "Amount (Raw)",
      "Notes",
    ]);
    statement.monthlyExpenses.forEach((expense) => {
      rows.push([
        expense.expenseDate,
        expense.category,
        expense.description,
        expense.paymentMethod,
        formatCurrency(expense.amount),
        String(expense.amount),
        expense.notes,
      ]);
    });

    const csv = rows.map((line) => line.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monthly-statement-${monthFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardShell
      sectionLabel="Expenses"
      title="Daily Expenses Tracker"
      subtitle="Track day-to-day expenses and download monthly statements"
    >
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { label: "Monthly Sales", value: formatCurrency(statement.totalSales) },
          { label: "Monthly Expenses", value: formatCurrency(statement.totalExpense) },
          { label: "Net", value: formatCurrency(statement.net) },
        ].map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900 dark:text-slate-100">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {editingId ? "Edit Expense" : "Add Daily Expense"}
          </h2>
        </div>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Expense Date
            <input
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Category
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as ExpenseCategory }))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="Inventory Purchase">Inventory Purchase</option>
              <option value="Shipping">Shipping</option>
              <option value="Marketing">Marketing</option>
              <option value="Utilities">Utilities</option>
              <option value="Operations">Operations</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Amount
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 md:col-span-2">
            Description
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Payment Method
            <input
              value={form.paymentMethod}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 md:col-span-3">
            Notes
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          {error ? <p className="text-sm text-red-600 md:col-span-3">{error}</p> : null}
          <div className="flex gap-2 md:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#253b39] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : editingId ? "Update Expense" : "Add Expense"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Expense Records</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={downloadMonthlyStatement}
              className="rounded-md bg-gradient-to-r from-[#253b39] to-[#3a5a57] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
            >
              Download Monthly Statement
            </button>
          </div>
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {loading ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Loading expenses...
            </p>
          ) : filteredExpenses.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No expenses found for this month.
            </p>
          ) : (
            filteredExpenses.map((row) => (
              <article key={row.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{row.expenseDate} | {row.category}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(row.amount)}</p>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Payment: {row.paymentMethod}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.notes || "No notes"}</p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                    className="text-sm font-semibold text-[#253b39] underline underline-offset-2 transition-all duration-200 hover:text-[#1f3130] dark:text-teal-300 dark:hover:text-teal-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExpense(row.id)}
                    className="text-sm font-semibold text-red-600 underline underline-offset-2 transition-all duration-200 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left dark:bg-slate-900">
                {["Date", "Category", "Description", "Payment", "Amount", "Notes", "Actions"].map((head) => (
                  <th
                    key={head}
                    className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-800 dark:text-slate-400"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">
                    No expenses found for this month.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-900 ${
                      index % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50/40 dark:bg-slate-900/40"
                    }`}
                  >
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      {row.expenseDate}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200">
                      {row.category}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-900 dark:border-slate-800 dark:text-slate-100">
                      {row.description}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      {row.paymentMethod}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      {row.notes || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="mr-3 font-semibold text-[#253b39] underline underline-offset-2 transition-all duration-200 hover:text-[#1f3130] dark:text-teal-300 dark:hover:text-teal-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExpense(row.id)}
                        className="font-semibold text-red-600 underline underline-offset-2 transition-all duration-200 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
