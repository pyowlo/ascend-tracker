"use client";

import React, { useMemo, useState } from "react";
import { Download, Eye, Inbox, Search } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { MarketingTag, SaleRecord, sparklineData } from "@/lib/dashboard-data";
import { formatDateInPH } from "@/lib/time";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function formatDate(value: string) {
  return formatDateInPH(value);
}

function Sparkline({ data }: { data: number[] }) {
  const width = 90;
  const height = 34;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((point, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="#253b39"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const tagStyle: Record<MarketingTag, string> = {
  Promo: "bg-violet-100 text-violet-700",
  Organic: "bg-emerald-100 text-emerald-700",
  Paid: "bg-blue-100 text-blue-700",
  Referral: "bg-orange-100 text-orange-700",
};

export default function DashboardPage() {
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReceipt, setActiveReceipt] = useState<SaleRecord | null>(null);

  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return salesData;
    }

    return salesData.filter((entry) => {
      return (
        entry.itemName.toLowerCase().includes(q) ||
        entry.marketingTag.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, salesData]);

  const metrics = useMemo(() => {
    const revenue = salesData.reduce((sum, row) => sum + row.total, 0);
    const sold = salesData.reduce((sum, row) => sum + row.quantity, 0);
    const low = salesData.filter((row) => row.lowStock).length;

    return {
      revenue: formatCurrency(revenue),
      sold: sold.toLocaleString("en-US"),
      low: low.toLocaleString("en-US"),
    };
  }, [salesData]);

  const exportCsv = () => {
    if (salesData.length === 0) {
      return;
    }

    const headers = ["Date", "Item Name", "Quantity", "Unit Price", "Total", "Marketing Tag"];
    const rows = filteredSales.map((row) => [
      row.date,
      row.itemName,
      String(row.quantity),
      String(row.unitPrice),
      String(row.total),
      row.marketingTag,
    ]);

    const csv = [headers, ...rows].map((line) => line.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardShell
      sectionLabel="Dashboard"
      title="Sales Dashboard"
      subtitle="Track revenue, inventory, and sales performance"
    >
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Total Revenue</p>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">{metrics.revenue}</p>
            </div>
          </div>
          {salesData.length > 0 && (
            <div className="flex items-end justify-between">
              <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">+12.4% vs last month</span>
              <Sparkline data={sparklineData.revenue} />
            </div>
          )}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Items Sold</p>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">{metrics.sold}</p>
            </div>
          </div>
          {salesData.length > 0 && (
            <div className="flex items-end justify-between">
              <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">+8.7% vs last month</span>
              <Sparkline data={sparklineData.itemsSold} />
            </div>
          )}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Low Stock Alerts</p>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">{metrics.low}</p>
            </div>
          </div>
          {salesData.length > 0 && (
            <div className="flex items-end justify-between">
              <span className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">+2 vs last month</span>
              <Sparkline data={sparklineData.lowStock} />
            </div>
          )}
        </article>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Sales Overview</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-[#253b39] sm:w-64"
              />
            </div>
            <button
              onClick={exportCsv}
              disabled={salesData.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#253b39] to-[#3a5a57] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export to CSV
            </button>
          </div>
        </div>

        {salesData.length === 0 ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">No sales recorded yet.</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Sales will appear here once items are processed from your inventory.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {filteredSales.map((row) => (
                <article key={row.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.itemName}</p>
                      <p className="text-xs text-slate-500">{formatDate(row.date)}</p>
                    </div>
                    <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${tagStyle[row.marketingTag]}`}>
                      {row.marketingTag}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <p>Qty: <span className="font-semibold text-slate-900">{row.quantity}</span></p>
                    <p>Unit: <span className="font-semibold text-slate-900">{formatCurrency(row.unitPrice)}</span></p>
                    <p className="col-span-2">Total: <span className="font-semibold text-slate-900">{formatCurrency(row.total)}</span></p>
                  </div>
                  <button
                    onClick={() => setActiveReceipt(row)}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#253b39] underline underline-offset-2 transition-all duration-200 hover:text-[#1d2f2d]"
                  >
                    <Eye className="h-4 w-4" />
                    View Receipt
                  </button>
                </article>
              ))}
              {filteredSales.length === 0 && (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  No records found.
                </p>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left">
                  {["Date", "Item Name", "Quantity", "Unit Price", "Total", "Marketing Tag", "Actions"].map((header) => (
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
                {filteredSales.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`transition-all duration-200 hover:bg-slate-50 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                  >
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">{formatDate(row.date)}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">{row.itemName}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">{row.quantity}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{formatCurrency(row.unitPrice)}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(row.total)}</td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${tagStyle[row.marketingTag]}`}>
                        {row.marketingTag}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <button
                        onClick={() => setActiveReceipt(row)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[#253b39] underline underline-offset-2 transition-all duration-200 hover:text-[#1d2f2d]"
                      >
                        <Eye className="h-4 w-4" />
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {activeReceipt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Receipt Preview</h3>
            <p className="mt-2 text-sm text-slate-600">
              Receipt ID: <span className="font-semibold text-slate-900">{activeReceipt.receiptId}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">Item: {activeReceipt.itemName}</p>
            <p className="mt-1 text-sm text-slate-600">Total: {formatCurrency(activeReceipt.total)}</p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setActiveReceipt(null)}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                className="rounded-md bg-gradient-to-r from-[#253b39] to-[#3a5a57] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
              >
                Open Full Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
