
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserX, AlertTriangle, CalendarCheck2, CalendarX2, Phone, Mail, Loader2, PlusCircle, UserPlus2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import type { UserProfile } from "@/types";
import { USER_ROLES, PERMISSIONS } from "@/lib/constants";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { AddPublishersToGroupDialog } from "@/components/mi-grupo/publicadores/add-publishers-to-group-dialog"; // Updated import name if dialog is reused/renamed
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";

// MOCK DATA - En una aplicación real, estos datos vendrían de Firestore
const MOCK_ALL_PUBLISHERS_COPY: UserProfile[] = [
    { id: "uidUser1", name: "Ana Pérez", email: "ana@example.com", phoneNumber: "+56911111111", availability: { availableSlotIds: ["mon-0900-gen", "wed-0930-gen"] }, assignedGroupId: "G1", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser1", adminApprovalStatus: "approved" },
    { id: "uidUser2", name: "Luis Gómez", email: "luis@example.com", phoneNumber: "+56922222222", availability: { availableSlotIds: [] }, assignedGroupId: "G1", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser2", adminApprovalStatus: "approved" },
    { id: "uidUser3", name: "Carlos Díaz", email: "carlos@example.com", availability: { availableSlotIds: ["tue-1000-rur"] }, assignedGroupId: "G2", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser3", adminApprovalStatus: "approved" },
    { id: "uidUser4", name: "Elena Jara", email: "elena@example.com", availability: {}, assignedGroupId: "G2", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser4", adminApprovalStatus: "approved" },
    { id: "uidUser5", name: "Pedro Velez (Admin)", email: "pedro@example.com", availability: { availableSlotIds: ["sat-1000-gen"] }, role: USER_ROLES.ENCARGADO_TERRITORIO, status: "Activo", firebaseAuthUid: "uidUser5", adminApprovalStatus: "approved" },
    { id: "uidUser6", name: "Sofía Castro (SG G1)", email: "sofia.castro.sg@example.com", availability: { availableSlotIds: ["fri-1000-gen", "sun-1500-zoom"] }, assignedGroupId: "G1", role: USER_ROLES.SG, status: "Activo", firebaseAuthUid: "uidUser6", adminApprovalStatus: "approved" },
    { id: "uidUser7", name: "Marcos Solis (Sin Grupo)", email: "marcos@example.com", availability: { availableSlotIds: ["mon-0900-gen"] }, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser7", adminApprovalStatus: "approved" },
    { id: "uidUser8", name: "Laura Nuñez (Auxiliar G2)", email: "laura.nunez.aux@example.com", availability: { availableSlotIds: ["wed-0930-gen"] }, assignedGroupId: "G2", role: USER_ROLES.AUXILIAR_TERRITORIO, status: "Activo", firebaseAuthUid: "uidUser8", adminApprovalStatus: "approved" },
];


const getInitials = (name?: string) => {
    if (!name) return "??";
    const nameParts = name.split(" ");
    if (nameParts.length > 1) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

export default function MiGrupoPublicadoresPage() {
  const { userProfile, isLoadingPermissions, hasPermission } = usePermissions();
  const { toast } = useToast();

  const [allPublishersData, setAllPublishersData] = useState<UserProfile[]>(() =>
    JSON.parse(JSON.stringify(MOCK_ALL_PUBLISHERS_COPY)) // Use a deep copy for mutable state
  );
  const [isInviteUserFromGroupDialogOpen, setIsInviteUserFromGroupDialogOpen] = useState(false);

  if (isLoadingPermissions) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const canManageGroupPublishers = hasPermission(PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS);

  if (!canManageGroupPublishers) {
     return (
      <div className="space-y-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" />
          Publicadores de Mi Grupo
        </h1>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/>Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No tienes los permisos necesarios para ver o gestionar esta sección.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentGroupIdForManagement = userProfile?.assignedGroupId;
  // Mock group name lookup for display
  const currentGroupName = useMemo(() => {
      if (currentGroupIdForManagement) {
          const sgOfGroup = MOCK_ALL_PUBLISHERS_COPY.find(p => p.assignedGroupId === currentGroupIdForManagement && p.role === USER_ROLES.SG);
          if (sgOfGroup) return `Grupo de ${sgOfGroup.name.split(' ')[0]}`; // Example: "Grupo de Sofía"
          const groupInfo = MOCK_ALL_PUBLISHERS_COPY.find(p => p.assignedGroupId === currentGroupIdForManagement);
          if (groupInfo) return `Grupo ${currentGroupIdForManagement}`; // Fallback to ID if no SG found for name
          return `Grupo ${currentGroupIdForManagement}`;
      }
      return "Tu Grupo";
  }, [currentGroupIdForManagement]);


  if (userProfile?.role === USER_ROLES.SG && !currentGroupIdForManagement) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" />
          Publicadores de Mi Grupo
        </h1>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/>No Asignado a un Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Como Superintendente de Grupo, no estás asignado a ningún grupo de predicación. Contacta al administrador.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groupPublishers = useMemo(() => {
    if (currentGroupIdForManagement) {
      return allPublishersData.filter(p => p.assignedGroupId === currentGroupIdForManagement);
    }
    return [];
  }, [allPublishersData, currentGroupIdForManagement]);

  const handleUserInvitedFromGroup = (newUserData: { name: string, email: string, phoneNumber?: string }) => {
    if (!currentGroupIdForManagement) {
        toast({ title: "Error", description: "No se pudo identificar el grupo actual para añadir al publicador.", variant: "destructive"});
        return;
    }

    const newUserProfile: UserProfile = {
        id: crypto.randomUUID(),
        name: newUserData.name,
        email: newUserData.email,
        phoneNumber: newUserData.phoneNumber,
        role: USER_ROLES.PUBLICADOR, // Users invited by SG are initially Publicadores
        assignedGroupId: currentGroupIdForManagement,
        status: 'Pendiente Aprobación Admin', // New status indicating admin needs to approve
        adminApprovalStatus: 'pending',
        addedByGroupId: currentGroupIdForManagement,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        // firebaseAuthUid will be set after they accept invitation
    };

    setAllPublishersData(prevAllUsers => [newUserProfile, ...prevAllUsers]);
    toast({
      title: "Invitación de Publicador Enviada",
      description: `${newUserData.name} ha sido invitado al ${currentGroupName}. Quedará pendiente de aprobación por el administrador. (Simulación)`
    });
    setIsInviteUserFromGroupDialogOpen(false);
  };


  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Publicadores {userProfile?.role === USER_ROLES.SG ? `del ${currentGroupName}` : '(Gestión de Grupo)'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Consulta y gestiona la información de los publicadores asignados e invita nuevos miembros a tu grupo.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle>Lista de Publicadores ({groupPublishers.length})</CardTitle>
                <CardDescription>
                {currentGroupIdForManagement
                    ? `Publicadores actualmente en ${currentGroupName}.`
                    : "Como administrador, suplanta a un SG para ver los publicadores de su grupo."
                }
                </CardDescription>
            </div>
            {currentGroupIdForManagement && (
                 <Button onClick={() => setIsInviteUserFromGroupDialogOpen(true)} size="sm" className="mt-2 sm:mt-0">
                    <UserPlus2 className="mr-2 h-4 w-4" /> Invitar Nuevo Publicador
                </Button>
            )}
          </CardHeader>
          <CardContent>
            {!currentGroupIdForManagement && userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO && !userProfile.isImpersonating ? (
                <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
                    <Users className="h-20 w-20 text-muted-foreground/70 mb-6" />
                    <p className="text-xl font-medium text-muted-foreground mb-2">Página "Mi Grupo"</p>
                    <p className="text-sm text-muted-foreground text-center">
                        Como Encargado de Territorio, esta sección está orientada a la gestión del grupo que supervisarías si fueses SG. <br/> Para gestionar publicadores de forma global, usa la sección "Usuarios". <br/> O suplanta a un SG para ver esta página desde su perspectiva.
                    </p>
                </div>
            ) : groupPublishers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
                <UserX className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">
                    {currentGroupIdForManagement ? "No hay publicadores en este grupo." : "No se ha especificado un grupo."}
                </p>
                {currentGroupIdForManagement && (
                    <p className="text-sm text-muted-foreground text-center">
                    Utiliza el botón "Invitar Nuevo Publicador" para agregar miembros.
                    </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead className="text-center">Disponibilidad</TableHead>
                      <TableHead className="text-center">Estado General</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupPublishers.map((publisher) => {
                      const hasAvailabilitySet = publisher.availability?.availableSlotIds && publisher.availability.availableSlotIds.length > 0;
                      return (
                        <TableRow key={publisher.id} className={publisher.adminApprovalStatus === 'pending' ? 'bg-amber-500/5' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback>{getInitials(publisher.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{publisher.name}</div>
                                {publisher.role !== USER_ROLES.PUBLICADOR && <Badge variant="outline" className="text-xs mt-0.5">{publisher.role}</Badge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Mail size={13} className="mr-1.5 shrink-0"/> {publisher.email || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-xs text-muted-foreground">
                                {publisher.phoneNumber && <Phone size={13} className="mr-1.5 shrink-0"/>}
                                {publisher.phoneNumber || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <Badge variant={hasAvailabilitySet ? "default" : "outline"} className={`cursor-default ${hasAvailabilitySet ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50' : 'border-amber-400 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40'}`}>
                                    {hasAvailabilitySet ? (
                                        <CalendarCheck2 className="h-3.5 w-3.5" />
                                    ) : (
                                        <CalendarX2 className="h-3.5 w-3.5" />
                                    )}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">{hasAvailabilitySet ? "Disponibilidad configurada" : "Disponibilidad no configurada"}</p>
                                </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-center">
                             <Badge variant={
                                publisher.status === 'Activo' ? 'default'
                                : publisher.status === 'Pendiente Aprobación Admin' ? 'outline'
                                : 'destructive'
                              }
                              className={
                                publisher.status === 'Pendiente Aprobación Admin' ? 'border-blue-500 text-blue-600 bg-blue-500/10' : ''
                              }
                             >
                                {publisher.status}
                              </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {currentGroupIdForManagement && (
        <AddPublishersToGroupDialog
            isOpen={isInviteUserFromGroupDialogOpen}
            onOpenChange={setIsInviteUserFromGroupDialogOpen}
            onUserInvitedFromGroup={handleUserInvitedFromGroup}
            currentGroupName={currentGroupName}
        />
      )}
    </TooltipProvider>
  );
}
