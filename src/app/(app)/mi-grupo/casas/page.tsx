
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, PlusCircle, Pencil, Trash2, Ban, ShieldCheck, Users, Search, Phone, MapPin, CalendarClock, ShieldAlert, CheckCircle2, Users2 as GroupIcon, Loader2, Users as UsersTypeIcon, MountainSnow, Video } from "lucide-react";
import type { Casa, CasaAvailability, ProgramScheduleSlot, DayOfWeek, PreachingType, SettingsDoc } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, onSnapshot, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePermissions } from "@/hooks/use-permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { USER_ROLES } from "@/lib/constants";

const DAY_ORDER_AVAILABILITY: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS_AVAILABILITY: Record<DayOfWeek, string> = {
  monday: 'Lu', tuesday: 'Ma', wednesday: 'Mi', thursday: 'Ju', friday: 'Vi', saturday: 'Sá', sunday: 'Do'
};

const PreachingTypeIconSmall = ({ type, className }: { type: PreachingType, className?: string }) => {
  const defaultClass = "mr-1 h-3 w-3 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersTypeIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  // No icon for zoom as it's filtered out for casa availability
  return null;
};


function formatCasaAvailabilityDisplay(availableSlotIds?: string[], allSlots?: ProgramScheduleSlot[]): string {
  if (!availableSlotIds || availableSlotIds.length === 0 || !allSlots || allSlots.length === 0) {
    return "No especificada";
  }

  const groupedByDay: Record<DayOfWeek, ProgramScheduleSlot[]> = {
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  };

  availableSlotIds.forEach(slotId => {
    // Only consider non-zoom slots for casa availability display
    const slotDetail = allSlots.find(s => s.id === slotId && s.type !== 'zoom');
    if (slotDetail) {
      groupedByDay[slotDetail.dayOfWeek].push(slotDetail);
    }
  });

  const parts: string[] = [];
  DAY_ORDER_AVAILABILITY.forEach(dayKey => {
    const daySlots = groupedByDay[dayKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (daySlots.length > 0) {
      const slotStrings = daySlots.map(s => {
        let typeAbbreviation = ''; // G for General, R for Rural. Zoom is filtered out.
        if (s.type === 'general') typeAbbreviation = 'G';
        else if (s.type === 'rural') typeAbbreviation = 'R';
        
        return `${s.startTime}${typeAbbreviation ? ` (${typeAbbreviation})` : ''}`;
      });
      parts.push(`${DAY_LABELS_AVAILABILITY[dayKey]}: ${slotStrings.join(', ')}`);
    }
  });

  return parts.length > 0 ? parts.join('; ') : "No especificada (o solo horarios Zoom)";
}


export default function MiGrupoCasasPage() {
  const { userProfile, isLoadingPermissions } = usePermissions();
  const [groupCasas, setGroupCasas] = useState<Casa[]>([]);
  const [isLoadingGroupCasas, setIsLoadingGroupCasas] = useState(true);
  const { toast } = useToast();

  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isLoadingProgramSlots, setIsLoadingProgramSlots] = useState(true);

  const currentGroupId = userProfile?.assignedGroupId;

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingProgramSlots(false);
      return;
    }
    setIsLoadingProgramSlots(true);
    const settingsDocRef = doc(db, "settings", "programConfig");
    const unsubscribeSlots = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const settingsData = docSnap.data() as SettingsDoc;
          const slots = settingsData.programScheduleSlots || [];
          setProgramScheduleSlots(slots.sort((a,b) => {
            const dayCompare = DAY_ORDER_AVAILABILITY.indexOf(a.dayOfWeek) - DAY_ORDER_AVAILABILITY.indexOf(b.dayOfWeek);
            if (dayCompare !== 0) return dayCompare;
            return a.startTime.localeCompare(b.startTime);
          }));
        } else {
          setProgramScheduleSlots([]);
        }
        setIsLoadingProgramSlots(false);
    }, (error) => {
        console.error("Error fetching program schedule slots for Mi Grupo Casas:", error);
        toast({ title: "Error al Cargar Horarios", description: "No se pudieron cargar los horarios del programa.", variant: "destructive" });
        setIsLoadingProgramSlots(false);
    });
     return () => unsubscribeSlots();
  }, [toast]);


  useEffect(() => {
    if (isLoadingPermissions || isLoadingProgramSlots) return;

    if (!currentGroupId) {
      setIsLoadingGroupCasas(false);
      return;
    }
    
    if (!db || Object.keys(db).length === 0) {
      // Toast already shown by program slots effect
      setIsLoadingGroupCasas(false);
      return;
    }

    setIsLoadingGroupCasas(true);
    const casasCollectionRef = collection(db, "casas");
    const q = query(casasCollectionRef, where("addedByGroupId", "==", currentGroupId), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCasas = snapshot.docs.map(docSnap => ({ // Renamed doc to docSnap to avoid conflict
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt instanceof Timestamp ? docSnap.data().createdAt : Timestamp.now(),
        updatedAt: docSnap.data().updatedAt instanceof Timestamp ? docSnap.data().updatedAt : Timestamp.now(),
      } as Casa));
      setGroupCasas(fetchedCasas);
      setIsLoadingGroupCasas(false);
    }, (error) => {
      console.error("Error fetching group casas:", error);
      toast({ title: "Error al Cargar Casas del Grupo", description: "No se pudieron cargar las casas desde Firestore.", variant: "destructive" });
      setIsLoadingGroupCasas(false);
    });

    return () => unsubscribe();
  }, [currentGroupId, toast, isLoadingPermissions, isLoadingProgramSlots]);


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
            {isLoadingPermissions || isLoadingGroupCasas || isLoadingProgramSlots
                ? "Cargando información..." 
                : !currentGroupId 
                    ? (userProfile?.role === USER_ROLES.SG || userProfile?.role === USER_ROLES.AUXILIAR_TERRITORIO ? "No estás asignado a ningún grupo." : "Información de grupo no disponible.")
                    : `Estas son las casas de reunión asignadas a ${getGroupNameById(currentGroupId)}.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPermissions || isLoadingGroupCasas || isLoadingProgramSlots ? (
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
              {groupCasas.map((casa) => {
                const formattedAvailability = formatCasaAvailabilityDisplay(casa.availableDays?.availableProgramSlotIds, programScheduleSlots);
                return (
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
                        <span className="font-medium text-muted-foreground flex items-center"><CalendarClock size={13} className="mr-1.5" /> Disponibilidad (Horarios Programa):</span>
                        <p className="text-foreground pl-1 text-[0.7rem]">{formattedAvailability}</p>
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
                </Card>
              );
            })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}

