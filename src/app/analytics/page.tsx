"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";

type SaleStatus = "pending" | "delivered" | "returned";

type InventoryItem = {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
};

type SaleEntry = {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  total: number;
  status: SaleStatus;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

export default function AnalyticsPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "inventory")),
      (snapshot) => {
        setInventory(
          snapshot.docs.map((docEntry) => {
            const data = docEntry.data();
            return {
              id: docEntry.id,
              itemCode: String(data.itemCode ?? ""),
              itemName: String(data.itemName ?? ""),
              quantity: Number(data.quantity ?? 0),
            };
          })
        );
        setLoadingInventory(false);
      },
      () => setLoadingInventory(false)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "sales")),
      (snapshot) => {
        setSales(
          snapshot.docs.map((docEntry) => {
            const data = docEntry.data();
            return {
              id: docEntry.id,
              itemCode: String(data.itemCode ?? ""),
              itemName: String(data.itemName ?? ""),
              quantity: Number(data.quantity ?? 0),
              total: Number(data.total ?? 0),
              status: ((data.status === "pending_payment" ? "pending" : data.status) as SaleStatus) ?? "pending",
            };
          })
        );
        setLoadingSales(false);
      },
      () => setLoadingSales(false)
    );
    return () => unsubscribe();
  }, []);

  const metrics = useMemo(() => {
    const delivered = sales.filter((row) => row.status === "delivered");
    const revenue = delivered.reduce((sum, row) => sum + row.total, 0);
    const unitsSold = delivered.reduce((sum, row) => sum + row.quantity, 0);
    const pendingOrders = sales.filter((row) => row.status === "pending").length;
    const returnedOrders = sales.filter((row) => row.status === "returned").length;
    return { revenue, unitsSold, pendingOrders, returnedOrders };
  }, [sales]);

  const productRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        itemCode: string;
        itemName: string;
        deliveredUnits: number;
        deliveredRevenue: number;
        returns: number;
        inStock: number;
      }
    >();

    inventory.forEach((item) => {
      grouped.set(`${item.itemCode}-${item.itemName}`, {
        itemCode: item.itemCode,
        itemName: item.itemName,
        deliveredUnits: 0,
        deliveredRevenue: 0,
        returns: 0,
        inStock: item.quantity,
      });
    });

    sales.forEach((sale) => {
      const key = `${sale.itemCode}-${sale.itemName}`;
      const row = grouped.get(key) ?? {
        itemCode: sale.itemCode,
        itemName: sale.itemName,
        deliveredUnits: 0,
        deliveredRevenue: 0,
        returns: 0,
        inStock: 0,
      };
      if (sale.status === "delivered") {
        row.deliveredUnits += sale.quantity;
        row.deliveredRevenue += sale.total;
      }
      if (sale.status === "returned") {
        row.returns += 1;
      }
      grouped.set(key, row);
    });

    return Array.from(grouped.values()).sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);
  }, [inventory, sales]);

  const loading = loadingInventory || loadingSales;

  return (
    <DashboardShell
      sectionLabel="Analytics"
      title="Peptide Analytics"
      subtitle="Track Ascend product performance from live inventory and sales"
    >
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          { label: "Delivered Revenue", value: formatCurrency(metrics.revenue) },
          { label: "Units Sold", value: metrics.unitsSold.toLocaleString("en-US") },
          { label: "Pending Orders", value: metrics.pendingOrders.toLocaleString("en-US") },
          { label: "Returned Orders", value: metrics.returnedOrders.toLocaleString("en-US") },
        ].map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-2xl font-bold text-slate-900">Product Performance</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ascend Vitality, Ascend Shred, and package-linked movement.
          </p>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {loading && <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">Loading analytics...</p>}
          {!loading && productRows.length === 0 && (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              No analytics data yet. Add inventory and record sales to populate this page.
            </p>
          )}
          {!loading &&
            productRows.map((row) => (
              <article key={`${row.itemCode}-${row.itemName}`} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{row.itemName}</p>
                <p className="text-xs text-slate-500">{row.itemCode}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p>Units: <span className="font-semibold text-slate-900">{row.deliveredUnits.toLocaleString("en-US")}</span></p>
                  <p>Returns: <span className="font-semibold text-slate-900">{row.returns}</span></p>
                  <p>Revenue: <span className="font-semibold text-slate-900">{formatCurrency(row.deliveredRevenue)}</span></p>
                  <p>Stock: <span className="font-semibold text-slate-900">{row.inStock.toLocaleString("en-US")}</span></p>
                </div>
              </article>
            ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left">
                {["Item Code", "Product", "Delivered Units", "Delivered Revenue", "Returns", "In Stock"].map(
                  (header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                    Loading analytics...
                  </td>
                </tr>
              )}

              {!loading && productRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                    No analytics data yet. Add inventory and record sales to populate this page.
                  </td>
                </tr>
              )}

              {!loading &&
                productRows.map((row, index) => (
                  <tr
                    key={`${row.itemCode}-${row.itemName}`}
                    className={`transition-all duration-200 hover:bg-slate-50 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">{row.itemCode}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">
                      {row.itemName}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                      {row.deliveredUnits.toLocaleString("en-US")}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                      {formatCurrency(row.deliveredRevenue)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{row.returns}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {row.inStock.toLocaleString("en-US")}
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
