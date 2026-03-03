"use client";

import React from "react";
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  BarChart3,
  FileText,
  ChevronRight,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Package,
  TrendingUp,
  BarChart3,
  FileText,
};

interface SidebarProps {
  activeNav: string;
  onNavChange: (id: string) => void;
}

const navItems = [
  { label: "Dashboard", icon: "LayoutDashboard", id: "dashboard" },
  { label: "Inventory", icon: "Package", id: "inventory" },
  { label: "Sales", icon: "TrendingUp", id: "sales" },
  { label: "Analytics", icon: "BarChart3", id: "analytics" },
  { label: "Audit Logs", icon: "FileText", id: "audit" },
];

export default function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  return (
    <aside
      style={{
        width: "220px",
        minWidth: "220px",
        backgroundColor: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
        fontFamily: "'Bricolage Grotesque', sans-serif",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              background: "linear-gradient(135deg, #253b39, #3d6460)",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={16} color="#ffffff" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#1a1f2e",
              letterSpacing: "-0.02em",
            }}
          >
            Ascend Tracker
          </span>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                marginBottom: "2px",
                borderRadius: "4px",
                border: "none",
                background: isActive ? "rgba(37, 59, 57, 0.07)" : "transparent",
                borderLeft: isActive
                  ? "3px solid #253b39"
                  : "3px solid transparent",
                cursor: "pointer",
                transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#253b39" : "#64748b",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(37, 59, 57, 0.04)";
                  (e.currentTarget as HTMLElement).style.color = "#1a1f2e";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#64748b";
                }
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #253b39, #3d6460)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
            JD
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#1a1f2e",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Jane Doe
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#ffffff",
              background: "#253b39",
              borderRadius: "2px",
              padding: "1px 6px",
              display: "inline-block",
              fontWeight: 600,
              marginTop: "2px",
            }}
          >
            Admin
          </div>
        </div>
      </div>
    </aside>
  );
}
