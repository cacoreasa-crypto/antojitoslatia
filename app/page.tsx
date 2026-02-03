"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  TrendingUp,
  Wallet,
  Package,
  AlertTriangle,
  Receipt,
  ArrowUpRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import { Invoice, Product, Expense, Sale } from "@/types";

export default function Dashboard() {
  const [stats, setStats] = useState({
    monthlySales: 0,
    monthlyExpenses: 0,
    lowStockItems: [] as Product[],
    recentInvoices: [] as Invoice[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    // 1. Monthly Sales Listener
    const salesQ = query(
      collection(db, "sales"),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    );
    const unsubSales = onSnapshot(salesQ, (snapshot) => {
      const monthlySales = snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setStats(prev => ({ ...prev, monthlySales }));
      setLoading(false);
    });

    // 2. Monthly Expenses Listener
    const expensesQ = query(
      collection(db, "expenses"),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    );
    const unsubExpenses = onSnapshot(expensesQ, (snapshot) => {
      const monthlyExpenses = snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setStats(prev => ({ ...prev, monthlyExpenses }));
      setLoading(false);
    });

    // 3. Low Stock Listener
    const productsQ = collection(db, "products");
    const unsubProducts = onSnapshot(productsQ, (snapshot) => {
      const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      const lowStockItems = allProducts.filter(p => p.stock <= p.minStock);
      setStats(prev => ({ ...prev, lowStockItems }));
      setLoading(false);
    });

    // 4. Recent Invoices Listener
    const invoicesQ = query(collection(db, "invoices"), where("status", "==", "pending"));
    const unsubInvoices = onSnapshot(invoicesQ, (snapshot) => {
      const recentInvoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)).slice(0, 5);
      setStats(prev => ({ ...prev, recentInvoices }));
      setLoading(false);
    });

    return () => {
      unsubSales();
      unsubExpenses();
      unsubProducts();
      unsubInvoices();
    };
  }, []);

  const cards = [
    {
      label: "Ventas del Mes",
      value: formatCurrency(stats.monthlySales),
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
      href: "/sales"
    },
    {
      label: "Gastos del Mes",
      value: formatCurrency(stats.monthlyExpenses),
      icon: Wallet,
      color: "text-red-500",
      bg: "bg-red-500/10",
      href: "/expenses"
    },
    {
      label: "Utilidad Neta",
      value: formatCurrency(stats.monthlySales - stats.monthlyExpenses),
      icon: Package,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/"
    },
    {
      label: "Alertas de Stock",
      value: stats.lowStockItems.length.toString(),
      icon: AlertTriangle,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      href: "/inventory"
    }
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-[var(--muted)] rounded-full" />
          <div className="h-4 w-32 bg-[var(--muted)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black italic tracking-tight">DASHBOARD</h1>
          <p className="text-muted-foreground font-medium">Resumen administrativo de Antojitos la Tia.</p>
        </div>
        <div className="bg-[var(--muted)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <Link href={card.href} key={card.label}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card-premium h-full group hover:translate-y-[-4px] active:scale-95 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                  <card.icon size={28} />
                </div>
                <ArrowUpRight className="text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" size={20} />
              </div>
              <div className="mt-6">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{card.label}</p>
                <h3 className="text-3xl font-black mt-1">{card.value}</h3>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-premium !p-0 overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Receipt size={20} className="text-primary" />
              FACTURAS PENDIENTES
            </h3>
            <Link href="/invoices" className="text-xs font-bold text-primary hover:underline">Ver todas</Link>
          </div>
          <div className="p-2">
            {stats.recentInvoices.length === 0 ? (
              <div className="text-muted-foreground text-sm text-center py-12 italic">
                No hay facturas pendientes.
              </div>
            ) : (
              stats.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-[var(--muted)]/50 rounded-xl transition-colors">
                  <div>
                    <p className="font-bold">{inv.customerName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{inv.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg">{formatCurrency(inv.total)}</p>
                    <p className="text-[10px] font-bold text-yellow-500 uppercase">Pendiente</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-premium !p-0 overflow-hidden border-yellow-500/20">
          <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-yellow-500/5">
            <h3 className="text-xl font-black flex items-center gap-2 text-yellow-500">
              <AlertTriangle size={20} />
              STOCK BAJO
            </h3>
            <Link href="/inventory" className="text-xs font-bold text-primary hover:underline">Gestionar Stock</Link>
          </div>
          <div className="p-2">
            {stats.lowStockItems.length === 0 ? (
              <div className="text-muted-foreground text-sm text-center py-12 italic">
                Todos los productos tienen stock suficiente.
              </div>
            ) : (
              stats.lowStockItems.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 hover:bg-[var(--muted)]/50 rounded-xl transition-colors">
                  <div>
                    <p className="font-bold">{product.name}</p>
                    <p className="text-xs text-muted-foreground">Mínimo sugerido: {product.minStock}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-2xl text-red-500">{product.stock}</p>
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Agotándose</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
