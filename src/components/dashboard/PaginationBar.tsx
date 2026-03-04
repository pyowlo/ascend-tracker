"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  totalRows: number;
  rowsPerPage: number;
  currentPage: number;
  onRowsPerPageChange: (v: number) => void;
  onPageChange: (p: number) => void;
}

const rowOptions = [5, 10, 20, 50];

export default function PaginationBar({
  totalRows,
  rowsPerPage,
  currentPage,
  onRowsPerPageChange,
  onPageChange,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const start = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, totalRows);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderTop: "1px solid #e2e8f0",
        backgroundColor: "#f8fafc",
        fontFamily: "'Bricolage Grotesque', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "12px", color: "#64748b" }}>Rows per page:</span>
        <select
          value={rowsPerPage}
          onChange={(e) => {
            onRowsPerPageChange(Number(e.target.value));
            onPageChange(1);
          }}
          style={{
            padding: "4px 8px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#1a1f2e",
            backgroundColor: "#ffffff",
            cursor: "pointer",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            outline: "none",
          }}
        >
          {rowOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <span style={{ fontSize: "12px", color: "#64748b" }}>
        {start}-{end} of {totalRows} rows
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            backgroundColor: currentPage === 1 ? "#f1f5f9" : "#ffffff",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            color: currentPage === 1 ? "#cbd5e1" : "#64748b",
            transition: "all 150ms ease",
          }}
        >
          <ChevronLeft size={14} />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${page === currentPage ? "#253b39" : "#e2e8f0"}`,
              borderRadius: "4px",
              backgroundColor: page === currentPage ? "#253b39" : "#ffffff",
              cursor: "pointer",
              color: page === currentPage ? "#ffffff" : "#64748b",
              fontSize: "12px",
              fontWeight: page === currentPage ? 700 : 400,
              fontFamily: "'Bricolage Grotesque', sans-serif",
              transition: "all 150ms ease",
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            backgroundColor: currentPage === totalPages ? "#f1f5f9" : "#ffffff",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            color: currentPage === totalPages ? "#cbd5e1" : "#64748b",
            transition: "all 150ms ease",
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
