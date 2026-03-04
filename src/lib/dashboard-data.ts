export type MarketingTag = "Promo" | "Organic" | "Paid" | "Referral";

export interface SaleRecord {
  id: string;
  date: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  marketingTag: MarketingTag;
  lowStock?: boolean;
  receiptId: string;
}

export const salesData: SaleRecord[] = [];

export const sparklineData = {
  revenue: [42, 58, 45, 71, 55, 83, 67, 90, 75, 95, 88, 102],
  itemsSold: [18, 24, 19, 31, 26, 38, 29, 42, 35, 44, 40, 48],
  lowStock: [3, 2, 4, 3, 5, 4, 6, 5, 4, 6, 5, 7],
};

export type NavItem = {
  label: string;
  icon: string;
  id: string;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", icon: "LayoutDashboard", id: "dashboard" },
  { label: "Inventory", icon: "Package", id: "inventory" },
  { label: "Sales", icon: "TrendingUp", id: "sales" },
  { label: "Delivery Board", icon: "Truck", id: "deliveries" },
  { label: "Analytics", icon: "BarChart3", id: "analytics" },
  { label: "Reminders", icon: "BellRing", id: "reminders" },
  { label: "Receivables", icon: "HandCoins", id: "receivables" },
  { label: "Audit Logs", icon: "FileText", id: "audit" },
];
