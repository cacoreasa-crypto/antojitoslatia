"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogIn, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
        } catch (err: any) {
            setError("Credenciales inválidas o acceso no autorizado.");
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-8 card-premium"
            >
                <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32 mb-4">
                        <Image
                            src="/logo.png"
                            alt="Antojitos la Tia"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h2 className="text-3xl font-bold text-center tracking-tight">
                        Web Admin
                    </h2>
                    <p className="text-muted-foreground">Acceso restringido</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full input-premium"
                            placeholder="admin@antojitoslatia.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full input-premium"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary flex justify-center items-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                <LogIn size={20} />
                                Iniciar Sesión
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
