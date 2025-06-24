
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Bot, AlertTriangle, CheckCircle2, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateMonthlyAssignments, type GenerateMonthlyAssignmentsInput, type GenerateMonthlyAssignmentsOutput } from "@/ai/flows/generate-monthly-assignments";
import { GenerateAIDialog } from "@/components/programa/generate-ai-dialog";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth, getDay, isWithinInterval, parseISO, parse } from 'date-fns';
import { Timestamp, writeBatch, collection, doc, getDoc, getDocs, query, where, orderBy, deleteField, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProgramScheduleSlot, PublisherDetail, PreachingType as TypePreachingType, SettingsDoc, Casa, Territory, PreachingGroup, DayOfWeek as TypeDayOfWeek, Campaign, Assembly, CustomHoliday, PreachingAssignedType, PreachingType } from "@/types";
import { USER_ROLES } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(currentYear, i), "MMMM", { locale: es }),
}));

const DAY_OF_WEEK_MAP_NUM_TO_KEY: Record<number, TypeDayOfWeek> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

const initialGroupOrganizedDaysState: Record<TypeDayOfWeek, boolean> = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
};

export default function ProgramaMensualPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isLoading, setIsLoading] = useState(false); // For AI generation
  const [isSavingProgram, setIsSavingProgram] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false); // For fetching initial data for AI
  const [generatedAssignments, setGeneratedAssignments] = useState<GenerateMonthlyAssignmentsOutput | null>(null);
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const { toast } = useToast();

  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<Record<TypeDayOfWeek, boolean>>(initialGroupOrganizedDaysState);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [holidays, setHolidays] = useState<CustomHoliday[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [publishers, setPublishers] = useState<PublisherDetail[]>([]);
  const [casas, setCasas] = useState<Casa[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [preachingGroups, setPreachingGroups] = useState<PreachingGroup[]>([]);


  const fetchRequiredDataForAI = useCallback(async () => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      return false;
    }
    setIsLoadingData(true);
    try {
      // Fetch settings
      const programConfigRef = doc(db, "settings", "programConfig");
      const programConfigSnap = await getDoc(programConfigRef);
      if (programConfigSnap.exists()) {
        const config = programConfigSnap.data() as SettingsDoc;
        setProgramScheduleSlots(config.programScheduleSlots || []);
        
        const organizedDaysMap: Record<TypeDayOfWeek, boolean> = { ...initialGroupOrganizedDaysState };
        (config.groupOrganizedDays || []).forEach(day => { 
            if (day in organizedDaysMap) {
                organizedDaysMap[day as TypeDayOfWeek] = true; 
            }
        });
        setGroupOrganizedDays(organizedDaysMap);
      } else {
        setProgramScheduleSlots([]);
        setGroupOrganizedDays(initialGroupOrganizedDaysState);
      }

      const specialEventsConfigRef = doc(db, "settings", "specialEventsConfig");
      const specialEventsConfigSnap = await getDoc(specialEventsConfigRef);
      if (specialEventsConfigSnap.exists()) {
        const eventsConfig = specialEventsConfigSnap.data() as SettingsDoc;
        const convertTimestampToDate = (item: any, dateFields: string[]) => {
            const newItem = { ...item };
            dateFields.forEach(field => {
                if (newItem[field] instanceof Timestamp) {
                    newItem[field] = newItem[field].toDate();
                } else if (typeof newItem[field] === 'string') { 
                     try {
                        const parsedDate = new Date(newItem[field]); // Handles ISO strings
                        if (!isNaN(parsedDate.getTime())) {
                           newItem[field] = parsedDate;
                        }
                    } catch (e) {/* ignore */}
                }
            });
            return newItem;
        };
        setCampaigns((eventsConfig.campaignsList || []).map(c => convertTimestampToDate(c, ['startDate', 'endDate'])));
        setHolidays((eventsConfig.holidaysList || []).map(h => convertTimestampToDate(h, ['date'])));
        setAssemblies((eventsConfig.assembliesList || []).map(a => convertTimestampToDate(a, ['startDate', 'endDate'])));
      }

      // Fetch collections
      const usersQuery = query(collection(db, "users"), where("status", "==", "Activo"), where("adminApprovalStatus", "==", "approved"));
      const usersSnap = await getDocs(usersQuery);
      setPublishers(usersSnap.docs.map(d => ({ 
        id: d.id, 
        firebaseAuthUid: d.data().firebaseAuthUid || d.id, 
        name: d.data().name, 
        email: d.data().email, 
        availability: d.data().availability || {},
        assignedGroupId: d.data().assignedGroupId 
      } as PublisherDetail)));
      
      const casasQuery = query(collection(db, "casas"), where("isBlocked", "==", false));
      const casasSnap = await getDocs(casasQuery);
      setCasas(casasSnap.docs.map(d => ({ 
        id: d.id, 
        ownerName: d.data().ownerName,
        address: d.data().address,
        unavailabilityPeriods: (d.data().unavailabilityPeriods || []).map((p: any) => ({
          id: p.id || crypto.randomUUID(), 
          startDate: p.startDate instanceof Timestamp ? p.startDate.toDate() : new Date(p.startDate),
          endDate: p.endDate instanceof Timestamp ? p.endDate.toDate() : new Date(p.endDate),
          reason: p.reason
        }))
      } as Casa)));

      const territoriesQuery = query(collection(db, "territories"), where("isBlocked", "==", false));
      const territoriesSnap = await getDocs(territoriesQuery);
      setTerritories(territoriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Territory)));

      const groupsQuery = query(collection(db, "preachingGroups"));
      const groupsSnap = await getDocs(groupsQuery);
      setPreachingGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PreachingGroup)));

      return true;
    } catch (error) {
      console.error("Error fetching data for AI:", error);
      toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos necesarios para la IA.", variant: "destructive" });
      return false;
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);


  const handleOpenGenerateDialog = async () => {
    const dataFetched = await fetchRequiredDataForAI();
    if (dataFetched) {
      setIsGenerationDialogOpen(true);
    } else {
      toast({ title: "Datos Incompletos", description: "No se pueden abrir las opciones de generación sin los datos de configuración.", variant: "destructive"});
    }
  };

  const handleGenerateAssignments = async (dialogData: { additionalInstructions: string; holidayOverrides?: Array<{ date: string; time: string; type: PreachingType }>; }) => {
    setIsLoading(true);
    setGeneratedAssignments(null);

    const processedAvailableDays: Record<TypeDayOfWeek, {startTime: string; type: TypePreachingType}[]> = {} as Record<TypeDayOfWeek, {startTime: string; type: TypePreachingType}[]>;
    programScheduleSlots.forEach(slot => {
        if (!processedAvailableDays[slot.dayOfWeek]) {
            processedAvailableDays[slot.dayOfWeek] = [];
        }
        processedAvailableDays[slot.dayOfWeek].push({startTime: slot.startTime, type: slot.type});
    });
    
    const input: GenerateMonthlyAssignmentsInput = {
      year: selectedYear,
      month: selectedMonth, 
      additionalInstructions: dialogData.additionalInstructions,
      
      availableDaysWithTimeSlots: processedAvailableDays,
      groupPreachingDays: groupOrganizedDays,

      publisherDetailedAvailabilities: publishers.map(p => ({ id: p.firebaseAuthUid || p.id, name: p.name })),
      availableCasas: casas.map(c => ({ 
          id: c.id, 
          name: c.ownerName, 
          address: c.address,
          unavailabilityPeriods: (c.unavailabilityPeriods || []).map(up => ({
              id: up.id || crypto.randomUUID(), 
              startDate: format(up.startDate instanceof Timestamp ? up.startDate.toDate() : new Date(up.startDate), "yyyy-MM-dd"),
              endDate: format(up.endDate instanceof Timestamp ? up.endDate.toDate() : new Date(up.endDate), "yyyy-MM-dd"),
              reason: up.reason
          }))
      })),
      availableTerritories: territories.map(t => ({id: t.id, name: t.name, type: t.type, number: t.number})),
      preachingGroups: preachingGroups.map(g => ({id: g.id, name: g.name, superintendentId: g.superintendentId})),
      
      configuredCampaigns: campaigns
        .filter(c => {
            const campaignStartDate = c.startDate instanceof Timestamp ? c.startDate.toDate() : new Date(c.startDate);
            const campaignEndDate = c.endDate instanceof Timestamp ? c.endDate.toDate() : new Date(c.endDate);
            const campaignStartMonth = campaignStartDate.getMonth();
            const campaignStartYear = campaignStartDate.getFullYear();
            const campaignEndMonth = campaignEndDate.getMonth();
            const campaignEndYear = campaignEndDate.getFullYear();
            return (campaignStartYear < selectedYear || (campaignStartYear === selectedYear && campaignStartMonth <= selectedMonth)) &&
                   (campaignEndYear > selectedYear || (campaignEndYear === selectedYear && campaignEndMonth >= selectedMonth));
        })
        .map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            startDate: format(c.startDate instanceof Timestamp ? c.startDate.toDate() : new Date(c.startDate), "yyyy-MM-dd"), 
            endDate: format(c.endDate instanceof Timestamp ? c.endDate.toDate() : new Date(c.endDate), "yyyy-MM-dd"),
            superintendentName: c.superintendentName === null ? undefined : c.superintendentName,
            specialCampaignTerritoriesPerDay: c.specialCampaignTerritoriesPerDay === null ? undefined : c.specialCampaignTerritoriesPerDay,
            description: c.description === null ? undefined : c.description,
        })),
      
      holidayDatesInMonth: holidays
        .filter(h => {
            const holidayDate = h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date);
            return holidayDate.getFullYear() === selectedYear && holidayDate.getMonth() === selectedMonth;
        })
        .map(h => format(h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date), "yyyy-MM-dd")),
      
      holidaySchedulingOverrides: dialogData.holidayOverrides || [],

      assembliesInMonth: assemblies
         .filter(a => {
            const assemblyStartDate = a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate);
            const assemblyEndDate = a.endDate instanceof Timestamp ? a.endDate.toDate() : new Date(a.endDate);
            const assemblyStartMonth = assemblyStartDate.getMonth();
            const assemblyStartYear = assemblyStartDate.getFullYear();
            const assemblyEndMonth = assemblyEndDate.getMonth();
            const assemblyEndYear = assemblyEndDate.getFullYear();
            return (assemblyStartYear < selectedYear || (assemblyStartYear === selectedYear && assemblyStartMonth <= selectedMonth)) &&
                   (assemblyEndYear > selectedYear || (assemblyEndYear === selectedYear && assemblyEndMonth >= selectedMonth));
        })
        .map(a => ({
            name: a.name,
            startDate: format(a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate), "yyyy-MM-dd"), 
            endDate: format(a.endDate instanceof Timestamp ? a.endDate.toDate() : new Date(a.endDate), "yyyy-MM-dd"),
            description: a.description === null ? undefined : a.description,
        })),

      assignCasas: true,
      assignTerritories: true, 
      detailedTerritoryReports: territories, // Pass all territories so AI can check lastWorked date
      specialCampaignTerritoriesPerDay: 1,
    };

    try {
      const result = await generateMonthlyAssignments(input);
      setGeneratedAssignments(result);
      toast({
        title: "Programa Generado por IA",
        description: "El borrador del programa mensual ha sido generado. Revísalo y guárdalo.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating monthly assignments:", error);
      toast({
        title: "Error de Generación",
        description: "Hubo un problema al generar el programa con la IA.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsGenerationDialogOpen(false);
    }
  };

  const handleSaveProgramToFirestore = async () => {
    if (!generatedAssignments || !generatedAssignments.captainAssignments) {
        toast({ title: "Sin Datos", description: "No hay asignaciones generadas para guardar.", variant: "default" });
        return;
    }
    if (!db || Object.keys(db).length === 0) {
        toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
        return;
    }

    setIsSavingProgram(true);
    const batch = writeBatch(db);
    const assignmentsCollectionRef = collection(db, "assignments");
    let assignmentCount = 0;

    try {
        Object.values(generatedAssignments.captainAssignments).flat().forEach(assign => {
            if (!assign.captainId || assign.captainId === "PENDING_CAPTAIN_ID") {
                console.warn(`Saltando asignación para ${assign.date} a las ${assign.time} porque no tiene capitán asignado.`);
                return; 
            }
            const newAssignmentRef = doc(assignmentsCollectionRef); 
            assignmentCount++;
            
            const captainUser = publishers.find(p => p.id === assign.captainId || p.firebaseAuthUid === assign.captainId);

            batch.set(newAssignmentRef, {
                userId: assign.captainId,
                userName: assign.captainName,
                userEmail: captainUser?.email || null, 
                date: assign.date,
                time: assign.time,
                type: assign.preachingType as PreachingAssignedType, 
                locationName: assign.territoryName || assign.casaName || "Lugar no especificado",
                status: 'pending', 
                assignedBy: 'Admin IA',
                assignedGroupId: captainUser?.assignedGroupId || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();
        toast({
            title: "Programa Guardado",
            description: `${assignmentCount} asignaciones han sido guardadas en Firestore.`,
            variant: "default",
        });
        setGeneratedAssignments(null); 
    } catch (error) {
        console.error("Error saving program to Firestore:", error);
        toast({
            title: "Error al Guardar",
            description: "No se pudo guardar el programa en Firestore.",
            variant: "destructive",
        });
    } finally {
        setIsSavingProgram(false);
    }
  };

  const handleDeleteAssignment = (assignmentId: string, dayKey: string) => {
    setGeneratedAssignments(prev => {
        if (!prev || !prev.captainAssignments) return prev;

        const updatedDayAssignments = (prev.captainAssignments[dayKey] || []).filter(a => a.id !== assignmentId);

        const newCaptainAssignments = {
            ...prev.captainAssignments,
            [dayKey]: updatedDayAssignments,
        };

        return {
            ...prev,
            captainAssignments: newCaptainAssignments,
        };
    });
    toast({
        title: "Asignación eliminada del borrador",
        description: "La asignación ha sido quitada y no se guardará.",
    });
  };
  
  const monthDays = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth);
    const numDays = getDaysInMonth(date);
    return Array.from({ length: numDays }, (_, i) => format(new Date(selectedYear, selectedMonth, i + 1), "yyyy-MM-dd"));
  }, [selectedMonth, selectedYear]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa Mensual de Predicación
        </h1>
        <p className="text-muted-foreground mt-1">
          Planifica y visualiza las asignaciones para el mes. Usa la IA para generar automáticamente el programa.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Configuración y Generación</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
            <div className="flex gap-3 items-center w-full sm:w-auto">
              <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Selecciona Mes" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Selecciona Año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleOpenGenerateDialog} size="lg" className="w-full sm:w-auto mt-2 sm:mt-0" disabled={isLoadingData || isLoading}>
              {isLoadingData ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Bot className="mr-2 h-5 w-5" />} 
              {isLoadingData ? "Cargando Datos..." : "Generar Programa con IA"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Generando programa con IA...</p>
              <p className="text-sm text-muted-foreground">Esto puede tardar unos momentos.</p>
            </div>
          ) : generatedAssignments && generatedAssignments.captainAssignments ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold font-headline text-center">
                Borrador de Asignaciones para {months.find(m => m.value === selectedMonth)?.label} de {selectedYear}
              </h2>
              {monthDays.map(dayString => {
                const assignmentsForDay = generatedAssignments.captainAssignments[dayString] || [];
                const isEventDay = (generatedAssignments.captainAssignments[dayString]?.length === 0) && 
                                      Object.keys(generatedAssignments.captainAssignments).includes(dayString);


                return (
                  <Card key={dayString} className="shadow-md">
                    <CardHeader className="pb-2 bg-muted/30 rounded-t-md">
                      <CardTitle className="text-lg font-semibold">
                        {format(parse(dayString, 'yyyy-MM-dd', new Date()), "EEEE, dd 'de' MMMM", { locale: es })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {isEventDay ? (
                        <p className="text-center text-amber-600 font-medium py-3 flex items-center justify-center">
                          <AlertTriangle className="mr-2 h-5 w-5" /> Día de Asamblea o Festivo (Sin predicación programada)
                        </p>
                      ) : assignmentsForDay.length > 0 ? (
                        <ul className="space-y-3">
                          {assignmentsForDay.map(assign => (
                            <li key={assign.id} className="p-3 border rounded-md shadow-sm bg-card hover:bg-muted/10 transition-colors">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-primary">{assign.captainName}</span>
                                    <span className="text-sm text-muted-foreground">{assign.time}</span>
                                  </div>
                                  <p className="text-sm capitalize">Tipo: {assign.preachingType}</p>
                                  {assign.territoryName && <p className="text-sm">Territorio: {assign.territoryName}</p>}
                                  {assign.casaName && <p className="text-sm">Casa: {assign.casaName}</p>}
                                </div>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-2 h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                                        onClick={() => handleDeleteAssignment(assign.id, dayString)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Eliminar esta asignación del borrador</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-center text-muted-foreground py-3">No hay asignaciones para este día.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-lg border border-dashed">
              <CalendarDays className="h-20 w-20 text-muted-foreground/70 mb-6" />
              <p className="text-xl font-medium text-muted-foreground mb-2">Programa Mensual Vacío</p>
              <p className="text-sm text-muted-foreground">
                Selecciona un mes y año, luego haz clic en "Generar Programa con IA" para comenzar.
              </p>
            </div>
          )}
        </CardContent>
        {generatedAssignments && (
             <CardFooter className="border-t pt-4 flex justify-end">
                <Button onClick={handleSaveProgramToFirestore} disabled={isSavingProgram || isLoading}>
                    {isSavingProgram && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Programa en Firestore
                </Button>
            </CardFooter>
        )}
      </Card>

      {isGenerationDialogOpen && (
        <GenerateAIDialog
          isOpen={isGenerationDialogOpen}
          onOpenChange={setIsGenerationDialogOpen}
          onSubmitGeneration={handleGenerateAssignments}
          year={selectedYear}
          month={selectedMonth}
          holidays={holidays}
        />
      )}
    </div>
  );
}
