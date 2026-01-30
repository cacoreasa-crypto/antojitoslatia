"use client";

import { useAuth } from "@/hooks/useAuth";
import {
    LayoutDashboard,
    Receipt,
    Package,
    TrendingUp,
    Wallet,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    Shield
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Receipt, label: "Invoices", href: "/invoices" },
    { icon: TrendingUp, label: "Ventas", href: "/sales" },
    { icon: Package, label: "Inventario", href: "/inventory" },
    { icon: Wallet, label: "Gastos", href: "/expenses" },
];

export default function Sidebar() {
    const { logout, user, isSuperAdmin } = useAuth();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggleMobile = () => setMobileOpen(!mobileOpen);

    return (
        <>
            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--border)] z-50 flex items-center justify-between px-4">
                <div className="relative w-10 h-10">
                    <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                </div>
                <button
                    onClick={toggleMobile}
                    className="p-2 hover:bg-[var(--muted)] rounded-full transition-colors"
                >
                    <Menu size={24} />
                </button>
            </header>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
                />
            )}

            <aside className={cn(
                "h-screen content-start bg-[var(--card)] border-r border-[var(--border)] transition-all duration-300 flex flex-col z-[60]",
                "fixed md:sticky top-0 left-0",
                mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                collapsed ? "w-64 md:w-20" : "w-64"
            )}>
                <div className="p-6 flex items-center gap-4">
                    <div className="relative w-8 h-8 flex-shrink-0">
                        <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                    </div>
                    {(!collapsed || mobileOpen) && (
                        <span className="font-bold text-lg whitespace-nowrap">Admin Tia</span>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-4 p-3 rounded-lg transition-all hover:bg-[var(--muted)]",
                                    isActive ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-yellow-500/20" : "text-muted-foreground",
                                    (collapsed && !mobileOpen) && "justify-center"
                                )}
                            >
                                <item.icon size={22} />
                                {(!collapsed || mobileOpen) && <span className="font-medium">{item.label}</span>}
                            </Link>
                        );
                    })}
                    {isSuperAdmin && (
                        <Link
                            href="/users"
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-4 p-3 rounded-lg transition-all hover:bg-[var(--muted)]",
                                pathname === "/users" ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-yellow-500/20" : "text-muted-foreground",
                                (collapsed && !mobileOpen) && "justify-center"
                            )}
                        >
                            <Shield size={22} />
                            {(!collapsed || mobileOpen) && <span className="font-medium">Usuarios</span>}
                        </Link>
                    )}
                </nav>

                <div className="p-4 border-t border-[var(--border)] space-y-2 mt-auto">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex w-full items-center gap-4 p-3 text-muted-foreground hover:bg-[var(--muted)] rounded-lg transition-all"
                    >
                        {collapsed ? <ChevronRight size={22} /> : <div className="flex items-center gap-4"><ChevronLeft size={22} /> <span>Contraer</span></div>}
                    </button>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-4 p-3 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                        <LogOut size={22} />
                        {(!collapsed || mobileOpen) && <span className="font-medium">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
