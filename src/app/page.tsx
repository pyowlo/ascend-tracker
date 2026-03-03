"use client";

import React, { useState, useMemo } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import StatCards from "@/components/dashboard/StatCards";
import ActionBar from "@/components/dashboard/ActionBar";
import DataTable from "@/components/dashboard/DataTable";
import PaginationBar from "@/components/dashboard/PaginationBar";
import ReceiptModal from "@/components/dashboard/ReceiptModal";
import { salesData, SaleRecord } from "@/lib/dashboard-data";

function filterByDate(data: SaleRecord[], filter: string): SaleRecord[] {
  const now = new Date();
  return data.filter((r) => {
    const date = new Date(r.date);
    if (filter === "today") {
      return date.toDateString() === now.toDateString();
    }
    if (filter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    if (filter === "month") {
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });
}

export default function Page() {
  const [activeNav, setActiveNav] = useState("sales");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedReceipt, setSelectedReceipt] = useState<SaleRecord | null>(null);

  const filteredData = useMemo(() => {
    let data = filterByDate(salesData, dateFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((r) => r.itemName.toLowerCase().includes(q));
    }
    return data;
  }, [searchQuery, dateFilter]);

  const handleExport = () => {
    const headers = ["Date", "Item Name", "Quantity", "Unit Price", "Total", "Marketing Tag"];
    const rows = filteredData.map((r) => [r.date, r.itemName, r.quantity, r.unitPrice, r.total, r.marketingTag]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Bricolage Grotesque', sans-serif",
      }}
    >
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

      <main
        style={{
          marginLeft: "220px",
          flex: 1,
          padding: "24px",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {/* Page Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
              Ascend Tracker
            </span>
            <span style={{ color: "#cbd5e1", fontSize: "12px" }}>/</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#253b39", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
              Sales
            </span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1a1f2e", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
            Sales Dashboard
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            Track revenue, inventory, and sales performance
          </p>
        </div>

        {/* Stat Cards */}
        <StatCards />

        {/* Table Section */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "20px 20px 16px" }}>
            <ActionBar
              searchQuery={searchQuery}
              onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
              dateFilter={dateFilter}
              onDateFilterChange={(v) => { setDateFilter(v); setCurrentPage(1); }}
              onExport={handleExport}
            />
          </div>

          <DataTable
            data={filteredData}
            onViewReceipt={(record) => setSelectedReceipt(record)}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
          />

          <PaginationBar
            totalRows={filteredData.length}
            rowsPerPage={rowsPerPage}
            currentPage={currentPage}
            onRowsPerPageChange={(v) => { setRowsPerPage(v); setCurrentPage(1); }}
            onPageChange={setCurrentPage}
          />
        </div>
      </main>

      <ReceiptModal
        record={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
}
