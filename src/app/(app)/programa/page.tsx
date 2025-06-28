
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Edit, Trash2, Users, MountainSnow, Video, Bot, Save, XCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth, getDay, isSameDay, parse } from 'date-fns';
import { collection, doc, onSnapshot, query, where, getDocs, writeBatch, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, PreachingAssignedType, PublisherDetail, Casa, Territory, Campaign, Assembly, CustomHoliday, ProgramScheduleSlot, SettingsDoc, PreachingType, PreachingGroup } from "@/types";
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { generateMonthlyAssignments, GenerateMonthlyAssignmentsOutput } from "@/ai/flows/generate-monthly-assignments";
import { GenerateAIDialog } from "@/components/programa/generate-ai-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";

type DraftAssignmentItem = GenerateMonthlyAssignmentsOutput['schedule'][0]['assignments'][0];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(currentYear, i), "MMMM", { locale: es }),
}));

const PreachingTypeIcon = ({ type }: { type: PreachingAssignedType }) => {
  const iconClass = "mr-1.5 h-4 w-4 shrink-0 text-muted-foreground";
  if (type === "publica") return <Users className={iconClass} />;
  if (type === "rural") return <MountainSnow className={iconClass} />;
  if (type === "zoom") return <Video className={iconClass} />;
  return null;
};

export default function ProgramaMensualPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  // Data states
  const [allPublishers, setAllPublishers] = useState<PublisherDetail[]>([]);
  const [allCasas, setAllCasas] = useState<Casa[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [allAssemblies, setAllAssemblies] = useState<Assembly[]>([]);
  const [allHolidays, setAllHolidays] = useState<CustomHoliday[]>([]);
  const [programSlots, setProgramSlots] = useState<ProgramScheduleSlot[]>([]);
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<any>({});
  const [allGroups, setAllGroups] = useState<PreachingGroup[]>([]);
  const [savedAssignments, setSavedAssignments] = useState<Assignment[]>([]);

  // Dialog and draft states
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, DraftAssignmentItem[]>>({});

  useEffect(() => {
    setIsLoading(true);
    const publishersQuery = query(collection(db, "users"));
    const unsubPublishers = onSnapshot(publishersQuery, (snap) => setAllPublishers(snap.docs.map(d => ({id: d.id, ...d.data()} as PublisherDetail))));
    
    const casasQuery = query(collection(db, "casas"));
    const unsubCasas = onSnapshot(casasQuery, (snap) => setAllCasas(snap.docs.map(d => ({id: d.id, ...d.data()} as Casa))));

    const territoriesQuery = query(collection(db, "territories"));
    const unsubTerritories = onSnapshot(territoriesQuery, (snap) => setAllTerritories(snap.docs.map(d => ({id: d.id, ...d.data()} as Territory))));
    
    const groupsQuery = query(collection(db, "preachingGroups"));
    const unsubGroups = onSnapshot(groupsQuery, (snap) => setAllGroups(snap.docs.map(d => ({id: d.id, ...d.data()} as PreachingGroup))));

    const settingsDocRef = doc(db, "settings", "programConfig");
    const unsubSettings = onSnapshot(settingsDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SettingsDoc;
        setProgramSlots(data.programScheduleSlots || []);
        const groupDays = (data.groupOrganizedDays || []).reduce((acc, day) => ({ ...acc, [day]: true }), {});
        setGroupOrganizedDays(groupDays);
      }
    });
    
    const eventsDocRef = doc(db, "settings", "specialEventsConfig");
    const unsubEvents = onSnapshot(eventsDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SettingsDoc;
        setAllCampaigns((data.campaignsList || []).map(c => ({...c, startDate: (c.startDate as Timestamp).toDate(), endDate: (c.endDate as Timestamp).toDate() })));
        setAllAssemblies((data.assembliesList || []).map(a => ({...a, startDate: (a.startDate as Timestamp).toDate(), endDate: (a.endDate as Timestamp).toDate() })));
        setAllHolidays((data.holidaysList || []).map(h => ({...h, date: (h.date as Timestamp).toDate() })));
      }
    });

    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      unsubPublishers(); unsubCasas(); unsubTerritories();
      unsubSettings(); unsubEvents(); clearTimeout(timer); unsubGroups();
    };
  }, []);

  useEffect(() => {
    const startDate = format(startOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
    const assignmentsQuery = query(collection(db, "assignments"), where("date", ">=", startDate), where("date", "<=", endDate));
    const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
      setSavedAssignments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment)));
    });
    return () => unsubscribe();
  }, [selectedMonth, selectedYear]);
  
  const canGenerateProgram = hasPermission(PERMISSIONS.GENERATE_MONTHLY_PROGRAM);
  
  const handleGenerateAssignments = async (options: { 
    assignCaptains: boolean, assignLocations: boolean, additionalInstructions: string; 
    holidayOverrides?: Array<{date: string, time: string, type: PreachingType}>;
    designatedRuralWeekendDays: string[];
  }) => {
    setIsGenerating(true);
    setIsGenerateDialogOpen(false);
    toast({ title: "Generando programa con IA...", description: "Esto puede tardar un momento. Por favor, espera." });

    const availableDaysWithTimeSlots: any = {};
    programSlots.forEach(slot => {
        if (!availableDaysWithTimeSlots[slot.dayOfWeek]) {
            availableDaysWithTimeSlots[slot.dayOfWeek] = [];
        }
        availableDaysWithTimeSlots[slot.dayOfWeek].push({ startTime: slot.startTime, type: slot.type });
    });

    const serializableTerritories = allTerritories.map(t => ({
      id: t.id, name: t.name, type: t.type, number: t.number,
      lastWorked: t.lastWorked, associatedCasaIds: t.associatedCasaIds || [],
    }));

    const serializableCasas = allCasas.map(c => ({
      id: c.id, ownerName: c.ownerName, address: c.address,
      unavailabilityPeriods: (c.unavailabilityPeriods || []).map(p => ({
          ...p,
          startDate: format(p.startDate instanceof Timestamp ? p.startDate.toDate() : new Date(p.startDate), 'yyyy-MM-dd'),
          endDate: format(p.endDate instanceof Timestamp ? p.endDate.toDate() : new Date(p.endDate), 'yyyy-MM-dd'),
      })),
      associatedTerritoryIds: c.associatedCasaIds || [],
    }));
    
    const serializablePublishers = allPublishers.map(p => ({
      id: p.id || p.firebaseAuthUid, name: p.name, blockInfo: p.blockInfo,
      unavailabilityPeriods: (p.availability?.unavailabilityPeriods || []).map(up => ({
          ...up,
          startDate: format(up.startDate instanceof Timestamp ? up.startDate.toDate() : new Date(up.startDate), 'yyyy-MM-dd'),
          endDate: format(up.endDate instanceof Timestamp ? up.endDate.toDate() : new Date(up.endDate), 'yyyy-MM-dd'),
      })),
      managedCasaId: p.managedCasaId,
    }));
    
    const serializableCampaigns = allCampaigns.map(c => ({...c, startDate: format(c.startDate as Date, 'yyyy-MM-dd'), endDate: format(c.endDate as Date, 'yyyy-MM-dd')}));
    const serializableAssemblies = allAssemblies.map(a => ({...a, startDate: format(a.startDate as Date, 'yyyy-MM-dd'), endDate: format(a.endDate as Date, 'yyyy-MM-dd')}));
    const serializableHolidays = allHolidays.map(h => format(h.date as Date, 'yyyy-MM-dd'));
    const serializableGroups = allGroups.map(g => ({ id: g.id, name: g.name, superintendentId: g.superintendentId }));

    const inputForAI = {
      year: selectedYear, month: selectedMonth, availableDaysWithTimeSlots,
      assignCaptains: options.assignCaptains, assignCasas: options.assignLocations, assignTerritories: options.assignLocations,
      availableCasas: serializableCasas, availableTerritories: serializableTerritories,
      groupPreachingDays: groupOrganizedDays, configuredCampaigns: serializableCampaigns,
      specialCampaignTerritoriesPerDay: 2, holidayDatesInMonth: serializableHolidays,
      holidaySchedulingOverrides: options.holidayOverrides, designatedRuralWeekendDays: options.designatedRuralWeekendDays,
      publisherDetailedAvailabilities: serializablePublishers, additionalInstructions: options.additionalInstructions,
      preachingGroups: serializableGroups,
    };

    try {
        const result = await generateMonthlyAssignments(inputForAI as any);
        if (result && result.schedule) {
            const newDraft: Record<string, DraftAssignmentItem[]> = {};
            result.schedule.forEach(daySchedule => { newDraft[daySchedule.date] = daySchedule.assignments; });
            setDraftAssignments(newDraft);
            toast({ title: "Borrador Generado", description: "El borrador del programa está listo. Revísalo y guárdalo." });
        } else {
            throw new Error("La IA no devolvió un programa válido.");
        }
    } catch(error) {
        console.error("Error generating AI schedule:", error);
        toast({ title: "Error de Generación", description: "La IA no pudo generar el programa. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsGenerating(true);
    const batch = writeBatch(db);
    const assignmentsInDraft = Object.values(draftAssignments).flat();

    if (assignmentsInDraft.length === 0) {
        toast({ title: "Borrador Vacío", description: "No hay asignaciones en el borrador para guardar.", variant: "default"});
        setIsGenerating(false);
        return;
    }

    assignmentsInDraft.forEach(assign => {
      if (!assign.id) return;
      const docRef = doc(db, "assignments", assign.id);
      
      const territory = allTerritories.find(t => t.name === assign.territoryName);
      const casa = allCasas.find(c => c.ownerName === assign.casaName);
      const publisher = allPublishers.find(p => p.id === assign.captainId || p.firebaseAuthUid === assign.captainId);
      
      const assignData: Partial<Assignment> = {
          id: assign.id, date: assign.date, time: assign.time, type: assign.preachingType as PreachingAssignedType,
          status: 'pending', userId: assign.captainId, userName: assign.captainName, userEmail: publisher?.email,
          userPhoneNumber: publisher?.phoneNumber, locationName: assign.territoryName || assign.casaName || 'Zoom',
          locationId: territory?.id || casa?.id, assignedBy: 'Sistema IA',
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      batch.set(docRef, assignData, { merge: true });
    });

    try {
        await batch.commit();
        setDraftAssignments({});
        toast({ title: "Programa Guardado", description: "Las asignaciones del borrador se han guardado en Firestore.", variant: "default" });
    } catch(error) {
        console.error("Error saving draft:", error);
        toast({ title: "Error al Guardar", description: "No se pudieron guardar las asignaciones.", variant: "destructive"});
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleDiscardDraft = () => {
    setDraftAssignments({});
    toast({ title: "Borrador Descartado", description: "Los cambios no guardados han sido eliminados.", variant: "destructive" });
  };
  
  const hasDraft = Object.keys(draftAssignments).length > 0;
  const firstDayOfMonth = startOfMonth(new Date(selectedYear, selectedMonth));
  const daysInMonth = getDaysInMonth(firstDayOfMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth);
  const dayOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => new Date(selectedYear, selectedMonth, i + 1));
  const assignmentsToDisplay = hasDraft ? draftAssignments : savedAssignments.reduce((acc, curr) => {
    (acc[curr.date] = acc[curr.date] || []).push(curr);
    return acc;
  }, {} as Record<string, any[]>);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa Mensual de Predicación
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualiza el programa guardado o genera un nuevo borrador con IA.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle>Calendario de Asignaciones</CardTitle>
              <div className="flex gap-3 items-center pt-2">
                <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Mes" /></SelectTrigger>
                  <SelectContent>{months.map(m => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}</SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger className="w-[120px]"><SelectValue placeholder="Año" /></SelectTrigger>
                  <SelectContent>{years.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            {canGenerateProgram && (
                <Button onClick={() => setIsGenerateDialogOpen(true)} size="lg" disabled={isGenerating}>
                    <Bot className="mr-2 h-5 w-5" /> Generar Programa con IA
                </Button>
            )}
          </div>
           {hasDraft && (
             <CardDescription className="pt-4 text-amber-600 dark:text-amber-400 font-medium flex items-center">
                <FileText className="mr-2 h-4 w-4"/> Estás viendo un borrador. Haz los cambios que necesites y luego guárdalo.
             </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isLoading || isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{isGenerating ? "Generando programa..." : "Cargando datos..."}</p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground pb-2 border-b">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => <div key={day}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: dayOffset }).map((_, i) => <div key={`empty-${i}`} className="border rounded-md min-h-[120px] bg-muted/30"></div>)}
                {calendarDays.map(day => {
                  const dayString = format(day, "yyyy-MM-dd");
                  const assignmentsForDay = (assignmentsToDisplay[dayString] || []).sort((a: any, b: any) => a.time.localeCompare(b.time));
                  const isToday = isSameDay(day, new Date());

                  return (
                    <Card key={dayString} className={`min-h-[120px] flex flex-col rounded-md shadow-sm ${isToday ? 'border-2 border-primary' : 'border'} ${hasDraft ? 'border-amber-500/50 bg-amber-500/5' : 'bg-card'}`}>
                      <CardHeader className="p-2 pb-1 flex flex-row justify-between items-start">
                        <CardTitle className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{format(day, "d")}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-1.5 space-y-1.5 overflow-y-auto flex-grow">
                        {assignmentsForDay.length > 0 ? (
                          assignmentsForDay.map((assign: any) => (
                            <div key={assign.id} className="p-1.5 rounded-md bg-muted/50 text-xs shadow-sm group relative">
                              <div className="flex items-center font-semibold text-primary"><PreachingTypeIcon type={assign.type || assign.preachingType} /><span>{assign.time}</span></div>
                              <p className="truncate text-foreground/90" title={assign.userName || assign.captainName}>{assign.userName || assign.captainName}</p>
                              <p className="truncate text-muted-foreground text-[0.7rem]" title={assign.locationName || assign.territoryName || assign.casaName}>{assign.locationName || assign.territoryName || assign.casaName}</p>
                            </div>
                          ))
                        ) : (<div className="h-full flex items-center justify-center text-xs text-muted-foreground/50">Vacío</div>)}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
        {hasDraft && (
            <CardFooter className="border-t pt-4 flex gap-2">
                 <Button onClick={handleSaveDraft} size="lg" disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5"/>}
                     Guardar Programa
                </Button>
                <Button onClick={handleDiscardDraft} variant="destructive" disabled={isGenerating}>
                    <XCircle className="mr-2 h-5 w-5"/> Descartar Borrador
                </Button>
            </CardFooter>
        )}
      </Card>
      {canGenerateProgram && 
        <GenerateAIDialog
          isOpen={isGenerateDialogOpen}
          onOpenChange={setIsGenerateDialogOpen}
          onSubmitGeneration={handleGenerateAssignments}
          year={selectedYear}
          month={selectedMonth}
          holidays={allHolidays}
          programScheduleSlots={programSlots}
          allTerritories={allTerritories}
        />
      }
    </div>
  );
}
