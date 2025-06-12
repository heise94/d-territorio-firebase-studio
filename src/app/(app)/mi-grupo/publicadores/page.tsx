
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserX, AlertTriangle, CalendarCheck2, CalendarX2, Phone, Mail, Loader2, PlusCircle } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import type { PublisherDetail, UserAvailability, UserProfile } from "@/types";
import { USER_ROLES } from "@/lib/constants";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { AddPublishersToGroupDialog } from "@/components/mi-grupo/publicadores/add-publishers-to-group-dialog";
import { useToast } from "@/hooks/use-toast";

// MOCK DATA - En una aplicación real, estos datos vendrían de Firestore
// Hacemos una copia para poder modificarla localmente sin afectar otros usos del mock
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
  
  // State to hold all publishers data, initialized with a copy of MOCK_ALL_PUBLISHERS_COPY
  // This allows local modifications for simulation purposes without affecting the original mock.
  const [allPublishersData, setAllPublishersData] = useState<UserProfile[]>(() => 
    JSON.parse(JSON.stringify(MOCK_ALL_PUBLISHERS_COPY)) // Deep copy
  );

  const [isAddPublisherDialogOpen, setIsAddPublisherDialogOpen] = useState(false);

  const groupPublishers = useMemo(() => {
    if (userProfile?.assignedGroupId && !isLoadingPermissions) {
      return allPublishersData.filter(p => p.assignedGroupId === userProfile.assignedGroupId);
    }
    return [];
  }, [userProfile, isLoadingPermissions, allPublishersData]);


  if (isLoadingPermissions) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const canManageGroupPublishers = hasPermission(USER_ROLES.SG) || hasPermission(USER_ROLES.ENCARGADO_TERRITORIO);
  
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
    )
  }

  if (!userProfile?.assignedGroupId && userProfile?.role === USER_ROLES.SG) {
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
    )
  }
  
  // This logic needs to be adapted if an Encargado Territorio is viewing and hasn't selected a group to "act as"
  const currentGroupIdForManagement = userProfile?.assignedGroupId; 
  // TODO: If Encargado Territorio, might need a group selector, or this page might be under a different context.
  // For now, it assumes the userProfile.assignedGroupId is the one being managed.
  
  const currentGroupName = currentGroupIdForManagement || "Grupo Desconocido"; 

  const handleAddPublishersToGroup = (selectedUserIds: string[]) => {
    if (!currentGroupIdForManagement) {
      toast({ title: "Error", description: "No se pudo identificar el grupo actual.", variant: "destructive"});
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
      description: `${selectedUserIds.length} publicador(es) ${selectedUserIds.length === 1 ? 'ha' : 'han'} sido añadido(s) al grupo ${currentGroupName} (simulación).`
    });
    setIsAddPublisherDialogOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Publicadores del Grupo {currentGroupName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Consulta y gestiona la información de los publicadores asignados a tu grupo.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle>Lista de Publicadores ({groupPublishers.length})</CardTitle>
                <CardDescription>
                Publicadores actualmente en el grupo {currentGroupName}.
                </CardDescription>
            </div>
            {currentGroupIdForManagement && (
                 <Button onClick={() => setIsAddPublisherDialogOpen(true)} size="sm" className="mt-2 sm:mt-0">
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Publicador al Grupo
                </Button>
            )}
          </CardHeader>
          <CardContent>
            {groupPublishers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
                <UserX className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">No hay publicadores en este grupo.</p>
                <p className="text-sm text-muted-foreground text-center">
                  Utiliza el botón "Añadir Publicador al Grupo" para agregar miembros.
                </p>
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
                      {/* <TableHead className="text-right">Acciones</TableHead> */}
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
                                {/* <AvatarImage src={publisher.avatarUrl} alt={publisher.name} /> */}
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
                          {/* <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Más acciones</span>
                            </Button>
                          </TableCell> */}
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
            allUsers={allPublishersData}
            publishersInCurrentGroup={groupPublishers}
        />
      )}
    </TooltipProvider>
  );
}
    
