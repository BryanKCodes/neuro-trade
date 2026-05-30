/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type UserData = {
    strategies?: Record<string, any>;
    [key: string]: any;
};

type UserContextType = {
    userData: UserData | null;
    loading: boolean;
    refreshUserData: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
    userData: null,
    loading: true,
    refreshUserData: async () => {},
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return; // wait until auth finishes
        if (!user) {
            setUserData(null);
            setLoading(false);
            return;
        }
    }, [user, authLoading]);

    const refreshUserData = async () => {
    if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            setUserData(snapshot.data() as UserData);
        }
    };

    return (
        <UserContext.Provider value={{ userData, loading, refreshUserData }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
