"use client";

import React from "react";
import { SaleRecord, MarketingTag } from "@/lib/dashboard-data";
import { Eye, AlertTriangle } from "lucide-react";

const tagStyles: Record<
  MarketingTag,
  { bg: string; color: string }
> = {
  Promo: { bg: "rgba(139,92,246,0.1)", color: "#7c3aed" },
  Organic: { bg: "rgba(34,197,94,0.1)", color: "#16a34a" },
  Paid: { bg: "rgba(59,130,246,0.1)", color: "#2563eb" },
  Referral: { bg: "rgba(249,115,22,0.1)", color: "#ea580c" },
};

interface DataTableProps {
  data: SaleRecord[];
  onViewReceipt: (record: SaleRecord) => void;
  currentPage: number;
  rowsPerPage: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function DataTable({
  data,
  onViewReceipt,
  currentPage,
  rowsPerPage,
}: DataTableProps) {
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);

  const start = (currentPage - 1) * rowsPerPage;
  const paginatedData = data.slice(start, start + rowsPerPage);

  const columns = [
    { key: "date", label: "Date", width: "110px" },
    { key: "itemName", label: "Item Name", width: "auto" },
    { key: "quantity", label: "Qty", width: "60px" },
    { key: "unitPrice", label: "Unit Price", width: "100px" },
    { key: "total", label: "Total", width: "110px" },
    { key: "marketingTag", label: "Tag", width: "100px" },
    { key: "actions", label: "Actions", width: "100px" },
  ];

  return (
    <div
      style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid #e2e8f0",
                position: "sticky",
                top: 0,
                backgroundColor: "#f8fafc",
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    width: col.width,
                    whiteSpace: "nowrap",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "48px 16px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: "14px",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                  }}
                >
                  No results found
                </td>
              </tr>
            )}
            {paginatedData.map((record, index) => {
              const isHovered = hoveredRow === record.id;
              const isEven = index % 2 === 0;

              return (
                <tr
                  key={record.id}
                  onMouseEnter={() => setHoveredRow(record.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    backgroundColor: isHovered
                      ? "rgba(37,59,57,0.04)"
                      : isEven
                      ? "#ffffff"
                      : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    transition: "background-color 250ms cubic-bezier(0.4,0,0.2,1), box-shadow 250ms cubic-bezier(0.4,0,0.2,1)",
                    boxShadow: isHovered
                      ? "inset 0 0 0 1px rgba(37,59,57,0.08)"
                      : "none",
                  }}
                >
                  {/* Date */}
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      color: "#64748b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(record.date)}
                  </td>

                  {/* Item Name */}
                  <td style={{ padding: "13px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#1a1f2e",
                        }}
                      >
                        {record.itemName}
                      </span>
                      {record.lowStock && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#b45309",
                            background: "rgba(245,158,11,0.12)",
                            borderRadius: "2px",
                            padding: "2px 6px",
                          }}
                        >
                          <AlertTriangle size={10} />
                          Low Stock
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      color: "#1a1f2e",
                      fontWeight: 500,
                      textAlign: "left",
                    }}
                  >
                    {record.quantity}
                  </td>

                  {/* Unit Price */}
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      color: "#1a1f2e",
                    }}
                  >
                    {formatCurrency(record.unitPrice)}
                  </td>

                  {/* Total */}
                  <td
                    style={{
                      padding: "13px 16px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1a1f2e",
                    }}
                  >
                    {formatCurrency(record.total)}
                  </td>

                  {/* Marketing Tag */}
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        borderRadius: "2px",
                        padding: "3px 8px",
                        background: tagStyles[record.marketingTag].bg,
                        color: tagStyles[record.marketingTag].color,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {record.marketingTag}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "13px 16px" }}>
                    <button
                      onClick={() => onViewReceipt(record)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#253b39",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 0",
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        textDecoration: "underline",
                        textDecorationColor: "rgba(37,59,57,0.3)",
                        transition: "color 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "#1a2e2c";
                        (e.currentTarget as HTMLElement).style.textDecorationColor = "#253b39";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "#253b39";
                        (e.currentTarget as HTMLElement).style.textDecorationColor =
                          "rgba(37,59,57,0.3)";
                      }}
                    >
                      <Eye size={12} />
                      View Receipt
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
