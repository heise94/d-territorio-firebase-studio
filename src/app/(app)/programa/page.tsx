
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Bot, AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateMonthlyAssignments, type GenerateMonthlyAssignmentsInput, type GenerateMonthlyAssignmentsOutput } from "@/ai/flows/generate-monthly-assignments";
import { GenerateAIDialog } from "@/components/programa/generate-ai-dialog";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth } from 'date-fns';
import { Timestamp, writeBatch, collection, doc } from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import type { ProgramScheduleSlot, PublisherDetail, PreachingAssignedType } from "@/types";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(currentYear, i), "MMMM", { locale: es }),
}));

// MOCK data for program schedule slots - replace with actual data fetching from settings later
const MOCK_PROGRAM_SCHEDULE_SLOTS_FOR_DIALOG: ProgramScheduleSlot[] = [
  { id: 'mon-0900-gen', dayOfWeek: 'monday', startTime: '09:00', type: 'general', status: 'fixed' },
  { id: 'tue-1000-rur', dayOfWeek: 'tuesday', startTime: '10:00', type: 'rural', status: 'fixed' },
  { id: 'wed-0930-gen', dayOfWeek: 'wednesday', startTime: '09:30', type: 'general', status: 'fixed' },
  { id: 'sat-1000-gen', dayOfWeek: 'saturday', startTime: '10:00', type: 'general', status: 'fixed' },
  { id: 'sat-1100-rur', dayOfWeek: 'saturday', startTime: '11:00', type: 'rural', status: 'fixed' },
  { id: 'sun-1500-zoom', dayOfWeek: 'sunday', startTime: '15:00', type: 'zoom', status: 'fixed' },
  { id: 'sun-1000-rur', dayOfWeek: 'sunday', startTime: '10:00', type: 'rural', status: 'fixed' },
];

// MOCK data for publishers - replace with actual data fetching later
const MOCK_PUBLISHERS_FOR_PROGRAM_GENERATION: PublisherDetail[] = [
    { id: "uidUser1", name: "Ana Pérez", email: "ana@example.com", availability: { availableSlotIds: ["mon-0900-gen", "wed-0930-gen"] } },
    { id: "uidUser2", name: "Luis Gómez", email: "luis@example.com", availability: { availableSlotIds: ["mon-1500-zoom", "thu-1400-zoom"] } },
    { id: "uidUser3", name: "Sofía Castro", email: "sofia@example.com", availability: { availableSlotIds: ["tue-1000-rur", "fri-1000-gen"] } },
    { id: "uidUser4", name: "Carlos Díaz", email: "carlos@example.com", availability: { availableSlotIds: ["sat-1000-gen", "sun-1500-zoom"] } },
    { id: "uidUser5", name: "Elena Jara (SG)", email: "elena.jara.sg@example.com", availability: { availableSlotIds: ["mon-0900-gen", "fri-1700-rur"] } },
];


export default function ProgramaMensualPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProgram, setIsSavingProgram] = useState(false);
  const [generatedAssignments, setGeneratedAssignments] = useState<GenerateMonthlyAssignmentsOutput | null>(null);
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleOpenGenerateDialog = () => {
    setIsGenerationDialogOpen(true);
  };

  const handleGenerateAssignments = async (dialogData: { additionalInstructions: string; designatedRuralWeekendDays: string[] }) => {
    setIsLoading(true);
    setGeneratedAssignments(null);

    const input: GenerateMonthlyAssignmentsInput = {
      year: selectedYear,
      month: selectedMonth, 
      additionalInstructions: dialogData.additionalInstructions,
      designatedRuralSundays: dialogData.designatedRuralWeekendDays,
      publisherDetailedAvailabilities: MOCK_PUBLISHERS_FOR_PROGRAM_GENERATION.map(p => ({ id: p.id, name: p.name })), // Pass only id and name as per schema
      availableDaysWithTimeSlots: { 
        monday: [{ startTime: "09:00", type: "publica" }],
        saturday: [{ startTime: "10:00", type: "publica" }, { startTime: "11:00", type: "rural" }],
        sunday: [{ startTime: "10:00", type: "rural" }, { startTime: "15:00", type: "zoom" }],
      },
      assignCasas: true,
      availableCasas: [], 
      assignTerritories: true,
      availableTerritories: [], 
      detailedTerritoryReports: [], 
      predeterminedRuralSundayAssignments: [], 
      groupPreachingDays: { wednesday: true }, 
      configuredCampaigns: [], 
      specialCampaignTerritoriesPerDay: 1, 
      holidayDatesInMonth: [], 
      assembliesInMonth: [], 
      lastRuralWeekendLeadingGroupId: undefined, 
      preachingGroups: [], 
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
            const newAssignmentRef = doc(assignmentsCollectionRef); // Auto-generate ID
            assignmentCount++;
            batch.set(newAssignmentRef, {
                userId: assign.captainId,
                userName: assign.captainName,
                date: assign.date,
                time: assign.time,
                type: assign.preachingType as PreachingAssignedType, // Cast, as schema is string but we use specific types
                locationName: assign.territoryName || assign.casaName || "Lugar no especificado",
                status: 'pending', // Default status
                assignedBy: 'Admin IA',
                assignedGroupId: assign.assignedGroupId || null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                // locationId could be derived if territory/casa IDs were part of the flow's output
            });
        });

        await batch.commit();
        toast({
            title: "Programa Guardado",
            description: `${assignmentCount} asignaciones han sido guardadas en Firestore.`,
            variant: "default",
        });
        setGeneratedAssignments(null); // Clear after saving
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
            <Button onClick={handleOpenGenerateDialog} size="lg" className="w-full sm:w-auto mt-2 sm:mt-0">
              <Bot className="mr-2 h-5 w-5" /> Generar Programa con IA
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
                const isAssemblyDay = (generatedAssignments.captainAssignments[dayString]?.length === 0) && 
                                      Object.keys(generatedAssignments.captainAssignments).includes(dayString);


                return (
                  <Card key={dayString} className="shadow-md">
                    <CardHeader className="pb-2 bg-muted/30 rounded-t-md">
                      <CardTitle className="text-lg font-semibold">
                        {format(new Date(dayString + 'T00:00:00'), "EEEE, dd 'de' MMMM", { locale: es })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {isAssemblyDay ? (
                        <p className="text-center text-amber-600 font-medium py-3 flex items-center justify-center">
                          <AlertTriangle className="mr-2 h-5 w-5" /> Día de Asamblea (Sin predicación programada)
                        </p>
                      ) : assignmentsForDay.length > 0 ? (
                        <ul className="space-y-3">
                          {assignmentsForDay.map(assign => (
                            <li key={assign.id} className="p-3 border rounded-md shadow-sm bg-card hover:bg-muted/10 transition-colors">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-primary">{assign.captainName} ({assign.captainId})</span>
                                <span className="text-sm text-muted-foreground">{assign.time}</span>
                              </div>
                              <p className="text-sm capitalize">Tipo: {assign.preachingType}</p>
                              {assign.territoryName && <p className="text-sm">Territorio: {assign.territoryName}</p>}
                              {assign.casaName && <p className="text-sm">Casa: {assign.casaName}</p>}
                              {assign.assignedGroupId && <p className="text-xs text-muted-foreground">Grupo ID: {assign.assignedGroupId}</p>}
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
                {/* <Button variant="outline" className="mr-2" disabled={isSavingProgram}>Guardar Borrador</Button> */}
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
          programScheduleSlots={MOCK_PROGRAM_SCHEDULE_SLOTS_FOR_DIALOG} 
        />
      )}
    </div>
  );
}

    
