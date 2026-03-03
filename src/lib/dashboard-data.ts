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

export const salesData: SaleRecord[] = [
  {
    id: "1",
    date: "2024-01-15",
    itemName: "Ascend Pro Headset",
    quantity: 3,
    unitPrice: 249.99,
    total: 749.97,
    marketingTag: "Promo",
    receiptId: "RCP-001",
  },
  {
    id: "2",
    date: "2024-01-15",
    itemName: "Wireless Keyboard X1",
    quantity: 12,
    unitPrice: 89.5,
    total: 1074.0,
    marketingTag: "Organic",
    lowStock: true,
    receiptId: "RCP-002",
  },
  {
    id: "3",
    date: "2024-01-14",
    itemName: "Ergonomic Mouse Pro",
    quantity: 7,
    unitPrice: 65.0,
    total: 455.0,
    marketingTag: "Paid",
    receiptId: "RCP-003",
  },
  {
    id: "4",
    date: "2024-01-14",
    itemName: "4K Monitor UltraWide",
    quantity: 2,
    unitPrice: 899.0,
    total: 1798.0,
    marketingTag: "Referral",
    receiptId: "RCP-004",
  },
  {
    id: "5",
    date: "2024-01-13",
    itemName: "USB-C Hub Deluxe",
    quantity: 15,
    unitPrice: 45.0,
    total: 675.0,
    marketingTag: "Promo",
    lowStock: true,
    receiptId: "RCP-005",
  },
  {
    id: "6",
    date: "2024-01-13",
    itemName: "Mechanical Keyboard TKL",
    quantity: 4,
    unitPrice: 159.99,
    total: 639.96,
    marketingTag: "Organic",
    receiptId: "RCP-006",
  },
  {
    id: "7",
    date: "2024-01-12",
    itemName: "Laptop Stand Carbon",
    quantity: 8,
    unitPrice: 79.0,
    total: 632.0,
    marketingTag: "Paid",
    receiptId: "RCP-007",
  },
  {
    id: "8",
    date: "2024-01-12",
    itemName: "Webcam HD 1080p",
    quantity: 6,
    unitPrice: 99.99,
    total: 599.94,
    marketingTag: "Referral",
    lowStock: true,
    receiptId: "RCP-008",
  },
  {
    id: "9",
    date: "2024-01-11",
    itemName: "Cable Management Kit",
    quantity: 20,
    unitPrice: 24.99,
    total: 499.8,
    marketingTag: "Organic",
    receiptId: "RCP-009",
  },
  {
    id: "10",
    date: "2024-01-11",
    itemName: "Desk Pad XL",
    quantity: 9,
    unitPrice: 39.99,
    total: 359.91,
    marketingTag: "Promo",
    receiptId: "RCP-010",
  },
  {
    id: "11",
    date: "2024-01-10",
    itemName: "Gaming Chair Elite",
    quantity: 1,
    unitPrice: 599.0,
    total: 599.0,
    marketingTag: "Paid",
    lowStock: true,
    receiptId: "RCP-011",
  },
  {
    id: "12",
    date: "2024-01-10",
    itemName: "LED Desk Lamp Smart",
    quantity: 11,
    unitPrice: 54.99,
    total: 604.89,
    marketingTag: "Referral",
    receiptId: "RCP-012",
  },
];

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
  { label: "Analytics", icon: "BarChart3", id: "analytics" },
  { label: "Audit Logs", icon: "FileText", id: "audit" },
];
