
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, PlusCircle, Pencil, Trash2, Ban, ShieldCheck, Users, Search, Phone, MapPin, CalendarClock, ShieldAlert, CheckCircle2, Users2 as GroupIcon, Loader2 } from "lucide-react";
import type { Casa, CasaAvailability } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePermissions } from "@/hooks/use-permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { USER_ROLES } from "@/lib/constants";

function formatAvailability(availability?: CasaAvailability): string {
  if (!availability) return "No especificada";
  const dayLabels: Record<keyof Pick<Required<CasaAvailability>, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>, string> = {
    monday: 'Lu', tuesday: 'Ma', wednesday: 'Mi', thursday: 'Ju', friday: 'Vi'
  };
  const daysOrder: (keyof Pick<Required<CasaAvailability>, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const parts: string[] = [];
  daysOrder.forEach(dayKey => {
    const daySlots = availability[dayKey];
    if (daySlots && (daySlots.am || daySlots.pm)) {
      const slots: string[] = [];
      if (daySlots.am) slots.push("AM");
      if (daySlots.pm) slots.push("PM");
      parts.push(`${dayLabels[dayKey]}: ${slots.join('/')}`);
    }
  });
  return parts.length > 0 ? parts.join('; ') : "Disponibilidad no detallada";
}


export default function MiGrupoCasasPage() {
  const { userProfile, isLoadingPermissions } = usePermissions();
  const [groupCasas, setGroupCasas] = useState<Casa[]>([]);
  const [isLoadingGroupCasas, setIsLoadingGroupCasas] = useState(true);
  const { toast } = useToast();

  const currentGroupId = userProfile?.assignedGroupId;

  useEffect(() => {
    if (isLoadingPermissions) return;

    if (!currentGroupId) {
      setIsLoadingGroupCasas(false);
      if (userProfile?.role === USER_ROLES.SG || userProfile?.role === USER_ROLES.AUXILIAR_TERRITORIO) {
        //toast({ title: "No Asignado", description: "No estás asignado a un grupo para ver sus casas.", variant: "default" });
      }
      return;
    }
    
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingGroupCasas(false);
      return;
    }

    setIsLoadingGroupCasas(true);
    const casasCollectionRef = collection(db, "casas");
    const q = query(casasCollectionRef, where("addedByGroupId", "==", currentGroupId), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCasas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt : Timestamp.now(),
        updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt : Timestamp.now(),
      } as Casa));
      setGroupCasas(fetchedCasas);
      setIsLoadingGroupCasas(false);
    }, (error) => {
      console.error("Error fetching group casas:", error);
      toast({ title: "Error al Cargar Casas del Grupo", description: "No se pudieron cargar las casas desde Firestore.", variant: "destructive" });
      setIsLoadingGroupCasas(false);
    });

    return () => unsubscribe();
  }, [currentGroupId, toast, isLoadingPermissions, userProfile?.role]);


  const MOCK_GROUPS_FOR_DISPLAY: { id: string, name: string }[] = [
    { id: 'G1', name: 'Grupo Los Pioneros' },
    { id: 'G2', name: 'Grupo Betel' },
    { id: 'G3', name: 'Grupo Emanuel' },
  ];

  const getGroupNameById = (groupId?: string) => {
    if (!groupId) return 'N/A';
    const group = MOCK_GROUPS_FOR_DISPLAY.find(g => g.id === groupId);
    return group ? group.name : groupId;
  };


  return (
    <TooltipProvider>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <Building className="mr-3 h-8 w-8 text-primary" />
          Casas de Reunión de Mi Grupo
        </h1>
        <p className="text-muted-foreground mt-1">
          Consulta las casas de reunión que han sido asignadas o añadidas por tu grupo de predicación.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>
            {currentGroupId ? `Casas del ${getGroupNameById(currentGroupId)}` : "Casas del Grupo"}
          </CardTitle>
          <CardDescription>
            {isLoadingPermissions || isLoadingGroupCasas 
                ? "Cargando información..." 
                : !currentGroupId 
                    ? (userProfile?.role === USER_ROLES.SG || userProfile?.role === USER_ROLES.AUXILIAR_TERRITORIO ? "No estás asignado a ningún grupo." : "Información de grupo no disponible.")
                    : `Estas son las casas de reunión asignadas a ${getGroupNameById(currentGroupId)}.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPermissions || isLoadingGroupCasas ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="flex flex-col">
                  <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
                  <CardContent className="flex-grow space-y-2 pt-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></CardContent>
                </Card>
              ))}
            </div>
          ) : !currentGroupId && (userProfile?.role === USER_ROLES.SG || userProfile?.role === USER_ROLES.AUXILIAR_TERRITORIO) ? (
             <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                <GroupIcon className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">No Estás Asignado a un Grupo</p>
                <p className="text-sm text-muted-foreground">
                  Contacta al administrador para que te asigne a un grupo de predicación.
                </p>
            </div>
          ) : groupCasas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
              <Building className="h-20 w-20 text-muted-foreground/70 mb-6" />
              <p className="text-xl font-medium text-muted-foreground mb-2">No hay casas asignadas a tu grupo.</p>
              <p className="text-sm text-muted-foreground">
                El administrador puede asignar casas a tu grupo desde la sección "Casas".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupCasas.map((casa) => (
                <Card key={casa.id} className={`flex flex-col hover:shadow-md transition-shadow duration-200 rounded-md ${casa.isBlocked ? 'opacity-60 bg-muted/50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold">{casa.ownerName}</CardTitle>
                        <Badge variant={casa.isBlocked ? 'destructive' : 'default'}>
                            {casa.isBlocked ? 'Bloqueada' : 'Disponible'}
                        </Badge>
                    </div>
                    <CardDescription className="text-xs pt-1 flex items-center"><MapPin size={13} className="mr-1.5 text-muted-foreground shrink-0" /> {casa.address}</CardDescription>
                    {casa.phoneNumber && (
                        <p className="text-xs text-muted-foreground flex items-center"><Phone size={11} className="mr-1.5 shrink-0" /> {casa.phoneNumber}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2 pt-2 text-xs">
                    <div>
                        <span className="font-medium text-muted-foreground flex items-center"><CalendarClock size={13} className="mr-1.5" /> Disponibilidad (Lu-Vi):</span>
                        <p className="text-foreground pl-1 text-[0.7rem]">{formatAvailability(casa.availableDays)}</p>
                    </div>
                    {casa.isSuitableForRural !== undefined && (
                        <div className="flex items-center">
                            {casa.isSuitableForRural ? <CheckCircle2 size={13} className="mr-1.5 text-green-600" /> : <ShieldAlert size={13} className="mr-1.5 text-red-600" />}
                            <span className="text-[0.7rem]">{casa.isSuitableForRural ? 'Apta para rural' : 'No apta para rural'}</span>
                        </div>
                    )}
                    {casa.notes && (
                        <div>
                            <span className="font-medium text-muted-foreground">Notas:</span>
                            <p className="text-foreground pl-1 text-[0.7rem] italic">{casa.notes}</p>
                        </div>
                    )}
                  </CardContent>
                  {/* No actions from "Mi Grupo" view to avoid confusion with main Casa management */}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}

