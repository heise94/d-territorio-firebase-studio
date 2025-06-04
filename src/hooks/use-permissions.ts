
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

      if (authLoading) {
        // If auth is still loading, we can't determine permissions yet.
        // Ensure isLoadingPermissions is false so UI doesn't hang if this is the only blocker.
        // However, AuthenticatedLayoutContent also checks authLoading, so this might be redundant
        // but ensures PermissionsProvider itself isn't stuck in a loading state.
        setIsLoadingPermissions(false);
        return;
      }

      if (!authUser || typeof authUser.uid === 'undefined') {
        // This case handles when user is logged out, or authUser/uid is unexpectedly undefined.
        console.warn('PermissionsProvider: authUser or authUser.uid is not available. User might be logged out or authUser is not yet fully loaded/propagated.', { authUser });
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

      // Fetch UserProfile by firebaseAuthUid
      try {
        const usersRef = collection(db, "users");
        // At this point, authUser and authUser.uid should be defined.
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
          // Ensure loading state is updated even if an error occurs before onSnapshot setup
          // This path might not be hit if query itself throws, but as a safeguard.
          // The primary isLoadingPermissions(false) is in the rolePermissions fetch.
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
