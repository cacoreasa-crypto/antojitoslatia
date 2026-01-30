"use client";

import Sidebar from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, loading } = useAuth();
    const pathname = usePathname();

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
            </div>
        );
    }

    // Allow public routes without sidebar/auth check
    if (pathname.startsWith("/public")) {
        return <>{children}</>;
    }

    if (!user || pathname === "/login") {
        return <>{children}</>;
    }

    // Restrict access if not admin
    if (!isAdmin) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
                <p className="text-muted-foreground mb-4">No tienes permisos de administrador.</p>
                <button onClick={() => window.location.href = "/login"} className="btn-primary">
                    Regresar al Login
                </button>
            </div>
        );
    }

    return (
        <div className="flex bg-[var(--background)] min-h-screen">
            <Sidebar />
            <main className="flex-1 p-4 pt-20 md:p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}
