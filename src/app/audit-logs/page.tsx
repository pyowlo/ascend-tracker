"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { db } from "@/lib/firebase";
import { PH_TIME_ZONE } from "@/lib/time";
import { collection, onSnapshot, query } from "firebase/firestore";

type InventoryLog = {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  createdAtMs: number;
};

type SaleLog = {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  status: "pending" | "delivered" | "returned";
  customerName: string;
  createdAtMs: number;
};

type AuditEvent = {
  id: string;
  timestampMs: number;
  timeLabel: string;
  module: "Inventory" | "Sales";
  action: string;
  subject: string;
  details: string;
  result: "Success";
};

function formatEventTime(ms: number) {
  if (!ms) return "Unknown time";
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PH_TIME_ZONE,
  });
}

export default function AuditLogsPage() {
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [salesLogs, setSalesLogs] = useState<SaleLog[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "inventory")),
      (snapshot) => {
        setInventoryLogs(
          snapshot.docs.map((docEntry) => {
            const data = docEntry.data();
            const createdAtMs =
              data.updatedAt && typeof data.updatedAt.toMillis === "function"
                ? data.updatedAt.toMillis()
                : data.createdAt && typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : 0;

            return {
              id: docEntry.id,
              itemCode: String(data.itemCode ?? ""),
              itemName: String(data.itemName ?? ""),
              quantity: Number(data.quantity ?? 0),
              createdAtMs,
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
        setSalesLogs(
          snapshot.docs.map((docEntry) => {
            const data = docEntry.data();
            const createdAtMs =
              data.updatedAt && typeof data.updatedAt.toMillis === "function"
                ? data.updatedAt.toMillis()
                : data.createdAt && typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : 0;

            return {
              id: docEntry.id,
              itemCode: String(data.itemCode ?? ""),
              itemName: String(data.itemName ?? ""),
              quantity: Number(data.quantity ?? 0),
              status: (data.status as "pending" | "delivered" | "returned") ?? "pending",
              customerName: String(data.customerName ?? ""),
              createdAtMs,
            };
          })
        );
        setLoadingSales(false);
      },
      () => setLoadingSales(false)
    );
    return () => unsubscribe();
  }, []);

  const events = useMemo(() => {
    const inventoryEvents: AuditEvent[] = inventoryLogs.map((row) => ({
      id: `inventory-${row.id}`,
      timestampMs: row.createdAtMs,
      timeLabel: formatEventTime(row.createdAtMs),
      module: "Inventory",
      action: "Inventory item saved/updated",
      subject: `${row.itemName} (${row.itemCode})`,
      details: `Current stock: ${row.quantity}`,
      result: "Success",
    }));

    const salesEvents: AuditEvent[] = salesLogs.map((row) => ({
      id: `sales-${row.id}`,
      timestampMs: row.createdAtMs,
      timeLabel: formatEventTime(row.createdAtMs),
      module: "Sales",
      action: `Customer order marked ${row.status}`,
      subject: `${row.itemName} (${row.itemCode})`,
      details: `Qty ${row.quantity} | Customer: ${row.customerName || "N/A"}`,
      result: "Success",
    }));

    return [...salesEvents, ...inventoryEvents].sort((a, b) => b.timestampMs - a.timestampMs);
  }, [inventoryLogs, salesLogs]);

  const metrics = useMemo(() => {
    const totalEvents = events.length;
    const inventoryEvents = events.filter((event) => event.module === "Inventory").length;
    const salesEvents = events.filter((event) => event.module === "Sales").length;
    return { totalEvents, inventoryEvents, salesEvents };
  }, [events]);

  const loading = loadingInventory || loadingSales;

  return (
    <DashboardShell
      sectionLabel="Audit Logs"
      title="Operations Audit Trail"
      subtitle="Track inventory and sales activity for Ascend Peptides"
    >
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { label: "Total Events", value: metrics.totalEvents.toLocaleString("en-US") },
          { label: "Inventory Events", value: metrics.inventoryEvents.toLocaleString("en-US") },
          { label: "Sales Events", value: metrics.salesEvents.toLocaleString("en-US") },
        ].map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-2xl font-bold text-slate-900">Recent Activity</h2>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {loading && (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              Loading audit events...
            </p>
          )}
          {!loading && events.length === 0 && (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              No events yet. Inventory and sales actions will appear here automatically.
            </p>
          )}
          {!loading &&
            events.map((event) => (
              <article key={event.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{event.module}</p>
                    <p className="text-xs text-slate-500">{event.timeLabel}</p>
                  </div>
                  <span className="inline-flex rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {event.result}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-800">{event.action}</p>
                <p className="mt-1 text-xs text-slate-600">{event.subject}</p>
                <p className="mt-1 text-xs text-slate-500">{event.details}</p>
              </article>
            ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left">
                {["Time", "Module", "Action", "Subject", "Details", "Result"].map((header) => (
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
                  <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                    Loading audit events...
                  </td>
                </tr>
              )}

              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                    No events yet. Inventory and sales actions will appear here automatically.
                  </td>
                </tr>
              )}

              {!loading &&
                events.map((event, index) => (
                  <tr
                    key={event.id}
                    className={`transition-all duration-200 hover:bg-slate-50 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
                      {event.timeLabel}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">
                      {event.module}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {event.action}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {event.subject}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {event.details}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm">
                      <span className="inline-flex rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {event.result}
                      </span>
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
