"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign } from "lucide-react";
import { sparklineData } from "@/lib/dashboard-data";

function Sparkline({
  data,
  color = "#253b39",
}: {
  data: number[];
  color?: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const polyline = points.join(" ");
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const fillPath = `M${firstPoint} L${polyline
    .split(" ")
    .slice(1)
    .join(" L")} L${lastPoint.split(",")[0]},${h} L0,${h} Z`;

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d={fillPath}
        fill={`url(#grad-${color.replace("#", "")})`}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  sparkData: number[];
  icon: React.ElementType;
  delay: number;
}

function StatCard({
  label,
  value,
  change,
  isPositive,
  sparkData,
  icon: Icon,
  delay,
}: StatCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "4px",
        padding: "20px",
        boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
        fontFamily: "'Bricolage Grotesque', sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: `opacity 400ms cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 400ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "6px",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#1a1f2e",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {value}
          </div>
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            background: "rgba(37,59,57,0.08)",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} color="#253b39" />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "12px",
              fontWeight: 600,
              color: isPositive ? "#16a34a" : "#dc2626",
              background: isPositive ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
              borderRadius: "2px",
              padding: "2px 6px",
            }}
          >
            {isPositive ? (
              <TrendingUp size={11} />
            ) : (
              <TrendingDown size={11} />
            )}
            {change}
          </span>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>vs last month</span>
        </div>
        <Sparkline data={sparkData} />
      </div>
    </div>
  );
}

export default function StatCards() {
  return (
    <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
      <StatCard
        label="Total Revenue"
        value="$9,487"
        change="+12.4%"
        isPositive={true}
        sparkData={sparklineData.revenue}
        icon={DollarSign}
        delay={0}
      />
      <StatCard
        label="Items Sold"
        value="1,284"
        change="+8.7%"
        isPositive={true}
        sparkData={sparklineData.itemsSold}
        icon={Package}
        delay={50}
      />
      <StatCard
        label="Low Stock Alerts"
        value="7"
        change="+2"
        isPositive={false}
        sparkData={sparklineData.lowStock}
        icon={AlertTriangle}
        delay={100}
      />
    </div>
  );
}
