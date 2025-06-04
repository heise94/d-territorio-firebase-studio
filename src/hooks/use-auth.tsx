"use client";

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { auth } from '@/lib/firebase'; // Uses the aliased export 'auth' from firebase.ts
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Ensure auth object is available, could be {} if firebase init failed
    if (!auth || Object.keys(auth).length === 0) {
        console.warn("Firebase Auth is not initialized. Authentication will not work.");
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
        console.error("Auth state change error:", error);
        setUser(null);
        setLoading(false);
        toast({title: "Error de autenticación", description: "No se pudo verificar el estado de autenticación.", variant: "destructive"});
    });
    return () => unsubscribe();
  }, [toast]);

  const signOut = async () => {
    if (!auth || Object.keys(auth).length === 0) {
        toast({title: "Error", description: "Firebase Auth no está disponible.", variant: "destructive"});
        return;
    }
    try {
      await firebaseSignOut(auth);
      // User state will be set to null by onAuthStateChanged
      router.push('/login'); 
      toast({ title: "Sesión cerrada", description: "Has cerrado sesión exitosamente." });
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: "Error al cerrar sesión", description: "Hubo un problema al cerrar tu sesión.", variant: "destructive" });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
