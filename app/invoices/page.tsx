"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc, getDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice, Product } from "@/types";
import {
    Plus,
    Search,
    FileText,
    CheckCircle2,
    Truck,
    ExternalLink,
    Download,
    Loader2,
    Clock,
    Circle
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

const statusConfig: Record<string, { icon: any, color: string, bg: string, label: string }> = {
    pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pendiente" },
    paid: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Pagado" },
    delivered: { icon: Truck, color: "text-blue-500", bg: "bg-blue-500/10", label: "Entregado" },
};

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            setInvoices(data);
            setLoading(false);
        }, (error: Error) => {
            console.error("Error fetching invoices:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleStatusChange = async (invoice: Invoice, newStatus: "paid" | "delivered") => {
        try {
            const updates: any = { status: newStatus };

            if (newStatus === "paid") {
                updates.paidAt = Timestamp.now();
                // Register sale
                await addDoc(collection(db, "sales"), {
                    invoiceId: invoice.id,
                    customerName: invoice.customerName || "Cliente General",
                    amount: invoice.total,
                    date: Timestamp.now(),
                    items: invoice.items
                });
            }

            if (newStatus === "delivered") {
                updates.deliveredAt = Timestamp.now();
                // Discount inventory
                for (const item of invoice.items) {
                    const productRef = doc(db, "products", item.productId);
                    const productSnap = await getDoc(productRef);
                    if (productSnap.exists()) {
                        const currentStock = productSnap.data().stock || 0;
                        const qtyToDeduct = (item.quantity * (item.conversionFactor || 1));
                        await updateDoc(productRef, {
                            stock: currentStock - qtyToDeduct
                        });
                    }
                }
            }

            await updateDoc(doc(db, "invoices", invoice.id), updates);
            // fetchInvoices(); // Handled by onSnapshot
        } catch (err) {
            console.error(err);
            alert("Error al actualizar el estado.");
        }
    };

    const [timeRange, setTimeRange] = useState("all");

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (timeRange === "all") return true;

        const date = inv.createdAt.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (timeRange === "today") return date >= now;
        if (timeRange === "week") {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            return date >= startOfWeek;
        }
        if (timeRange === "month") {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return date >= startOfMonth;
        }
        if (timeRange === "year") {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            return date >= startOfYear;
        }
        return true;
    });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Facturas</h1>
                    <p className="text-muted-foreground">Genera y rastrea tus facturaciones.</p>
                </div>
                <Link href="/invoices/new" className="btn-primary flex items-center gap-2 px-3 md:px-4">
                    <Plus size={20} />
                    <span className="hidden md:inline">Nueva Factura</span>
                </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente..."
                        className="w-full pl-10 input-premium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="input-premium w-full md:w-48"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                >
                    <option value="all">Todo el historial</option>
                    <option value="today">Hoy</option>
                    <option value="week">Esta semana</option>
                    <option value="month">Este mes</option>
                    <option value="year">Este año</option>
                </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="card-premium text-center py-12 text-muted-foreground text-sm">
                        No se encontraron facturas.
                    </div>
                ) : (
                    filteredInvoices.map((invoice, i) => (
                        <motion.div
                            key={invoice.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="card-premium flex flex-col md:flex-row md:items-center justify-between gap-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[var(--muted)] rounded-lg text-muted-foreground">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{invoice.customerName}</h3>
                                    <p className="text-sm text-muted-foreground">{formatDate(invoice.createdAt)} • {invoice.items.length} productos</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6">
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="font-bold text-xl">{formatCurrency(invoice.total)}</p>
                                </div>

                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                                    statusConfig[invoice.status].bg,
                                    statusConfig[invoice.status].color
                                )}>
                                    {(() => {
                                        const Icon = statusConfig[invoice.status].icon;
                                        return <Icon size={16} />;
                                    })()}
                                    {statusConfig[invoice.status].label}
                                </div>

                                <div className="flex items-center gap-2">
                                    {invoice.status === "pending" && (
                                        <button
                                            onClick={() => handleStatusChange(invoice, "paid")}
                                            className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                                            title="Marcar como Pagado"
                                        >
                                            <CheckCircle2 size={20} />
                                        </button>
                                    )}
                                    {invoice.status === "paid" && (
                                        <button
                                            onClick={() => handleStatusChange(invoice, "delivered")}
                                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                            title="Marcar como Entregado"
                                        >
                                            <Truck size={20} />
                                        </button>
                                    )}
                                    <Link
                                        href={`/public/invoice/${invoice.id}`}
                                        target="_blank"
                                        className="p-2 text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-all"
                                        title="Ver Enlace Público"
                                    >
                                        <ExternalLink size={20} />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
