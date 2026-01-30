"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice } from "@/types";
import { useParams } from "next/navigation";
import {
    Loader2,
    Download,
    CheckCircle2,
    Clock,
    MapPin,
    Phone
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function PublicInvoicePage() {
    const { id } = useParams();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchInvoice() {
            if (!id) return;
            try {
                const docSnap = await getDoc(doc(db, "invoices", id as string));
                if (docSnap.exists()) {
                    setInvoice({ id: docSnap.id, ...docSnap.data() } as Invoice);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchInvoice();
    }, [id]);

    const downloadPDF = () => {
        if (!invoice) return;
        const doc = new jsPDF();

        // 1. Header Background (Yellow Brand Color)
        doc.setFillColor(249, 200, 14); // #F9C80E
        doc.rect(0, 0, 210, 40, "F");

        // 2. Logo & Company Name
        try {
            doc.addImage("/logo.png", "PNG", 14, 8, 24, 24);
        } catch (e) {
            console.warn("Logo not found");
        }

        doc.setFontSize(24);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("ANTOJITOS LA TIA", 44, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Salvadoran Food • Catering & Delivery", 44, 26);
        doc.text("Tel: +1 (240) 240-8022 | Maryland, USA", 44, 31);

        // 3. Invoice Details (Right aligned in Header)
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("FACTURA", 195, 18, { align: "right" });
        doc.setFontSize(10);
        doc.text(`#${invoice.id.slice(0, 8).toUpperCase()}`, 195, 24, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(invoice.createdAt), 195, 30, { align: "right" });

        // 4. Customer Information
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("FACTURAR A:", 14, 55);

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(invoice.customerName, 14, 62);

        let yPos = 68;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);

        if (invoice.customerAddress) {
            doc.text(invoice.customerAddress, 14, yPos);
            yPos += 5;
        }
        if (invoice.customerPhone) {
            doc.text(invoice.customerPhone, 14, yPos);
            yPos += 5;
        }

        // 5. Product Table
        const tableData = invoice.items.map(item => [
            item.name,
            `${item.quantity} ${item.unitType === 'bag' ? 'Bolsa(s)' : item.unitType === 'box' ? 'Caja(s)' : item.unitType === 'pallet' ? 'Pallet(s)' : 'Unid.'}`,
            formatCurrency(item.price),
            formatCurrency(item.total)
        ]);

        autoTable(doc, {
            startY: yPos + 10,
            head: [['PRODUCTO / DESCRIPCIÓN', 'CANTIDAD', 'PRECIO UNIT.', 'TOTAL']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [249, 200, 14],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'left'
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                valign: 'middle'
            },
            alternateRowStyles: {
                fillColor: [250, 250, 250]
            }
        });

        // 6. Totals
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        doc.setDrawColor(200, 200, 200);
        doc.line(120, finalY - 5, 195, finalY - 5);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL A PAGAR", 140, finalY + 5);

        doc.setFontSize(16);
        doc.setTextColor(0, 150, 0); // Green for money
        doc.text(formatCurrency(invoice.total), 195, finalY + 5, { align: "right" });

        // 7. Status Watermark (if paid)
        if (invoice.status === 'paid') {
            doc.setTextColor(0, 150, 0);
            doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
            doc.setFontSize(60);
            doc.text("PAGADO", 105, 150, { align: "center", angle: 45 });
            doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
        }

        // 8. Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFillColor(20, 20, 20);
        doc.rect(0, pageHeight - 15, 210, 15, "F");

        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text("¡Gracias por su preferencia!", 105, pageHeight - 9, { align: "center" });
        doc.text("www.antojitoslatia.com", 105, pageHeight - 5, { align: "center" });

        doc.save(`Factura-${invoice.customerName.replace(/\s+/g, '-')}-${id?.slice(0, 5)}.pdf`);
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">Factura No Encontrada</h1>
                <p className="text-gray-500">El enlace es inválido o la factura ha sido eliminada.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-black py-12 px-4 shadow-sm">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    <div className="bg-[var(--primary)] p-8 flex flex-col md:flex-row justify-between items-center text-black">
                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                            <div className="relative w-20 h-20 bg-white rounded-2xl p-2 shadow-lg">
                                <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black italic">ANTOJITOS LA TIA</h1>
                                <p className="font-bold opacity-80">Salvadoran Food</p>
                            </div>
                        </div>
                        <div className="text-center md:text-right">
                            <p className="text-sm font-bold opacity-70">SITUACIÓN DE FACTURA</p>
                            <div className="flex items-center gap-2 text-xl font-black uppercase">
                                {invoice.status === 'paid' ? <CheckCircle2 /> : <Clock />}
                                {invoice.status === 'paid' ? 'PAGADO' : invoice.status === 'delivered' ? 'ENTREGADO' : 'PENDIENTE'}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-2 gap-8 pb-8 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212]">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Facturar a</p>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{invoice.customerName}</h2>
                                {invoice.customerAddress && (
                                    <p className="text-sm text-gray-500 mt-1">{invoice.customerAddress}</p>
                                )}
                                {invoice.customerPhone && (
                                    <p className="text-sm text-gray-500">{invoice.customerPhone}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Fecha de Emisión</p>
                                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{formatDate(invoice.createdAt)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-4 text-xs font-bold text-gray-500 uppercase tracking-widest pb-2 border-b border-gray-200 dark:border-gray-700">
                                <div className="col-span-2">Producto</div>
                                <div className="text-center">Cant.</div>
                                <div className="text-right">Total</div>
                            </div>
                            {invoice.items.map((item, i) => (
                                <div key={i} className="grid grid-cols-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors rounded-lg px-2 -mx-2">
                                    <div className="col-span-2">
                                        <p className="font-bold text-gray-900 dark:text-gray-100">{item.name}</p>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-bold uppercase bg-[var(--primary)]/20 text-black dark:text-[var(--primary)] px-1.5 py-0.5 rounded">
                                                {item.unitType === 'unit' ? 'Unidad' : item.unitType === 'bag' ? 'Bolsa' : item.unitType === 'box' ? 'Caja' : 'Pallet'}
                                            </span>
                                            <p className="text-xs text-gray-500">{formatCurrency(item.price)}</p>
                                        </div>
                                    </div>
                                    <div className="text-center font-medium self-center text-gray-700 dark:text-gray-300">{item.quantity}</div>
                                    <div className="text-right font-black self-center text-gray-900 dark:text-gray-100">{formatCurrency(item.total)}</div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-100 dark:border-gray-800">
                            <div className="flex gap-6">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Phone size={14} className="text-primary" />
                                    +1 (240) 240-8022
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin size={14} className="text-primary" />
                                    Maryland, USA
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total a Pagar</p>
                                <p className="text-4xl font-black text-primary">{formatCurrency(invoice.total)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-gray-50 dark:bg-black/20 flex justify-center border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={downloadPDF}
                            className="btn-primary flex items-center gap-2 h-12 px-8 shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform"
                        >
                            <Download size={20} />
                            Descargar PDF
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-8 mb-12">
                    © {new Date().getFullYear()} Antojitos la Tia. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
