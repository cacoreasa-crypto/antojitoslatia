"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, setDoc, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
    Plus,
    Trash2,
    Loader2,
    Shield,
    Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface AdminUser {
    id: string; // email
    email: string;
    createdAt?: any;
    name?: string;
}

export default function UsersPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.push("/");
            return;
        }

        if (isSuperAdmin) {
            fetchAdmins();
        }
    }, [isSuperAdmin, authLoading, router]);

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "admins"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser));
            setAdmins(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await setDoc(doc(db, "admins", email), {
                email,
                name,
                createdAt: new Date()
            });
            setEmail("");
            setName("");
            fetchAdmins();
        } catch (err) {
            console.error(err);
            alert("Error al agregar admin.");
        }
    };

    const handleDelete = async (email: string) => {
        if (confirm(`¿Eliminar acceso para ${email}?`)) {
            await deleteDoc(doc(db, "admins", email));
            fetchAdmins();
        }
    };

    if (authLoading || !isSuperAdmin) return null;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="text-[var(--primary)]" />
                        Gestión de Administradores
                    </h1>
                    <p className="text-muted-foreground">Otorga acceso al panel administrativo.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List */}
                <div className="card-premium space-y-4">
                    <h3 className="font-bold border-b border-[var(--border)] pb-2">Administradores Actuales</h3>
                    {loading ? (
                        <div className="py-8 text-center"><Loader2 className="animate-spin inline" /></div>
                    ) : admins.length === 0 ? (
                        <p className="text-muted-foreground italic">No hay administradores extras configurados.</p>
                    ) : (
                        <div className="space-y-2">
                            {admins.map(admin => (
                                <div key={admin.id} className="flex items-center justify-between p-3 bg-[var(--muted)]/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-[var(--card)] rounded-full">
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <p className="font-medium">{admin.name || "Sin nombre"}</p>
                                            <p className="text-xs text-muted-foreground">{admin.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(admin.id)}
                                        className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Form */}
                <div className="card-premium h-fit">
                    <h3 className="font-bold border-b border-[var(--border)] pb-2 mb-4">Agregar Nuevo Admin</h3>
                    <form onSubmit={handleAddAdmin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Email (Google)</label>
                            <input
                                type="email"
                                required
                                placeholder="usuario@gmail.com"
                                className="w-full input-premium"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                El usuario deberá iniciar sesión con este correo en la pantalla de Login.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                            <input
                                type="text"
                                placeholder="Nombre del usuario"
                                className="w-full input-premium"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2">
                            <Plus size={20} />
                            Autorizar Acceso
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
