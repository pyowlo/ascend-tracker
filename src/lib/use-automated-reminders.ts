"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCurrentPHDateKey } from "@/lib/time";

type SaleStatus = "pending" | "delivered" | "returned";
type PaymentMethod = "cash" | "bank_transfer" | "pending_payment";
type ScheduleStatus = "pending" | "done";
type ReminderSeverity = "critical" | "warning" | "info";

export type AutomatedReminder = {
  id: string;
  severity: ReminderSeverity;
  title: string;
  message: string;
  actionHref: string;
};

type SaleSnapshot = {
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  deliveryDate: string;
  paymentDueDate: string;
  saleDate: string;
  quantity: number;
  itemCode: string;
  itemName: string;
};

type InventorySnapshot = {
  quantity: number;
  itemCode: string;
  itemName: string;
};

type ScheduleSnapshot = {
  status: ScheduleStatus;
  scheduleDate: string;
};

type DismissMap = Record<string, string>;

const STORAGE_KEY = "ascend_reminder_dismiss_until";

function addDaysDateKey(dateKey: string, days: number) {
  const ms = Date.parse(`${dateKey}T00:00:00+08:00`);
  if (Number.isNaN(ms)) return dateKey;
  const next = new Date(ms + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(next);
}

function toMs(value: string) {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function useAutomatedReminders() {
  const todayKey = getCurrentPHDateKey();
  const [sales, setSales] = useState<SaleSnapshot[]>([]);
  const [inventory, setInventory] = useState<InventorySnapshot[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSnapshot[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [dismissMap, setDismissMap] = useState<DismissMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DismissMap;
        setDismissMap(parsed);
      }
    } catch {
      setDismissMap({});
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "sales")),
      (snapshot) => {
        const rows = snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            status: ((data.status === "pending_payment" ? "pending" : data.status) as SaleStatus) ?? "pending",
            paymentMethod: (data.paymentMethod as PaymentMethod) ?? "cash",
            deliveryDate: String(data.deliveryDate ?? ""),
            paymentDueDate: String(data.paymentDueDate ?? ""),
            saleDate: String(data.saleDate ?? ""),
            quantity: Number(data.quantity ?? 0),
            itemCode: String(data.itemCode ?? ""),
            itemName: String(data.itemName ?? ""),
          };
        });
        setSales(rows);
        setLoadingSales(false);
      },
      () => setLoadingSales(false)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "inventory")),
      (snapshot) => {
        const rows = snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            quantity: Number(data.quantity ?? 0),
            itemCode: String(data.itemCode ?? ""),
            itemName: String(data.itemName ?? ""),
          };
        });
        setInventory(rows);
        setLoadingInventory(false);
      },
      () => setLoadingInventory(false)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "schedules")),
      (snapshot) => {
        const rows = snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            status: (data.status as ScheduleStatus) ?? "pending",
            scheduleDate: String(data.scheduleDate ?? ""),
          };
        });
        setSchedules(rows);
        setLoadingSchedules(false);
      },
      () => setLoadingSchedules(false)
    );
    return () => unsubscribe();
  }, []);

  const reminders = useMemo<AutomatedReminder[]>(() => {
    const list: AutomatedReminder[] = [];

    const pendingSales = sales.filter((row) => row.status === "pending");
    const overdueDeliveries = pendingSales.filter((row) => row.deliveryDate && row.deliveryDate < todayKey).length;
    const deliveriesToday = pendingSales.filter((row) => row.deliveryDate === todayKey).length;
    const pendingPaymentRows = sales.filter((row) => row.paymentMethod === "pending_payment");
    const overduePayments = pendingPaymentRows.filter(
      (row) => row.paymentDueDate && row.paymentDueDate < todayKey
    ).length;
    const missingDueDate = pendingPaymentRows.filter((row) => !row.paymentDueDate).length;
    const pendingSchedulesToday = schedules.filter(
      (row) => row.status === "pending" && row.scheduleDate === todayKey
    ).length;

    const nowMs = Date.parse(`${todayKey}T23:59:59+08:00`);
    const windowStart = nowMs - 30 * 86_400_000;
    const recentDelivered = sales.filter((row) => {
      const ms = toMs(row.saleDate);
      return row.status === "delivered" && ms >= windowStart && ms <= nowMs;
    });

    const stockoutCritical = inventory.filter((item) => {
      const sold30 = recentDelivered
        .filter((sale) => sale.itemCode === item.itemCode || sale.itemName === item.itemName)
        .reduce((sum, sale) => sum + sale.quantity, 0);
      const avgDaily = sold30 / 30;
      if (item.quantity <= 0) return true;
      if (avgDaily <= 0) return item.quantity <= 3;
      return item.quantity / avgDaily <= 7;
    }).length;

    const stockoutWarning = inventory.filter((item) => {
      const sold30 = recentDelivered
        .filter((sale) => sale.itemCode === item.itemCode || sale.itemName === item.itemName)
        .reduce((sum, sale) => sum + sale.quantity, 0);
      const avgDaily = sold30 / 30;
      if (item.quantity <= 0) return false;
      if (avgDaily <= 0) return false;
      const days = item.quantity / avgDaily;
      return days > 7 && days <= 14;
    }).length;

    if (overdueDeliveries > 0) {
      list.push({
        id: `delivery-overdue-${todayKey}`,
        severity: "critical",
        title: "Overdue Deliveries",
        message: `${overdueDeliveries} pending delivery order(s) are past due date.`,
        actionHref: "/deliveries",
      });
    }
    if (deliveriesToday > 0) {
      list.push({
        id: `delivery-today-${todayKey}`,
        severity: "info",
        title: "Deliveries Due Today",
        message: `${deliveriesToday} delivery order(s) are scheduled for today.`,
        actionHref: "/deliveries",
      });
    }
    if (overduePayments > 0) {
      list.push({
        id: `payments-overdue-${todayKey}`,
        severity: "critical",
        title: "Overdue Payments",
        message: `${overduePayments} receivable account(s) are past payment due date.`,
        actionHref: "/receivables",
      });
    }
    if (missingDueDate > 0) {
      list.push({
        id: `payments-missing-due-${todayKey}`,
        severity: "warning",
        title: "Missing Due Dates",
        message: `${missingDueDate} pending-payment sale(s) do not have payment due date set.`,
        actionHref: "/receivables",
      });
    }
    if (pendingSchedulesToday > 0) {
      list.push({
        id: `calendar-today-${todayKey}`,
        severity: "info",
        title: "Calendar Follow-up",
        message: `${pendingSchedulesToday} schedule(s) are pending on today's calendar.`,
        actionHref: "/calendar",
      });
    }
    if (stockoutCritical > 0) {
      list.push({
        id: `stock-critical-${todayKey}`,
        severity: "critical",
        title: "Critical Stockout Risk",
        message: `${stockoutCritical} inventory item(s) may stock out within 7 days.`,
        actionHref: "/inventory",
      });
    }
    if (stockoutWarning > 0) {
      list.push({
        id: `stock-warning-${todayKey}`,
        severity: "warning",
        title: "Upcoming Stockout Risk",
        message: `${stockoutWarning} inventory item(s) may stock out within 8-14 days.`,
        actionHref: "/inventory",
      });
    }

    return list;
  }, [inventory, sales, schedules, todayKey]);

  const activeReminders = useMemo(() => {
    return reminders.filter((row) => {
      const hiddenUntil = dismissMap[row.id];
      if (!hiddenUntil) return true;
      return hiddenUntil < todayKey;
    });
  }, [dismissMap, reminders, todayKey]);

  const persistMap = (next: DismissMap) => {
    setDismissMap(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const dismissForToday = (id: string) => {
    persistMap({ ...dismissMap, [id]: todayKey });
  };

  const snoozeOneDay = (id: string) => {
    const tomorrow = addDaysDateKey(todayKey, 1);
    persistMap({ ...dismissMap, [id]: tomorrow });
  };

  const clearAllDismissals = () => {
    persistMap({});
  };

  return {
    reminders: activeReminders,
    unreadCount: activeReminders.length,
    loading: loadingSales || loadingInventory || loadingSchedules,
    dismissForToday,
    snoozeOneDay,
    clearAllDismissals,
  };
}
