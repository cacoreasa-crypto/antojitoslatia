export type InvoiceStatus = 'pending' | 'paid' | 'delivered';

export interface Product {
    id: string;
    name: string;
    price: number; // Price per UNIT
    stock: number; // Stored in UNITS
    minStock: number;
    category?: string;
    packaging?: {
        unitsPerBag: number;
        bagsPerBox: number;
        boxesPerPallet: number;
    };
}

export interface InvoiceItem {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    unitType?: 'unit' | 'bag' | 'box' | 'pallet';
    conversionFactor?: number;
}

export interface Invoice {
    id: string;
    customerId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: InvoiceStatus;
    createdAt: any;
    paidAt?: any;
    deliveredAt?: any;
}

export interface Client {
    id: string;
    name: string;
    email?: string;
    phone: string;
    address: string;
    createdAt: any;
}

export interface Expense {
    id: string;
    date: any;
    category: string;
    amount: number;
    description: string;
    receiptUrl?: string;
    receiptName?: string;
}

export interface Sale {
    id: string;
    invoiceId: string;
    customerName?: string;
    amount: number;
    date: any;
    items: InvoiceItem[];
}
