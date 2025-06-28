
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Search, Users, Settings2, Edit3, Trash2, ShieldOff, ShieldCheck, UserCog, CheckSquare, ShieldAlert, MessageSquareWarning, Loader2, Send, CalendarCog, KeyRound, UserCheck, UserX, CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import { InviteUserDialog } from "@/components/usuarios/invite-user-dialog";
import { EditUserDialog } from "@/components/usuarios/edit-user-dialog";
import { EditUserAvailabilityDialog } from "@/components/usuarios/edit-user-availability-dialog";
import { EditUserUnavailabilityDialog } from "@/components/usuarios/edit-user-unavailability-dialog";
import type { UserProfile, PreachingGroup, ProgramScheduleSlot, SettingsDoc, Casa, UnavailabilityPeriod } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, doc, setDoc, onSnapshot, deleteDoc, query, orderBy, updateDoc, writeBatch, deleteField, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { USER_ROLES, USER_ROLES_LIST, UserRole, PERMISSIONS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription as FormFieldDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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


const blockUserFormSchema = z.object({
  forSystem: z.boolean().default(false),
  forGroup: z.boolean().default(false),
  reason: z.string().max(200, "Máximo 200 caracteres.").optional(),
}).refine(data => data.forSystem || data.forGroup, {
  message: "Debes seleccionar al menos un tipo de bloqueo.",
  path: ["forSystem"],
});

type BlockUserFormValues = z.infer<typeof blockUserFormSchema>;


export default function UsuariosPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile: currentUserProfile, startImpersonation, actualUserRole, hasPermission } = usePermissions();

  const [isBlockUserDialogOpen, setIsBlockUserDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [availableGroups, setAvailableGroups] = useState<PreachingGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const [availableCasas, setAvailableCasas] = useState<Casa[]>([]);
  const [isLoadingCasas, setIsLoadingCasas] = useState(true);

  const [isEditAvailabilityDialogOpen, setIsEditAvailabilityDialogOpen] = useState(false);
  const [userToEditAvailability, setUserToEditAvailability] = useState<UserProfile | null>(null);
  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);

  const [isEditUnavailabilityDialogOpen, setIsEditUnavailabilityDialogOpen] = useState(false);
  const [userToEditUnavailability, setUserToEditUnavailability] = useState<UserProfile | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const blockForm = useForm<BlockUserFormValues>({
    resolver: zodResolver(blockUserFormSchema),
    defaultValues: { forSystem: false, forGroup: false, reason: "" },
  });

  // Fetch all necessary data from Firestore
  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingUsers(false);
      setIsLoadingGroups(false);
      setIsLoadingCasas(false);
      setIsLoadingSlots(false);
      return;
    }
    
    const unsubscribers: (()=>void)[] = [];

    setIsLoadingUsers(true);
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
    unsubscribers.push(onSnapshot(usersQuery, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(d => ({id: d.id, ...d.data() } as UserProfile));
      setUsers(fetchedUsers);
      setIsLoadingUsers(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setIsLoadingUsers(false);
    }));

    setIsLoadingGroups(true);
    const groupsQuery = query(collection(db, "preachingGroups"), orderBy("name", "asc"));
    unsubscribers.push(onSnapshot(groupsQuery, (snapshot) => {
        setAvailableGroups(snapshot.docs.map(d => ({id: d.id, ...d.data() } as PreachingGroup)));
        setIsLoadingGroups(false);
    }, (error) => {
        console.error("Error fetching groups:", error);
        setIsLoadingGroups(false);
    }));

    setIsLoadingCasas(true);
    const casasQuery = query(collection(db, "casas"), orderBy("ownerName", "asc"));
    unsubscribers.push(onSnapshot(casasQuery, (snapshot) => {
        setAvailableCasas(snapshot.docs.map(d => ({id: d.id, ...d.data() } as Casa)));
        setIsLoadingCasas(false);
    }, (error) => {
        console.error("Error fetching casas:", error);
        setIsLoadingCasas(false);
    }));

    setIsLoadingSlots(true);
    const settingsDocRef = doc(db, "settings", "programConfig");
    unsubscribers.push(onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const settingsData = docSnap.data() as SettingsDoc;
            setProgramScheduleSlots(settingsData.programScheduleSlots || []);
        }
        setIsLoadingSlots(false);
    }, (error) => {
        console.error("Error fetching program slots:", error);
        setIsLoadingSlots(false);
    }));

    return () => unsubscribers.forEach(unsub => unsub());
  }, [toast]);
  
  useEffect(() => {
    if (isBlockUserDialogOpen && userToBlock) {
      blockForm.reset(userToBlock.blockInfo || { forSystem: false, forGroup: false, reason: "" });
    } else {
      blockForm.reset({ forSystem: false, forGroup: false, reason: "" });
    }
  }, [isBlockUserDialogOpen, userToBlock, blockForm]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);


  const handleOpenAddUserDialog = () => {
    setIsAddUserDialogOpen(true);
  };

  const handleManagePermissions = () => {
    router.push('/settings');
  };

  const handleUserAdded = async (newUserData: { name: string, email: string, role: UserRole, assignedGroupId?: string, phoneNumber: string }) => {
    setIsSubmitting(true);
    const newUserDocRef = doc(collection(db, "users"));
    
    const newUserProfile: any = {
      id: newUserDocRef.id,
      name: newUserData.name,
      email: newUserData.email.toLowerCase(),
      phoneNumber: newUserData.phoneNumber,
      role: newUserData.role,
      status: 'Pendiente Invitación',
      isAssignable: false,
      adminApprovalStatus: 'approved',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (newUserData.assignedGroupId && newUserData.assignedGroupId.trim() !== "") {
      newUserProfile.assignedGroupId = newUserData.assignedGroupId;
    }
    
    try {
      await setDoc(newUserDocRef, newUserProfile);
      toast({
        title: "Usuario Añadido",
        description: `${newUserData.name} ha sido añadido al sistema. Ahora puedes enviarle una invitación.`,
        duration: 7000,
      });
      setIsAddUserDialogOpen(false);
    } catch (error) {
      console.error("Error adding user to Firestore:", error);
      toast({ title: "Error", description: "No se pudo añadir el usuario a la base de datos.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserUpdate = async (userId: string, data: Partial<Pick<UserProfile, 'role' | 'assignedGroupId' | 'managedCasaId'>>) => {
    setIsSubmitting(true);
    const userDocRef = doc(db, "users", userId);
    const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
    };
    try {
        await updateDoc(userDocRef, updateData);
        toast({
          title: "Usuario Actualizado",
          description: `El perfil de ${userToEdit?.name} ha sido actualizado.`,
        });
        setIsEditUserDialogOpen(false);
    } catch (error) {
        console.error("Error updating user:", error);
        toast({ title: "Error", description: "No se pudo actualizar el perfil del usuario.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleOpenBlockUserDialog = (user: UserProfile) => {
    setUserToBlock(user);
    setIsBlockUserDialogOpen(true);
  };
  
  const handleUnblockUser = async (user: UserProfile) => {
    if (!db) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        status: 'Activo',
        blockInfo: deleteField(),
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Usuario Desbloqueado", description: `${user.name} ha sido desbloqueado.` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo desbloquear al usuario.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const onBlockUserSubmit = async (values: BlockUserFormValues) => {
    if (!userToBlock) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", userToBlock.id), {
        status: 'Bloqueado',
        blockInfo: {
          forSystem: values.forSystem,
          forGroup: values.forGroup,
          reason: values.reason || "",
        },
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Usuario Bloqueado", description: `${userToBlock.name} ha sido bloqueado.` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo bloquear al usuario.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsBlockUserDialogOpen(false);
    }
  };

  const handleToggleAssignableStatus = async (userId: string, isCurrentlyAssignable: boolean) => {
    setIsSubmitting(true);
    const userDocRef = doc(db, "users", userId);
    try {
        await updateDoc(userDocRef, {
        isAssignable: !isCurrentlyAssignable,
        updatedAt: Timestamp.now()
        });
        toast({
        title: "Estado de Asignación Actualizado",
        description: `El usuario ha sido ${!isCurrentlyAssignable ? 'habilitado' : 'deshabilitado'} para asignaciones.`,
        });
    } catch (error) {
        console.error("Error toggling assignable status:", error);
        toast({ title: "Error", description: "No se pudo actualizar el estado del usuario.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsSubmitting(true);
    const userToDelete = users.find(u => u.id === userId);
    try {
        await deleteDoc(doc(db, "users", userId));
        toast({
          title: "Usuario Eliminado",
          description: `${userToDelete?.name || 'El usuario'} ha sido eliminado del sistema.`,
          variant: "default",
          duration: 7000,
        });
    } catch(error) {
        console.error("Error deleting user:", error);
        toast({title: "Error", description: "No se pudo eliminar el usuario.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
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
    const userDocRef = doc(db, "users", userId);
    try {
        await updateDoc(userDocRef, {
            adminApprovalStatus: 'approved',
            status: 'Pendiente Invitación',
            updatedAt: Timestamp.now()
        });
        const userToApprove = users.find(u => u.id === userId);
        toast({
          title: "Usuario Aprobado",
          description: `${userToApprove?.name || 'El usuario'} ha sido aprobado. Ahora puedes enviarle una invitación.`,
          duration: 7000,
        });
    } catch (error) {
        console.error("Error approving user:", error);
        toast({title: "Error", description: "No se pudo aprobar al usuario.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
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
    const userDocRef = doc(db, "users", userId);
    try {
        await updateDoc(userDocRef, {
            "availability.availableSlotIds": availability.availableSlotIds,
            updatedAt: serverTimestamp()
        });
        toast({
          title: "Disponibilidad Actualizada",
          description: `La disponibilidad del usuario ha sido actualizada.`,
        });
        setIsEditAvailabilityDialogOpen(false);
    } catch(error) {
        console.error("Error updating availability:", error);
        toast({ title: "Error", description: "No se pudo actualizar la disponibilidad.", variant: "destructive" });
    }
  };

  const handleOpenEditUnavailabilityDialog = (user: UserProfile) => {
    setUserToEditUnavailability(user);
    setIsEditUnavailabilityDialogOpen(true);
  };

  const handleUnavailabilityUpdate = async (userId: string, periods: UnavailabilityPeriod[]) => {
    const userDocRef = doc(db, "users", userId);
    try {
      await updateDoc(userDocRef, {
        "availability.unavailabilityPeriods": periods,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Indisponibilidad Actualizada",
        description: `Los períodos de indisponibilidad del usuario han sido actualizados.`,
      });
      setIsEditUnavailabilityDialogOpen(false);
    } catch (error) {
      console.error("Error updating unavailability:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la indisponibilidad.",
        variant: "destructive",
      });
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

  const canManageUsers = hasPermission(PERMISSIONS.MANAGE_USERS);
  const canViewSensitiveUserDetails = hasPermission(PERMISSIONS.VIEW_USERS);
  const canManagePermissions = hasPermission(PERMISSIONS.MANAGE_ROLE_PERMISSIONS);


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

  const totalPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / itemsPerPage);
  }, [filteredUsers.length, itemsPerPage]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const canImpersonate = actualUserRole === USER_ROLES.ENCARGADO_TERRITORIO;
  const isLoadingAnyData = isLoadingUsers || isLoadingGroups || isLoadingSlots || isLoadingCasas;

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
              {canManagePermissions && (
                  <Button onClick={handleManagePermissions} variant="outline" size="lg">
                    <Settings2 className="mr-2 h-5 w-5" />
                    Permisos de Roles
                  </Button>
              )}
              {canManageUsers && (
                  <Button onClick={handleOpenAddUserDialog} size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Añadir Nuevo Usuario
                  </Button>
              )}
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2">
              <CardDescription>
                {isLoadingAnyData ? "Cargando usuarios..." :
                  filteredUsers.length > 0
                    ? `Mostrando ${paginatedUsers.length} de ${filteredUsers.length} usuario(s) registrados.`
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
            {isLoadingAnyData ? (
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
                    {paginatedUsers.map((user) => {
                      const isUserAdmin = user.role === USER_ROLES.ENCARGADO_TERRITORIO;
                      const isPendingAdminApprovalFromGroup = user.addedByGroupId && user.adminApprovalStatus === 'pending';
                      
                      let displayStatus: React.ReactNode = user.status;
                      let badgeVariant: "default" | "destructive" | "outline" | "secondary" = 'outline';
                      let badgeClass = '';

                      if (isPendingAdminApprovalFromGroup) {
                        displayStatus = 'Pendiente Aprobación Admin';
                        badgeClass = 'border-blue-500 text-blue-600 bg-blue-500/10';
                      } else if (user.status === 'Activo') {
                        badgeVariant = 'default';
                      } else if (user.status === 'Pendiente Invitación') {
                        if (user.isAssignable) {
                          displayStatus = 'Asignable (Invit. Pend.)';
                          badgeClass = 'border-green-500 text-green-700 bg-green-500/10';
                        } else {
                          badgeClass = 'border-purple-500 text-purple-600 bg-purple-500/10';
                        }
                      } else if (user.status === 'Bloqueado') {
                        badgeVariant = 'destructive';
                      }

                      const showBlockReasonTooltip = canViewSensitiveUserDetails && user.status === 'Bloqueado' && (user.blockInfo?.reason || user.blockInfo?.forSystem || user.blockInfo?.forGroup);
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
                              <Badge variant={badgeVariant} className={badgeClass}>
                                {displayStatus}
                              </Badge>
                            </TooltipTrigger>
                            {showBlockReasonTooltip && (
                               <TooltipContent side="bottom" className="max-w-xs bg-destructive text-destructive-foreground p-2 rounded-md shadow-lg">
                                  <p className="text-xs font-semibold flex items-center"><MessageSquareWarning size={13} className="mr-1.5"/>Razón del bloqueo:</p>
                                  {user.blockInfo?.reason && <p className="text-xs italic">{user.blockInfo.reason}</p>}
                                  <p className='text-xs mt-1'>Alcance:</p>
                                  <ul className='list-disc pl-4 text-xs'>
                                      {user.blockInfo?.forSystem && <li>Sistema (IA)</li>}
                                      {user.blockInfo?.forGroup && <li>Grupo (Manual)</li>}
                                  </ul>
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
                            {user.adminApprovalStatus === 'pending' && canManageUsers && (
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
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleToggleAssignableStatus(user.id, !!user.isAssignable)} disabled={isSubmitting}>
                                    {user.isAssignable ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{user.isAssignable ? "Deshabilitar para asignaciones" : "Habilitar para asignaciones"}</TooltipContent>
                              </Tooltip>
                            )}

                            {user.status === 'Pendiente Invitación' && user.adminApprovalStatus !== 'pending' && canManageUsers && (
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
                                    <TooltipContent>Editar Disponibilidad Horaria</TooltipContent>
                                </Tooltip>
                            )}
                            
                             {canManageUsers && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditUnavailabilityDialog(user)} disabled={isSubmitting}>
                                            <CalendarOff className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar Indisponibilidad (Vacaciones)</TooltipContent>
                                </Tooltip>
                            )}

                            {canManageUsers && !isUserAdmin && user.status === 'Activo' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700" onClick={() => handleOpenBlockUserDialog(user)} disabled={isSubmitting}>
                                    <ShieldOff className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Bloquear Usuario</TooltipContent>
                              </Tooltip>
                            )}

                            {canManageUsers && !isUserAdmin && user.status === 'Bloqueado' && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUnblockUser(user)} disabled={isSubmitting}>
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
          {totalPages > 1 && (
            <CardFooter className="border-t pt-4 justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline mr-1">Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {canManageUsers && (
            <InviteUserDialog
            isOpen={isAddUserDialogOpen}
            onOpenChange={setIsAddUserDialogOpen}
            onUserAdded={handleUserAdded}
            availableGroups={availableGroups}
            />
        )}
        
        {canManageUsers && (
            <EditUserDialog
                isOpen={isEditUserDialogOpen}
                onOpenChange={setIsEditUserDialogOpen}
                onUserUpdate={handleUserUpdate}
                userToEdit={userToEdit}
                availableGroups={availableGroups}
                availableCasas={availableCasas}
            />
        )}

        {userToEditAvailability && canManageUsers && (
            <EditUserAvailabilityDialog
                isOpen={isEditAvailabilityDialogOpen}
                onOpenChange={setIsEditAvailabilityDialogOpen}
                onAvailabilityUpdate={handleAvailabilityUpdate}
                userToEdit={userToEditAvailability}
                programScheduleSlots={programScheduleSlots}
            />
        )}
        
        {userToEditUnavailability && canManageUsers && (
            <EditUserUnavailabilityDialog
                isOpen={isEditUnavailabilityDialogOpen}
                onOpenChange={setIsEditUnavailabilityDialogOpen}
                onUnavailabilityUpdate={handleUnavailabilityUpdate}
                userToEdit={userToEditUnavailability}
            />
        )}
        
        <Dialog open={isBlockUserDialogOpen} onOpenChange={setIsBlockUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-amber-500"/>Bloquear Usuario: {userToBlock?.name}</DialogTitle>
              <DialogDescriptionComponent>
                Define el alcance y la razón del bloqueo.
              </DialogDescriptionComponent>
            </DialogHeader>
            <Form {...blockForm}>
            <form onSubmit={blockForm.handleSubmit(onBlockUserSubmit)} className="space-y-4 py-2">
                <div className="space-y-3 rounded-md border p-4">
                  <FormField
                    control={blockForm.control}
                    name="forSystem"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none"><Label htmlFor="forSystem" className="font-normal">Bloquear para Sistema (IA)</Label><FormFieldDescription className="text-xs">El usuario no será considerado por la IA para el programa mensual.</FormFieldDescription></div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={blockForm.control}
                    name="forGroup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none"><Label htmlFor="forGroup" className="font-normal">Bloquear para Grupo (Manual)</Label><FormFieldDescription className="text-xs">El usuario no aparecerá como opción para los SG en la planificación de grupo.</FormFieldDescription></div>
                      </FormItem>
                    )}
                  />
                  {blockForm.formState.errors.forSystem && <p className="text-sm font-medium text-destructive">{blockForm.formState.errors.forSystem.message}</p>}
                </div>
                <FormField
                  control={blockForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem><Label>Razón del Bloqueo (Opcional)</Label><FormControl><Textarea placeholder="Ej: Inactividad, solicitud del usuario, etc." {...field} /></FormControl></FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Bloqueo
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}

    