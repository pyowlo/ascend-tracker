"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  Package,
  TrendingUp,
  BarChart3,
  FileText,
  CalendarDays,
  MessageCircle,
  Wallet,
  HandCoins,
  Truck,
  BellRing,
} from "lucide-react";
import { useAppContext } from "@/lib/app-context";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Package,
  TrendingUp,
  BarChart3,
  FileText,
  CalendarDays,
  MessageCircle,
  Wallet,
  HandCoins,
  Truck,
  BellRing,
};

const navItems = [
  { label: "Dashboard", icon: "LayoutDashboard", id: "dashboard", href: "/dashboard" },
  { label: "Inventory", icon: "Package", id: "inventory", href: "/inventory" },
  { label: "Sales", icon: "TrendingUp", id: "sales", href: "/sales" },
  { label: "Delivery Board", icon: "Truck", id: "deliveries", href: "/deliveries" },
  { label: "Analytics", icon: "BarChart3", id: "analytics", href: "/analytics" },
  { label: "Calendar", icon: "CalendarDays", id: "calendar", href: "/calendar" },
  { label: "Expenses", icon: "Wallet", id: "expenses", href: "/expenses" },
  { label: "Reminders", icon: "BellRing", id: "reminders", href: "/reminders" },
  { label: "Receivables", icon: "HandCoins", id: "receivables", href: "/receivables" },
  { label: "Chat", icon: "MessageCircle", id: "chat", href: "/chat" },
  { label: "Audit Logs", icon: "FileText", id: "audit", href: "/audit-logs" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAppContext();

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      ) : null}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[220px] min-w-[220px] flex-col border-r border-slate-200 bg-white font-[Inter,sans-serif] transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="border-b border-slate-200 px-5 pb-4 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded">
                <img
                  src="/assets/ascend-logo.png"
                  alt="Ascend Tracker logo"
                  width={28}
                  height={28}
                  style={{ width: "28px", height: "28px", objectFit: "contain", display: "block" }}
                />
              </div>
              <span className="text-base font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                Ascend Tracker
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-200 bg-white p-1 text-slate-600 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-3">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className={`mb-0.5 flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-all duration-200 ${
                  isActive
                    ? "border-l-[3px] border-l-[#253b39] bg-[#253b39]/10 font-semibold text-[#253b39] dark:bg-teal-400/10 dark:text-teal-200"
                    : "border-l-[3px] border-l-transparent font-normal text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#253b39] to-[#3d6460]">
            <span className="text-xs font-bold text-white">
              {profile.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {profile.name}
            </div>
            <div className="mt-0.5 inline-block rounded bg-[#253b39] px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {profile.role}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
