import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Sale } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

// Helper to load image
const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } else {
                reject(new Error("Could not get canvas context"));
            }
        };
        img.onerror = error => reject(error);
        img.src = url;
    });
};

const COMPANY_INFO = {
    name: "Antojitos La Tía",
    address: "Maryland, USA",
    phone: "+1 (555) 000-0000", // Update with real info if available
    email: "contact@antojitoslatia.com"
};

const setupPDF = async () => {
    const doc = new jsPDF();

    // Add Logo
    try {
        const logoData = await getBase64ImageFromURL('/logo.png');
        // Aspect ratio of logo is roughly square or landscape? Provided file is 320KB, likely decent res.
        // Assuming square-ish for now or fitting in box.
        doc.addImage(logoData, 'PNG', 14, 10, 25, 25);
    } catch (e) {
        console.error("Logo load failed", e);
    }

    // Company Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(COMPANY_INFO.name, 45, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Reporte Generado: " + new Date().toLocaleDateString(), 45, 30);

    // Draw a line
    doc.setDrawColor(200);
    doc.line(14, 40, 196, 40);

    return doc;
};

export const generateExpensesPDF = async (expenses: Expense[], filters: any) => {
    const doc = await setupPDF();

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Reporte de Gastos", 14, 55);

    // Filter Info
    doc.setFontSize(10);
    doc.setTextColor(80);
    let filterText = "Filtros aplicados: ";

    const parts = [];
    if (filters.year) parts.push(`Año: ${filters.year}`);
    if (filters.month !== 'all') {
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        // Assuming filters.month is index 0-11 or "all"
        const mName = months[parseInt(filters.month)] || filters.month;
        parts.push(`Mes: ${mName}`);
    }
    if (filters.category !== 'all') parts.push(`Categoría: ${filters.category}`);
    if (filters.search) parts.push(`Búsqueda: "${filters.search}"`);

    if (parts.length === 0) parts.push("Ninguno (Todo)");
    filterText += parts.join(" | ");

    doc.text(filterText, 14, 62);

    // Table
    const tableData = expenses.map(e => [
        formatDate(e.date),
        e.description,
        e.category,
        formatCurrency(e.amount)
    ]);

    // Calculate Total
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    autoTable(doc, {
        startY: 70,
        head: [['Fecha', 'Descripción', 'Categoría', 'Monto']],
        body: tableData,
        foot: [['', '', 'TOTAL GLOBAL', formatCurrency(total)]],
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69] }, // Red for expenses
        footStyles: { fillColor: [240, 240, 240], textColor: [220, 53, 69], fontStyle: 'bold', halign: 'right' },
        columnStyles: {
            3: { halign: 'right', fontStyle: 'bold' } // Amount column right aligned
        },
        styles: { fontSize: 10, cellPadding: 3 }
    });

    doc.save(`Gastos_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateSalesPDF = async (sales: Sale[], filters: any) => {
    const doc = await setupPDF();

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Reporte de Ventas", 14, 55);

    // Filter Info
    doc.setFontSize(10);
    doc.setTextColor(80);
    let filterText = "Período: ";
    if (filters.dateRange?.start && filters.dateRange?.end) {
        filterText += `${new Date(filters.dateRange.start).toLocaleDateString()} al ${new Date(filters.dateRange.end).toLocaleDateString()}`;
    } else {
        filterText += "Histórico Completo";
    }
    if (filters.search) filterText += ` | Búsqueda: "${filters.search}"`;

    doc.text(filterText, 14, 62);

    // Table
    const tableData = sales.map(s => [
        formatDate(s.date),
        s.invoiceId.substring(0, 8) + '...', // Truncate ID for PDF
        s.customerName || 'N/A',
        s.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
        formatCurrency(s.amount)
    ]);

    const total = sales.reduce((sum, s) => sum + s.amount, 0);

    autoTable(doc, {
        startY: 70,
        head: [['Fecha', 'ID Factura', 'Cliente', 'Productos', 'Monto']],
        body: tableData,
        foot: [['', '', '', 'TOTAL GLOBAL', formatCurrency(total)]],
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69] }, // Green for sales
        footStyles: { fillColor: [240, 240, 240], textColor: [40, 167, 69], fontStyle: 'bold', halign: 'right' },
        columnStyles: {
            3: { cellWidth: 80 }, // Wider column for products
            4: { halign: 'right', fontStyle: 'bold' } // Amount column
        },
        styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`Ventas_${new Date().toISOString().split('T')[0]}.pdf`);
};
