
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserX, AlertTriangle, CalendarCheck2, CalendarX2, Phone, Mail, Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import type { PublisherDetail, UserAvailability } from "@/types"; // Asegúrate que UserAvailability esté en types
import { USER_ROLES } from "@/lib/constants";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// MOCK DATA - En una aplicación real, estos datos vendrían de Firestore
const MOCK_ALL_PUBLISHERS: PublisherDetail[] = [
    { id: "uidUser1", name: "Ana Pérez", email: "ana@example.com", availability: { availableSlotIds: ["mon-0900-gen", "wed-0930-gen"] }, assignedGroupId: "G1" },
    { id: "uidUser2", name: "Luis Gómez", email: "luis@example.com", availability: { availableSlotIds: [] }, assignedGroupId: "G1" },
    { id: "uidUser3", name: "Carlos Díaz", email: "carlos@example.com", availability: { availableSlotIds: ["tue-1000-rur"] }, assignedGroupId: "G2" },
    { id: "uidUser4", name: "Elena Jara", email: "elena@example.com", availability: {}, assignedGroupId: "G2" },
    { id: "uidUser5", name: "Pedro Velez (Sin Grupo)", email: "pedro@example.com", availability: { availableSlotIds: ["sat-1000-gen"] } },
    { id: "uidUser6", name: "Sofia Castro (SG)", email: "sofia.castro.sg@example.com", availability: { availableSlotIds: ["fri-1000-gen", "sun-1500-zoom"] }, assignedGroupId: "G1" },
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
  const { userProfile, isLoadingPermissions } = usePermissions();
  const [groupPublishers, setGroupPublishers] = useState<PublisherDetail[]>([]);

  useEffect(() => {
    if (userProfile?.assignedGroupId && !isLoadingPermissions) {
      // Simular carga de datos o filtrar MOCK_ALL_PUBLISHERS
      const filtered = MOCK_ALL_PUBLISHERS.filter(p => p.assignedGroupId === userProfile.assignedGroupId);
      setGroupPublishers(filtered);
    } else {
      setGroupPublishers([]);
    }
  }, [userProfile, isLoadingPermissions]);

  if (isLoadingPermissions) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const isSGorAdmin = userProfile?.role === USER_ROLES.SG || userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO;
  
  if (!isSGorAdmin) {
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
            <p className="text-muted-foreground">No tienes los permisos necesarios para ver esta sección. Esta área es para Superintendentes de Grupo (SG) o Encargados de Territorio.</p>
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
  
  const currentGroupName = userProfile?.assignedGroupId || "Grupo Desconocido"; // TODO: Fetch group name later

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Publicadores del Grupo {currentGroupName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Consulta la información de los publicadores asignados a tu grupo de predicación.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Lista de Publicadores ({groupPublishers.length})</CardTitle>
            <CardDescription>
              Publicadores actualmente en el grupo {currentGroupName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {groupPublishers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
                <UserX className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">No hay publicadores en este grupo.</p>
                <p className="text-sm text-muted-foreground text-center">
                  Contacta al administrador para asignar publicadores a este grupo.
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
    </TooltipProvider>
  );
}

    