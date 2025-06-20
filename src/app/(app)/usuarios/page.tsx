
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Search, Users, Settings2, Edit3, Trash2, ShieldOff, ShieldCheck, UserCog, CheckSquare, ShieldAlert, MessageSquareWarning } from "lucide-react";
import { InviteUserDialog } from "@/components/usuarios/invite-user-dialog";
import type { UserProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, doc, updateDoc, deleteField } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Import auth
import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from "firebase/auth"; // Import firebase auth functions
import { USER_ROLES, USER_ROLES_LIST } from "@/lib/constants";
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


export default function UsuariosPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false); // Renamed from isInviteUserDialogOpen
  const [users, setUsers] = useState<UserProfile[]>([
    { id: '1', name: 'Elena Campos', email: 'elena.campos@example.com', phoneNumber: '+56911111111', role: USER_ROLES.ENCARGADO_TERRITORIO, status: 'Activo', firebaseAuthUid: 'uidElena', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), assignedGroupId: 'G1', adminApprovalStatus: 'approved' },
    { id: '2', name: 'Carlos Rivas', email: 'carlos.rivas@example.com', phoneNumber: '+56922222222', role: USER_ROLES.PUBLICADOR, status: 'Activo', firebaseAuthUid: 'uidCarlos', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), assignedGroupId: 'G2', adminApprovalStatus: 'approved' },
    { id: '3', name: 'Laura Méndez (SG)', email: 'laura.mendez@example.com', role: USER_ROLES.SG, status: 'Bloqueado', blockReason: "Inactividad prolongada", firebaseAuthUid: 'uidLaura', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), assignedGroupId: 'G1', adminApprovalStatus: 'approved'},
    { id: '5', name: 'Nuevo Publicador (Desde Grupo)', email: 'nuevo.grupo@example.com', phoneNumber: '+56933333333', role: USER_ROLES.PUBLICADOR, status: 'Pendiente Aprobación Admin', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), addedByGroupId: 'G1', adminApprovalStatus: 'pending' },

  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile: currentUserProfile, startImpersonation, actualUserRole } = usePermissions();

  const [isBlockReasonUserDialogOpen, setIsBlockReasonUserDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<UserProfile | null>(null);
  const [blockReasonUser, setBlockReasonUser] = useState("");


  const handleOpenAddUserDialog = () => { // Renamed from handleOpenInviteDialog
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

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newUserData.email, newUserData.password);
      const firebaseUser = userCredential.user;

      // 2. Update Firebase Auth user profile (optional, but good practice)
      if (firebaseUser) {
        await updateAuthProfile(firebaseUser, { displayName: newUserData.name });
      }

      // 3. Create user profile in Firestore
      const newUserProfile: UserProfile = {
        id: crypto.randomUUID(), // Or use Firestore auto-ID: const newUserRef = doc(collection(db, "users")); newUserProfile.id = newUserRef.id;
        firebaseAuthUid: firebaseUser.uid,
        name: newUserData.name,
        email: newUserData.email,
        phoneNumber: newUserData.phoneNumber,
        role: newUserData.role,
        assignedGroupId: newUserData.assignedGroupId,
        status: 'Activo',
        adminApprovalStatus: 'approved', // Admin is creating, so auto-approved
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      // In a real app, save to Firestore: await setDoc(doc(db, "users", newUserProfile.id), newUserProfile);
      setUsers(prev => [newUserProfile, ...prev]);
      
      toast({
        title: "Usuario Creado Exitosamente",
        description: `${newUserData.name} ha sido creado. Por favor, comunícale su email y la contraseña temporal de forma segura. Se recomienda que cambie su contraseña al iniciar sesión.`,
        duration: 10000, // Longer duration for this important message
      });

    } catch (error: any) {
      console.error("Error creating user:", error);
      let errorMessage = "No se pudo crear el usuario.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya está registrado. Si el usuario existe, edita sus datos.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "La contraseña proporcionada es demasiado débil.";
      }
      toast({ title: "Error al Crear Usuario", description: errorMessage, variant: "destructive" });
    }
    setIsAddUserDialogOpen(false);
  };


  const handleOpenBlockReasonUserDialog = (user: UserProfile) => {
    setUserToBlock(user);
    setBlockReasonUser(user.blockReason || "");
    setIsBlockReasonUserDialogOpen(true);
  };

  const confirmToggleBlockUser = async () => {
    if (!userToBlock || !db || Object.keys(db).length === 0) return;

    const newStatus = userToBlock.status === 'Activo' ? 'Bloqueado' : 'Activo';
    const updateData: { status: UserProfile['status']; updatedAt: Timestamp; blockReason?: any } = {
      status: newStatus,
      updatedAt: Timestamp.now(),
    };

    if (newStatus === 'Bloqueado') {
      updateData.blockReason = blockReasonUser.trim() || deleteField();
    } else {
      updateData.blockReason = deleteField();
    }

    setUsers(prevUsers =>
      prevUsers.map(u =>
        u.id === userToBlock.id
          ? { ...u, status: newStatus, blockReason: newStatus === 'Bloqueado' ? (blockReasonUser.trim() || undefined) : undefined, updatedAt: Timestamp.now() }
          : u
      )
    );

    toast({
      title: `Usuario ${newStatus === 'Bloqueado' ? 'Bloqueado' : 'Desbloqueado'}`,
      description: `${userToBlock.name} ha sido ${newStatus === 'Bloqueado' ? 'bloqueado' : 'desbloqueado'} (simulación).`,
    });

    setIsBlockReasonUserDialogOpen(false);
    setUserToBlock(null);
    setBlockReasonUser("");
  };


  const handleDeleteUser = (userId: string) => {
    setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    const user = users.find(u => u.id === userId);
    toast({
      title: "Usuario Eliminado",
      description: `${user?.name || 'El usuario'} ha sido eliminado (simulación).`,
      variant: "destructive"
    });
  };

  const handleEditUser = (userId: string) => {
    toast({
      title: "Función no implementada",
      description: "La edición de usuarios estará disponible pronto.",
    });
    console.log(`Editando usuario ${userId}`);
  };

  const handleViewAvailability = (userId: string) => {
    toast({
      title: "Función no implementada",
      description: "La visualización de disponibilidad de usuario estará disponible pronto.",
    });
    console.log(`Viendo disponibilidad del usuario ${userId}`);
  };

  const handleImpersonateUser = (userToImpersonate: UserProfile) => {
    if (actualUserRole !== USER_ROLES.ENCARGADO_TERRITORIO) {
      toast({title: "Acción no permitida", description: "Solo los administradores pueden suplantar usuarios.", variant: "destructive"});
      return;
    }
    if (userToImpersonate.firebaseAuthUid === users.find(u => u.role === USER_ROLES.ENCARGADO_TERRITORIO)?.firebaseAuthUid) {
      toast({title: "Acción no permitida", description: "No puedes suplantar a otro administrador o a ti mismo.", variant: "destructive"});
      return;
    }
     if (userToImpersonate.adminApprovalStatus === 'pending' || userToImpersonate.status === 'Pendiente Aprobación Admin') {
      toast({title: "Acción no permitida", description: "Este usuario está pendiente de aprobación. Apruébalo primero para poder suplantarlo.", variant: "default"});
      return;
    }
    startImpersonation(userToImpersonate);
    router.push('/dashboard');
  };

  const handleApproveUser = (userId: string) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId
          ? { ...user, adminApprovalStatus: 'approved', status: 'Activo', updatedAt: Timestamp.now() }
          : user
      )
    );
    const user = users.find(u => u.id === userId);
    toast({
      title: "Usuario Aprobado",
      description: `${user?.name || 'El usuario'} ha sido aprobado y ahora está activo. Deberás crear su cuenta en Firebase Auth y comunicarle sus credenciales.`,
    });
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
    const sortedUsers = [...users].sort((a, b) => {
      if (a.adminApprovalStatus === 'pending' && b.adminApprovalStatus !== 'pending') return -1;
      if (a.adminApprovalStatus !== 'pending' && b.adminApprovalStatus === 'pending') return 1;
      if (a.status === 'Pendiente Aprobación Admin' && b.status !== 'Pendiente Aprobación Admin') return -1;
      if (a.status !== 'Pendiente Aprobación Admin' && b.status === 'Pendiente Aprobación Admin') return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    if (!searchTerm) return sortedUsers;
    return sortedUsers.filter(user =>
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
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
                {filteredUsers.length > 0
                  ? `Mostrando ${filteredUsers.length} de ${users.length} usuario(s) registrados.`
                  : users.length > 0 ? "Ningún usuario coincide con la búsqueda."
                  : "Actualmente no hay usuarios registrados."
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
            {users.length === 0 && !searchTerm ? (
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
                      {/* Removed Invitation Status Column */}
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const isUserAdmin = user.role === USER_ROLES.ENCARGADO_TERRITORIO;
                      const displayStatus = (canViewSensitiveUserDetails || user.status !== 'Bloqueado') ? user.status : 'Activo';
                      const showBlockReasonTooltip = canViewSensitiveUserDetails && user.status === 'Bloqueado' && user.blockReason;

                      return (
                      <TableRow key={user.id} className={user.adminApprovalStatus === 'pending' ? 'bg-amber-500/10 hover:bg-amber-500/15' : ''}>
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
                              {user.addedByGroupId && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                     <p className="text-xs text-blue-600 mt-0.5 cursor-default">Añadido por Grupo: {user.addedByGroupId}</p>
                                  </TooltipTrigger>
                                  <TooltipContent>Este usuario fue invitado por el Superintendente del Grupo {user.addedByGroupId} y requiere aprobación.</TooltipContent>
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
                                  : displayStatus === 'Pendiente Aprobación Admin' ? 'outline'
                                  : 'destructive' 
                                }
                                className={
                                    displayStatus === 'Pendiente Aprobación Admin' ? 'border-blue-500 text-blue-600 bg-blue-500/10' : ''
                                }
                              >
                                {displayStatus}
                              </Badge>
                            </TooltipTrigger>
                            {showBlockReasonTooltip && (
                               <TooltipContent side="bottom" className="max-w-xs bg-destructive text-destructive-foreground p-2 rounded-md shadow-lg">
                                  <p className="text-xs font-semibold flex items-center"><MessageSquareWarning size={13} className="mr-1.5"/>Razón del bloqueo:</p>
                                  <p className="text-xs italic">{user.blockReason}</p>
                               </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        {/* Removed Invitation Status TableCell */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {user.adminApprovalStatus === 'pending' && canManageUsers && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleApproveUser(user.id)}>
                                    <CheckSquare className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Aprobar Usuario</TooltipContent>
                              </Tooltip>
                            )}

                           {canManageUsers && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUser(user.id)} disabled={user.adminApprovalStatus === 'pending'}>
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar Usuario</TooltipContent>
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
                                  disabled={user.adminApprovalStatus === 'pending' || isUserAdmin}>
                                    {user.status === 'Activo' ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{user.status === 'Activo' ? 'Bloquear Usuario' : 'Desbloquear Usuario'}</TooltipContent>
                              </Tooltip>
                            )}

                            {canImpersonate && !isUserAdmin && user.status === 'Activo' && user.adminApprovalStatus === 'approved' && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => handleImpersonateUser(user)}>
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
                                        disabled={isUserAdmin} >
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
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario '{user.name}' de tus registros (simulación).
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className={buttonVariants({variant: "destructive"})}>
                                            Sí, eliminar
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
                <AlertDialogAction onClick={confirmToggleBlockUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Confirmar Bloqueo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </div>
    </TooltipProvider>
  );
}
