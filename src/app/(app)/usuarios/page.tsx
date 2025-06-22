
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Search, Users, Settings2, Edit3, Trash2, ShieldOff, ShieldCheck, UserCog, CheckSquare, ShieldAlert, MessageSquareWarning, Loader2, Send, CalendarCog, KeyRound } from "lucide-react";
import { InviteUserDialog } from "@/components/usuarios/invite-user-dialog";
import { EditUserDialog } from "@/components/usuarios/edit-user-dialog";
import { EditUserAvailabilityDialog } from "@/components/usuarios/edit-user-availability-dialog";
import type { UserProfile, PreachingGroup, ProgramScheduleSlot, SettingsDoc, Casa } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
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


const MOCK_ALL_USERS_DATA: UserProfile[] = [
    // Special Roles from before
    { id: "uidAdmin", name: "Pedro Velez (Admin)", email: "admin@example.com", phoneNumber: "+56955555555", availability: { availableSlotIds: ["sat-1000-gen"] }, role: USER_ROLES.ENCARGADO_TERRITORIO, status: "Activo", firebaseAuthUid: "uidAdmin", adminApprovalStatus: "approved" },
    { id: "uidSG1", name: "Sofía Castro (SG G1)", email: "sg1@example.com", phoneNumber: "+56966666666", availability: { availableSlotIds: ["fri-1000-gen", "sun-1500-zoom"] }, assignedGroupId: "G1", role: USER_ROLES.SG, status: "Activo", firebaseAuthUid: "uidSG1", adminApprovalStatus: "approved" },
    { id: "uidAux2", name: "Laura Nuñez (Auxiliar G2)", email: "aux2@example.com", phoneNumber: "+56988888888", availability: { availableSlotIds: ["wed-0930-gen"] }, assignedGroupId: "G2", role: USER_ROLES.AUXILIAR_TERRITORIO, status: "Activo", firebaseAuthUid: "uidAux2", adminApprovalStatus: "approved" },
    // Publishers created from historical data
    { id: "pub-1", name: "Camilo Torres", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-2", name: "Edison Díaz", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-3", name: "Robert Guale", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-4", name: "Esteban Vásquez", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-5", name: "Carlos Heise", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-6", name: "Jimmy Guale", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-7", name: "Gonzalo Heise", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-8", name: "Ricardo Salas", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-9", name: "Rolando Alarcón", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-10", name: "Jonatan Palma", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-11", name: "Cristian Pichinao", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-12", name: "Diego Henríquez", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-13", name: "Cristian Coronado", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-14", name: "Carlos Sepúlveda", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-15", name: "Omar Salas", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-16", name: "Javier Heise", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-17", name: "Mauricio Flores", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-18", name: "Nelsón Muci", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
    { id: "pub-19", name: "Martín Sandoval", email: "", phoneNumber: "", role: USER_ROLES.PUBLICADOR, status: "Pendiente Invitación" },
];


export default function UsuariosPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  const [users, setUsers] = useState<UserProfile[]>(MOCK_ALL_USERS_DATA);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false); // No longer loading from firestore here
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile: currentUserProfile, startImpersonation, actualUserRole } = usePermissions();

  const [isBlockReasonUserDialogOpen, setIsBlockReasonUserDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<UserProfile | null>(null);
  const [blockReasonUser, setBlockReasonUser] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [availableGroups, setAvailableGroups] = useState<PreachingGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const [availableCasas, setAvailableCasas] = useState<Casa[]>([]);
  const [isLoadingCasas, setIsLoadingCasas] = useState(true);

  const [isEditAvailabilityDialogOpen, setIsEditAvailabilityDialogOpen] = useState(false);
  const [userToEditAvailability, setUserToEditAvailability] = useState<UserProfile | null>(null);
  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);

  // MOCK DATA: Simulating fetching related data
  useEffect(() => {
    setIsLoadingGroups(true);
    setIsLoadingCasas(true);
    setIsLoadingSlots(true);
    // Simulating async fetch
    setTimeout(() => {
        setAvailableGroups([
            { id: 'G1', name: 'Grupo Los Pioneros', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
            { id: 'G2', name: 'Grupo Betel', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
        ]);
        setAvailableCasas([
            { id: 'C1', ownerName: 'Familia Pérez', address: 'Calle Sol 123', isBlocked: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
            { id: 'C2', ownerName: 'Hna. Ana', address: 'Av. Luna 456', isBlocked: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
        ]);
        setProgramScheduleSlots([
            { id: 'mon-0900-gen', dayOfWeek: 'monday', startTime: '09:00', type: 'general', status: 'fixed' },
            { id: 'wed-0930-gen', dayOfWeek: 'wednesday', startTime: '09:30', type: 'general', status: 'fixed' },
            { id: 'fri-1000-gen', dayOfWeek: 'friday', startTime: '10:00', type: 'general', status: 'fixed' },
            { id: 'sat-1000-gen', dayOfWeek: 'saturday', startTime: '10:00', type: 'general', status: 'fixed' },
            { id: 'sun-1500-zoom', dayOfWeek: 'sunday', startTime: '15:00', type: 'zoom', status: 'tentative' },
            { id: 'tue-1000-rur', dayOfWeek: 'tuesday', startTime: '10:00', type: 'rural', status: 'fixed' },
        ]);
        setIsLoadingGroups(false);
        setIsLoadingCasas(false);
        setIsLoadingSlots(false);
    }, 500);
  }, []);


  const handleOpenAddUserDialog = () => {
    setIsAddUserDialogOpen(true);
  };

  const handleManagePermissions = () => {
    router.push('/settings');
  };

  const handleUserAdded = async (newUserData: { name: string, email: string, role: UserRole, assignedGroupId?: string, phoneNumber: string }) => {
    setIsSubmitting(true);
    const newUserProfile: UserProfile = {
      id: crypto.randomUUID(),
      name: newUserData.name,
      email: newUserData.email,
      phoneNumber: newUserData.phoneNumber,
      role: newUserData.role,
      assignedGroupId: newUserData.assignedGroupId || undefined,
      status: 'Pendiente Invitación', 
      adminApprovalStatus: 'approved', 
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    setUsers(prev => [newUserProfile, ...prev]);
    
    toast({
      title: "Usuario Añadido (Simulación)",
      description: `${newUserData.name} ha sido añadido a la lista local.`,
      duration: 7000,
    });
    setIsAddUserDialogOpen(false);
    setIsSubmitting(false);
  };

  const handleUserUpdate = async (userId: string, data: Partial<Pick<UserProfile, 'role' | 'assignedGroupId' | 'managedCasaId'>>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data, updatedAt: Timestamp.now() } : u));
    toast({
      title: "Usuario Actualizado (Simulación)",
      description: `El perfil de ${userToEdit?.name} ha sido actualizado localmente.`,
    });
  };


  const handleOpenBlockReasonUserDialog = (user: UserProfile) => {
    setUserToBlock(user);
    setBlockReasonUser(user.blockReason || "");
    setIsBlockReasonUserDialogOpen(true);
  };

  const confirmToggleBlockUser = async () => {
    if (!userToBlock) return;
    setIsSubmitting(true);
    const newStatus = userToBlock.status === 'Activo' ? 'Bloqueado' : 'Activo';
    
    setUsers(prev => prev.map(u => u.id === userToBlock.id ? { ...u, status: newStatus, blockReason: newStatus === 'Bloqueado' ? blockReasonUser : undefined, updatedAt: Timestamp.now() } : u));
    
    toast({
      title: `Usuario ${newStatus === 'Bloqueado' ? 'Bloqueado' : 'Desbloqueado'} (Simulación)`,
      description: `${userToBlock.name} ha sido ${newStatus === 'Bloqueado' ? 'bloqueado' : 'desbloqueado'} localmente.`,
    });
    setIsBlockReasonUserDialogOpen(false);
    setUserToBlock(null);
    setBlockReasonUser("");
    setIsSubmitting(false);
  };

  const handleDeleteUser = async (userId: string) => {
    setIsSubmitting(true);
    const userToDelete = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({
      title: "Usuario Eliminado (Simulación)",
      description: `${userToDelete?.name || 'El usuario'} ha sido eliminado de la lista local.`,
      variant: "default",
      duration: 7000,
    });
    setIsSubmitting(false);
  };

  const handleEditUser = (user: UserProfile) => {
    setUserToEdit(user);
    setIsEditUserDialogOpen(true);
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
     if (userToImpersonate.adminApprovalStatus === 'pending' || userToImpersonate.status !== 'Activo') {
      toast({title: "Acción no permitida", description: "Este usuario no está activo. Apruébalo y envíale la invitación primero para poder suplantarlo.", variant: "default"});
      return;
    }
    startImpersonation(userToImpersonate);
    router.push('/dashboard');
  };

  const handleApproveUser = async (userId: string) => {
    setIsSubmitting(true);
    const userToApprove = users.find(u => u.id === userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, adminApprovalStatus: 'approved', status: 'Pendiente Invitación' } : u));
    toast({
      title: "Usuario Aprobado (Simulación)",
      description: `${userToApprove?.name || 'El usuario'} ha sido aprobado localmente. Ahora puedes enviarle una invitación.`,
      duration: 7000,
    });
    setIsSubmitting(false);
  };
  
  const handleSendInvitation = (userToInvite: UserProfile) => {
    if (!userToInvite.phoneNumber) {
        toast({ title: "Error", description: "Este usuario no tiene un número de teléfono registrado.", variant: "destructive" });
        return;
    }
    const appBaseUrl = window.location.origin;
    const invitationUrl = `${appBaseUrl}/accept-invitation?email=${encodeURIComponent(userToInvite.email)}`;
    const message = `¡Hola ${userToInvite.name}! Has sido invitado a D-TERRITORIO. Para activar tu cuenta y crear tu contraseña, por favor haz clic en el siguiente enlace: ${invitationUrl}`;
    const cleanedPhoneNumber = userToInvite.phoneNumber.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${cleanedPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast({
        title: "Abriendo WhatsApp",
        description: `Prepara el mensaje de invitación para ${userToInvite.name}.`,
    });
  };

  const handleSendPasswordResetViaWhatsApp = (user: UserProfile) => {
    if (!user.phoneNumber) {
      toast({ title: "Error", description: "Este usuario no tiene un número de teléfono para enviarle instrucciones.", variant: "destructive" });
      return;
    }
    const appBaseUrl = window.location.origin;
    const forgotPasswordUrl = `${appBaseUrl}/forgot-password`;
    const message = `Hola ${user.name}, para restablecer tu contraseña en D-TERRITORIO, por favor visita el siguiente enlace y sigue las instrucciones: ${forgotPasswordUrl}`;
    const cleanedPhoneNumber = user.phoneNumber.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${cleanedPhoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    toast({
        title: "Abriendo WhatsApp",
        description: `Prepara el mensaje con instrucciones para ${user.name}.`,
    });
  };

  const handleOpenEditAvailabilityDialog = (user: UserProfile) => {
    setUserToEditAvailability(user);
    setIsEditAvailabilityDialogOpen(true);
  };

  const handleAvailabilityUpdate = async (userId: string, availability: { availableSlotIds: string[] }) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, availability: { ...u.availability, ...availability }, updatedAt: Timestamp.now() } : u));
    toast({
      title: "Disponibilidad Actualizada (Simulación)",
      description: `La disponibilidad del usuario ha sido actualizada localmente.`,
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
    let clientSortedUsers = [...users].sort((a, b) => {
      const statusOrder = (user: UserProfile) => {
        if (user.status === 'Pendiente Aprobación Admin') return 0;
        if (user.adminApprovalStatus === 'pending') return 1;
        if (user.status === 'Pendiente Invitación') return 2;
        if (user.status === 'Activo') return 3;
        if (user.status === 'Bloqueado') return 4;
        return 5; 
      };

      const statusComparison = statusOrder(a) - statusOrder(b);
      if (statusComparison !== 0) return statusComparison;
      return (a.name || '').localeCompare(b.name || ''); 
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
            {isLoadingUsers || isLoadingGroups || isLoadingSlots || isLoadingCasas ? (
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
                      const groupName = user.assignedGroupId ? availableGroups.find(g => g.id === user.assignedGroupId)?.name : null;

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
                                     <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5 cursor-default">Invitado por Grupo: {groupName || user.addedByGroupId}</p>
                                  </TooltipTrigger>
                                  <TooltipContent>Este usuario fue invitado por el SG del Grupo {groupName || user.addedByGroupId} y requiere aprobación del Encargado de Territorio.</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                        <TableCell>{groupName || 'N/A'}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={
                                  displayStatus === 'Activo' ? 'default'
                                  : displayStatus === 'Pendiente Aprobación Admin' || isPendingAdminApprovalFromGroup || displayStatus === 'Pendiente Invitación' ? 'outline'
                                  : 'destructive' 
                                }
                                className={
                                    displayStatus === 'Pendiente Aprobación Admin' || isPendingAdminApprovalFromGroup ? 'border-blue-500 text-blue-600 bg-blue-500/10' 
                                    : displayStatus === 'Pendiente Invitación' ? 'border-purple-500 text-purple-600 bg-purple-500/10'
                                    : ''
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
                                    <p className="text-xs">Este usuario fue invitado por el SG del Grupo {groupName || user.addedByGroupId} y requiere aprobación.</p>
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
                            
                            {user.status === 'Pendiente Invitación' && canManageUsers && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => handleSendInvitation(user)} disabled={isSubmitting}>
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Enviar Invitación WhatsApp</TooltipContent>
                              </Tooltip>
                            )}

                            {user.status === 'Activo' && canManageUsers && (
                                <AlertDialog>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-secondary-foreground hover:text-primary" disabled={isSubmitting}>
                                        <KeyRound className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                    <p>Enviar instrucciones para restablecer contraseña por WhatsApp</p>
                                    </TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar envío?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Se abrirá WhatsApp para enviar un mensaje a <span className="font-semibold">{user.name}</span> con instrucciones para que pueda restablecer su contraseña. ¿Deseas continuar?
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleSendPasswordResetViaWhatsApp(user)}>
                                        Sí, abrir WhatsApp
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            )}

                           {canManageUsers && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUser(user)} disabled={isSubmitting}>
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar Usuario</TooltipContent>
                              </Tooltip>
                           )}

                           {canManageUsers && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditAvailabilityDialog(user)} disabled={isSubmitting}>
                                            <CalendarCog className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar Disponibilidad</TooltipContent>
                                </Tooltip>
                            )}

                            {canManageUsers && !isUserAdmin && user.status === 'Activo' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"
                                   onClick={() => handleOpenBlockReasonUserDialog(user)}
                                  disabled={isSubmitting}>
                                    <ShieldOff className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Bloquear Usuario</TooltipContent>
                              </Tooltip>
                            )}

                            {canManageUsers && !isUserAdmin && user.status === 'Bloqueado' && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => {setUserToBlock(user); setBlockReasonUser(""); confirmToggleBlockUser();}}
                                    disabled={isSubmitting}>
                                        <ShieldCheck className="h-4 w-4 text-green-600"/>
                                    </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Desbloquear Usuario</TooltipContent>
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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={isSubmitting}>
                                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Eliminar Usuario</p></TooltipContent>
                                </Tooltip>
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
          availableGroups={availableGroups}
        />

        <EditUserDialog
            isOpen={isEditUserDialogOpen}
            onOpenChange={setIsEditUserDialogOpen}
            onUserUpdate={handleUserUpdate}
            userToEdit={userToEdit}
            availableGroups={availableGroups}
            availableCasas={availableCasas}
        />

        {userToEditAvailability && (
            <EditUserAvailabilityDialog
                isOpen={isEditAvailabilityDialogOpen}
                onOpenChange={setIsEditAvailabilityDialogOpen}
                onAvailabilityUpdate={handleAvailabilityUpdate}
                userToEdit={userToEditAvailability}
                programScheduleSlots={programScheduleSlots}
            />
        )}

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

    