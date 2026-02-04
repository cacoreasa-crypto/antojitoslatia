"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, query, orderBy, Timestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Expense } from "@/types";
import {
    Plus,
    Search,
    Wallet,
    FileText,
    Image as ImageIcon,
    Loader2,
    X,
    Upload,
    Download,
    Settings,
    Trash2,
    Trash2,
    Edit2,
    Filter
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
// import { DateRangePicker, DateRange } from "@/components/DateRangePicker"; // Removed for simpler dropdowns

import * as XLSX from 'xlsx';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const [addingCategory, setAddingCategory] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const [form, setForm] = useState({
        description: "",
        amount: 0,
        category: "",
        date: new Date().toISOString().split('T')[0]
    });
    const [file, setFile] = useState<File | null>(null);

    const DEFAULT_CATEGORIES = [
        "Cocina / Insumos",
        "Servicios (Luz, Agua, Gas)",
        "Local / Renta",
        "Marketing / Publicidad",
        "Transporte",
        "Otros"
    ];

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "expenses"), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            setExpenses(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const q = query(collection(db, "expense_categories"), orderBy("name"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            setCategories(data);
        } catch (err) {
            console.error("Error fetching categories:", err);
        }
    };

    useEffect(() => {
        fetchExpenses();
        fetchCategories();
    }, []);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        setAddingCategory(true);
        try {
            await addDoc(collection(db, "expense_categories"), {
                name: newCategory.trim(),
                createdAt: Timestamp.now()
            });
            setNewCategory("");
            fetchCategories();
        } catch (error) {
            console.error("Error adding category:", error);
            alert("Error al agregar categoría");
        } finally {
            setAddingCategory(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;
        try {
            await deleteDoc(doc(db, "expense_categories", id));
            fetchCategories();
        } catch (error) {
            console.error("Error deleting category:", error);
            alert("Error al eliminar categoría");
        }
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(expenses.map(e => ({
            Fecha: formatDate(e.date),
            Descripción: e.description,
            Categoría: e.category,
            Monto: e.amount,
            Recibo: e.receiptUrl || "N/A"
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Gastos");
        XLSX.writeFile(wb, `Reporte-Gastos-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let receiptUrl = "";
            let receiptName = "";

            if (file) {
                const fileRef = ref(storage, `expenses/${Date.now()}_${file.name}`);
                const uploadResult = await uploadBytes(fileRef, file);
                receiptUrl = await getDownloadURL(uploadResult.ref);
                receiptName = file.name;
            }

            if (editingExpense) {
                const updates: any = {
                    ...form,
                    amount: parseFloat(form.amount.toString()),
                    date: Timestamp.fromDate(new Date(form.date)),
                };
                if (receiptUrl) {
                    updates.receiptUrl = receiptUrl;
                    updates.receiptName = receiptName;
                }
                await updateDoc(doc(db, "expenses", editingExpense.id), updates);
            } else {
                await addDoc(collection(db, "expenses"), {
                    ...form,
                    amount: parseFloat(form.amount.toString()),
                    date: Timestamp.fromDate(new Date(form.date)),
                    receiptUrl,
                    receiptName,
                    createdAt: Timestamp.now()
                });
            }

            setEditingExpense(null);

            setShowModal(false);
            setForm({ description: "", amount: 0, category: "", date: new Date().toISOString().split('T')[0] });
            setFile(null);
            fetchExpenses();
        } catch (err) {
            console.error(err);
            alert("Error al registrar gasto.");
        } finally {
            setSaving(false);
        }
    };

    // Enhanced Filter Logic
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth()).toString()); // 0-11
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const filteredExpenses = expenses.filter(e => {
        // 1. Text Search
        const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        const expenseDate = e.date.toDate ? e.date.toDate() : new Date(e.date);

        // 2. Year Filter
        if (expenseDate.getFullYear() !== selectedYear) return false;

        // 3. Month Filter (if not 'all')
        if (selectedMonth !== "all") {
            if (expenseDate.getMonth() !== parseInt(selectedMonth)) return false;
        }

        // 4. Category Filter (if not 'all')
        if (selectedCategory !== "all") {
            if (e.category !== selectedCategory) return false;
        }

        return true;
    });

    // Merge default and custom categories for selection
    const availableCategories = [
        ...DEFAULT_CATEGORIES,
        ...categories.map(c => c.name)
    ].filter((value, index, self) => self.indexOf(value) === index).sort();

    useEffect(() => {
        if (availableCategories.length > 0 && !form.category) {
            setForm(prev => ({ ...prev, category: availableCategories[0] }));
        }
    }, [categories]);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Gastos</h1>
                    <p className="text-muted-foreground">Registra egresos y facturas de compra.</p>
                </div>
                <div className="flex gap-2">
                    {/* Desktop Actions */}
                    <div className="hidden md:flex gap-2">
                        <button
                            onClick={exportToExcel}
                            className="btn-accent flex items-center gap-2"
                        >
                            <Download size={20} />
                            Exportar
                        </button>
                        <button
                            onClick={() => setShowCategoryModal(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Settings size={20} />
                            Categorías
                        </button>
                    </div>

                    {/* Mobile Actions Dropdown */}
                    <div className="md:hidden relative">
                        <TopMenu
                            onExport={exportToExcel}
                            onCategories={() => setShowCategoryModal(true)}
                        />
                    </div>

                    <button
                        onClick={() => {
                            setEditingExpense(null);
                            setForm({ description: "", amount: 0, category: "", date: new Date().toISOString().split('T')[0] });
                            setFile(null);
                            setShowModal(true);
                        }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span className="hidden md:inline">Registrar Gasto</span>
                        <span className="md:hidden">Nuevo</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar gasto..."
                            className="w-full pl-10 input-premium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Advanced Filter Bar */}
                <div className="flex flex-wrap gap-2 items-center bg-[var(--muted)]/50 p-2 rounded-xl border border-[var(--border)]">
                    <span className="text-xs font-bold text-muted-foreground uppercase px-2"><Filter size={14} className="inline mr-1" /> Filtros:</span>

                    {/* Year Selector */}
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    {/* Month Selector */}
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">Todo el Año</option>
                        {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((month, idx) => (
                            <option key={idx} value={idx}>{month}</option>
                        ))}
                    </select>

                    {/* Category Selector */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 max-w-[200px]"
                    >
                        <option value="all">Todas las Categorías</option>
                        {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {(selectedCategory !== "all" || selectedMonth !== "all" || selectedYear !== new Date().getFullYear()) && (
                        <button
                            onClick={() => {
                                setSelectedYear(new Date().getFullYear());
                                setSelectedMonth("all"); // Reset to whole year for easier view
                                setSelectedCategory("all");
                            }}
                            className="ml-auto text-xs text-red-500 hover:text-red-600 font-medium px-2"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-secondary" size={32} />
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="card-premium text-center py-12 text-muted-foreground">
                        No hay gastos registrados.
                    </div>
                ) : (
                    filteredExpenses.map((expense, i) => (
                        <motion.div
                            key={expense.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="card-premium flex flex-col md:flex-row md:items-center justify-between gap-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{expense.description}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs bg-[var(--muted)] px-2 py-0.5 rounded text-muted-foreground font-bold uppercase">{expense.category}</span>
                                        <span className="text-xs text-muted-foreground">{formatDate(expense.date)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="font-bold text-xl text-red-500">{formatCurrency(expense.amount)}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {expense.receiptUrl && (
                                        <a
                                            href={expense.receiptUrl}
                                            target="_blank"
                                            className="p-2 text-muted-foreground hover:text-primary transition-all bg-[var(--muted)] rounded-lg"
                                            title="Ver Recibo"
                                        >
                                            <ImageIcon size={20} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => {
                                            setEditingExpense(expense);
                                            setForm({
                                                description: expense.description,
                                                amount: expense.amount,
                                                category: expense.category,
                                                date: new Date(expense.date.toDate()).toISOString().split('T')[0]
                                            });
                                            setFile(null);
                                            setShowModal(true);
                                        }}
                                        className="p-2 text-muted-foreground hover:text-[var(--primary)] transition-all bg-[var(--muted)] rounded-lg"
                                        title="Editar"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (confirm("¿Estás seguro de eliminar este gasto?")) {
                                                try {
                                                    await deleteDoc(doc(db, "expenses", expense.id));
                                                    fetchExpenses();
                                                } catch (error) {
                                                    console.error("Error deleting expense:", error);
                                                    alert("Error al eliminar gasto");
                                                }
                                            }
                                        }}
                                        className="p-2 text-muted-foreground hover:text-red-500 transition-all bg-[var(--muted)] rounded-lg"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Create/Edit Expense Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                            className="card-premium w-full max-w-lg relative z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">{editingExpense ? "Editar Gasto" : "Registrar Gasto"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-white">
                                    <X />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full input-premium"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Ej. Compra de insumos cocina"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Monto ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full input-premium text-red-500 font-bold"
                                            value={form.amount}
                                            onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Fecha</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full input-premium"
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                                    <select
                                        className="w-full input-premium bg-[var(--muted)]"
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    >
                                        {availableCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Recibo (Opcional)</label>
                                    <div className="relative group cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        />
                                        <div className="w-full border-2 border-dashed border-[var(--border)] rounded-xl p-8 flex flex-col items-center justify-center gap-2 group-hover:border-primary/50 transition-all bg-[var(--muted)]/50">
                                            <Upload className="text-muted-foreground group-hover:text-primary transition-all" />
                                            <p className="text-sm text-muted-foreground">{file ? file.name : (editingExpense?.receiptName || "Sube una imagen o PDF del recibo")}</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full btn-primary h-12 flex items-center justify-center gap-2 mt-6"
                                >
                                    {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    {editingExpense ? "Guardar Cambios" : "Registrar Gasto"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Category Management Modal */}
            <AnimatePresence>
                {showCategoryModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCategoryModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-premium w-full max-w-md relative z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">Gestionar Categorías</h2>
                                <button onClick={() => setShowCategoryModal(false)} className="text-muted-foreground hover:text-white">
                                    <X />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <form onSubmit={handleAddCategory} className="flex gap-2">
                                    <input
                                        className="input-premium flex-1"
                                        placeholder="Nueva categoría..."
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={addingCategory}
                                    >
                                        {addingCategory ? <Loader2 className="animate-spin" /> : <Plus />}
                                    </button>
                                </form>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase">Tus Categorías Personalizadas</h3>
                                    {categories.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">No has agregado categorías personalizadas.</p>
                                    ) : (
                                        categories.map(cat => (
                                            <div key={cat.id} className="flex justify-between items-center p-3 bg-[var(--muted)]/50 rounded-lg">
                                                <span>{cat.name}</span>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}

                                    <div className="pt-4 border-t border-[var(--border)] mt-4">
                                        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2">Categorías por Defecto</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {DEFAULT_CATEGORIES.map(cat => (
                                                <span key={cat} className="text-xs bg-[var(--muted)] px-2 py-1 rounded text-muted-foreground">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TopMenu({ onExport, onCategories }: { onExport: () => void, onCategories: () => void }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="p-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-muted-foreground"
            >
                <Settings size={20} />
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 top-12 min-w-[160px] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-20 flex flex-col p-1"
                        >
                            <button
                                onClick={() => { onExport(); setOpen(false); }}
                                className="flex items-center gap-2 px-4 py-3 hover:bg-[var(--muted)] rounded-lg text-sm text-left"
                            >
                                <Download size={16} />
                                Exportar Excel
                            </button>
                            <button
                                onClick={() => { onCategories(); setOpen(false); }}
                                className="flex items-center gap-2 px-4 py-3 hover:bg-[var(--muted)] rounded-lg text-sm text-left"
                            >
                                <Settings size={16} />
                                Categorías
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function Save({ size }: { size: number }) {
    return <FileText size={size} />;
}
