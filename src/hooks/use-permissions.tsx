"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, RoleConfiguration, SettingsDoc } from '@/types';
import { DEFAULT_ROLE_PERMISSIONS, PermissionId, USER_ROLES } from '@/lib/constants';
import { useToast } from './use-toast';


interface PermissionsContextType {
  userProfile: UserProfile | null;
  rolePermissionsConfig: RoleConfiguration | null;
  isLoadingPermissions: boolean;
  hasPermission: (permissionId: PermissionId) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rolePermissionsConfig, setRolePermissionsConfig] = useState<RoleConfiguration | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const { toast } = useToast();

  // Debug log to see when this component is rendered and with what authUser
  if (typeof window !== 'undefined') {
    console.log('[PermissionsProvider] Rendering. AuthUser UID:', authUser?.uid, 'AuthLoading:', authLoading);
  }

  useEffect(() => {
    let unsubscribeUserProfile: (() => void) | undefined;
    let unsubscribeRolePermissions: (() => void) | undefined;

    async function fetchInitialData() {
      setIsLoadingPermissions(true);

      // Debug log
      if (typeof window !== 'undefined') {
        console.log('[PermissionsProvider:fetchInitialData] Start. AuthUser UID:', authUser?.uid, 'AuthLoading:', authLoading);
      }


      if (authLoading) {
        if (typeof window !== 'undefined') {
            console.log('[PermissionsProvider:fetchInitialData] Auth is loading, returning early and setting isLoadingPermissions to false.');
        }
        setIsLoadingPermissions(false); // Ensure loading state is updated
        return;
      }

      if (!authUser || !authUser.uid) {
        if (typeof window !== 'undefined') {
            console.warn('PermissionsProvider:fetchInitialData: authUser or authUser.uid is not available. User might be logged out or authUser is not yet fully loaded/propagated.', { authUserExists: !!authUser, authUserUid: authUser?.uid });
        }
        setUserProfile(null);
        setRolePermissionsConfig(null);
        setIsLoadingPermissions(false);
        return;
      }
      
      if (!db || Object.keys(db).length === 0) {
        console.error("Firestore is not initialized. Cannot fetch permissions.");
        toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
        setIsLoadingPermissions(false);
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("firebaseAuthUid", "==", authUser.uid));
        
        unsubscribeUserProfile = onSnapshot(q, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setUserProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
          } else {
            console.warn(`User profile not found in Firestore for auth UID: ${authUser.uid}`);
            setUserProfile(null); 
          }
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
          toast({ title: "Error de Perfil", description: "No se pudo cargar tu perfil de usuario.", variant: "destructive" });
        });

      } catch (error) {
          console.error("Error setting up user profile listener:", error);
          setUserProfile(null);
      }

      try {
        const rolePermissionsDocRef = doc(db, "settings", "rolePermissions");
        unsubscribeRolePermissions = onSnapshot(rolePermissionsDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as SettingsDoc;
            setRolePermissionsConfig(data.rolePermissions || DEFAULT_ROLE_PERMISSIONS);
          } else {
            console.warn("Role permissions document (settings/rolePermissions) not found. Using default permissions.");
            setRolePermissionsConfig(DEFAULT_ROLE_PERMISSIONS);
          }
          setIsLoadingPermissions(false); 
        }, (error) => {
          console.error("Error fetching role permissions:", error);
          setRolePermissionsConfig(DEFAULT_ROLE_PERMISSIONS); 
          setIsLoadingPermissions(false);
          toast({ title: "Error de Permisos", description: "No se pudieron cargar las configuraciones de permisos.", variant: "destructive" });
        });
      } catch (error) {
        console.error("Error setting up role permissions listener:", error);
        setRolePermissionsConfig(DEFAULT_ROLE_PERMISSIONS);
        setIsLoadingPermissions(false);
      }
    }

    fetchInitialData();

    return () => {
      if (unsubscribeUserProfile) unsubscribeUserProfile();
      if (unsubscribeRolePermissions) unsubscribeRolePermissions();
    };

  }, [authUser, authLoading, toast]);

  const hasPermission = useCallback((permissionId: PermissionId): boolean => {
    if (!userProfile || !userProfile.role || !rolePermissionsConfig) {
      return false; 
    }
    if (userProfile.role === USER_ROLES.ENCARGADO_TERRITORIO) {
        return true; 
    }

    const permissionsForRole = rolePermissionsConfig[userProfile.role];
    return permissionsForRole ? permissionsForRole.includes(permissionId) : false;
  }, [userProfile, rolePermissionsConfig]);

  return (
    <PermissionsContext.Provider value={{ userProfile, rolePermissionsConfig, isLoadingPermissions, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextType {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
