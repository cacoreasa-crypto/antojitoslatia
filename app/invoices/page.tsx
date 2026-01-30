"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc, getDoc, Timestamp } from "firebase/firestore";
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

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            setInvoices(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
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
            fetchInvoices();
        } catch (err) {
            console.error(err);
            alert("Error al actualizar el estado.");
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Facturas</h1>
                    <p className="text-muted-foreground">Genera y rastrea tus facturaciones.</p>
                </div>
                <Link href="/invoices/new" className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    Nueva Factura
                </Link>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por cliente..."
                    className="w-full pl-10 input-premium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
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
