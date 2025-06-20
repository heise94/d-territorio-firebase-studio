
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Search, Users, Settings2, Edit3, Trash2, ShieldOff, ShieldCheck, UserCog, CheckSquare, ShieldAlert, MessageSquareWarning, Loader2 } from "lucide-react";
import { InviteUserDialog } from "@/components/usuarios/invite-user-dialog";
import type { UserProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, doc, updateDoc, deleteDoc, setDoc, collection, query, orderBy, onSnapshot, deleteField } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from "firebase/auth";
import { USER_ROLES, USER_ROLES_LIST, UserRole } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsuariosPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile: currentUserProfile, startImpersonation, actualUserRole } = usePermissions();

  const [isBlockReasonUserDialogOpen, setIsBlockReasonUserDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<UserProfile | null>(null);
  const [blockReasonUser, setBlockReasonUser] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingUsers(false);
      return;
    }
    setIsLoadingUsers(true);
    const usersCollectionRef = collection(db, "users");
    // Consulta restaurada para usar el índice de Firestore
    const q = query(usersCollectionRef, orderBy("adminApprovalStatus", "asc"), orderBy("name", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt : Timestamp.now(),
        updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt : Timestamp.now(),
      } as UserProfile));
      setUsers(fetchedUsers);
      setIsLoadingUsers(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      if (error.message && error.message.includes("The query requires an index")) {
        toast({
            title: "Índice de Firestore Requerido",
            description: "La consulta de usuarios necesita un índice. Por favor, créalo en la consola de Firebase. La URL para crearlo suele estar en los logs de error.",
            variant: "destructive",
            duration: 10000,
        });
      } else {
        toast({ title: "Error al Cargar Usuarios", description: "No se pudieron cargar los usuarios desde Firestore.", variant: "destructive" });
      }
      setIsLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [toast]);


  const handleOpenAddUserDialog = () => {
    setIsAddUserDialogOpen(true);
  };

  const handleManagePermissions = () => {
    router.push('/settings');
  };

  const handleUserAdded = async (newUserData: { name: string, email: string, role: UserRole, password?: string, assignedGroupId?: string, phoneNumber?: string }) => {
    if (!db || Object.keys(db).length === 0 || !auth || Object.keys(auth).length === 0) {
      toast({ title: "Error de Configuración", description: "Firebase no está inicializado correctamente.", variant: "destructive" });
      return;
    }
    if (!newUserData.password) {
      toast({ title: "Error", description: "La contraseña es obligatoria.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // SIMULACIÓN - Aquí iría la lógica real de Firebase Auth
      // const userCredential = await createUserWithEmailAndPassword(auth, newUserData.email, newUserData.password);
      // const firebaseUser = userCredential.user;
      // if (firebaseUser) {
      //   await updateAuthProfile(firebaseUser, { displayName: newUserData.name });
      // }
      // const firebaseAuthUid = firebaseUser.uid;
      const mockFirebaseAuthUid = `mock-auth-${crypto.randomUUID()}`; // Para simulación
      console.log(`Simulación: Usuario ${newUserData.name} creado en Auth con UID: ${mockFirebaseAuthUid}`);


      const newUserDocRef = doc(db, "users", mockFirebaseAuthUid); // Usar UID de Auth como ID de Firestore
      const newUserProfile: UserProfile = {
        id: mockFirebaseAuthUid,
        firebaseAuthUid: mockFirebaseAuthUid,
        name: newUserData.name,
        email: newUserData.email,
        phoneNumber: newUserData.phoneNumber || undefined,
        role: newUserData.role,
        assignedGroupId: newUserData.assignedGroupId || undefined,
        status: 'Activo',
        adminApprovalStatus: 'approved',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      await setDoc(newUserDocRef, newUserProfile);
      
      toast({
        title: "Usuario Creado (Simulación)",
        description: `${newUserData.name} ha sido creado. Comunícale su email y la contraseña temporal de forma segura.`,
        duration: 7000,
      });
      setIsAddUserDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating user:", error);
      let errorMessage = "No se pudo crear el usuario.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya está registrado.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "La contraseña proporcionada es demasiado débil.";
      }
      toast({ title: "Error al Crear Usuario", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleOpenBlockReasonUserDialog = (user: UserProfile) => {
    setUserToBlock(user);
    setBlockReasonUser(user.blockReason || "");
    setIsBlockReasonUserDialogOpen(true);
  };

  const confirmToggleBlockUser = async () => {
    if (!userToBlock || !db || Object.keys(db).length === 0) return;

    setIsSubmitting(true);
    const newStatus = userToBlock.status === 'Activo' ? 'Bloqueado' : 'Activo';
    const userDocRef = doc(db, "users", userToBlock.id);
    const updateData: { status: UserProfile['status']; updatedAt: Timestamp; blockReason?: any } = {
      status: newStatus,
      updatedAt: Timestamp.now(),
      blockReason: newStatus === 'Bloqueado' ? (blockReasonUser.trim() || deleteField()) : deleteField(),
    };

    try {
      await updateDoc(userDocRef, updateData);
      toast({
        title: `Usuario ${newStatus === 'Bloqueado' ? 'Bloqueado' : 'Desbloqueado'}`,
        description: `${userToBlock.name} ha sido ${newStatus === 'Bloqueado' ? 'bloqueado' : 'desbloqueado'}.`,
      });
    } catch (error) {
      console.error("Error toggling user block status:", error);
      toast({ title: "Error", description: "No se pudo actualizar el estado del usuario.", variant: "destructive" });
    } finally {
      setIsBlockReasonUserDialogOpen(false);
      setUserToBlock(null);
      setBlockReasonUser("");
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const userToDelete = users.find(u => u.id === userId);
    try {
      await deleteDoc(doc(db, "users", userId));
      toast({
        title: "Usuario Eliminado de Firestore",
        description: `${userToDelete?.name || 'El usuario'} ha sido eliminado de Firestore. La cuenta de Firebase Auth (si existe) debe eliminarse manualmente.`,
        variant: "default",
        duration: 7000,
      });
    } catch (error) {
      console.error("Error deleting user from Firestore:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar el usuario de Firestore.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (userId: string) => {
    toast({
      title: "Función no implementada",
      description: "La edición de usuarios estará disponible pronto.",
    });
    console.log(`Editando usuario ${userId}`);
  };

  const handleImpersonateUser = (userToImpersonate: UserProfile) => {
    if (actualUserRole !== USER_ROLES.ENCARGADO_TERRITORIO) {
      toast({title: "Acción no permitida", description: "Solo los administradores pueden suplantar usuarios.", variant: "destructive"});
      return;
    }
    if (userToImpersonate.firebaseAuthUid === currentUserProfile?.firebaseAuthUid) {
      toast({title: "Acción no permitida", description: "No puedes suplantarte a ti mismo.", variant: "destructive"});
      return;
    }
     if (userToImpersonate.adminApprovalStatus === 'pending' || userToImpersonate.status === 'Pendiente Aprobación Admin') {
      toast({title: "Acción no permitida", description: "Este usuario está pendiente de aprobación. Apruébalo primero para poder suplantarlo.", variant: "default"});
      return;
    }
    startImpersonation(userToImpersonate);
    router.push('/dashboard');
  };

  const handleApproveUser = async (userId: string) => {
     if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const userToApprove = users.find(u => u.id === userId);
    const userDocRef = doc(db, "users", userId);
    try {
      await updateDoc(userDocRef, {
        adminApprovalStatus: 'approved',
        status: 'Activo', 
        updatedAt: Timestamp.now(),
      });
      toast({
        title: "Usuario Aprobado",
        description: `${userToApprove?.name || 'El usuario'} ha sido aprobado y ahora está activo. Si aún no tiene cuenta en Firebase Auth, debes crearla y comunicarle sus credenciales.`,
        duration: 7000,
      });
    } catch (error) {
      console.error("Error approving user:", error);
      toast({ title: "Error al Aprobar", description: "No se pudo aprobar al usuario.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const nameParts = name.split(" ");
    if (nameParts.length > 1) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const canManageUsers = currentUserProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO;
  const canViewSensitiveUserDetails = currentUserProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO || currentUserProfile?.role === USER_ROLES.SS;

  const filteredUsers = useMemo(() => {
    // Firestore ya ordena por adminApprovalStatus y luego por name
    // El sort cliente es para el status 'Pendiente Aprobación Admin' que es diferente de adminApprovalStatus
    let clientSortedUsers = [...users].sort((a, b) => {
      const statusOrder = (user: UserProfile) => {
        if (user.status === 'Pendiente Aprobación Admin') return 0;
        if (user.adminApprovalStatus === 'pending' && user.status !== 'Pendiente Aprobación Admin') return 1; // Users invited by SG, pending admin
        if (user.status === 'Activo') return 2;
        if (user.status === 'Bloqueado') return 3;
        return 4; 
      };

      const statusComparison = statusOrder(a) - statusOrder(b);
      if (statusComparison !== 0) return statusComparison;
      return (a.name || '').localeCompare(b.name || ''); // Secondary sort by name if statuses are same
    });
    
    if (searchTerm) {
      clientSortedUsers = clientSortedUsers.filter(user =>
          (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }
    return clientSortedUsers;
  }, [users, searchTerm]);

  const canImpersonate = actualUserRole === USER_ROLES.ENCARGADO_TERRITORIO;

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground mt-1">
              Administra los usuarios, sus roles y permisos en la aplicación.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleManagePermissions} variant="outline" size="lg">
                  <Settings2 className="mr-2 h-5 w-5" />
                  Permisos de Roles
              </Button>
              <Button onClick={handleOpenAddUserDialog} size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Añadir Nuevo Usuario
              </Button>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2">
              <CardDescription>
                {isLoadingUsers ? "Cargando usuarios..." :
                  (filteredUsers.length > 0
                    ? `Mostrando ${filteredUsers.length} de ${users.length} usuario(s) registrados.`
                    : users.length > 0 ? "Ningún usuario coincide con la búsqueda."
                    : "Actualmente no hay usuarios registrados."
                  )
                }
              </CardDescription>
              <div className="relative w-full sm:w-64 md:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, email o rol..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : users.length === 0 && !searchTerm ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                <Users className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">No hay usuarios para mostrar.</p>
                <p className="text-sm text-muted-foreground">
                  Haz clic en "Añadir Nuevo Usuario" para registrar el primero.
                </p>
              </div>
            ) : filteredUsers.length === 0 && searchTerm ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                <Search className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">Sin resultados</p>
                <p className="text-sm text-muted-foreground">
                  No se encontraron usuarios que coincidan con "{searchTerm}".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px]">Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const isUserAdmin = user.role === USER_ROLES.ENCARGADO_TERRITORIO;
                      const displayStatus = (canViewSensitiveUserDetails || user.status !== 'Bloqueado') ? user.status : 'Activo';
                      const showBlockReasonTooltip = canViewSensitiveUserDetails && user.status === 'Bloqueado' && user.blockReason;
                      const isPendingAdminApprovalFromGroup = user.addedByGroupId && user.adminApprovalStatus === 'pending';

                      return (
                      <TableRow key={user.id} className={isPendingAdminApprovalFromGroup ? 'bg-amber-500/10 hover:bg-amber-500/15' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={(user as any).avatarUrl || undefined} alt={user.name} />
                              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                              {user.phoneNumber && <div className="text-xs text-muted-foreground/70 mt-0.5">{user.phoneNumber}</div>}
                              {isPendingAdminApprovalFromGroup && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                     <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5 cursor-default">Invitado por Grupo: {user.addedByGroupId}</p>
                                  </TooltipTrigger>
                                  <TooltipContent>Este usuario fue invitado por el SG del Grupo {user.addedByGroupId} y requiere aprobación del Encargado de Territorio.</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                        <TableCell>{user.assignedGroupId || 'N/A'}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={
                                  displayStatus === 'Activo' ? 'default'
                                  : displayStatus === 'Pendiente Aprobación Admin' || isPendingAdminApprovalFromGroup ? 'outline'
                                  : 'destructive' 
                                }
                                className={
                                    displayStatus === 'Pendiente Aprobación Admin' || isPendingAdminApprovalFromGroup ? 'border-blue-500 text-blue-600 bg-blue-500/10' : ''
                                }
                              >
                                {isPendingAdminApprovalFromGroup ? 'Pendiente Aprobación Admin' : displayStatus}
                              </Badge>
                            </TooltipTrigger>
                            {showBlockReasonTooltip && (
                               <TooltipContent side="bottom" className="max-w-xs bg-destructive text-destructive-foreground p-2 rounded-md shadow-lg">
                                  <p className="text-xs font-semibold flex items-center"><MessageSquareWarning size={13} className="mr-1.5"/>Razón del bloqueo:</p>
                                  <p className="text-xs italic">{user.blockReason}</p>
                               </TooltipContent>
                            )}
                             {isPendingAdminApprovalFromGroup && (
                                 <TooltipContent side="bottom" className="max-w-xs bg-blue-500/10 border border-blue-500 text-blue-700 p-2 rounded-md shadow-lg">
                                    <p className="text-xs">Este usuario fue invitado por el SG del Grupo {user.addedByGroupId} y requiere aprobación.</p>
                                </TooltipContent>
                             )}
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {(user.adminApprovalStatus === 'pending' || (user.addedByGroupId && user.status === 'Pendiente Aprobación Admin') ) && canManageUsers && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleApproveUser(user.id)} disabled={isSubmitting}>
                                    <CheckSquare className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Aprobar Usuario</TooltipContent>
                              </Tooltip>
                            )}

                           {canManageUsers && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUser(user.id)} disabled={user.adminApprovalStatus === 'pending' || isSubmitting}>
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar Usuario (Próximamente)</TooltipContent>
                              </Tooltip>
                           )}

                            {canManageUsers && !isUserAdmin && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"
                                   onClick={() => {
                                      if (user.adminApprovalStatus === 'pending') {
                                          toast({ title: "Acción no permitida", description: "Debes aprobar al usuario antes de bloquearlo.", variant: "default" });
                                          return;
                                      }
                                      if (user.status === 'Activo') {
                                          handleOpenBlockReasonUserDialog(user);
                                      } else if (user.status === 'Bloqueado') {
                                          setUserToBlock(user); 
                                          setBlockReasonUser(""); 
                                          confirmToggleBlockUser();
                                      }
                                  }}
                                  disabled={user.adminApprovalStatus === 'pending' || isUserAdmin || isSubmitting}>
                                    {user.status === 'Activo' ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{user.status === 'Activo' ? 'Bloquear Usuario' : 'Desbloquear Usuario'}</TooltipContent>
                              </Tooltip>
                            )}

                            {canImpersonate && user.id !== currentUserProfile?.id && !isUserAdmin && user.status === 'Activo' && user.adminApprovalStatus === 'approved' && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => handleImpersonateUser(user)} disabled={isSubmitting}>
                                    <UserCog className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Suplantar Usuario</TooltipContent>
                                </Tooltip>
                            )}

                            {canManageUsers && !isUserAdmin && (
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                        disabled={isUserAdmin || isSubmitting} >
                                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{isUserAdmin ? "No se puede eliminar al administrador" : "Eliminar Usuario"}</TooltipContent>
                                    </Tooltip>
                                </AlertDialogTrigger>
                                {!isUserAdmin && (
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario '{user.name}' de Firestore. La cuenta de Firebase Auth (si existe) deberá eliminarse manualmente.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className={buttonVariants({variant: "destructive"})}>
                                            Sí, eliminar de Firestore
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                )}
                                </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <InviteUserDialog
          isOpen={isAddUserDialogOpen}
          onOpenChange={setIsAddUserDialogOpen}
          onUserAdded={handleUserAdded}
        />

        {userToBlock && (
          <AlertDialog open={isBlockReasonUserDialogOpen} onOpenChange={setIsBlockReasonUserDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-amber-500"/>Bloquear Usuario: {userToBlock.name}</AlertDialogTitle>
                <AlertDialogDescription>
                  Estás a punto de bloquear a este usuario. Si lo deseas, puedes añadir una razón (opcional).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Label htmlFor="blockReasonUserInput" className="text-sm font-medium">Razón del Bloqueo (Opcional)</Label>
                <Textarea
                  id="blockReasonUserInput"
                  placeholder="Ej: Inactividad, solicitud del usuario, etc."
                  value={blockReasonUser}
                  onChange={(e) => setBlockReasonUser(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setIsBlockReasonUserDialogOpen(false); setUserToBlock(null); setBlockReasonUser(""); }}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmToggleBlockUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar Bloqueo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </div>
    </TooltipProvider>
  );
}


