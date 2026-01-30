"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User,
    signOut as firebaseSignOut
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: User | null;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAdmin: false,
    isSuperAdmin: false,
    loading: true,
    logout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                // Check for hardcoded admin or in Firestore
                const isSuper = user.email === "cacoreasa@gmail.com";
                setIsSuperAdmin(isSuper);

                const adminDoc = await getDoc(doc(db, "admins", user.email || ""));
                setIsAdmin(isSuper || adminDoc.exists());

                if (pathname === "/login") {
                    router.push("/");
                }
            } else {
                setIsAdmin(false);
                setIsSuperAdmin(false);
                if (pathname !== "/login" && !pathname.startsWith("/public")) {
                    router.push("/login");
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router, pathname]);

    const logout = async () => {
        await firebaseSignOut(auth);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
