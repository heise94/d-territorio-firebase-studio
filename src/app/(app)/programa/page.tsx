
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Edit, Trash2, Users, MountainSnow, Video, Bot, Save, XCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth, endOfMonth, getDay, isSameDay, parseISO, parse } from 'date-fns';
import { collection, doc, onSnapshot, query, where, deleteDoc, getDocs, writeBatch, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, PreachingAssignedType, PublisherDetail, Casa, Territory, Campaign, Assembly, CustomHoliday, ProgramScheduleSlot, SettingsDoc, GenerateMonthlyAssignmentsOutput } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { generateMonthlyAssignments } from "@/ai/flows/generate-monthly-assignments";
import { GenerateAIDialog } from "@/components/programa/generate-ai-dialog";
import { EditAssignmentDialog } from "@/components/programa/edit-assignment-dialog";
import { AddManualAssignmentDialog } from "@/components/programa/add-manual-assignment-dialog";

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
  
  // Data states
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allPublishers, setAllPublishers] = useState<PublisherDetail[]>([]);
  const [allCasas, setAllCasas] = useState<Casa[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [allAssemblies, setAllAssemblies] = useState<Assembly[]>([]);
  const [allHolidays, setAllHolidays] = useState<CustomHoliday[]>([]);
  const [programSlots, setProgramSlots] = useState<ProgramScheduleSlot[]>([]);
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<any>({});

  // Dialog and draft states
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddManualDialogOpen, setIsAddManualDialogOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<DraftAssignmentItem | null>(null);
  const [dayForManualAdd, setDayForManualAdd] = useState<string | null>(null);
  const [assignmentIdToDelete, setAssignmentIdToDelete] = useState<string | null>(null);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, DraftAssignmentItem[]>>({});


  useEffect(() => {
    setIsLoading(true);
    const startDate = format(startOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');

    const assignmentsQuery = query(collection(db, "assignments"), where("date", ">=", startDate), where("date", "<=", endDate));
    const unsubAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      setAssignments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment)));
    });

    const publishersQuery = query(collection(db, "users"));
    const unsubPublishers = onSnapshot(publishersQuery, (snap) => setAllPublishers(snap.docs.map(d => ({id: d.id, ...d.data()} as PublisherDetail))));
    
    const casasQuery = query(collection(db, "casas"));
    const unsubCasas = onSnapshot(casasQuery, (snap) => setAllCasas(snap.docs.map(d => ({id: d.id, ...d.data()} as Casa))));

    const territoriesQuery = query(collection(db, "territories"));
    const unsubTerritories = onSnapshot(territoriesQuery, (snap) => setAllTerritories(snap.docs.map(d => ({id: d.id, ...d.data()} as Territory))));
    
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
      unsubAssignments(); unsubPublishers(); unsubCasas(); unsubTerritories();
      unsubSettings(); unsubEvents(); clearTimeout(timer);
    };
  }, [selectedMonth, selectedYear]);

  const handleGenerateAssignments = async (options: { 
    additionalInstructions: string; 
    holidayOverrides?: Array<{date: string, time: string, type: PreachingType}>;
    designatedRuralWeekendDays: string[];
    assignLocations: boolean;
    assignCaptains: boolean;
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
        ...t,
        createdAt: format(t.createdAt.toDate(), 'yyyy-MM-dd'),
        updatedAt: format(t.updatedAt.toDate(), 'yyyy-MM-dd'),
    }));
    
    const inputForAI = {
      year: selectedYear,
      month: selectedMonth,
      availableDaysWithTimeSlots,
      assignCaptains: options.assignCaptains,
      assignCasas: options.assignLocations,
      assignTerritories: options.assignLocations,
      availableCasas: allCasas.map(c => ({...c, unavailabilityPeriods: (c.unavailabilityPeriods || []).map(p => ({...p, startDate: format((p.startDate as Timestamp).toDate(), 'yyyy-MM-dd'), endDate: format((p.endDate as Timestamp).toDate(), 'yyyy-MM-dd')})) })),
      availableTerritories: serializableTerritories,
      groupPreachingDays,
      configuredCampaigns: allCampaigns.map(c => ({...c, startDate: format(c.startDate as Date, 'yyyy-MM-dd'), endDate: format(c.endDate as Date, 'yyyy-MM-dd')})),
      specialCampaignTerritoriesPerDay: 2, 
      holidayDatesInMonth: allHolidays.map(h => format(h.date as Date, 'yyyy-MM-dd')),
      holidaySchedulingOverrides: options.holidayOverrides,
      designatedRuralWeekendDays: options.designatedRuralWeekendDays,
      publisherDetailedAvailabilities: allPublishers.map(p => ({...p, unavailabilityPeriods: (p.availability?.unavailabilityPeriods || []).map(up => ({...up, startDate: format((up.startDate as Timestamp).toDate(), 'yyyy-MM-dd'), endDate: format((up.endDate as Timestamp).toDate(), 'yyyy-MM-dd')}))})),
      additionalInstructions: options.additionalInstructions,
      preachingGroups: allGroups,
    };

    try {
        const result = await generateMonthlyAssignments(inputForAI as any); // Cast as any to bypass TS type complexity on client
        if (result && result.schedule) {
            const newDraft: Record<string, DraftAssignmentItem[]> = {};
            result.schedule.forEach(daySchedule => {
                newDraft[daySchedule.date] = daySchedule.assignments;
            });
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
        const docRef = doc(db, "assignments", assign.id);
        const assignData: Partial<Assignment> = {
            id: assign.id,
            date: assign.date,
            time: assign.time,
            preachingType: assign.preachingType as PreachingAssignedType,
            status: 'pending',
            captainId: assign.captainId,
            userName: assign.captainName,
            userEmail: allPublishers.find(p => p.id === assign.captainId)?.email,
            locationName: assign.territoryName || assign.casaName || 'Zoom',
            locationId: allTerritories.find(t => t.name === assign.territoryName)?.id || allCasas.find(c => c.ownerName === assign.casaName)?.id,
            assignedBy: 'Sistema IA',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
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
  
  const handleUpdateDraftAssignment = (updatedAssignment: DraftAssignmentItem) => {
    setDraftAssignments(prev => {
        const newDraft = { ...prev };
        const dayAssignments = newDraft[updatedAssignment.date];
        if (dayAssignments) {
            const index = dayAssignments.findIndex(a => a.id === updatedAssignment.id);
            if (index > -1) {
                dayAssignments[index] = updatedAssignment;
            }
        }
        return newDraft;
    });
  };

  const handleAddManualAssignmentToDraft = (newAssignment: DraftAssignmentItem) => {
    setDraftAssignments(prev => {
        const newDraft = { ...prev };
        const dayAssignments = newDraft[newAssignment.date] || [];
        newDraft[newAssignment.date] = [...dayAssignments, newAssignment].sort((a,b) => a.time.localeCompare(b.time));
        return newDraft;
    });
  };
  
  const handleDeleteDraftAssignment = (date: string, id: string) => {
    setDraftAssignments(prev => {
        const newDraft = { ...prev };
        if (newDraft[date]) {
            newDraft[date] = newDraft[date].filter(a => a.id !== id);
        }
        return newDraft;
    });
  };

  const handleDeleteExistingAssignment = async () => {
    if (!assignmentIdToDelete) return;
    const assignmentRef = doc(db, "assignments", assignmentIdToDelete);
    try {
        await deleteDoc(assignmentRef);
        toast({ title: "Asignación Eliminada", variant: "default" });
        setAssignmentIdToDelete(null);
    } catch (error) {
        toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };
  
  const hasDraft = Object.keys(draftAssignments).length > 0;

  const firstDayOfMonth = startOfMonth(new Date(selectedYear, selectedMonth));
  const daysInMonth = getDaysInMonth(firstDayOfMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth); 
  const dayOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1; 
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => new Date(selectedYear, selectedMonth, i + 1));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa Mensual de Predicación
        </h1>
        <p className="text-muted-foreground mt-1">
           Visualiza el programa guardado. Usa el generador con IA para crear un borrador de programa mensual.
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
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {hasDraft && (
                  <Button onClick={handleDiscardDraft} variant="destructive" size="lg" className="w-full sm:w-auto">
                      <XCircle className="mr-2 h-5 w-5"/> Descartar Borrador
                  </Button>
              )}
               <Button onClick={() => setIsGenerateDialogOpen(true)} size="lg" className="w-full sm:w-auto">
                  <Bot className="mr-2 h-5 w-5" /> Generar Programa con IA
               </Button>
            </div>
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
                          const assignmentsForDay = hasDraft ? (draftAssignments[dayString] || []) : assignments.filter(a => a.date === dayString);
                          const isToday = isSameDay(day, new Date());
                          
                          return (
                              <Card key={dayString} className={`min-h-[120px] flex flex-col rounded-md shadow-sm ${isToday ? 'border-2 border-primary bg-primary/5' : 'border bg-card'} ${hasDraft ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                              <CardHeader className="p-2 pb-1 flex flex-row justify-between items-start">
                                  <CardTitle className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                  {format(day, "d")}
                                  </CardTitle>
                              </CardHeader>
                              <CardContent className="p-1.5 space-y-1.5 overflow-y-auto flex-grow">
                                  {assignmentsForDay.length > 0 ? (
                                  assignmentsForDay.map(assign => (
                                      <div key={assign.id} className="p-1.5 rounded-md bg-muted/50 text-xs shadow-sm group relative">
                                        <div className="flex items-center font-semibold text-primary">
                                            <PreachingTypeIcon type={assign.preachingType as PreachingAssignedType} />
                                            <span>{assign.time}</span>
                                        </div>
                                        <p className="truncate text-foreground/90" title={assign.userName || assign.captainName || 'Usuario no disponible'}>{assign.userName || assign.captainName}</p>
                                        <p className="truncate text-muted-foreground text-[0.7rem]" title={assign.locationName || assign.territoryName || assign.casaName}>{assign.locationName || assign.territoryName || assign.casaName}</p>
                                        <div className="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-background/80 backdrop-blur-sm rounded-bl-md rounded-tr-md p-0.5">
                                            {hasDraft && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setAssignmentToEdit(assign); setIsEditDialogOpen(true);}}><Edit className="h-3 w-3 text-blue-600" /></Button>}
                                            <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5"><Trash2 className="h-3 w-3 text-destructive" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se eliminará la asignación de {assign.userName || assign.captainName}.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => hasDraft ? handleDeleteDraftAssignment(assign.date, assign.id!) : setAssignmentIdToDelete(assign.id!)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                      </div>
                                  ))
                                  ) : (
                                      <div className="h-full"></div>
                                  )}
                                  {hasDraft && <Button variant="ghost" size="sm" className="w-full text-xs h-6 mt-1" onClick={() => { setDayForManualAdd(dayString); setIsAddManualDialogOpen(true); }}>+ Añadir manual</Button>}
                              </CardContent>
                              </Card>
                          );
                      })}
                  </div>
              </div>
          )}
        </CardContent>
        {hasDraft && (
            <CardFooter className="border-t pt-4">
                 <Button onClick={handleSaveDraft} size="lg" disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5"/>}
                     Guardar Programa
                </Button>
            </CardFooter>
        )}
      </Card>

      <GenerateAIDialog
        isOpen={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onSubmitGeneration={handleGenerateAssignments}
        year={selectedYear}
        month={selectedMonth}
        holidays={allHolidays}
        programScheduleSlots={programSlots}
      />
      
      {isEditDialogOpen && (
          <EditAssignmentDialog
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onUpdateAssignment={handleUpdateDraftAssignment}
            assignmentToEdit={assignmentToEdit}
            availablePublishers={allPublishers}
          />
      )}

      {isAddManualDialogOpen && (
          <AddManualAssignmentDialog
            isOpen={isAddManualDialogOpen}
            onOpenChange={setIsAddManualDialogOpen}
            onAddAssignment={handleAddManualAssignmentToDraft}
            day={dayForManualAdd}
            availablePublishers={allPublishers}
            availableCasas={allCasas}
            availableTerritories={allTerritories}
          />
      )}
      
      {assignmentIdToDelete && !hasDraft && (
        <AlertDialog open={!!assignmentIdToDelete} onOpenChange={(isOpen) => !isOpen && setAssignmentIdToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setAssignmentIdToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteExistingAssignment} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
```
,
  <change>
    <file>/src/components/programa/generate-ai-dialog.tsx</file>
    <content><![CDATA[
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription as FormFieldDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bot, CalendarDays, AlertTriangle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, getDaysInMonth, getDay, startOfMonth, addDays, isSameMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { CustomHoliday, PreachingType, ProgramScheduleSlot } from "@/types";
import { Timestamp } from "firebase/firestore";

const holidayOverrideSchema = z.object({
  date: z.string(),
  name: z.string(),
  enabled: z.boolean().default(false),
  hour: z.string().optional(),
  minute: z.string().optional(),
  type: z.enum(['general', 'rural', 'zoom']).optional(),
}).refine(data => {
    if (!data.enabled) return true;
    return !!data.hour && !!data.minute && !!data.type;
}, {
    message: "Si se habilita, la hora, minuto y tipo son obligatorios.",
    path: ["hour"],
});


const generateAIDialogSchema = z.object({
  assignLocations: z.boolean().default(true),
  assignCaptains: z.boolean().default(true),
  additionalInstructions: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
  holidayOverrides: z.array(holidayOverrideSchema).optional(),
  designatedRuralWeekendDays: z.array(z.string()).optional().default([]),
});

type GenerateAIDialogValues = z.infer<typeof generateAIDialogSchema>;

interface GenerateAIDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitGeneration: (data: { 
    additionalInstructions: string; 
    holidayOverrides?: Array<{date: string, time: string, type: PreachingType}>; 
    designatedRuralWeekendDays: string[];
    assignLocations: boolean;
    assignCaptains: boolean;
  }) => Promise<void>;
  year: number;
  month: number; // 0-indexed
  holidays: CustomHoliday[];
  programScheduleSlots: ProgramScheduleSlot[];
}

export function GenerateAIDialog({ isOpen, onOpenChange, onSubmitGeneration, year, month, holidays, programScheduleSlots }: GenerateAIDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GenerateAIDialogValues>({
    resolver: zodResolver(generateAIDialogSchema),
    defaultValues: {
      assignLocations: true,
      assignCaptains: true,
      additionalInstructions: "",
      holidayOverrides: [],
      designatedRuralWeekendDays: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "holidayOverrides",
  });

  const holidaysForMonth = useMemo(() => {
    return holidays
      .filter(h => {
        const holidayDate = h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date);
        return isSameMonth(holidayDate, new Date(year, month));
      })
      .sort((a,b) => (a.date as Date).getTime() - (b.date as Date).getTime());
  }, [holidays, year, month]);

  const weekendDaysForSelection = useMemo(() => {
    const days: { date: Date; dayName: string; type: 'saturday' | 'sunday' }[] = [];
    const firstDayOfMonth = startOfMonth(new Date(year, month));
    const numDaysInMonth = getDaysInMonth(firstDayOfMonth);

    const hasSaturdayRuralSlot = programScheduleSlots.some(slot => slot.dayOfWeek === 'saturday' && slot.type === 'rural');
    const hasSundayRuralSlot = programScheduleSlots.some(slot => slot.dayOfWeek === 'sunday' && slot.type === 'rural');

    for (let i = 0; i < numDaysInMonth; i++) {
      const currentDate = addDays(firstDayOfMonth, i);
      const dayOfWeek = getDay(currentDate);

      if (dayOfWeek === 6 && hasSaturdayRuralSlot) {
        days.push({ date: currentDate, dayName: format(currentDate, "EEEE, d 'de' MMMM", { locale: es }), type: 'saturday' });
      } else if (dayOfWeek === 0 && hasSundayRuralSlot) {
        days.push({ date: currentDate, dayName: format(currentDate, "EEEE, d 'de' MMMM", { locale: es }), type: 'sunday' });
      }
    }
    return days;
  }, [year, month, programScheduleSlots]);

  useEffect(() => {
    if (isOpen) {
        const overrides = holidaysForMonth.map(h => ({
            date: format(h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date), "yyyy-MM-dd"),
            name: h.name,
            enabled: false,
            hour: '10',
            minute: '00',
            type: 'general' as PreachingType,
        }));
        replace(overrides);
        form.reset({
            assignLocations: true,
            assignCaptains: true,
            additionalInstructions: "",
            holidayOverrides: overrides,
            designatedRuralWeekendDays: [],
        });
    } else {
        form.reset({ assignLocations: true, assignCaptains: true, additionalInstructions: "", holidayOverrides: [], designatedRuralWeekendDays: [] });
    }
  }, [isOpen, holidaysForMonth, form, replace]);


  async function handleSubmit(values: GenerateAIDialogValues) {
    setIsSubmitting(true);
    try {
      const activeHolidayOverrides = (values.holidayOverrides || [])
        .filter(override => override.enabled && override.hour && override.minute && override.type)
        .map(override => ({
            date: override.date,
            time: `${override.hour!}:${override.minute!}`,
            type: override.type!,
        }));

      await onSubmitGeneration({
        additionalInstructions: values.additionalInstructions || "",
        holidayOverrides: activeHolidayOverrides,
        designatedRuralWeekendDays: values.designatedRuralWeekendDays || [],
        assignLocations: values.assignLocations,
        assignCaptains: values.assignCaptains,
      });
    } catch (error) {
      console.error("Error in dialog submission:", error);
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
       setIsSubmitting(false);
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && !isSubmitting) {
      form.reset({ assignLocations: true, assignCaptains: true, additionalInstructions: "", holidayOverrides: [], designatedRuralWeekendDays: [] });
    }
    onOpenChange(open);
  };
  
  const monthName = format(new Date(year, month), "MMMM", { locale: es });

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bot className="mr-2 h-6 w-6 text-primary" />
            Generar Programa Automático para {monthName} {year}
          </DialogTitle>
          <DialogDescription>
             Define instrucciones y habilita la predicación en días festivos y fines de semana rurales especiales.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-2 pr-1">
             <div className="space-y-3">
              <FormLabel className="text-base font-semibold flex items-center">
                 <Bot className="mr-2 h-5 w-5 text-primary" />
                Opciones de Generación
              </FormLabel>
              <div className="space-y-2 rounded-md border p-3 shadow-sm bg-muted/30">
                <FormField
                    control={form.control}
                    name="assignLocations"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 rounded-md">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div className="space-y-0.5 leading-none">
                                <FormLabel className="cursor-pointer">Asignar Territorios y Casas</FormLabel>
                                <FormFieldDescription className="text-xs">Si se desmarca, la IA solo creará los horarios sin asignar un lugar específico.</FormFieldDescription>
                            </div>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="assignCaptains"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 rounded-md">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div className="space-y-0.5 leading-none">
                                <FormLabel className="cursor-pointer">Asignar Capitanes</FormLabel>
                                <FormFieldDescription className="text-xs">Si se desmarca, la IA creará los horarios sin asignar un publicador encargado.</FormFieldDescription>
                            </div>
                        </FormItem>
                    )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <FormLabel className="text-base font-semibold flex items-center">
                <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                Configuración Especial de Días
              </FormLabel>
              <div className="max-h-52 overflow-y-auto space-y-2 rounded-md border p-3 shadow-sm bg-muted/30">
                {holidaysForMonth.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground px-1 pb-1">Días Festivos:</p>
                    {fields.map((field, index) => {
                      const isEnabled = form.watch(`holidayOverrides.${index}.enabled`);
                      return (
                        <div key={field.id} className="p-3 border bg-card rounded-md space-y-2">
                          <FormField
                            control={form.control}
                            name={`holidayOverrides.${index}.enabled`}
                            render={({ field: checkboxField }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl><Checkbox checked={checkboxField.value} onCheckedChange={checkboxField.onChange} /></FormControl>
                                <div className="space-y-0.5 leading-none">
                                  <FormLabel className="cursor-pointer">{form.getValues(`holidayOverrides.${index}.name`)} ({format(parseISO(form.getValues(`holidayOverrides.${index}.date`)), "EEEE d", {locale: es})})</FormLabel>
                                  <FormFieldDescription className="text-xs">Marcar para programar predicación en este día.</FormFieldDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          {isEnabled && (
                            <div className="grid grid-cols-3 gap-3 pl-8 pt-2">
                               <FormField
                                control={form.control}
                                name={`holidayOverrides.${index}.hour`}
                                render={({ field: hourField }) => (<FormItem><FormLabel className="text-xs">Hora</FormLabel>
                                  <Select onValueChange={hourField.onChange} value={hourField.value}>
                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="HH" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {Array.from({ length: 16 }, (_, i) => (i + 7).toString().padStart(2, '0')).map(hour => (<SelectItem key={hour} value={hour}>{hour}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                <FormMessage /></FormItem>)}
                              />
                               <FormField
                                control={form.control}
                                name={`holidayOverrides.${index}.minute`}
                                render={({ field: minuteField }) => (<FormItem><FormLabel className="text-xs">Minuto</FormLabel>
                                  <Select onValueChange={minuteField.onChange} value={minuteField.value}>
                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="MM" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {['00', '15', '30', '45'].map(minute => (<SelectItem key={minute} value={minute}>{minute}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                <FormMessage /></FormItem>)}
                              />
                              <FormField
                                control={form.control}
                                name={`holidayOverrides.${index}.type`}
                                render={({ field: typeField }) => (
                                  <FormItem><FormLabel className="text-xs">Tipo</FormLabel>
                                  <Select onValueChange={typeField.onChange} value={typeField.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="rural">Rural</SelectItem><SelectItem value="zoom">Zoom</SelectItem></SelectContent></Select>
                                  <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {weekendDaysForSelection.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground px-1 pt-2 pb-1">Fines de Semana Rurales:</p>
                    {weekendDaysForSelection.map((day) => (
                      <FormField
                        key={day.date.toISOString()}
                        control={form.control}
                        name="designatedRuralWeekendDays"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2.5 rounded-md hover:bg-muted/50 transition-colors bg-card">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(format(day.date, "yyyy-MM-dd"))}
                                onCheckedChange={(checked) => {
                                  const dateString = format(day.date, "yyyy-MM-dd");
                                  return checked
                                    ? field.onChange([...(field.value || []), dateString])
                                    : field.onChange((field.value || []).filter((value) => value !== dateString));
                                }}
                                id={`rural-day-${day.date.toISOString()}`}
                              />
                            </FormControl>
                            <FormLabel htmlFor={`rural-day-${day.date.toISOString()}`} className="font-normal text-sm cursor-pointer w-full">
                              {day.dayName} (Designar como rural especial)
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </>
                )}
                {holidaysForMonth.length === 0 && weekendDaysForSelection.length === 0 && (
                   <p className="text-sm text-muted-foreground text-center py-4">No hay días festivos o fines de semana rurales configurados para este mes.</p>
                )}

              </div>
            </div>

            <FormField
              control={form.control}
              name="additionalInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Instrucciones Adicionales (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Priorizar territorios no trabajados recientemente. Considerar asignar al Hno. X el día Y."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Generación con IA
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
