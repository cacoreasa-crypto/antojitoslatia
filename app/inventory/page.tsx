"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2,
    AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [form, setForm] = useState({
        name: "",
        price: 0,
        stock: 0,
        minStock: 5,
        unitsPerBag: 25,
        bagsPerBox: 20,
        boxesPerPallet: 30,
        stockUnitType: "unit"
    });

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "products"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(data);
            setLoading(false);
        }, (error: Error) => {
            console.error("Error fetching products:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const calculateTotalUnits = (qty: number, type: string) => {
        if (type === 'bag') return qty * form.unitsPerBag;
        if (type === 'box') return qty * form.unitsPerBag * form.bagsPerBox;
        if (type === 'pallet') return qty * form.unitsPerBag * form.bagsPerBox * form.boxesPerPallet;
        return qty;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalStock = form.stock;
        // If creating new or manually updating stock via this simplified form, convert input to units
        // Note: For editing existing stock correctly, we might need a separate "Adjust Stock" flow, but for now we follow the request to keep it simple in one form.
        // Logic: if editing, overwrite stock with new calculation? Or just save?
        // User request: "Stock inicial debe ingresarse en tipo de empaque". 
        // We will assume the input 'stock' is what the user counted in 'stockUnitType'.

        finalStock = calculateTotalUnits(form.stock, form.stockUnitType);

        const productData = {
            name: form.name,
            price: form.price,
            stock: finalStock,
            minStock: form.minStock, // This is usually in units
            packaging: {
                unitsPerBag: form.unitsPerBag,
                bagsPerBox: form.bagsPerBox,
                boxesPerPallet: form.boxesPerPallet
            }
        };

        try {
            if (editingProduct) {
                // If editing, we might not want to reset stock unless explicitly changed.
                // However, per request "Stock inicial", typically usually implied for creation.
                // Let's assume if editing, we update everything.
                await updateDoc(doc(db, "products", editingProduct.id), productData);
            } else {
                await addDoc(collection(db, "products"), productData);
            }
            setShowModal(false);
            setEditingProduct(null);
            resetForm();
            // fetchProducts(); // Handled by onSnapshot
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setForm({
            name: "",
            price: 0,
            stock: 0,
            minStock: 5,
            unitsPerBag: 25,
            bagsPerBox: 20,
            boxesPerPallet: 30,
            stockUnitType: "unit"
        });
    }

    const startEdit = (product: Product) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            price: product.price,
            stock: product.stock, // Show current stock in units by default
            minStock: product.minStock,
            unitsPerBag: product.packaging?.unitsPerBag || 0,
            bagsPerBox: product.packaging?.bagsPerBox || 0,
            boxesPerPallet: product.packaging?.boxesPerPallet || 0,
            stockUnitType: "unit"
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este producto?")) {
            await deleteDoc(doc(db, "products", id));
            // fetchProducts(); // Handled by onSnapshot
        }
    };

    // Helper to safely handle number inputs
    const safeValue = (val: number) => isNaN(val) ? "" : val;

    return (
        <div className="space-y-8 pb-20 md:pb-0"> {/* Add padding bottom for mobile if needed */}
            <div className="flex justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Inventario</h1>
                    <p className="text-muted-foreground">Gestiona tus productos y existencias.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingProduct(null);
                        resetForm();
                        setShowModal(true);
                    }}
                    className="btn-primary flex items-center justify-center gap-2 px-3 md:px-4"
                >
                    <Plus size={20} />
                    <span className="hidden md:inline">Nuevo Producto</span>
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                    type="text"
                    placeholder="Buscar producto..."
                    className="w-full pl-10 input-premium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block card-premium overflow-hidden !p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-[var(--muted)] text-muted-foreground text-sm">
                            <tr>
                                <th className="px-6 py-4 font-medium">Nombre</th>
                                <th className="px-6 py-4 font-medium">Precio Unit.</th>
                                <th className="px-6 py-4 font-medium">Stock (Unidades)</th>
                                <th className="px-6 py-4 font-medium">Empaques</th>
                                <th className="px-6 py-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="animate-spin inline-block mr-2" />
                                        Cargando productos...
                                    </td>
                                </tr>
                            ) : products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            ) : (
                                products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((product) => (
                                    <tr key={product.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                                        <td className="px-6 py-4 font-medium">{product.name}</td>
                                        <td className="px-6 py-4">{formatCurrency(product.price)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`flex items-center gap-2 ${product.stock <= product.minStock ? 'text-red-500 font-bold' : ''}`}>
                                                {product.stock}
                                                {product.stock <= product.minStock && <AlertCircle size={14} />}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            {product.packaging ? (
                                                <div className="flex flex-col gap-1 text-xs">
                                                    <span>Bolsa: {product.packaging.unitsPerBag}u</span>
                                                    <span>Caja: {product.packaging.bagsPerBox}b</span>
                                                    <span>Pallet: {product.packaging.boxesPerPallet}c</span>
                                                </div>
                                            ) : "N/A"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => startEdit(product)}
                                                className="p-2 text-muted-foreground hover:text-[var(--primary)] transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                    <div className="card-premium text-center py-8 text-muted-foreground">
                        No se encontraron productos.
                    </div>
                ) : (
                    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((product) => (
                        <div key={product.id} className="card-premium space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{product.name}</h3>
                                    <p className="text-muted-foreground text-sm">{formatCurrency(product.price)} / unidad</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startEdit(product)}
                                        className="p-2 bg-[var(--muted)] rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="p-2 bg-[var(--muted)] rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-[var(--muted)]/50 rounded-lg">
                                <span className="text-sm font-medium">Stock Disponible</span>
                                <span className={`flex items-center gap-2 font-bold ${product.stock <= product.minStock ? 'text-red-500' : ''}`}>
                                    {product.stock} u
                                    {product.stock <= product.minStock && <AlertCircle size={14} />}
                                </span>
                            </div>

                            {product.packaging && (
                                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                                    <div className="bg-[var(--muted)]/30 p-2 rounded">
                                        <p className="text-muted-foreground">Bolsa</p>
                                        <p className="font-medium">{product.packaging.unitsPerBag}u</p>
                                    </div>
                                    <div className="bg-[var(--muted)]/30 p-2 rounded">
                                        <p className="text-muted-foreground">Caja</p>
                                        <p className="font-medium">{product.packaging.bagsPerBox}b</p>
                                    </div>
                                    <div className="bg-[var(--muted)]/30 p-2 rounded">
                                        <p className="text-muted-foreground">Pallet</p>
                                        <p className="font-medium">{product.packaging.boxesPerPallet}c</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Modal Multi-purpose */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-premium w-full max-w-2xl relative z-10 my-8 max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-2xl font-bold mb-6">
                                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full input-premium"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Precio Base (por Unidad) ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full input-premium"
                                            value={safeValue(form.price)}
                                            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                {/* Empaques Section */}
                                <div className="p-4 bg-[var(--muted)]/50 rounded-xl space-y-4 border border-[var(--border)]">
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Configuración de Empaques</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Unidades por Bolsa</label>
                                            <input
                                                type="number"
                                                className="w-full input-premium bg-[var(--card)]"
                                                value={safeValue(form.unitsPerBag)}
                                                onChange={(e) => setForm({ ...form, unitsPerBag: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Bolsas por Caja</label>
                                            <input
                                                type="number"
                                                className="w-full input-premium bg-[var(--card)]"
                                                value={safeValue(form.bagsPerBox)}
                                                onChange={(e) => setForm({ ...form, bagsPerBox: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Cajas por Pallet</label>
                                            <input
                                                type="number"
                                                className="w-full input-premium bg-[var(--card)]"
                                                value={safeValue(form.boxesPerPallet)}
                                                onChange={(e) => setForm({ ...form, boxesPerPallet: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Precios Calculados (Read Only) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[var(--muted)] p-4 rounded-xl">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Precio Bolsa</p>
                                        <p className="font-bold">{formatCurrency((form.price || 0) * (form.unitsPerBag || 0))}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Precio Caja</p>
                                        <p className="font-bold">{formatCurrency((form.price || 0) * (form.unitsPerBag || 0) * (form.bagsPerBox || 0))}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Precio Pallet</p>
                                        <p className="font-bold">{formatCurrency((form.price || 0) * (form.unitsPerBag || 0) * (form.bagsPerBox || 0) * (form.boxesPerPallet || 0))}</p>
                                    </div>
                                </div>

                                {/* Stock Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Stock Inicial / Actual</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                required
                                                className="w-full input-premium"
                                                value={safeValue(form.stock)}
                                                onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) })}
                                            />
                                            <select
                                                className="input-premium bg-[var(--muted)] max-w-[120px]"
                                                value={form.stockUnitType}
                                                onChange={(e) => setForm({ ...form, stockUnitType: e.target.value })}
                                            >
                                                <option value="unit">Unidades</option>
                                                <option value="bag">Bolsas</option>
                                                <option value="box">Cajas</option>
                                                <option value="pallet">Pallets</option>
                                            </select>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Se guardará como: {calculateTotalUnits(form.stock || 0, form.stockUnitType)} Unidades
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Alerta Stock Bajo (Unidades)</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full input-premium"
                                            value={safeValue(form.minStock)}
                                            onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8 pt-4 border-t border-[var(--border)]">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 btn-primary"
                                    >
                                        {editingProduct ? "Guardar Cambios" : "Crear Producto"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
