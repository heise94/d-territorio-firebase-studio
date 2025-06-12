
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserX, AlertTriangle, CalendarCheck2, CalendarX2, Phone, Mail, Loader2, PlusCircle } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import type { UserProfile } from "@/types";
import { USER_ROLES, PERMISSIONS } from "@/lib/constants"; // Import PERMISSIONS
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { AddPublishersToGroupDialog } from "@/components/mi-grupo/publicadores/add-publishers-to-group-dialog";
import { useToast } from "@/hooks/use-toast";

// MOCK DATA - En una aplicación real, estos datos vendrían de Firestore
const MOCK_ALL_PUBLISHERS_COPY: UserProfile[] = [
    { id: "uidUser1", name: "Ana Pérez", email: "ana@example.com", availability: { availableSlotIds: ["mon-0900-gen", "wed-0930-gen"] }, assignedGroupId: "G1", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser1" },
    { id: "uidUser2", name: "Luis Gómez", email: "luis@example.com", availability: { availableSlotIds: [] }, assignedGroupId: "G1", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser2" },
    { id: "uidUser3", name: "Carlos Díaz", email: "carlos@example.com", availability: { availableSlotIds: ["tue-1000-rur"] }, assignedGroupId: "G2", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser3" },
    { id: "uidUser4", name: "Elena Jara", email: "elena@example.com", availability: {}, assignedGroupId: "G2", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser4" },
    { id: "uidUser5", name: "Pedro Velez (Sin Grupo)", email: "pedro@example.com", availability: { availableSlotIds: ["sat-1000-gen"] }, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser5" },
    { id: "uidUser6", name: "Sofía Castro (SG)", email: "sofia.castro.sg@example.com", availability: { availableSlotIds: ["fri-1000-gen", "sun-1500-zoom"] }, assignedGroupId: "G1", role: USER_ROLES.SG, status: "Activo", firebaseAuthUid: "uidUser6" },
    { id: "uidUser7", name: "Marcos Solis (Sin Grupo)", email: "marcos@example.com", availability: { availableSlotIds: ["mon-0900-gen"] }, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidUser7" },
    { id: "uidUser8", name: "Laura Nuñez (Auxiliar)", email: "laura.nunez.aux@example.com", availability: { availableSlotIds: ["wed-0930-gen"] }, assignedGroupId: "G2", role: USER_ROLES.AUXILIAR_TERRITORIO, status: "Activo", firebaseAuthUid: "uidUser8" },
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
    JSON.parse(JSON.stringify(MOCK_ALL_PUBLISHERS_COPY))
  );
  const [isAddPublisherDialogOpen, setIsAddPublisherDialogOpen] = useState(false);

  // 1. Loading Check
  if (isLoadingPermissions) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  // 2. Permission Check
  // userProfile here IS the effective profile (actual or impersonated)
  // PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS should be granted to SG and Encargado Territorio
  const canAccessPage = hasPermission(PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS);

  if (!canAccessPage) {
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

  // 3. Group Assignment Check (specifically for SG role, Admins/Encargados might not have an "assignedGroupId" themselves)
  // userProfile is the effective profile. If impersonating an SG, userProfile.role will be SG.
  if (userProfile?.role === USER_ROLES.SG && !userProfile?.assignedGroupId) {
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
  
  // Determine the group ID to manage. For SGs, it's their assigned group.
  // For Encargado Territorio, they don't have an "own" group in this context, so this might be null or handled differently if they could select a group.
  // For "Mi Grupo" page, an Encargado Territorio impersonating an SG will use the SG's group.
  // If an Encargado Territorio lands here *not* impersonating, assignedGroupId would be null.
  const currentGroupIdForManagement = userProfile?.assignedGroupId;
  
  const groupPublishers = useMemo(() => {
    if (currentGroupIdForManagement) {
      return allPublishersData.filter(p => p.assignedGroupId === currentGroupIdForManagement);
    }
    return [];
  }, [allPublishersData, currentGroupIdForManagement]);

  const currentGroupName = useMemo(() => {
    if (currentGroupIdForManagement) {
      // In a real app, fetch group name from groups collection. For mock:
      const groupInfo = MOCK_ALL_PUBLISHERS_COPY.find(p => p.assignedGroupId === currentGroupIdForManagement && p.role === USER_ROLES.SG); // Crude way to get a group context
      return `Grupo ${groupInfo?.assignedGroupId || currentGroupIdForManagement}`;
    }
    // If an Encargado Territorio (not impersonating) lands here, they don't have a "Mi Grupo".
    // However, the permission check should ideally prevent this state or guide them.
    return "Tu Grupo";
  }, [currentGroupIdForManagement]);


  const handleAddPublishersToGroup = (selectedUserIds: string[]) => {
    if (!currentGroupIdForManagement) {
      toast({ title: "Error", description: "No se pudo identificar el grupo actual para añadir publicadores.", variant: "destructive"});
      return;
    }
    setAllPublishersData(prevAllUsers => {
      return prevAllUsers.map(user => {
        if (selectedUserIds.includes(user.id)) {
          return { ...user, assignedGroupId: currentGroupIdForManagement };
        }
        return user;
      });
    });
    toast({
      title: "Publicadores Añadidos",
      description: `${selectedUserIds.length} publicador(es) ${selectedUserIds.length === 1 ? 'ha' : 'han'} sido añadido(s) al ${currentGroupName} (simulación).`
    });
    setIsAddPublisherDialogOpen(false);
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
            Consulta y gestiona la información de los publicadores asignados.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle>Lista de Publicadores ({groupPublishers.length})</CardTitle>
                <CardDescription>
                {currentGroupIdForManagement 
                    ? `Publicadores actualmente en ${currentGroupName}.`
                    : "Selecciona un grupo o accede como SG para ver publicadores."
                }
                </CardDescription>
            </div>
            {currentGroupIdForManagement && ( // Button only makes sense if there's a group context
                 <Button onClick={() => setIsAddPublisherDialogOpen(true)} size="sm" className="mt-2 sm:mt-0">
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Publicador al Grupo
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
                    Utiliza el botón "Añadir Publicador al Grupo" para agregar miembros.
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupPublishers.map((publisher) => {
                      const hasAvailabilitySet = publisher.availability?.availableSlotIds && publisher.availability.availableSlotIds.length > 0;
                      return (
                        <TableRow key={publisher.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback>{getInitials(publisher.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{publisher.name}</div>
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
            isOpen={isAddPublisherDialogOpen}
            onOpenChange={setIsAddPublisherDialogOpen}
            onPublishersSelected={handleAddPublishersToGroup}
            currentGroupId={currentGroupIdForManagement}
            allUsers={allPublishersData} // Pass all users from the system for selection
            publishersInCurrentGroup={groupPublishers} // Pass users already in this group to filter them out or mark them
        />
      )}
    </TooltipProvider>
  );
}
    

    