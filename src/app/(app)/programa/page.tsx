
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Bot, AlertTriangle, CheckCircle2, Save, Trash2, Edit, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateMonthlyAssignments, type GenerateMonthlyAssignmentsInput, type GenerateMonthlyAssignmentsOutput } from "@/ai/flows/generate-monthly-assignments";
import { GenerateAIDialog } from "@/components/programa/generate-ai-dialog";
import { EditAssignmentDialog } from "@/components/programa/edit-assignment-dialog";
import { AddManualAssignmentDialog } from "@/components/programa/add-manual-assignment-dialog";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth, endOfMonth, getDay, isWithinInterval, parseISO, parse } from 'date-fns';
import { Timestamp, writeBatch, collection, doc, getDoc, getDocs, query, where, orderBy, deleteField, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProgramScheduleSlot, PublisherDetail, PreachingType as TypePreachingType, SettingsDoc, Casa, Territory, PreachingGroup, DayOfWeek as TypeDayOfWeek, Campaign, Assembly, CustomHoliday, PreachingAssignedType, PreachingType } from "@/types";
import { USER_ROLES } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);
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
  const [isLoadingData, setIsLoadingData] = useState(true); // For fetching initial data for AI
  const [generatedAssignments, setGeneratedAssignments] = useState<GenerateMonthlyAssignmentsOutput | null>(null);
  const { toast } = useToast();

  // Dialog States
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<GenerateMonthlyAssignmentsOutput['captainAssignments'][string][0] | null>(null);
  const [isAddManualDialogOpen, setIsAddManualDialogOpen] = useState(false);
  const [dayToAddManualAssignment, setDayToAddManualAssignment] = useState<string | null>(null);
  
  // Data States
  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<Record<TypeDayOfWeek, boolean>>(initialGroupOrganizedDaysState);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [holidays, setHolidays] = useState<CustomHoliday[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [publishers, setPublishers] = useState<PublisherDetail[]>([]);
  const [casas, setCasas] = useState<Casa[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [preachingGroups, setPreachingGroups] = useState<PreachingGroup[]>([]);


  const fetchRequiredData = useCallback(async () => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      return false;
    }
    setIsLoadingData(true);
    try {
      const programConfigRef = doc(db, "settings", "programConfig");
      const specialEventsConfigRef = doc(db, "settings", "specialEventsConfig");
      
      const [programConfigSnap, specialEventsConfigSnap] = await Promise.all([
        getDoc(programConfigRef),
        getDoc(specialEventsConfigRef),
      ]);
      
      if (programConfigSnap.exists()) {
        const config = programConfigSnap.data() as SettingsDoc;
        setProgramScheduleSlots(config.programScheduleSlots || []);
        const organizedDaysMap: Record<TypeDayOfWeek, boolean> = { ...initialGroupOrganizedDaysState };
        (config.groupOrganizedDays || []).forEach(day => { if (day in organizedDaysMap) { organizedDaysMap[day as TypeDayOfWeek] = true; } });
        setGroupOrganizedDays(organizedDaysMap);
      } else {
        setProgramScheduleSlots([]);
        setGroupOrganizedDays(initialGroupOrganizedDaysState);
      }

      if (specialEventsConfigSnap.exists()) {
        const eventsConfig = specialEventsConfigSnap.data() as SettingsDoc;
        setCampaigns((eventsConfig.campaignsList || []).map(c => ({...c, startDate: c.startDate instanceof Timestamp ? c.startDate.toDate() : new Date(c.startDate), endDate: c.endDate instanceof Timestamp ? c.endDate.toDate() : new Date(c.endDate)})));
        setHolidays((eventsConfig.holidaysList || []).map(h => ({...h, date: h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date)})));
        setAssemblies((eventsConfig.assembliesList || []).map(a => ({...a, startDate: a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate), endDate: a.endDate instanceof Timestamp ? a.endDate.toDate() : new Date(a.endDate)})));
      }

      const collectionsToFetch = {
        users: query(
            collection(db, "users"),
            where("adminApprovalStatus", "==", "approved"),
            where("isAssignable", "==", true)
        ),
        casas: query(collection(db, "casas")),
        territories: query(collection(db, "territories"), where("isBlocked", "==", false)),
        preachingGroups: query(collection(db, "preachingGroups")),
      };

      const [usersSnap, casasSnap, territoriesSnap, groupsSnap] = await Promise.all([
        getDocs(collectionsToFetch.users),
        getDocs(collectionsToFetch.casas),
        getDocs(collectionsToFetch.territories),
        getDocs(collectionsToFetch.preachingGroups),
      ]);
      
      setPublishers(usersSnap.docs.map(d => ({ ...d.data(), id: d.id, firebaseAuthUid: d.data().firebaseAuthUid || d.id } as PublisherDetail)));
      setCasas(casasSnap.docs.map(d => ({ ...d.data(), id: d.id } as Casa)));
      setTerritories(territoriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Territory)));
      setPreachingGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PreachingGroup)));

      return true;
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      return false;
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequiredData();
  }, [fetchRequiredData]);


  const handleOpenGenerateDialog = async () => {
    if (isLoadingData) {
        toast({ title: "Cargando", description: "Espere a que los datos de configuración terminen de cargarse.", variant: "default" });
        return;
    }
    setIsGenerationDialogOpen(true);
  };

  const handleGenerateAssignments = async (dialogData: { additionalInstructions: string; holidayOverrides?: Array<{ date: string; time: string; type: PreachingType }>; designatedRuralWeekendDays: string[] }) => {
    setIsLoading(true);
    setGeneratedAssignments(null);

    const processedAvailableDays: Record<TypeDayOfWeek, {startTime: string; type: TypePreachingType}[]> = {} as Record<TypeDayOfWeek, {startTime: string; type: TypePreachingType}[]>;
    programScheduleSlots.forEach(slot => {
        if (!processedAvailableDays[slot.dayOfWeek]) {
            processedAvailableDays[slot.dayOfWeek] = [];
        }
        processedAvailableDays[slot.dayOfWeek].push({startTime: slot.startTime, type: slot.type});
    });
    
    const availableCasasForAI = casas.filter(c => !c.blockInfo || !c.blockInfo.forSystem);

    const input: GenerateMonthlyAssignmentsInput = {
      year: selectedYear,
      month: selectedMonth, 
      additionalInstructions: dialogData.additionalInstructions,
      
      availableDaysWithTimeSlots: processedAvailableDays,
      groupPreachingDays: groupOrganizedDays,

      publisherDetailedAvailabilities: publishers.map(p => ({ 
          id: p.firebaseAuthUid || p.id, 
          name: p.name,
          blockInfo: p.blockInfo 
      })),
      availableCasas: availableCasasForAI.map(c => ({ 
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
      availableTerritories: territories.map(t => ({
          id: t.id, 
          name: t.type === 'urban' && t.number ? `U-${t.number}` : t.name, 
          type: t.type, 
          number: t.number
      })),
      preachingGroups: preachingGroups.map(g => ({id: g.id, name: g.name, superintendentId: g.superintendentId})),
      
      configuredCampaigns: campaigns
        .filter(c => {
            const campaignStartDate = c.startDate instanceof Timestamp ? c.startDate.toDate() : new Date(c.startDate);
            const campaignEndDate = c.endDate instanceof Timestamp ? c.endDate.toDate() : new Date(c.endDate);
            return isWithinInterval(new Date(selectedYear, selectedMonth, 15), { start: campaignStartDate, end: campaignEndDate });
        })
        .map(c => ({
            id: c.id, name: c.name, type: c.type,
            startDate: format(c.startDate instanceof Timestamp ? c.startDate.toDate() : new Date(c.startDate), "yyyy-MM-dd"), 
            endDate: format(c.endDate instanceof Timestamp ? c.endDate.toDate() : new Date(c.endDate), "yyyy-MM-dd"),
            superintendentName: c.superintendentName || undefined,
            specialCampaignTerritoriesPerDay: c.specialCampaignTerritoriesPerDay || undefined,
            description: c.description || undefined,
        })),
      
      holidayDatesInMonth: holidays
        .filter(h => {
          const holidayDate = h.date instanceof Timestamp ? h.date.toDate() : h.date;
          return isWithinInterval(holidayDate, { start: startOfMonth(new Date(selectedYear, selectedMonth)), end: endOfMonth(new Date(selectedYear, selectedMonth)) })
        })
        .map(h => {
          const holidayDate = h.date instanceof Timestamp ? h.date.toDate() : h.date;
          return format(holidayDate, "yyyy-MM-dd");
        }),
      
      holidaySchedulingOverrides: dialogData.holidayOverrides || [],
      designatedRuralWeekendDays: dialogData.designatedRuralWeekendDays || [],

      assembliesInMonth: assemblies
        .filter(a => {
            const assemblyStartDate = a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate);
            const assemblyEndDate = a.endDate instanceof Timestamp ? a.endDate.toDate() : new Date(a.endDate);
            return isWithinInterval(new Date(selectedYear, selectedMonth, 15), { start: assemblyStartDate, end: assemblyEndDate });
        })
        .map(a => ({
            name: a.name,
            startDate: format(a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate), "yyyy-MM-dd"), 
            endDate: format(a.endDate instanceof Timestamp ? a.endDate.toDate() : new Date(a.endDate), "yyyy-MM-dd"),
            description: a.description || undefined,
        })),

      assignCasas: true, assignTerritories: true, 
      detailedTerritoryReports: territories,
      specialCampaignTerritoriesPerDay: 1,
    };

    try {
      const result = await generateMonthlyAssignments(input);
      setGeneratedAssignments(result);
      toast({ title: "Programa Generado por IA", description: "El borrador del programa mensual ha sido generado. Revísalo y guárdalo.", variant: "default", });
    } catch (error) {
      console.error("Error generating monthly assignments:", error);
      toast({ title: "Error de Generación", description: "Hubo un problema al generar el programa con la IA.", variant: "destructive", });
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
            const locationType = assign.territoryName ? 'territory' : (assign.casaName ? 'casa' : 'zoom');
            const locationId = locationType === 'territory' 
                ? territories.find(t => t.name === assign.territoryName || (t.type === 'urban' && `U-${t.number}` === assign.territoryName))?.id 
                : (locationType === 'casa' ? casas.find(c => c.ownerName === assign.casaName)?.id : undefined);


            batch.set(newAssignmentRef, {
                userId: captainUser?.id || assign.captainId,
                userName: assign.captainName,
                userEmail: captainUser?.email || null, 
                userPhoneNumber: captainUser?.phoneNumber || null,
                date: assign.date,
                time: assign.time,
                type: assign.preachingType as PreachingAssignedType, 
                locationName: assign.territoryName || assign.casaName || "Predicación por Zoom",
                locationId: locationId,
                status: 'pending', 
                assignedBy: 'Admin IA',
                assignedGroupId: captainUser?.assignedGroupId || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();
        toast({ title: "Programa Guardado", description: `${assignmentCount} asignaciones han sido guardadas en Firestore.`, variant: "default" });
        setGeneratedAssignments(null); 
    } catch (error) {
      console.error("Error saving program to Firestore:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar el programa en Firestore.", variant: "destructive", });
    } finally {
      setIsSavingProgram(false);
    }
  };

  const handleDeleteAssignment = (assignmentId: string, dayKey: string) => {
    setGeneratedAssignments(prev => {
        if (!prev || !prev.captainAssignments) return prev;
        const updatedDayAssignments = (prev.captainAssignments[dayKey] || []).filter(a => a.id !== assignmentId);
        const newCaptainAssignments = { ...prev.captainAssignments, [dayKey]: updatedDayAssignments };
        return { ...prev, captainAssignments: newCaptainAssignments };
    });
    toast({ title: "Asignación eliminada del borrador", description: "La asignación ha sido quitada y no se guardará." });
  };

  const handleOpenEditDialog = (assignment: GenerateMonthlyAssignmentsOutput['captainAssignments'][string][0]) => {
    setAssignmentToEdit(assignment);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateAssignment = (updatedAssignment: GenerateMonthlyAssignmentsOutput['captainAssignments'][string][0]) => {
    setGeneratedAssignments(prev => {
      if (!prev || !prev.captainAssignments) return prev;
      const dayKey = updatedAssignment.date;
      const dayAssignments = prev.captainAssignments[dayKey] || [];
      const updatedDayAssignments = dayAssignments.map(a => a.id === updatedAssignment.id ? updatedAssignment : a);
      const newCaptainAssignments = { ...prev.captainAssignments, [dayKey]: updatedDayAssignments };
      return { ...prev, captainAssignments: newCaptainAssignments };
    });
    toast({ title: "Asignación actualizada en el borrador", description: `Se ha cambiado el capitán para el ${updatedAssignment.date}.` });
  };

  const handleOpenAddManualDialog = (dayString: string) => {
    setDayToAddManualAssignment(dayString);
    setIsAddManualDialogOpen(true);
  };
  
  const handleAddManualAssignment = (newAssignment: GenerateMonthlyAssignmentsOutput['captainAssignments'][string][0]) => {
    setGeneratedAssignments(prev => {
      if (!prev) return null; // Should not happen if button is visible
      const dayKey = newAssignment.date;
      const dayAssignments = prev.captainAssignments[dayKey] || [];
      const updatedDayAssignments = [...dayAssignments, newAssignment].sort((a,b) => a.time.localeCompare(b.time));

      const newCaptainAssignments = {
        ...prev.captainAssignments,
        [dayKey]: updatedDayAssignments,
      };
      return { ...prev, captainAssignments: newCaptainAssignments };
    });
    toast({ title: "Asignación Añadida", description: `Se añadió una nueva asignación para el ${newAssignment.date}.`, });
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
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Selecciona Mes" /></SelectTrigger>
                <SelectContent>{months.map(month => (<SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="Selecciona Año" /></SelectTrigger>
                <SelectContent>{years.map(year => (<SelectItem key={year} value={String(year)}>{year}</SelectItem>))}</SelectContent>
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
                const isEventDay = (generatedAssignments.captainAssignments[dayString]?.length === 0) && Object.keys(generatedAssignments.captainAssignments).includes(dayString);

                return (
                  <Card key={dayString} className="shadow-md">
                    <CardHeader className="pb-2 bg-muted/30 rounded-t-md">
                      <CardTitle className="text-lg font-semibold">
                        {format(parse(dayString, 'yyyy-MM-dd', new Date()), "EEEE, dd 'de' MMMM", { locale: es })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
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
                                  <div className="flex items-center shrink-0 ml-2">
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-500/10" onClick={() => handleOpenEditDialog(assign)}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Editar esta asignación</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAssignment(assign.id, dayString)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Eliminar esta asignación del borrador</p></TooltipContent></Tooltip>
                                  </div>
                                </TooltipProvider>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-center text-muted-foreground py-3">No hay asignaciones para este día.</p>
                      )}
                      <Button variant="outline" size="sm" className="w-full mt-4 text-xs" onClick={() => handleOpenAddManualDialog(dayString)}>
                        <PlusCircle className="mr-1.5 h-4 w-4"/> Añadir Asignación Manual
                      </Button>
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
          programScheduleSlots={programScheduleSlots}
        />
      )}

      {isEditDialogOpen && (
        <EditAssignmentDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdateAssignment={handleUpdateAssignment}
          assignmentToEdit={assignmentToEdit}
          availablePublishers={publishers}
        />
      )}

      {isAddManualDialogOpen && dayToAddManualAssignment && (
        <AddManualAssignmentDialog
          isOpen={isAddManualDialogOpen}
          onOpenChange={setIsAddManualDialogOpen}
          onAddAssignment={handleAddManualAssignment}
          day={dayToAddManualAssignment}
          availablePublishers={publishers}
          availableCasas={casas}
          availableTerritories={territories}
        />
      )}
    </div>
  );
}
