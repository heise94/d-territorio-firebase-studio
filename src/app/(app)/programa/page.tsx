
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Bot, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateMonthlyAssignments, type GenerateMonthlyAssignmentsInput, type GenerateMonthlyAssignmentsOutput } from "@/ai/flows/generate-monthly-assignments";
import { GenerateAIDialog } from "@/components/programa/generate-ai-dialog";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth } from 'date-fns';
import { Timestamp } from "firebase/firestore"; // For placeholder data

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(currentYear, i), "MMMM", { locale: es }),
}));

export default function ProgramaMensualPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedAssignments, setGeneratedAssignments] = useState<GenerateMonthlyAssignmentsOutput | null>(null);
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleOpenGenerateDialog = () => {
    setIsGenerationDialogOpen(true);
  };

  const handleGenerateAssignments = async (dialogData: { numberOfCaptains: number; additionalInstructions: string; }) => {
    setIsLoading(true);
    setGeneratedAssignments(null);

    const input: GenerateMonthlyAssignmentsInput = {
      year: selectedYear,
      month: selectedMonth, // 0-indexed month
      numberOfCaptains: dialogData.numberOfCaptains,
      additionalInstructions: dialogData.additionalInstructions,
      // --- Start of placeholder/simulated data for complex inputs ---
      availableDaysWithTimeSlots: { // Example, replace with actual data from settings
        monday: [{ startTime: "09:00", type: "publica" }, { startTime: "15:00", type: "zoom" }],
        tuesday: [{ startTime: "10:00", type: "rural" }],
        wednesday: [{ startTime: "09:30", type: "publica" }, { startTime: "16:00", type: "publica" }],
        thursday: [{ startTime: "14:00", type: "zoom" }],
        friday: [{ startTime: "10:00", type: "publica" }, { startTime: "17:00", type: "rural" }],
        saturday: [{ startTime: "10:00", type: "publica" }, { startTime: "11:00", type: "rural" }],
        sunday: [{ startTime: "15:00", type: "zoom" }],
      },
      assignCasas: true,
      availableCasas: [], // Firestore data
      assignTerritories: true,
      availableTerritories: [], // Firestore data
      detailedTerritoryReports: [], // Firestore data
      designatedRuralSundays: [], // Example: ["2024-08-04", "2024-08-18"] -> from settings or logic
      predeterminedRuralSundayAssignments: [], // Firestore data for overrides
      groupPreachingDays: { monday: false, tuesday: false, wednesday: true, thursday: false, friday: false, saturday: false, sunday: false }, // from settings
      configuredCampaigns: [], // from settings
      specialCampaignTerritoriesPerDay: 1, // from settings
      holidayDatesInMonth: [], // from settings/logic based on selectedMonth/Year
      assembliesInMonth: [], // from settings/logic
      publisherDetailedAvailabilities: [], // Firestore data
      lastRuralWeekendLeadingGroupId: undefined, // from settings
      preachingGroups: [], // from Firestore
      // --- End of placeholder/simulated data ---
    };

    try {
      const result = await generateMonthlyAssignments(input);
      setGeneratedAssignments(result);
      toast({
        title: "Programa Generado",
        description: "El programa mensual ha sido generado por la IA.",
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
                Asignaciones para {months.find(m => m.value === selectedMonth)?.label} de {selectedYear}
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
                                <span className="font-medium text-primary">{assign.captain}</span>
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
                <Button variant="outline" className="mr-2">Guardar Borrador</Button>
                <Button>Publicar Programa</Button>
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
        />
      )}
    </div>
  );
}

