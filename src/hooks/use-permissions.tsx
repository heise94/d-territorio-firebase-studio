
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, RoleConfiguration, SettingsDoc } from '@/types';
import { DEFAULT_ROLE_PERMISSIONS, PermissionId, USER_ROLES, UserRole } from '@/lib/constants';
import { useToast } from './use-toast';


interface PermissionsContextType {
  userProfile: UserProfile | null; // This will be the effective profile (original or impersonated)
  rolePermissionsConfig: RoleConfiguration | null;
  isLoadingPermissions: boolean;
  hasPermission: (permissionId: PermissionId) => boolean;
  isImpersonating: boolean;
  startImpersonation: (targetProfile: UserProfile) => void;
  stopImpersonation: () => void;
  actualUserRole: UserRole | null; // Role of the genuinely authenticated user
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [actualUserProfile, setActualUserProfile] = useState<UserProfile | null>(null); // Profile of the logged-in user
  const [impersonatedUserProfile, setImpersonatedUserProfile] = useState<UserProfile | null>(null); // Profile of the user being impersonated
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalAdminProfile, setOriginalAdminProfile] = useState<UserProfile | null>(null); // Store admin's profile during impersonation

  const [rolePermissionsConfig, setRolePermissionsConfig] = useState<RoleConfiguration | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribeUserProfile: (() => void) | undefined;
    let unsubscribeRolePermissions: (() => void) | undefined;

    async function fetchInitialData() {
      // If impersonation is active, don't re-fetch based on authUser, keep impersonated profile
      if (isImpersonating) {
        setIsLoadingPermissions(false);
        return;
      }

      setIsLoadingPermissions(true);

      if (authLoading) {
        setIsLoadingPermissions(false); // Ensure loading is false if auth is still loading
        return;
      }

      if (!authUser || !authUser.uid) {
        setActualUserProfile(null);
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
      
      // --- START SIMULATION BLOCK FOR DEVELOPMENT ---
      if (process.env.NODE_ENV === 'development') {
        if (authUser.email === 'javih.jw@gmail.com') {
          const devAdminProfile = {
            id: 'dev-admin-javih', name: 'Javier (Admin Dev)', email: 'javih.jw@gmail.com',
            role: USER_ROLES.ENCARGADO_TERRITORIO, status: 'Activo', firebaseAuthUid: authUser.uid,
          };
          setActualUserProfile(devAdminProfile);
          // Fetch role permissions for admin, then set loading to false
          const rolePermissionsDocRefAdmin = doc(db, "settings", "rolePermissions");
          unsubscribeRolePermissions = onSnapshot(rolePermissionsDocRefAdmin, (docSnap) => {
              if (docSnap.exists()) {
              const data = docSnap.data() as SettingsDoc;
              setRolePermissionsConfig(data.rolePermissions || DEFAULT_ROLE_PERMISSIONS);
              } else {
              setRolePermissionsConfig(DEFAULT_ROLE_PERMISSIONS);
              }
              setIsLoadingPermissions(false);
          }, (error) => {
              console.error("Error fetching role permissions for dev admin:", error);
              setRolePermissionsConfig(DEFAULT_ROLE_PERMISSIONS);
              setIsLoadingPermissions(false);
          });
          return;
        } else if (authUser.uid === 'uidElena') {
          const devSgProfile = {
            id: 'dev-sg-elena', name: 'Elena Campos (SG Dev)', email: 'elena.campos.dev@example.com',
            role: USER_ROLES.SG, status: 'Activo', firebaseAuthUid: authUser.uid, assignedGroupId: 'G1',
          };
          setActualUserProfile(devSgProfile);
          const rolePermissionsDocRefSG = doc(db, "settings", "rolePermissions");
          unsubscribeRolePermissions = onSnapshot(rolePermissionsDocRefSG, (docSnap) => {
              if (docSnap.exists()) {
              const data = docSnap.data() as SettingsDoc;
              setRolePermissionsConfig(data.rolePermissions || DEFAULT_ROLE_PERMISSIONS);
              } else {
              setRolePermissionsConfig(DEFAULT_ROLE_PERMISSIONS);
              }
              setIsLoadingPermissions(false);
          }, (error) => {
              console.error("Error fetching role permissions for dev SG:", error);
              setRolePermissionsConfig(DEFAULT_ROLE_PERMISSIONS);
              setIsLoadingPermissions(false);
          });
          return;
        }
      }
      // --- END SIMULATION BLOCK ---

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("firebaseAuthUid", "==", authUser.uid));
        
        unsubscribeUserProfile = onSnapshot(q, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setActualUserProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
          } else {
            console.warn(`User profile not found in Firestore for auth UID: ${authUser.uid}. Logging out potentially.`);
            setActualUserProfile(null);
            // Consider calling signOut from useAuth here if profile is mandatory
          }
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setActualUserProfile(null);
          toast({ title: "Error de Perfil", description: "No se pudo cargar tu perfil de usuario.", variant: "destructive" });
        });

      } catch (error) {
          console.error("Error setting up user profile listener:", error);
          setActualUserProfile(null);
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

  }, [authUser, authLoading, toast, isImpersonating]); // Added isImpersonating to dependencies

  const startImpersonation = useCallback((targetProfile: UserProfile) => {
    if (actualUserProfile?.role !== USER_ROLES.ENCARGADO_TERRITORIO) {
      toast({ title: "Acción no permitida", description: "Solo los administradores pueden suplantar usuarios.", variant: "destructive" });
      return;
    }
    setOriginalAdminProfile(actualUserProfile);
    setImpersonatedUserProfile(targetProfile);
    setIsImpersonating(true);
    toast({ title: "Suplantación Iniciada", description: `Ahora estás viendo como ${targetProfile.name}.`, variant: "default" });
  }, [actualUserProfile, toast]);

  const stopImpersonation = useCallback(() => {
    setImpersonatedUserProfile(null);
    setOriginalAdminProfile(null); // Clear stored admin profile
    setIsImpersonating(false);
    toast({ title: "Suplantación Finalizada", description: "Has vuelto a tu sesión de administrador.", variant: "default" });
  }, [toast]);

  const effectiveUserProfile = isImpersonating ? impersonatedUserProfile : actualUserProfile;

  const hasPermission = useCallback((permissionId: PermissionId): boolean => {
    if (isLoadingPermissions && !isImpersonating) return false;
    if (!effectiveUserProfile || !effectiveUserProfile.role || !rolePermissionsConfig) {
      return false; 
    }
    if (effectiveUserProfile.role === USER_ROLES.ENCARGADO_TERRITORIO) {
        return true; 
    }
    const permissionsForRole = rolePermissionsConfig[effectiveUserProfile.role];
    return permissionsForRole ? permissionsForRole.includes(permissionId) : false;
  }, [effectiveUserProfile, rolePermissionsConfig, isLoadingPermissions, isImpersonating]);
  
  const actualUserRole = actualUserProfile?.role || null;

  return (
    <PermissionsContext.Provider value={{ 
        userProfile: effectiveUserProfile, 
        rolePermissionsConfig, 
        isLoadingPermissions, 
        hasPermission,
        isImpersonating,
        startImpersonation,
        stopImpersonation,
        actualUserRole
    }}>
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

    