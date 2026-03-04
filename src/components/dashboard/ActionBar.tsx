"use client";

import React from "react";
import { Search, Download, ChevronDown } from "lucide-react";

interface ActionBarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  dateFilter: string;
  onDateFilterChange: (v: string) => void;
  onExport: () => void;
}

const dateOptions = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export default function ActionBar({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  onExport,
}: ActionBarProps) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [exportPressed, setExportPressed] = React.useState(false);

  const selectedLabel =
    dateOptions.find((o) => o.value === dateFilter)?.label ?? "All Time";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px",
        fontFamily: "'Bricolage Grotesque', sans-serif",
      }}
    >
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#1a1f2e",
          letterSpacing: "-0.01em",
        }}
      >
        Sales Overview
      </h2>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#1a1f2e",
              cursor: "pointer",
              fontFamily: "'Bricolage Grotesque', sans-serif",
              boxShadow: "2px 2px 0 rgba(0,0,0,0.05)",
              transition: "all 250ms cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {selectedLabel}
            <ChevronDown
              size={13}
              style={{
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 250ms cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                boxShadow: "4px 4px 0 rgba(0,0,0,0.08)",
                zIndex: 100,
                minWidth: "140px",
                overflow: "hidden",
              }}
            >
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onDateFilterChange(opt.value);
                    setDropdownOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 14px",
                    fontSize: "13px",
                    fontWeight: dateFilter === opt.value ? 600 : 400,
                    color: dateFilter === opt.value ? "#253b39" : "#1a1f2e",
                    background:
                      dateFilter === opt.value
                        ? "rgba(37,59,57,0.06)"
                        : "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    transition: "background 150ms ease",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <Search
            size={14}
            color="#94a3b8"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              paddingLeft: "32px",
              paddingRight: "12px",
              paddingTop: "8px",
              paddingBottom: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              fontSize: "13px",
              color: "#1a1f2e",
              fontFamily: "'Bricolage Grotesque', sans-serif",
              outline: "none",
              width: "200px",
              boxShadow: "2px 2px 0 rgba(0,0,0,0.05)",
              transition: "border-color 250ms cubic-bezier(0.4,0,0.2,1)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#253b39";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          />
        </div>

        <button
          onClick={() => {
            setExportPressed(true);
            setTimeout(() => setExportPressed(false), 250);
            onExport();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            background: "linear-gradient(135deg, #253b39 0%, #3d6460 100%)",
            border: "none",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#ffffff",
            cursor: "pointer",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
            transform: exportPressed ? "scale(0.97)" : "scale(1)",
            transition: "transform 250ms cubic-bezier(0.4,0,0.2,1), box-shadow 250ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <Download size={14} />
          Export to CSV
        </button>
      </div>
    </div>
  );
}
