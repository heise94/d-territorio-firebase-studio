
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Users, Settings2, Edit3, Trash2, ShieldOff, ShieldCheck, Send, CalendarClock, UserCog } from "lucide-react"; // Added UserCog
import { InviteUserDialog } from "@/components/usuarios/invite-user-dialog";
import type { UserProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import { USER_ROLES, USER_ROLES_LIST } from "@/lib/constants";
import { useRouter } from "next/navigation"; // Added useRouter
import { usePermissions } from "@/hooks/use-permissions"; // Added usePermissions

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([
    // Datos de ejemplo iniciales
    { id: '1', name: 'Elena Campos', email: 'elena.campos@example.com', phoneNumber: '+56911111111', role: USER_ROLES.ENCARGADO_TERRITORIO, status: 'Activo', invitationStatus: 'accepted', firebaseAuthUid: 'uidElena', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), assignedGroupId: 'G1' },
    { id: '2', name: 'Carlos Rivas', email: 'carlos.rivas@example.com', phoneNumber: '+56922222222', role: USER_ROLES.PUBLICADOR, status: 'Activo', invitationStatus: 'accepted', firebaseAuthUid: 'uidCarlos', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), assignedGroupId: 'G2' },
    { id: '3', name: 'Laura Méndez', email: 'laura.mendez@example.com', role: USER_ROLES.SG, status: 'Bloqueado', invitationStatus: 'accepted', firebaseAuthUid: 'uidLaura', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), assignedGroupId: 'G1'},
    { id: '4', name: 'Pedro Herrera', email: 'pedro.herrera@example.com', phoneNumber: '56944444444', role: USER_ROLES.PUBLICADOR, status: 'Activo', invitationStatus: 'pending', firebaseAuthUid: 'uidPedro', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter(); // For navigation
  const { startImpersonation, actualUserRole } = usePermissions(); // Get impersonation functions and actual role

  const handleOpenInviteDialog = () => {
    setIsInviteUserDialogOpen(true);
  };

  const handleManagePermissions = () => {
    toast({
      title: "Próximamente",
      description: "La gestión de permisos de roles estará disponible pronto.",
    });
  };
  
  const handleUserInvited = (invitedUser: Pick<UserProfile, 'name' | 'email' | 'role' | 'assignedGroupId'>) => {
    const newUser: UserProfile = {
      id: crypto.randomUUID(),
      ...invitedUser,
      status: 'Activo',
      invitationStatus: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    setUsers(prev => [newUser, ...prev]); 
    setIsInviteUserDialogOpen(false);
  };

  const handleToggleBlockUser = (userId: string) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, status: user.status === 'Activo' ? 'Bloqueado' : 'Activo', updatedAt: Timestamp.now() } : user
      )
    );
    const user = users.find(u => u.id === userId);
    toast({
      title: `Usuario ${user?.status === 'Activo' ? 'Bloqueado' : 'Desbloqueado'}`,
      description: `${user?.name} ha sido ${user?.status === 'Activo' ? 'bloqueado' : 'desbloqueado'} (simulación).`,
    });
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

  const handleResendInvitation = (userEmail: string) => {
    toast({
      title: "Invitación Reenviada",
      description: `Se ha reenviado una invitación a ${userEmail} (simulación).`,
    });
     console.log(`Reenviando invitación a ${userEmail}`);
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
    if (userToImpersonate.firebaseAuthUid === users.find(u => u.role === USER_ROLES.ENCARGADO_TERRITORIO)?.firebaseAuthUid) { // Check if trying to impersonate self (or another admin)
      toast({title: "Acción no permitida", description: "No puedes suplantar a otro administrador o a ti mismo.", variant: "destructive"});
      return;
    }
    startImpersonation(userToImpersonate);
    router.push('/dashboard');
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const nameParts = name.split(" ");
    if (nameParts.length > 1) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
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
              <Button onClick={handleOpenInviteDialog} size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Invitar Nuevo Usuario
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
                  Haz clic en "Invitar Nuevo Usuario" para registrar el primero.
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
                      <TableHead>Invitación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
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
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                        <TableCell>{user.assignedGroupId || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'Activo' ? 'default' : 'destructive'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.invitationStatus === 'accepted' ? 'secondary' : 'outline'} className={user.invitationStatus === 'pending' ? 'text-amber-600 border-amber-500' : ''}>
                            {user.invitationStatus === 'pending' ? 'Pendiente' : 'Aceptada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUser(user.id)}>
                                  <Edit3 className="h-4 w-4" />
                                  <span className="sr-only">Editar</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar Usuario</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleBlockUser(user.id)}>
                                  {user.status === 'Activo' ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                  <span className="sr-only">{user.status === 'Activo' ? 'Bloquear' : 'Desbloquear'}</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{user.status === 'Activo' ? 'Bloquear Usuario' : 'Desbloquear Usuario'}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewAvailability(user.id)}>
                                  <CalendarClock className="h-4 w-4" />
                                  <span className="sr-only">Ver Disponibilidad</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver Disponibilidad</TooltipContent>
                            </Tooltip>
                            
                            {canImpersonate && user.role !== USER_ROLES.ENCARGADO_TERRITORIO && user.status === 'Activo' && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => handleImpersonateUser(user)}>
                                    <UserCog className="h-4 w-4" />
                                    <span className="sr-only">Suplantar Usuario</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Suplantar Usuario</TooltipContent>
                                </Tooltip>
                            )}

                            {user.invitationStatus === 'pending' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleResendInvitation(user.email)}>
                                    <Send className="h-4 w-4" />
                                    <span className="sr-only">Reenviar Invitación por Email</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reenviar Invitación por Email</TooltipContent>
                              </Tooltip>
                            )}
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" 
                                    disabled={user.role === USER_ROLES.ENCARGADO_TERRITORIO} /* Prevent deleting admin */ >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Eliminar</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{user.role === USER_ROLES.ENCARGADO_TERRITORIO ? "No se puede eliminar al administrador" : "Eliminar Usuario"}</TooltipContent>
                                </Tooltip>
                              </AlertDialogTrigger>
                              {user.role !== USER_ROLES.ENCARGADO_TERRITORIO && (
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <InviteUserDialog
          isOpen={isInviteUserDialogOpen}
          onOpenChange={setIsInviteUserDialogOpen}
          onUserInvited={handleUserInvited}
        />
      </div>
    </TooltipProvider>
  );
}
