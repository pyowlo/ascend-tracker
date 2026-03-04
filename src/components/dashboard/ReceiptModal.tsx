"use client";

import React, { useEffect } from "react";
import { SaleRecord, MarketingTag } from "@/lib/dashboard-data";
import { PH_TIME_ZONE } from "@/lib/time";
import { X, Receipt, AlertTriangle } from "lucide-react";

const tagStyles: Record<MarketingTag, { bg: string; color: string }> = {
  Promo: { bg: "rgba(139,92,246,0.1)", color: "#7c3aed" },
  Organic: { bg: "rgba(34,197,94,0.1)", color: "#16a34a" },
  Paid: { bg: "rgba(59,130,246,0.1)", color: "#2563eb" },
  Referral: { bg: "rgba(249,115,22,0.1)", color: "#ea580c" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

interface ReceiptModalProps {
  record: SaleRecord | null;
  onClose: () => void;
}

export default function ReceiptModal({ record, onClose }: ReceiptModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!record) return null;

  const tag = tagStyles[record.marketingTag];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(26,31,46,0.45)",
          zIndex: 200,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Slide-over Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "420px",
          height: "100vh",
          backgroundColor: "#ffffff",
          borderLeft: "1px solid #e2e8f0",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Bricolage Grotesque', sans-serif",
          borderRadius: "6px 0 0 6px",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #253b39 0%, #3d6460 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Receipt size={16} color="#ffffff" />
            </div>
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                Receipt Details
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.65)",
                  margin: 0,
                }}
              >
                {record.receiptId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              background: "rgba(255,255,255,0.12)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.22)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.12)";
            }}
          >
            <X size={16} color="#ffffff" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* Receipt image placeholder */}
          <div
            style={{
              width: "100%",
              height: "180px",
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              border: "2px dashed #e2e8f0",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <Receipt size={40} color="#cbd5e1" />
              <p
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  marginTop: "8px",
                }}
              >
                Receipt Image
              </p>
            </div>
          </div>

          {/* Details */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  margin: 0,
                }}
              >
                Transaction Info
              </p>
            </div>

            {[
              { label: "Receipt ID", value: record.receiptId },
              {
                label: "Date",
                value: new Date(record.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: PH_TIME_ZONE,
                }),
              },
              { label: "Item Name", value: record.itemName },
              { label: "Quantity", value: String(record.quantity) },
              { label: "Unit Price", value: formatCurrency(record.unitPrice) },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: "1px solid #e2e8f0",
                  backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#1a1f2e",
                    fontWeight: 500,
                    textAlign: "right",
                    maxWidth: "220px",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                Marketing Tag
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "2px",
                  padding: "3px 8px",
                  background: tag.bg,
                  color: tag.color,
                }}
              >
                {record.marketingTag}
              </span>
            </div>

            {record.lowStock && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 16px",
                  borderBottom: "1px solid #e2e8f0",
                  backgroundColor: "rgba(245,158,11,0.05)",
                }}
              >
                <AlertTriangle size={14} color="#b45309" />
                <span
                  style={{
                    fontSize: "12px",
                    color: "#b45309",
                    fontWeight: 600,
                  }}
                >
                  Low stock warning for this item
                </span>
              </div>
            )}

            {/* Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                background: "rgba(37,59,57,0.04)",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#1a1f2e",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#253b39",
                  letterSpacing: "-0.02em",
                }}
              >
                {formatCurrency(record.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#64748b",
              cursor: "pointer",
              fontFamily: "'Bricolage Grotesque', sans-serif",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#f1f5f9";
              (e.currentTarget as HTMLElement).style.color = "#1a1f2e";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#f8fafc";
              (e.currentTarget as HTMLElement).style.color = "#64748b";
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
