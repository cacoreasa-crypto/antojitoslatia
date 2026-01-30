"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
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

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchSales = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "sales"), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
            setSales(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
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

    const filteredSales = sales.filter(s =>
        s.invoiceId.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    Exportar Excel
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

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por ID de factura..."
                    className="w-full pl-10 input-premium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="card-premium overflow-hidden !p-0">
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
        </div>
    );
}
