"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sale } from "@/types";
import {
    TrendingUp,
    Search,
    Download,
    Loader2,
    Calendar,
    DollarSign
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import * as XLSX from 'xlsx';
import { DateRangePicker, DateRange } from "@/components/DateRangePicker";

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState<DateRange>({
        start: null,
        end: null,
        label: "Todo"
    });

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "sales"), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
            setSales(data);
            setLoading(false);
        }, (error: Error) => {
            console.error("Error fetching sales:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(sales.map(s => ({
            Fecha: formatDate(s.date),
            Monto: s.amount,
            ID_Factura: s.invoiceId,
            Items: s.items.map(i => `${i.name} (${i.quantity})`).join(", ")
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");
        XLSX.writeFile(wb, `Reporte-Ventas-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const [timeRange, setTimeRange] = useState("all");

    const filteredSales = sales.filter(s => {
        const matchesSearch = s.invoiceId.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (!dateRange.start || !dateRange.end) return true;

        const date = s.date.toDate ? s.date.toDate() : new Date(s.date);

        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);

        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        return date >= start && date <= end;
    });

    const totalSales = sales.reduce((acc, s) => acc + s.amount, 0);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Ventas</h1>
                    <p className="text-muted-foreground">Historial de transacciones confirmadas.</p>
                </div>
                <button
                    onClick={exportToExcel}
                    className="btn-accent flex items-center gap-2"
                >
                    <Download size={20} />
                    <span className="hidden md:inline">Exportar Excel</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <TrendingUp size={16} /> Total Histórico
                    </p>
                    <h3 className="text-3xl font-black text-green-500">{formatCurrency(totalSales)}</h3>
                </div>
                <div className="card-premium">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar size={16} /> Ventas este Mes
                    </p>
                    <h3 className="text-3xl font-black">{formatCurrency(totalSales)}</h3> {/* Calculation can be refined */}
                </div>
                <div className="card-premium">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <DollarSign size={16} /> Promedio por Venta
                    </p>
                    <h3 className="text-3xl font-black italic">{formatCurrency(sales.length ? totalSales / sales.length : 0)}</h3>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por ID de factura..."
                        className="w-full pl-10 input-premium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-auto">
                    <DateRangePicker value={dateRange} onChange={setDateRange} />
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block card-premium overflow-hidden !p-0">
                <table className="w-full text-left">
                    <thead className="bg-[var(--muted)] text-muted-foreground text-sm">
                        <tr>
                            <th className="px-6 py-4 font-medium">Fecha</th>
                            <th className="px-6 py-4 font-medium">Factura ID</th>
                            <th className="px-6 py-4 font-medium">Cliente</th>
                            <th className="px-6 py-4 font-medium">Productos</th>
                            <th className="px-6 py-4 font-medium text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <Loader2 className="animate-spin inline-block mr-2" />
                                    Cargando ventas...
                                </td>
                            </tr>
                        ) : filteredSales.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                    No se encontraron ventas.
                                </td>
                            </tr>
                        ) : (
                            filteredSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                                    <td className="px-6 py-4">{formatDate(sale.date)}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{sale.invoiceId}</td>
                                    <td className="px-6 py-4">{sale.customerName || "N/A"}</td>
                                    <td className="px-6 py-4 text-sm max-w-xs truncate">
                                        {sale.items.map(i => `${i.name} (${i.quantity})`).join(", ")}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-green-500">
                                        {formatCurrency(sale.amount)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : filteredSales.length === 0 ? (
                    <div className="card-premium text-center py-8 text-muted-foreground">
                        No se encontraron ventas.
                    </div>
                ) : (
                    filteredSales.map((sale) => (
                        <div key={sale.id} className="card-premium space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-green-500">{formatCurrency(sale.amount)}</h3>
                                    <p className="text-xs text-muted-foreground">{formatDate(sale.date)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono bg-[var(--muted)] px-1.5 py-0.5 rounded">{sale.invoiceId.slice(0, 8)}...</p>
                                </div>
                            </div>

                            {sale.customerName && (
                                <div className="text-sm font-medium border-t border-[var(--border)] pt-2">
                                    <span className="text-muted-foreground font-normal">Cliente:</span> {sale.customerName}
                                </div>
                            )}

                            <div className="bg-[var(--muted)]/30 rounded-lg p-2 text-sm space-y-1">
                                <p className="text-xs text-muted-foreground mb-2 uppercase font-bold">Productos</p>
                                {sale.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{item.name}</span>
                                        <span className="font-bold opacity-70">x{item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
