"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { db } from "@/lib/firebase";
import { formatDateInPH, getCurrentPHDateKey, getCurrentPHIsoString, getCurrentPHMonthKey } from "@/lib/time";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type SaleStatus = "pending" | "delivered" | "returned";
type PricingType = "srp" | "reseller" | "discounted";
type PaymentMethod = "cash" | "bank_transfer" | "pending_payment";

type InventoryItem = {
  id: string;
  itemCode: string;
  itemName: string;
  packageItems: string[];
  suggestedRetailPrice: number;
  resellerPrice: number;
  discountedPrice: number;
  quantity: number;
};

type SaleEntry = {
  id: string;
  createdAtMs: number;
  inventoryId: string;
  saleDate: string;
  deliveryDate: string;
  deliveryTime: string;
  linkedScheduleId: string;
  itemCode: string;
  itemName: string;
  packageItem?: string;
  quantity: number;
  unitPrice: number;
  pricingType: PricingType;
  suggestedRetailPrice: number;
  resellerPrice: number;
  discountedPrice: number;
  total: number;
  paidAmount: number;
  balanceRemaining: number;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  receiptUrl: string;
  receiptFileName: string;
};

type SaleForm = {
  inventoryId: string;
  quantity: string;
  pricingType: PricingType;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  deliveryDate: string;
  deliveryTime: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
};

type EditSaleForm = {
  quantity: string;
  pricingType: PricingType;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  deliveryDate: string;
  deliveryTime: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
};

const emptyForm: SaleForm = {
  inventoryId: "",
  quantity: "",
  pricingType: "srp",
  status: "pending",
  paymentMethod: "cash",
  deliveryDate: getCurrentPHDateKey(),
  deliveryTime: "09:00",
  customerName: "",
  customerPhone: "",
  customerAddress: "",
};

const emptyEditForm: EditSaleForm = {
  quantity: "",
  pricingType: "srp",
  status: "pending",
  paymentMethod: "cash",
  deliveryDate: getCurrentPHDateKey(),
  deliveryTime: "09:00",
  customerName: "",
  customerPhone: "",
  customerAddress: "",
};

const statusStyle: Record<SaleStatus, { bg: string; color: string }> = {
  pending: { bg: "rgba(245,158,11,0.12)", color: "#b45309" },
  delivered: { bg: "rgba(34,197,94,0.12)", color: "#15803d" },
  returned: { bg: "rgba(239,68,68,0.12)", color: "#b91c1c" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return formatDateInPH(dateStr);
}

export default function SalesPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [form, setForm] = useState<SaleForm>(emptyForm);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState(getCurrentPHMonthKey());
  const [selectedReceipt, setSelectedReceipt] = useState<SaleEntry | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleEntry | null>(null);
  const [editForm, setEditForm] = useState<EditSaleForm>(emptyEditForm);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "inventory"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((entry) => {
            const data = entry.data();
            const createdAtMs =
              data.createdAt && typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : 0;
            return {
              id: entry.id,
              itemCode: String(data.itemCode ?? ""),
              itemName: String(data.itemName ?? ""),
              packageItems: Array.isArray(data.packageItems)
                ? (data.packageItems as string[])
                : data.packageItem
                ? [String(data.packageItem)]
                : [],
              suggestedRetailPrice: Number(data.suggestedRetailPrice ?? data.retailPrice ?? 0),
              resellerPrice: Number(data.resellerPrice ?? 0),
              discountedPrice: Number(data.discountedPrice ?? 0),
              quantity: Number(data.quantity ?? 0),
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs)
          .map(({ createdAtMs: _createdAtMs, ...rest }) => rest);
        setInventoryItems(items);
        setLoadingInventory(false);
      },
      () => {
        setError("Failed to load inventory products.");
        setLoadingInventory(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "sales"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs
          .map((entry) => {
            const data = entry.data();
            const createdAtMs =
              data.createdAt && typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : Date.now();
            const normalizedStatus =
              data.status === "pending_payment" ? "pending" : data.status;
            return {
              id: entry.id,
              createdAtMs,
              inventoryId: String(data.inventoryId ?? ""),
              saleDate: String(data.saleDate ?? getCurrentPHIsoString()),
              deliveryDate: String(data.deliveryDate ?? ""),
              deliveryTime: String(data.deliveryTime ?? ""),
              linkedScheduleId: String(data.linkedScheduleId ?? ""),
              itemCode: String(data.itemCode ?? ""),
              itemName: String(data.itemName ?? ""),
              packageItem: String(data.packageItem ?? ""),
              quantity: Number(data.quantity ?? 0),
              unitPrice: Number(data.unitPrice ?? 0),
              pricingType: (data.pricingType as PricingType) ?? "srp",
              suggestedRetailPrice: Number(data.suggestedRetailPrice ?? 0),
              resellerPrice: Number(data.resellerPrice ?? 0),
              discountedPrice: Number(data.discountedPrice ?? 0),
              total: Number(data.total ?? 0),
              paidAmount: Number(data.paidAmount ?? 0),
              balanceRemaining: Number(data.balanceRemaining ?? Number(data.total ?? 0)),
              status: (normalizedStatus as SaleStatus) ?? "pending",
              paymentMethod: (data.paymentMethod as PaymentMethod) ?? "cash",
              customerName: String(data.customerName ?? ""),
              customerPhone: String(data.customerPhone ?? ""),
              customerAddress: String(data.customerAddress ?? ""),
              receiptUrl: String(data.receiptUrl ?? ""),
              receiptFileName: String(data.receiptFileName ?? ""),
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setSales(entries);
        setLoadingSales(false);
      },
      () => {
        setError("Failed to load sales records.");
        setLoadingSales(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const selectedInventory = useMemo(() => {
    return inventoryItems.find((item) => item.id === form.inventoryId) ?? null;
  }, [inventoryItems, form.inventoryId]);

  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return sales;
    }
    return sales.filter((sale) => {
      return (
        sale.itemName.toLowerCase().includes(q) ||
        sale.itemCode.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q) ||
        sale.status.toLowerCase().includes(q)
      );
    });
  }, [sales, searchQuery]);

  const metrics = useMemo(() => {
    const deliveredSales = sales.filter((sale) => sale.status === "delivered");
    const revenue = deliveredSales.reduce((sum, sale) => sum + sale.total, 0);
    const sold = deliveredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const returned = sales.filter((sale) => sale.status === "returned").length;
    return { revenue, sold, returned };
  }, [sales]);

  const exportCsv = () => {
    const monthlyRows = filteredSales.filter((sale) => sale.saleDate.slice(0, 7) === monthFilter);
    const headers = [
      "Sale Date",
      "Item Code",
      "Item Name",
      "Package",
      "Quantity",
      "Pricing Type",
      "Unit Price (PHP)",
      "Unit Price (Raw)",
      "SRP (PHP)",
      "SRP (Raw)",
      "Reseller Price (PHP)",
      "Reseller Price (Raw)",
      "Discounted Price (PHP)",
      "Discounted Price (Raw)",
      "Total (PHP)",
      "Total (Raw)",
      "Status",
      "Payment Method",
      "Delivery Date",
      "Delivery Time",
      "Customer Name",
      "Customer Phone",
      "Customer Address",
      "Receipt URL",
    ];
    const rows = monthlyRows.map((sale) => [
      sale.saleDate,
      sale.itemCode,
      sale.itemName,
      sale.packageItem ?? "",
      String(sale.quantity),
      sale.pricingType,
      formatCurrency(sale.unitPrice),
      String(sale.unitPrice),
      formatCurrency(sale.suggestedRetailPrice),
      String(sale.suggestedRetailPrice),
      formatCurrency(sale.resellerPrice),
      String(sale.resellerPrice),
      formatCurrency(sale.discountedPrice),
      String(sale.discountedPrice),
      formatCurrency(sale.total),
      String(sale.total),
      sale.status,
      sale.paymentMethod,
      sale.deliveryDate,
      sale.deliveryTime,
      sale.customerName,
      sale.customerPhone,
      sale.customerAddress,
      sale.receiptUrl,
    ]);
    const deliveredRevenue = monthlyRows
      .filter((sale) => sale.status === "delivered")
      .reduce((sum, sale) => sum + sale.total, 0);
    const summaryRows = [
      ["Monthly Sales Statement", monthFilter],
      ["Record Count", String(monthlyRows.length)],
      ["Delivered Revenue (PHP)", formatCurrency(deliveredRevenue)],
      ["Delivered Revenue (Raw)", String(deliveredRevenue)],
      [],
    ];
    const csv = [...summaryRows, headers, ...rows].map((line) => line.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-monthly-statement-${monthFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getUnitPriceByType = (sale: SaleEntry, pricingType: PricingType) => {
    if (pricingType === "reseller") {
      return sale.resellerPrice;
    }
    if (pricingType === "discounted") {
      return sale.discountedPrice;
    }
    return sale.suggestedRetailPrice;
  };

  const openEditModal = (sale: SaleEntry) => {
    setSelectedSale(sale);
    setEditForm({
      quantity: String(sale.quantity),
      pricingType: sale.pricingType,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      deliveryDate: sale.deliveryDate,
      deliveryTime: sale.deliveryTime,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      customerAddress: sale.customerAddress,
    });
    setError(null);
    setNotice(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedSale(null);
    setEditForm(emptyEditForm);
  };

  const handleUpdateSale = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSale) return;

    setError(null);
    setNotice(null);

    const inventory = inventoryItems.find((item) => item.id === selectedSale.inventoryId);
    if (!inventory) {
      setError("Linked inventory item not found.");
      return;
    }

    const nextQuantity = Number(editForm.quantity);
    if (Number.isNaN(nextQuantity) || nextQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (!editForm.customerName.trim() || !editForm.customerPhone.trim() || !editForm.customerAddress.trim()) {
      setError("Complete all customer details.");
      return;
    }
    if (editForm.status === "pending" && (!editForm.deliveryDate || !editForm.deliveryTime)) {
      setError("Delivery date and time are required for pending orders.");
      return;
    }

    const quantityDelta = nextQuantity - selectedSale.quantity;
    if (quantityDelta > 0 && inventory.quantity < quantityDelta) {
      setError("Not enough stock for this update.");
      return;
    }

    const nextUnitPrice = getUnitPriceByType(selectedSale, editForm.pricingType);
    const nextTotal = nextUnitPrice * nextQuantity;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, "sales", selectedSale.id), {
        quantity: nextQuantity,
        pricingType: editForm.pricingType,
        unitPrice: nextUnitPrice,
        total: nextTotal,
        balanceRemaining:
          editForm.paymentMethod === "pending_payment"
            ? Math.max(nextTotal - Number(selectedSale.paidAmount ?? 0), 0)
            : 0,
        status: editForm.status,
        paymentMethod: editForm.paymentMethod,
        deliveryDate: editForm.deliveryDate,
        deliveryTime: editForm.deliveryTime,
        customerName: editForm.customerName.trim(),
        customerPhone: editForm.customerPhone.trim(),
        customerAddress: editForm.customerAddress.trim(),
        updatedAt: serverTimestamp(),
      });

      if (editForm.status === "pending") {
        const schedulePayload = {
          title: `Deliver ${selectedSale.itemName}`,
          scheduleDate: editForm.deliveryDate,
          scheduleTime: editForm.deliveryTime,
          notes: `Customer: ${editForm.customerName.trim()} | Phone: ${editForm.customerPhone.trim()} | Address: ${editForm.customerAddress.trim()} | Sale ID: ${selectedSale.id}`,
          status: "pending",
          source: "sales",
          saleId: selectedSale.id,
          updatedAt: serverTimestamp(),
        };

        if (selectedSale.linkedScheduleId) {
          try {
            await updateDoc(doc(db, "schedules", selectedSale.linkedScheduleId), schedulePayload);
          } catch {
            const recreatedScheduleRef = await addDoc(collection(db, "schedules"), {
              ...schedulePayload,
              createdAt: serverTimestamp(),
            });
            await updateDoc(doc(db, "sales", selectedSale.id), {
              linkedScheduleId: recreatedScheduleRef.id,
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          const scheduleRef = await addDoc(collection(db, "schedules"), {
            ...schedulePayload,
            createdAt: serverTimestamp(),
          });
          await updateDoc(doc(db, "sales", selectedSale.id), {
            linkedScheduleId: scheduleRef.id,
            updatedAt: serverTimestamp(),
          });
        }
      } else if (selectedSale.linkedScheduleId) {
        await deleteDoc(doc(db, "schedules", selectedSale.linkedScheduleId));
        await updateDoc(doc(db, "sales", selectedSale.id), {
          linkedScheduleId: "",
          updatedAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, "inventory", selectedSale.inventoryId), {
        quantity: inventory.quantity - quantityDelta,
        updatedAt: serverTimestamp(),
      });

      closeEditModal();
    } catch {
      setError("Failed to update sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSale = async (sale: SaleEntry) => {
    const confirmed = window.confirm("Delete this sale record?");
    if (!confirmed) return;

    setError(null);
    setNotice(null);
    const inventory = inventoryItems.find((item) => item.id === sale.inventoryId);
    if (!inventory) {
      setError("Linked inventory item not found.");
      return;
    }

    setSubmitting(true);
    try {
      if (sale.linkedScheduleId) {
        try {
          await deleteDoc(doc(db, "schedules", sale.linkedScheduleId));
        } catch {
          // Continue deleting sale even if linked schedule no longer exists.
        }
      }
      await deleteDoc(doc(db, "sales", sale.id));
      await updateDoc(doc(db, "inventory", sale.inventoryId), {
        quantity: inventory.quantity + sale.quantity,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError("Failed to delete sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!selectedInventory) {
      setError("Select a product from inventory.");
      return;
    }

    const quantity = Number(form.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (quantity > selectedInventory.quantity) {
      setError("Quantity exceeds available inventory.");
      return;
    }
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.customerAddress.trim()) {
      setError("Complete all customer details.");
      return;
    }
    if (form.status === "pending" && (!form.deliveryDate || !form.deliveryTime)) {
      setError("Delivery date and time are required for pending orders.");
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl = "";
      let receiptFileName = "";
      if (receiptFile) {
        receiptFileName = receiptFile.name;
        const uploadForm = new FormData();
        uploadForm.append("file", receiptFile);

        const uploadRes = await fetch("/api/upload-receipt", {
          method: "POST",
          body: uploadForm,
        });

        if (uploadRes.ok) {
          const uploadPayload = await uploadRes.json();
          receiptUrl = String(uploadPayload.secureUrl ?? "");
        } else {
          const uploadError = await uploadRes.json().catch(() => null);
          const errorMessage =
            uploadError && typeof uploadError.error === "string"
              ? uploadError.error
              : "Cloudinary upload failed.";
          setNotice(`Sale saved without receipt upload. ${errorMessage}`);
        }
      }

      const unitPrice =
        form.pricingType === "reseller"
          ? selectedInventory.resellerPrice
          : form.pricingType === "discounted"
          ? selectedInventory.discountedPrice
          : selectedInventory.suggestedRetailPrice;
      const total = unitPrice * quantity;
      const saleDate = getCurrentPHIsoString();

      const saleRef = await addDoc(collection(db, "sales"), {
        saleDate,
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        linkedScheduleId: "",
        inventoryId: selectedInventory.id,
        itemCode: selectedInventory.itemCode,
        itemName: selectedInventory.itemName,
        packageItem: selectedInventory.packageItems.join(" + "),
        quantity,
        unitPrice,
        pricingType: form.pricingType,
        suggestedRetailPrice: selectedInventory.suggestedRetailPrice,
        resellerPrice: selectedInventory.resellerPrice,
        discountedPrice: selectedInventory.discountedPrice,
        total,
        paidAmount: form.paymentMethod === "pending_payment" ? 0 : total,
        balanceRemaining: form.paymentMethod === "pending_payment" ? total : 0,
        paymentHistory: [],
        status: form.status,
        paymentMethod: form.paymentMethod,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerAddress: form.customerAddress.trim(),
        receiptUrl,
        receiptFileName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (form.status === "pending") {
        const scheduleRef = await addDoc(collection(db, "schedules"), {
          title: `Deliver ${selectedInventory.itemName}`,
          scheduleDate: form.deliveryDate,
          scheduleTime: form.deliveryTime,
          notes: `Customer: ${form.customerName.trim()} | Phone: ${form.customerPhone.trim()} | Address: ${form.customerAddress.trim()} | Sale ID: ${saleRef.id}`,
          status: "pending",
          source: "sales",
          saleId: saleRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "sales", saleRef.id), {
          linkedScheduleId: scheduleRef.id,
          updatedAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, "inventory", selectedInventory.id), {
        quantity: selectedInventory.quantity - quantity,
        updatedAt: serverTimestamp(),
      });

      setForm(emptyForm);
      setReceiptFile(null);
    } catch {
      setError("Failed to save sale. Check Firebase rules for Firestore/Storage.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell
      sectionLabel="Sales"
      title="Sales Dashboard"
      subtitle="Manual sales entry and fulfillment tracking"
    >
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Revenue", value: formatCurrency(metrics.revenue) },
          { label: "Items Sold", value: metrics.sold.toLocaleString("en-US") },
          { label: "Returned Orders", value: metrics.returned.toLocaleString("en-US") },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              flex: 1,
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
              padding: "20px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {card.label}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: "40px", fontWeight: 800, color: "#1a1f2e" }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#1a1f2e" }}>Record Customer Sale</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Product from Inventory
              <select
                value={form.inventoryId}
                onChange={(e) => setForm((prev) => ({ ...prev, inventoryId: e.target.value }))}
                disabled={loadingInventory}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] disabled:bg-slate-100"
              >
                <option value="">
                  {loadingInventory ? "Loading inventory..." : "Select product"}
                </option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName} ({item.itemCode}) - Stock: {item.quantity}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Quantity Sold
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Pricing Type
              <select
                value={form.pricingType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pricingType: e.target.value as PricingType }))
                }
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              >
                <option value="srp">Suggested Retail Price (SRP)</option>
                <option value="reseller">Reseller's Price</option>
                <option value="discounted">Discounted Price</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Status
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value as SaleStatus }))
                }
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              >
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Payment Method
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))
                }
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="pending_payment">Pending Payment</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Delivery Date
              <input
                type="date"
                value={form.deliveryDate}
                onChange={(e) => setForm((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Delivery Time
              <input
                type="time"
                value={form.deliveryTime}
                onChange={(e) => setForm((prev) => ({ ...prev, deliveryTime: e.target.value }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Customer Name
              <input
                value={form.customerName}
                onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Customer Phone
              <input
                value={form.customerPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Customer Address
              <input
                value={form.customerAddress}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customerAddress: e.target.value }))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              Receipt Upload
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
            </label>
            <div className="flex items-end text-xs text-slate-500">
              {selectedInventory ? (
                <span>
                  Unit Price:{" "}
                  <strong>
                    {formatCurrency(
                      form.pricingType === "reseller"
                        ? selectedInventory.resellerPrice
                        : form.pricingType === "discounted"
                        ? selectedInventory.discountedPrice
                        : selectedInventory.suggestedRetailPrice
                    )}
                  </strong>
                  {" | "}
                  Available Stock: <strong>{selectedInventory.quantity}</strong>
                  {selectedInventory.packageItems.length > 0 ? (
                    <>
                      {" | "}
                      Package: <strong>{selectedInventory.packageItems.join(" + ")}</strong>
                    </>
                  ) : null}
                </span>
              ) : (
                <span>Select inventory product to view pricing and stock.</span>
              )}
            </div>
          </div>

          {error && <p className="m-0 text-sm text-red-600">{error}</p>}
          {notice && <p className="m-0 text-sm text-amber-700">{notice}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-[#253b39] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : "Record Sale"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setReceiptFile(null);
                setError(null);
              }}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          boxShadow: "2px 2px 0 rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Sales Records</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
            />
            <button
              onClick={exportCsv}
              className="rounded-md bg-gradient-to-r from-[#253b39] to-[#3a5a57] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
            >
              Monthly Statement
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {[
                  "Date",
                  "Item",
                  "Qty",
                  "Pricing",
                  "Total",
                  "Status",
                  "Delivery",
                  "Payment",
                  "Customer",
                  "Receipt",
                  "Actions",
                ].map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingSales && (
                <tr>
                  <td colSpan={11} style={{ padding: "20px 16px", fontSize: "13px", color: "#64748b" }}>
                    Loading sales...
                  </td>
                </tr>
              )}

              {!loadingSales && filteredSales.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: "20px 16px", fontSize: "13px", color: "#64748b" }}>
                    No sales records yet.
                  </td>
                </tr>
              )}

              {filteredSales.map((sale, idx) => (
                <tr
                  key={sale.id}
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                  }}
                >
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "#64748b" }}>
                    {formatDate(sale.saleDate)}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                    <div style={{ fontWeight: 600 }}>{sale.itemName}</div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>
                      {sale.itemCode}
                      {sale.packageItem ? ` | ${sale.packageItem}` : ""}
                      {sale.pricingType ? ` | ${sale.pricingType.toUpperCase()}` : ""}
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e", fontWeight: 600 }}>
                    {sale.quantity}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748b" }}>
                    <div>
                      Used: <strong style={{ color: "#1a1f2e" }}>{sale.pricingType.toUpperCase()}</strong>
                    </div>
                    <div>SRP: {formatCurrency(sale.suggestedRetailPrice)}</div>
                    <div>Reseller: {formatCurrency(sale.resellerPrice)}</div>
                    <div>Discounted: {formatCurrency(sale.discountedPrice)}</div>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e", fontWeight: 600 }}>
                    {formatCurrency(sale.total)}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        borderRadius: "2px",
                        padding: "3px 8px",
                        background: statusStyle[sale.status].bg,
                        color: statusStyle[sale.status].color,
                      }}
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "12px", color: "#64748b" }}>
                    {sale.deliveryDate ? `${sale.deliveryDate} ${sale.deliveryTime || ""}` : "-"}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e", textTransform: "capitalize" }}>
                    {sale.paymentMethod === "bank_transfer"
                      ? "Bank Transfer"
                      : sale.paymentMethod === "pending_payment"
                      ? "Pending Payment"
                      : "Cash"}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "#1a1f2e" }}>
                    <div>{sale.customerName}</div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>{sale.customerPhone}</div>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13px" }}>
                    {sale.receiptUrl ? (
                      <button
                        onClick={() => setSelectedReceipt(sale)}
                        style={{
                          color: "#253b39",
                          textDecoration: "underline",
                          fontWeight: 600,
                          border: "none",
                          background: "none",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        View Receipt
                      </button>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>No file</span>
                    )}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => openEditModal(sale)}
                      style={{
                        marginRight: "10px",
                        border: "none",
                        background: "none",
                        padding: 0,
                        color: "#253b39",
                        textDecoration: "underline",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSale(sale)}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        color: "#dc2626",
                        textDecoration: "underline",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && selectedSale && (
        <div
          onClick={closeEditModal}
          className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-900/45 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">Edit Sale</h3>
              <button
                onClick={closeEditModal}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUpdateSale} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    value={editForm.quantity}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Pricing Type
                  <select
                    value={editForm.pricingType}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        pricingType: e.target.value as PricingType,
                      }))
                    }
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  >
                    <option value="srp">Suggested Retail Price (SRP)</option>
                    <option value="reseller">Reseller's Price</option>
                    <option value="discounted">Discounted Price</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Status
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, status: e.target.value as SaleStatus }))
                    }
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  >
                    <option value="pending">Pending</option>
                    <option value="delivered">Delivered</option>
                    <option value="returned">Returned</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Payment Method
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value as PaymentMethod,
                      }))
                    }
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="pending_payment">Pending Payment</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Delivery Date
                  <input
                    type="date"
                    value={editForm.deliveryDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        deliveryDate: e.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Delivery Time
                  <input
                    type="time"
                    value={editForm.deliveryTime}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        deliveryTime: e.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Customer Name
                  <input
                    value={editForm.customerName}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Customer Phone
                  <input
                    value={editForm.customerPhone}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, customerPhone: e.target.value }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                  Customer Address
                  <input
                    value={editForm.customerAddress}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, customerAddress: e.target.value }))
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39]"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-[#253b39] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Saving..." : "Update Sale"}
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <div
          onClick={() => setSelectedReceipt(null)}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Receipt Preview</h3>
                <p className="text-xs text-slate-500">{selectedReceipt.receiptFileName}</p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              {selectedReceipt.receiptUrl.toLowerCase().includes(".pdf") ? (
                <iframe
                  src={selectedReceipt.receiptUrl}
                  title="Receipt PDF"
                  className="h-[65vh] w-full rounded-md border border-slate-200"
                />
              ) : (
                <img
                  src={selectedReceipt.receiptUrl}
                  alt="Receipt"
                  className="max-h-[65vh] w-full rounded-md border border-slate-200 object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
