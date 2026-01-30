"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, InvoiceItem, Client } from "@/types";
import {
    Plus,
    Trash2,
    ArrowLeft,
    Search,
    Loader2,
    Save,
    User,
    MapPin,
    Phone,
    X
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

export default function NewInvoicePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Client State
    const [clientSearch, setClientSearch] = useState("");
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showClientModal, setShowClientModal] = useState(false);
    const [newClient, setNewClient] = useState({ name: "", phone: "", address: "", email: "" });
    const [creatingClient, setCreatingClient] = useState(false);

    const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Products
                const pQuery = query(collection(db, "products"), orderBy("name"));
                const pSnapshot = await getDocs(pQuery);
                setProducts(pSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));

                // Fetch Clients
                const cQuery = query(collection(db, "clients"), orderBy("name"));
                const cSnapshot = await getDocs(cQuery);
                setClients(cSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const calculatePrice = (product: Product, type: string) => {
        let factor = 1;
        if (product.packaging) {
            if (type === 'bag') factor = product.packaging.unitsPerBag;
            if (type === 'box') factor = product.packaging.unitsPerBag * product.packaging.bagsPerBox;
            if (type === 'pallet') factor = product.packaging.unitsPerBag * product.packaging.bagsPerBox * product.packaging.boxesPerPallet;
        }
        return product.price * factor;
    };

    const getConversionFactor = (product: Product, type: string) => {
        if (!product.packaging) return 1;
        if (type === 'bag') return product.packaging.unitsPerBag;
        if (type === 'box') return product.packaging.unitsPerBag * product.packaging.bagsPerBox;
        if (type === 'pallet') return product.packaging.unitsPerBag * product.packaging.bagsPerBox * product.packaging.boxesPerPallet;
        return 1;
    }

    const addItem = (product: Product, unitType: 'unit' | 'bag' | 'box' | 'pallet' = 'unit') => {
        const price = calculatePrice(product, unitType);
        const existingIndex = selectedItems.findIndex(item => item.productId === product.id && item.unitType === unitType);

        if (existingIndex >= 0) {
            const newItems = [...selectedItems];
            const item = newItems[existingIndex];
            newItems[existingIndex] = {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price
            };
            setSelectedItems(newItems);
        } else {
            setSelectedItems([...selectedItems, {
                productId: product.id,
                name: product.name,
                quantity: 1,
                price: price,
                total: price,
                unitType: unitType,
                conversionFactor: getConversionFactor(product, unitType)
            }]);
        }
    };

    const removeItem = (index: number) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, qty: number) => {
        if (qty <= 0) return removeItem(index);
        const newItems = [...selectedItems];
        const item = newItems[index];
        newItems[index] = {
            ...item,
            quantity: qty,
            total: qty * item.price
        };
        setSelectedItems(newItems);
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClient.name || !newClient.phone || !newClient.address) {
            alert("Por favor completa los campos obligatorios (Nombre, Teléfono, Dirección)");
            return;
        }
        setCreatingClient(true);
        try {
            const docRef = await addDoc(collection(db, "clients"), {
                ...newClient,
                createdAt: Timestamp.now()
            });
            const createdClient = { id: docRef.id, ...newClient, createdAt: Timestamp.now() } as Client;
            setClients([...clients, createdClient]);
            setSelectedClient(createdClient);
            setShowClientModal(false);
            setNewClient({ name: "", phone: "", address: "", email: "" });
            setClientSearch("");
        } catch (error) {
            console.error("Error creating client:", error);
            alert("Error al crear cliente.");
        } finally {
            setCreatingClient(false);
        }
    };

    const handleSave = async () => {
        if (!selectedClient || selectedItems.length === 0) {
            alert("Por favor selecciona un cliente y agrega productos.");
            return;
        }

        setSaving(true);
        try {
            await addDoc(collection(db, "invoices"), {
                customerId: selectedClient.id,
                customerName: selectedClient.name,
                customerPhone: selectedClient.phone,
                customerAddress: selectedClient.address,
                items: selectedItems,
                total: selectedItems.reduce((acc, item) => acc + item.total, 0),
                status: "pending",
                createdAt: Timestamp.now(),
            });
            router.push("/invoices");
        } catch (err) {
            console.error(err);
            alert("Error al guardar la factura.");
        } finally {
            setSaving(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone.includes(clientSearch)
    );

    // Product Selection Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [addQty, setAddQty] = useState(1);
    const [addUnitType, setAddUnitType] = useState<string>('unit');
    const [productSearch, setProductSearch] = useState("");

    const openAddModal = (product: Product) => {
        setActiveProduct(product);
        setAddQty(1);
        setAddUnitType('unit');
        setShowProductModal(true);
    };

    const confirmAddItem = () => {
        if (!activeProduct) return;
        addItem(activeProduct, addUnitType as any);
        setShowProductModal(false);
        setActiveProduct(null);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-32 md:pb-20">
            <div className="flex items-center gap-4">
                <Link href="/invoices" className="p-2 hover:bg-[var(--muted)] rounded-lg transition-all">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Nueva Factura</h1>
                    <p className="text-muted-foreground">Completa los detalles de la venta.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Client Selection Card */}
                    <div className="card-premium space-y-4">
                        <h3 className="font-bold border-b border-[var(--border)] pb-2 flex justify-between items-center">
                            Información del Cliente
                            {selectedClient && (
                                <button
                                    onClick={() => setSelectedClient(null)}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Cambiar
                                </button>
                            )}
                        </h3>

                        {!selectedClient ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar cliente por nombre o teléfono..."
                                        className="w-full pl-10 input-premium"
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                    />
                                </div>

                                <div className="max-h-[200px] overflow-y-auto space-y-2 border border-[var(--border)] rounded-lg p-2 bg-[var(--background)]">
                                    {filteredClients.length > 0 ? (
                                        filteredClients.map(client => (
                                            <div
                                                key={client.id}
                                                onClick={() => setSelectedClient(client)}
                                                className="p-3 hover:bg-[var(--muted)] rounded-lg cursor-pointer flex justify-between items-center group transition-colors"
                                            >
                                                <div>
                                                    <p className="font-medium group-hover:text-primary transition-colors">{client.name}</p>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><Phone size={12} /> {client.phone}</span>
                                                        <span className="flex items-center gap-1"><MapPin size={12} /> {client.address}</span>
                                                    </div>
                                                </div>
                                                <button className="btn-secondary text-xs px-2 py-1">Seleccionar</button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-muted-foreground text-sm">
                                            No se encontraron clientes.
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setNewClient(prev => ({ ...prev, name: clientSearch }));
                                        setShowClientModal(true);
                                    }}
                                    className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} />
                                    Crear Nuevo Cliente
                                </button>
                            </div>
                        ) : (
                            <div className="bg-[var(--muted)]/30 p-4 rounded-xl space-y-3 border border-[var(--border)]">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-bold text-lg">{selectedClient.name}</h4>
                                        <p className="text-xs text-muted-foreground">ID: {selectedClient.id.slice(0, 6)}...</p>
                                    </div>
                                    <div className="h-10 w-10 bg-[var(--primary)]/20 text-[var(--primary)] rounded-full flex items-center justify-center">
                                        <User size={20} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="text-muted-foreground" size={16} />
                                        <span>{selectedClient.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="text-muted-foreground" size={16} />
                                        <span>{selectedClient.address}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card-premium space-y-4">
                        <h3 className="font-bold border-b border-[var(--border)] pb-2 text-primary">Productos en Factura</h3>
                        {selectedItems.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground text-sm italic">
                                Aún no has agregado productos.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {selectedItems.map((item, index) => (
                                    <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-4 p-3 bg-[var(--muted)]/50 rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{item.name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase bg-[var(--primary)]/20 text-[var(--primary-foreground)] px-2 py-0.5 rounded">
                                                    {item.unitType === 'unit' ? 'Unidad' : item.unitType === 'bag' ? 'Bolsa' : item.unitType === 'box' ? 'Caja' : 'Pallet'}
                                                </span>
                                                <p className="text-sm text-muted-foreground">{formatCurrency(item.price)} x {item.quantity}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--card)]">
                                                <button
                                                    onClick={() => updateQuantity(index, item.quantity - 1)}
                                                    className="px-3 py-1 hover:bg-[var(--muted)]"
                                                >-</button>
                                                <span className="px-3 font-medium min-w-[40px] text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(index, item.quantity + 1)}
                                                    className="px-3 py-1 hover:bg-[var(--muted)]"
                                                >+</button>
                                            </div>
                                            <p className="font-bold min-w-[80px] text-right">{formatCurrency(item.total)}</p>
                                            <button
                                                onClick={() => removeItem(index)}
                                                className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
                            <span className="text-lg font-bold">Total</span>
                            <span className="text-2xl font-black text-primary">{formatCurrency(selectedItems.reduce((acc, item) => acc + item.total, 0))}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card-premium space-y-4 min-h-[500px] flex flex-col">
                        <h3 className="font-bold border-b border-[var(--border)] pb-2 flex items-center justify-between">
                            Catálogo de Productos
                            <Link href="/inventory" className="text-xs text-primary hover:underline">Gestionar</Link>
                        </h3>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                className="w-full pl-9 input-premium text-sm"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                            {loading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : filteredProducts.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8 text-sm">No se encontraron productos.</p>
                            ) : (
                                filteredProducts.map(product => (
                                    <div
                                        key={product.id}
                                        onClick={() => openAddModal(product)}
                                        className="p-3 rounded-lg border border-[var(--border)] hover:border-primary cursor-pointer hover:bg-[var(--muted)]/50 transition-all group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-sm group-hover:text-primary transition-colors">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">{product.stock} disponibles</p>
                                            </div>
                                            <p className="font-bold text-sm">{formatCurrency(product.price)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedClient || selectedItems.length === 0}
                        className="w-full btn-primary h-14 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <><Save size={24} /> Guardar Factura</>}
                    </button>
                </div>
            </div>

            {/* Mobile Sticky Footer */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] p-4 flex items-center justify-between gap-4 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                <div>
                    <p className="text-xs text-muted-foreground">Total Estimado</p>
                    <p className="text-xl font-black text-primary">{formatCurrency(selectedItems.reduce((acc, item) => acc + item.total, 0))}</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || !selectedClient || selectedItems.length === 0}
                    className="btn-primary px-6 py-3 font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="animate-spin" /> : "Guardar"}
                </button>
            </div>

            {/* Create Client Modal */}
            <AnimatePresence>
                {showClientModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowClientModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-premium w-full max-w-md relative z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">Nuevo Cliente</h2>
                                <button onClick={() => setShowClientModal(false)} className="p-1 hover:bg-[var(--muted)] rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateClient} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nombre Completo *</label>
                                    <input
                                        required
                                        className="w-full input-premium"
                                        placeholder="Ej. Restaurante El Sol"
                                        value={newClient.name}
                                        onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Teléfono *</label>
                                    <input
                                        required
                                        className="w-full input-premium"
                                        placeholder="Ej. 240-555-0123"
                                        value={newClient.phone}
                                        onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Dirección *</label>
                                    <input
                                        required
                                        className="w-full input-premium"
                                        placeholder="Ej. 123 Main St, Silver Spring, MD"
                                        value={newClient.address}
                                        onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email (Opcional)</label>
                                    <input
                                        type="email"
                                        className="w-full input-premium"
                                        placeholder="cliente@ejemplo.com"
                                        value={newClient.email}
                                        onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowClientModal(false)}
                                        className="flex-1 btn-secondary"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 btn-primary flex justify-center items-center gap-2"
                                        disabled={creatingClient}
                                    >
                                        {creatingClient ? <Loader2 className="animate-spin" size={18} /> : "Crear Cliente"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Product Modal */}
            <AnimatePresence>
                {showProductModal && activeProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProductModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card-premium w-full max-w-sm relative z-10"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl font-bold">{activeProduct.name}</h2>
                                    <p className="text-sm text-muted-foreground">Precio Base: {formatCurrency(activeProduct.price)}</p>
                                </div>
                                <button onClick={() => setShowProductModal(false)} className="p-1 hover:bg-[var(--muted)] rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Tipo de Unidad</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setAddUnitType('unit')}
                                            className={`p-2 rounded-lg border text-sm transition-all ${addUnitType === 'unit' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-[var(--border)] hover:bg-[var(--muted)]'}`}
                                        >
                                            Unidad
                                        </button>
                                        {activeProduct.packaging && (
                                            <>
                                                <button
                                                    onClick={() => setAddUnitType('bag')}
                                                    className={`p-2 rounded-lg border text-sm transition-all ${addUnitType === 'bag' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-[var(--border)] hover:bg-[var(--muted)]'}`}
                                                >
                                                    Bolsa
                                                </button>
                                                <button
                                                    onClick={() => setAddUnitType('box')}
                                                    className={`p-2 rounded-lg border text-sm transition-all ${addUnitType === 'box' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-[var(--border)] hover:bg-[var(--muted)]'}`}
                                                >
                                                    Caja
                                                </button>
                                                <button
                                                    onClick={() => setAddUnitType('pallet')}
                                                    className={`p-2 rounded-lg border text-sm transition-all ${addUnitType === 'pallet' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-[var(--border)] hover:bg-[var(--muted)]'}`}
                                                >
                                                    Pallet
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Cantidad</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setAddQty(Math.max(1, addQty - 1))}
                                            className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center text-xl font-bold hover:bg-[var(--border)] transition-colors"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={addQty}
                                            onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="flex-1 h-12 text-center text-xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-primary outline-none"
                                        />
                                        <button
                                            onClick={() => setAddQty(addQty + 1)}
                                            className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center text-xl font-bold hover:bg-[var(--border)] transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-[var(--muted)]/30 p-4 rounded-xl flex justify-between items-center">
                                    <span className="font-medium">Total Estimado</span>
                                    <span className="text-xl font-black text-primary">
                                        {formatCurrency(calculatePrice(activeProduct, addUnitType) * addQty)}
                                    </span>
                                </div>

                                <button
                                    onClick={confirmAddItem}
                                    className="w-full btn-primary h-12 font-bold text-lg"
                                >
                                    Agregar a Factura
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
