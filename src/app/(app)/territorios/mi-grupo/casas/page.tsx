// This file is the new location for the Mi Grupo Casas page, moved from /app/(app)/mi-grupo/casas/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, AlertTriangle, Loader2, MapPin, Phone, CalendarClock } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import type { Casa, PreachingGroup, UnavailabilityPeriod, ProgramScheduleSlot, DayOfWeek, SettingsDoc } from "@/types";
import { USER_ROLES } from "@/lib/constants";
import { collection, onSnapshot, query, where, Timestamp, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const DAY_ORDER_AVAILABILITY: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS_AVAILABILITY: Record<DayOfWeek, string> = {
  monday: 'Lu', tuesday: 'Ma', wednesday: 'Mi', thursday: 'Ju', friday: 'Vi', saturday: 'Sá', sunday: 'Do'
};

function formatAvailabilityForGroup(availableSlotIds?: string[], allSlots?: ProgramScheduleSlot[]): string {
  if (!availableSlotIds || availableSlotIds.length === 0 || !allSlots || allSlots.length === 0) {
    return "No especificada";
  }

  const groupedByDay: Record<DayOfWeek, ProgramScheduleSlot[]> = {
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  };

  availableSlotIds.forEach(slotId => {
    const slotDetail = allSlots.find(s => s.id === slotId && s.type !== 'zoom');
    if (slotDetail) {
      groupedByDay[slotDetail.dayOfWeek].push(slotDetail);
    }
  });

  const parts: string[] = [];
  DAY_ORDER_AVAILABILITY.forEach(dayKey => {
    const daySlots = groupedByDay[dayKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (daySlots.length > 0) {
      const slotStrings = daySlots.map(s => `${s.startTime}`);
      parts.push(`${DAY_LABELS_AVAILABILITY[dayKey]}: ${slotStrings.join(', ')}`);
    }
  });

  return parts.length > 0 ? parts.join('; ') : "No especificada para predicación presencial.";
}

export default function MiGrupoCasasPage() {
  const { userProfile, isLoadingPermissions, hasPermission } = usePermissions();
  const [allCasas, setAllCasas] = useState<Casa[]>([]);
  const [programSlots, setProgramSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentGroupId = userProfile?.assignedGroupId;

  useEffect(() => {
    setIsLoading(true);
    const unsubscribers: (() => void)[] = [];

    // Fetch Casas
    const casasQuery = query(collection(db, "casas"));
    unsubscribers.push(onSnapshot(casasQuery, (snapshot) => {
      setAllCasas(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Casa)));
    }));

    // Fetch Program Slots
    const settingsRef = doc(db, "settings", "programConfig");
    unsubscribers.push(onSnapshot(settingsRef, (snapshot) => {
        if(snapshot.exists()) {
            const settingsData = snapshot.data() as SettingsDoc;
            setProgramSlots(settingsData.programScheduleSlots || []);
        }
    }));
    
    const timer = setTimeout(() => setIsLoading(false), 1500);
    unsubscribers.push(() => clearTimeout(timer));

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const groupCasas = useMemo(() => {
    if (!currentGroupId) return [];
    return allCasas.filter(c => c.addedByGroupId === currentGroupId && (!c.blockInfo || !c.blockInfo.forGroup));
  }, [allCasas, currentGroupId]);

  if (isLoading || isLoadingPermissions) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!userProfile?.assignedGroupId) {
    return (
       <div className="space-y-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <Home className="mr-3 h-8 w-8 text-primary" />
          Casas de Mi Grupo
        </h1>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/>No Asignado a un Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No estás asignado a ningún grupo de predicación para ver sus casas asociadas.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <Home className="mr-3 h-8 w-8 text-primary" />
          Casas de Mi Grupo
        </h1>
        <p className="text-muted-foreground mt-1">
          Consulta la información de las casas disponibles para tu grupo de predicación.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Lista de Casas del Grupo ({groupCasas.length})</CardTitle>
            <CardDescription>
                Casas disponibles para las reuniones de predicación de tu grupo.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {groupCasas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
                    <Home className="h-20 w-20 text-muted-foreground/70 mb-6" />
                    <p className="text-xl font-medium text-muted-foreground mb-2">
                        Tu grupo no tiene casas asignadas.
                    </p>
                    <p className="text-sm text-muted-foreground text-center">
                       Contacta al Encargado de Territorio para que asocie casas a tu grupo.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupCasas.map(casa => (
                        <Card key={casa.id}>
                            <CardHeader>
                                <CardTitle>{casa.ownerName}</CardTitle>
                                <CardDescription className="flex items-center text-xs pt-1"><MapPin size={12} className="mr-1.5 shrink-0"/> {casa.address}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                {casa.phoneNumber && <p className="flex items-center text-xs"><Phone size={12} className="mr-1.5 shrink-0"/> {casa.phoneNumber}</p>}
                                <p className="flex items-start text-xs"><CalendarClock size={12} className="mr-1.5 shrink-0 mt-0.5"/> 
                                <span className="font-medium">Disponibilidad:</span>
                                <span className="ml-1.5">{formatAvailabilityForGroup(casa.availableDays?.availableProgramSlotIds, programSlots)}</span></p>
                                {casa.isSuitableForRural && <Badge variant="outline">Apta para Rural</Badge>}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
