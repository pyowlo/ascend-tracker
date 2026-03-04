"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { db } from "@/lib/firebase";
import { formatDateInPH, getCurrentPHDateKey } from "@/lib/time";
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

type InventoryItem = {
  id: string;
  itemCode: string;
  itemName: string;
  batchNumber: string;
  packageItems: string[];
  quantity: number;
  suggestedRetailPrice: number;
  resellerPrice: number;
  discountedPrice: number;
};

type InventoryForm = {
  itemCode: string;
  itemName: string;
  batchNumber: string;
  packageItems: string[];
  quantity: string;
  suggestedRetailPrice: string;
  resellerPrice: string;
  discountedPrice: string;
};

type ProductOption = {
  itemName: string;
  itemCode: string;
  suggestedRetailPrice: number;
  resellerPrice: number;
  discountedPrice: number;
  requiredPackageItems: string[];
};

type SaleStatus = "pending" | "delivered" | "returned";

type SaleHistory = {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  status: SaleStatus;
  saleDate: string;
};

type ForecastRisk = "critical" | "warning" | "stable" | "unknown";

type ForecastRow = {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  soldLast30Days: number;
  avgDailySold: number;
  daysUntilStockout: number | null;
  projectedStockoutDate: string | null;
  risk: ForecastRisk;
};

const productOptions: ProductOption[] = [
  {
    itemName: "Ascend Vitality (Tirzepatide) - 20mg",
    itemCode: "ASC-VIT-20",
    suggestedRetailPrice: 349,
    resellerPrice: 329,
    discountedPrice: 299,
    requiredPackageItems: ["Bac-Water - 3mL", "VIT BOX"],
  },
  {
    itemName: "Ascend Shred (Retatrutide) - 20mg",
    itemCode: "ASC-SHD-20",
    suggestedRetailPrice: 369,
    resellerPrice: 349,
    discountedPrice: 319,
    requiredPackageItems: ["Bac-Water - 3mL", "SHD BOX"],
  },
];

const emptyForm: InventoryForm = {
  itemCode: "",
  itemName: "",
  batchNumber: "",
  packageItems: [],
  quantity: "",
  suggestedRetailPrice: "",
  resellerPrice: "",
  discountedPrice: "",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

function toMs(dateValue: string) {
  if (!dateValue) return 0;
  const ms = new Date(dateValue).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function addDaysToDateKey(dateKey: string, days: number) {
  const start = Date.parse(`${dateKey}T00:00:00+08:00`);
  if (Number.isNaN(start)) return "";
  const date = new Date(start + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleHistory[]>([]);
  const [form, setForm] = useState<InventoryForm>(emptyForm);
  const [editForm, setEditForm] = useState<InventoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "inventory"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextItems: InventoryItem[] = snapshot.docs
          .map((entry) => {
            const data = entry.data();
            const createdAtMs =
              data.createdAt && typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : 0;

            return {
              id: entry.id,
              itemCode: String(data.itemCode ?? data.sku ?? ""),
              itemName: String(data.itemName ?? data.item ?? ""),
              batchNumber: String(data.batchNumber ?? data.batch ?? ""),
              packageItems: Array.isArray(data.packageItems)
                ? (data.packageItems as string[])
                : data.packageItem
                ? [String(data.packageItem)]
                : [],
              quantity: Number(data.quantity ?? data.onHand ?? 0),
              suggestedRetailPrice: Number(data.suggestedRetailPrice ?? data.retailPrice ?? 0),
              resellerPrice: Number(data.resellerPrice ?? 0),
              discountedPrice: Number(data.discountedPrice ?? 0),
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs)
          .map(({ createdAtMs: _createdAtMs, ...rest }) => rest);

        setItems(nextItems);
        setLoading(false);
      },
      (firebaseError: { code?: string }) => {
        const code = firebaseError?.code ?? "unknown";
        if (code === "permission-denied") {
          setError(
            "Firestore read blocked (permission-denied). Update Firebase rules to allow reads for this app."
          );
        } else if (code === "unavailable") {
          setError("Firestore unavailable. Check internet connection and retry.");
        } else {
          setError(`Failed to load inventory from Firebase (${code}).`);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "sales")),
      (snapshot) => {
        const rows: SaleHistory[] = snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            itemCode: String(data.itemCode ?? ""),
            itemName: String(data.itemName ?? ""),
            quantity: Number(data.quantity ?? 0),
            status: ((data.status === "pending_payment" ? "pending" : data.status) as SaleStatus) ?? "pending",
            saleDate: String(data.saleDate ?? ""),
          };
        });
        setSales(rows);
        setLoadingSales(false);
      },
      () => {
        setLoadingSales(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    return {
      total: items.length,
      low: items.filter((item) => item.quantity <= 3).length,
      out: items.filter((item) => item.quantity === 0).length,
    };
  }, [items]);

  const forecast = useMemo(() => {
    const todayKey = getCurrentPHDateKey();
    const nowMs = Date.parse(`${todayKey}T23:59:59+08:00`);
    const lookbackDays = 30;
    const windowStart = nowMs - lookbackDays * 86_400_000;

    const deliveredRecent = sales.filter((sale) => {
      const ms = toMs(sale.saleDate);
      return sale.status === "delivered" && ms >= windowStart && ms <= nowMs;
    });

    const rows: ForecastRow[] = items.map((item) => {
      const soldLast30Days = deliveredRecent
        .filter((sale) => sale.itemCode === item.itemCode || sale.itemName === item.itemName)
        .reduce((sum, sale) => sum + sale.quantity, 0);
      const avgDailySold = soldLast30Days / lookbackDays;
      const daysUntilStockout = avgDailySold > 0 ? item.quantity / avgDailySold : null;
      const projectedStockoutDate =
        daysUntilStockout !== null ? addDaysToDateKey(todayKey, Math.ceil(daysUntilStockout)) : null;

      let risk: ForecastRisk = "unknown";
      if (item.quantity <= 0) {
        risk = "critical";
      } else if (daysUntilStockout !== null && daysUntilStockout <= 7) {
        risk = "critical";
      } else if (daysUntilStockout !== null && daysUntilStockout <= 14) {
        risk = "warning";
      } else if (daysUntilStockout !== null) {
        risk = "stable";
      } else if (item.quantity <= 3) {
        risk = "warning";
      }

      return {
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        soldLast30Days,
        avgDailySold,
        daysUntilStockout,
        projectedStockoutDate,
        risk,
      };
    });

    rows.sort((a, b) => {
      const rank: Record<ForecastRisk, number> = {
        critical: 0,
        warning: 1,
        stable: 2,
        unknown: 3,
      };
      if (rank[a.risk] !== rank[b.risk]) return rank[a.risk] - rank[b.risk];
      const aDays = a.daysUntilStockout ?? Number.POSITIVE_INFINITY;
      const bDays = b.daysUntilStockout ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    });

    const atRiskCount = rows.filter((row) => row.risk === "critical" || row.risk === "warning").length;
    const criticalCount = rows.filter((row) => row.risk === "critical").length;
    return { rows, atRiskCount, criticalCount };
  }, [items, sales]);

  const resetForm = () => {
    setForm(emptyForm);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingId(null);
    setEditForm(emptyForm);
    setError(null);
  };

  const selectByItemName = (itemName: string) => {
    const selected = productOptions.find((option) => option.itemName === itemName);
    if (!selected) {
      setForm((prev) => ({ ...prev, itemName, packageItems: [] }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      itemName: selected.itemName,
      itemCode: selected.itemCode,
      packageItems: selected.requiredPackageItems,
      suggestedRetailPrice: selected.suggestedRetailPrice.toString(),
      resellerPrice: selected.resellerPrice.toString(),
      discountedPrice: selected.discountedPrice.toString(),
    }));
  };

  const selectByItemCode = (itemCode: string) => {
    const selected = productOptions.find((option) => option.itemCode === itemCode);
    if (!selected) {
      setForm((prev) => ({ ...prev, itemCode, packageItems: [] }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      itemName: selected.itemName,
      itemCode: selected.itemCode,
      packageItems: selected.requiredPackageItems,
      suggestedRetailPrice: selected.suggestedRetailPrice.toString(),
      resellerPrice: selected.resellerPrice.toString(),
      discountedPrice: selected.discountedPrice.toString(),
    }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      itemCode: form.itemCode.trim(),
      itemName: form.itemName.trim(),
      batchNumber: form.batchNumber.trim(),
      packageItems: form.packageItems,
      quantity: Number(form.quantity),
      suggestedRetailPrice: Number(form.suggestedRetailPrice),
      resellerPrice: Number(form.resellerPrice),
      discountedPrice: Number(form.discountedPrice),
    };

    if (
      !payload.itemCode ||
      !payload.itemName ||
      !payload.batchNumber ||
      payload.packageItems.length === 0 ||
      Number.isNaN(payload.quantity) ||
      Number.isNaN(payload.suggestedRetailPrice) ||
      Number.isNaN(payload.resellerPrice) ||
      Number.isNaN(payload.discountedPrice)
    ) {
      setError("Please complete all fields before saving.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await addDoc(collection(db, "inventory"), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      resetForm();
    } catch {
      setError("Save failed. Check Firebase rules and try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectEditByItemName = (itemName: string) => {
    const selected = productOptions.find((option) => option.itemName === itemName);
    if (!selected) {
      setEditForm((prev) => ({ ...prev, itemName, packageItems: [] }));
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      itemName: selected.itemName,
      itemCode: selected.itemCode,
      packageItems: selected.requiredPackageItems,
      suggestedRetailPrice: selected.suggestedRetailPrice.toString(),
      resellerPrice: selected.resellerPrice.toString(),
      discountedPrice: selected.discountedPrice.toString(),
    }));
  };

  const selectEditByItemCode = (itemCode: string) => {
    const selected = productOptions.find((option) => option.itemCode === itemCode);
    if (!selected) {
      setEditForm((prev) => ({ ...prev, itemCode, packageItems: [] }));
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      itemName: selected.itemName,
      itemCode: selected.itemCode,
      packageItems: selected.requiredPackageItems,
      suggestedRetailPrice: selected.suggestedRetailPrice.toString(),
      resellerPrice: selected.resellerPrice.toString(),
      discountedPrice: selected.discountedPrice.toString(),
    }));
  };

  const onUpdateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingId) {
      return;
    }

    const payload = {
      itemCode: editForm.itemCode.trim(),
      itemName: editForm.itemName.trim(),
      batchNumber: editForm.batchNumber.trim(),
      packageItems: editForm.packageItems,
      quantity: Number(editForm.quantity),
      suggestedRetailPrice: Number(editForm.suggestedRetailPrice),
      resellerPrice: Number(editForm.resellerPrice),
      discountedPrice: Number(editForm.discountedPrice),
    };

    if (
      !payload.itemCode ||
      !payload.itemName ||
      !payload.batchNumber ||
      payload.packageItems.length === 0 ||
      Number.isNaN(payload.quantity) ||
      Number.isNaN(payload.suggestedRetailPrice) ||
      Number.isNaN(payload.resellerPrice) ||
      Number.isNaN(payload.discountedPrice)
    ) {
      setError("Please complete all fields before saving.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateDoc(doc(db, "inventory", editingId), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      closeEditModal();
    } catch {
      setError("Update failed. Check Firebase rules and try again.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      batchNumber: item.batchNumber,
      packageItems: item.packageItems ?? [],
      quantity: String(item.quantity),
      suggestedRetailPrice: String(item.suggestedRetailPrice),
      resellerPrice: String(item.resellerPrice),
      discountedPrice: String(item.discountedPrice),
    });
    setIsEditModalOpen(true);
    setError(null);
  };

  const removeItem = async (id: string) => {
    const confirmed = window.confirm("Delete this inventory item?");
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await deleteDoc(doc(db, "inventory", id));
      if (editingId === id) {
        resetForm();
      }
    } catch {
      setError("Delete failed. Check Firebase rules and try again.");
    }
  };

  return (
    <DashboardShell
      sectionLabel="Inventory"
      title="Inventory Control"
      subtitle="Manage stock levels directly from Firebase"
    >
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Items", value: String(stats.total) },
          { label: "Low Stock", value: String(stats.low) },
          { label: "Out of Stock", value: String(stats.out) },
          { label: "Forecast At Risk", value: String(forecast.atRiskCount) },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
              padding: "20px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {card.label}
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "30px",
                fontWeight: 800,
                color: "#1a1f2e",
              }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#1a1f2e" }}>
            Low-Stock Forecast (30-Day Velocity)
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
            Forecasts stockout dates using delivered sales in the last 30 days.
            {forecast.criticalCount > 0 ? ` ${forecast.criticalCount} item(s) need urgent restock.` : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {[
                  "Item",
                  "In Stock",
                  "Sold (30d)",
                  "Avg/Day",
                  "Days Left",
                  "Projected Stockout",
                  "Risk",
                ].map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "#64748b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(loading || loadingSales) && (
                <tr>
                  <td colSpan={7} style={{ padding: "20px 16px", fontSize: "13px", color: "#64748b" }}>
                    Loading forecast...
                  </td>
                </tr>
              )}

              {!loading && !loadingSales && forecast.rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "20px 16px", fontSize: "13px", color: "#64748b" }}>
                    No forecast data yet.
                  </td>
                </tr>
              )}

              {!loading &&
                !loadingSales &&
                forecast.rows.map((row, idx) => (
                  <tr
                    key={row.itemId}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                      <div style={{ fontWeight: 600 }}>{row.itemName}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{row.itemCode}</div>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e", fontWeight: 700 }}>
                      {row.quantity}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>{row.soldLast30Days}</td>
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                      {row.avgDailySold.toFixed(2)}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                      {row.daysUntilStockout !== null ? row.daysUntilStockout.toFixed(1) : "-"}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                      {row.projectedStockoutDate ? formatDateInPH(row.projectedStockoutDate) : "-"}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span
                        style={{
                          borderRadius: "2px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          background:
                            row.risk === "critical"
                              ? "rgba(239,68,68,0.12)"
                              : row.risk === "warning"
                              ? "rgba(245,158,11,0.15)"
                              : row.risk === "stable"
                              ? "rgba(34,197,94,0.12)"
                              : "rgba(100,116,139,0.12)",
                          color:
                            row.risk === "critical"
                              ? "#b91c1c"
                              : row.risk === "warning"
                              ? "#b45309"
                              : row.risk === "stable"
                              ? "#15803d"
                              : "#64748b",
                        }}
                      >
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#1a1f2e" }}>Add Inventory Item</h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Item Name
              <select
                value={form.itemName}
                onChange={(e) => selectByItemName(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] bg-white"
              >
                <option value="">Select product name</option>
                {productOptions.map((option) => (
                  <option key={option.itemCode} value={option.itemName}>
                    {option.itemName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Item Code
              <select
                value={form.itemCode}
                onChange={(e) => selectByItemCode(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] bg-white"
              >
                <option value="">Select item code</option>
                {productOptions.map((option) => (
                  <option key={`${option.itemCode}-code`} value={option.itemCode}>
                    {option.itemCode}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Batch Number
              <input
                value={form.batchNumber}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, batchNumber: e.target.value }))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Package
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {form.packageItems.length > 0
                  ? form.packageItems.join(" + ")
                  : "Select product first"}
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Quantity
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Suggested Retail Price (SRP)
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.suggestedRetailPrice}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    suggestedRetailPrice: e.target.value,
                  }))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Reseller's Price
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.resellerPrice}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    resellerPrice: e.target.value,
                  }))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Discounted Price
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.discountedPrice}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discountedPrice: e.target.value,
                  }))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#253b39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f3130] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : "Add Item"}
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
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-2xl font-bold text-slate-900">Edit Inventory Item</h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={onUpdateSubmit} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Item Name
                  <select
                    value={editForm.itemName}
                    onChange={(e) => selectEditByItemName(e.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  >
                    <option value="">Select product name</option>
                    {productOptions.map((option) => (
                      <option key={`edit-${option.itemCode}`} value={option.itemName}>
                        {option.itemName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Item Code
                  <select
                    value={editForm.itemCode}
                    onChange={(e) => selectEditByItemCode(e.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  >
                    <option value="">Select item code</option>
                    {productOptions.map((option) => (
                      <option key={`edit-${option.itemCode}-code`} value={option.itemCode}>
                        {option.itemCode}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Batch Number
                  <input
                    value={editForm.batchNumber}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, batchNumber: e.target.value }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Package
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {editForm.packageItems.length > 0
                      ? editForm.packageItems.join(" + ")
                      : "Select product first"}
                  </div>
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Quantity
                  <input
                    type="number"
                    min={0}
                    value={editForm.quantity}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Suggested Retail Price (SRP)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.suggestedRetailPrice}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        suggestedRetailPrice: e.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Reseller's Price
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.resellerPrice}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        resellerPrice: e.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Discounted Price
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.discountedPrice}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        discountedPrice: e.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>
              </div>

              {error && (
                <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[#253b39] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Update Item"}
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#1a1f2e" }}>
            Stock Ledger
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
            Live inventory records from Firebase.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              {["Item Code", "Item Name", "Batch", "Package", "Quantity", "SRP", "Reseller", "Discounted", "Actions"].map(
                (label) => (
                  <th
                    key={label}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    {label}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={9}
                  style={{ padding: "20px 16px", fontSize: "13px", color: "#64748b" }}
                >
                  Loading inventory...
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{ padding: "20px 16px", fontSize: "13px", color: "#64748b" }}
                >
                  No inventory records yet. Add your first item above.
                </td>
              </tr>
            )}

            {items.map((row, idx) => (
              <tr
                key={row.id}
                style={{
                  borderBottom: "1px solid #e2e8f0",
                  backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                }}
              >
                <td
                  style={{
                    padding: "13px 16px",
                    fontSize: "13px",
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  {row.itemCode}
                </td>
                <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                  {row.itemName}
                </td>
                <td style={{ padding: "13px 16px", fontSize: "13px", color: "#64748b" }}>
                  {row.batchNumber || "-"}
                </td>
                <td style={{ padding: "13px 16px", fontSize: "13px", color: "#64748b" }}>
                  {row.packageItems.length > 0 ? row.packageItems.join(" + ") : "-"}
                </td>
                <td
                  style={{
                    padding: "13px 16px",
                    fontSize: "13px",
                    color: "#1a1f2e",
                    fontWeight: 600,
                  }}
                >
                  {row.quantity}
                </td>
                <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                  {formatCurrency(row.suggestedRetailPrice)}
                </td>
                <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                  {formatCurrency(row.resellerPrice)}
                </td>
                <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                  {formatCurrency(row.discountedPrice)}
                </td>
                <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                  <button
                    onClick={() => startEdit(row)}
                    style={{
                      marginRight: "10px",
                      border: "none",
                      background: "none",
                      padding: 0,
                      color: "#253b39",
                      textDecoration: "underline",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeItem(row.id)}
                    style={{
                      border: "none",
                      background: "none",
                      padding: 0,
                      color: "#dc2626",
                      textDecoration: "underline",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
