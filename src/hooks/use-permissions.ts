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
  rolePermissionsConfig: RoleConfiguration | null; // Renamed from rolePermissions to avoid conflict
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

  useEffect(() => {
    let unsubscribeUserProfile: (() => void) | undefined;
    let unsubscribeRolePermissions: (() => void) | undefined;

    async function fetchInitialData() {
      setIsLoadingPermissions(true);

      if (authLoading) return;

      if (!authUser) {
        setUserProfile(null);
        setRolePermissionsConfig(null); // No specific permissions for unauthenticated users
        setIsLoadingPermissions(false);
        return;
      }
      
      if (!db || Object.keys(db).length === 0) {
        console.error("Firestore is not initialized. Cannot fetch permissions.");
        toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
        setIsLoadingPermissions(false);
        return;
      }

      // Fetch UserProfile by firebaseAuthUid
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("firebaseAuthUid", "==", authUser.uid));
        
        // Using onSnapshot for real-time updates to user profile (e.g. role change)
        unsubscribeUserProfile = onSnapshot(q, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setUserProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
          } else {
            // This case might happen if user exists in Auth but not in Firestore users collection yet
            // or if there's a delay in data sync.
            console.warn(`User profile not found in Firestore for auth UID: ${authUser.uid}`);
            setUserProfile(null); 
            // Potentially redirect or show error if user profile is critical and not found
            // For now, permissions will be denied if profile (and thus role) is missing.
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

      // Fetch RolePermissions from settings/rolePermissions
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
          setIsLoadingPermissions(false); // Set loading to false after both fetches attempted
        }, (error) => {
          console.error("Error fetching role permissions:", error);
          setRolePermissionsConfig(DEFAULT_ROLE_PERMISSIONS); // Fallback
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
    // Super Admins (Encargado Territorio) have all permissions implicitly for Phase 0 or as a fallback.
    // This can be made more granular by checking their actual configured permissions.
    if (userProfile.role === USER_ROLES.ENCARGADO_TERRITORIO) {
        return true; // Encargado Territorio has all permissions by default for now
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
