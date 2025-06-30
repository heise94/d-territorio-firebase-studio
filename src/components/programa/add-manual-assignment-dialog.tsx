"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Assignment, UserProfile, Territory, Casa, PreachingAssignedType, ProgramScheduleSlot, DayOfWeek } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users, MountainSnow, Video, Home, MapPin } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, parse, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const NO_SELECTION = "__NO_SELECTION__";

const manualAssignmentSchema = z.object({
  time: z.string().min(1, "La hora es obligatoria.").refine(val => val !== NO_SELECTION, "Debe seleccionar una hora."),
  type: z.enum(["publica", "rural", "zoom"], { required_error: "Debe seleccionar un tipo." }),
  territoryId: z.string().optional(),
  casaId: z.string().optional(),
  userId: z.string().min(1, "Debe seleccionar un publicador.").refine(val => val !== NO_SELECTION, "Debe seleccionar un publicador."),
  notes: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.type !== 'zoom') {
    if (!data.territoryId || data.territoryId === NO_SELECTION) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar un territorio.", path: ["territoryId"] });
    }
    if (!data.casaId || data.casaId === NO_SELECTION) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar una casa.", path: ["casaId"] });
    }
  }
});


type ManualAssignmentFormValues = z.infer<typeof manualAssignmentSchema>;

export interface ManualAssignmentSubmitData {
    id?: string;
    date: Date;
    time: string;
    type: PreachingAssignedType;
    territoryId?: string;
    casaId?: string;
    userId: string;
    notes?: string;
    status?: Assignment['status'];
}

const DAY_OF_WEEK_MAP: Record<number, DayOfWeek> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

interface AddManualAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssignmentSubmit: (data: ManualAssignmentSubmitData) => void;
  date: Date | null;
  assignmentToEdit?: Assignment | null;
  allPublishers: UserProfile[];
  allTerritories: Territory[];
  allCasas: Casa[];
  allAssignments: Assignment[];
  programScheduleSlots: ProgramScheduleSlot[];
}

export function AddManualAssignmentDialog({
  isOpen,
  onOpenChange,
  onAssignmentSubmit,
  date,
  assignmentToEdit,
  allPublishers,
  allTerritories,
  allCasas,
  allAssignments,
  programScheduleSlots,
}: AddManualAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!assignmentToEdit;
  
  const form = useForm<ManualAssignmentFormValues>({
    resolver: zodResolver(manualAssignmentSchema),
    defaultValues: {
        time: NO_SELECTION,
        type: "publica",
        territoryId: NO_SELECTION,
        casaId: NO_SELECTION,
        userId: NO_SELECTION,
        notes: "",
    },
  });
  
  const { watch, setValue } = form;
  const selectedType = watch("type");
  const selectedUserId = watch("userId");
  const selectedTerritoryId = watch("territoryId");
  const selectedTime = watch("time");

  const assignmentDate = date || (assignmentToEdit ? parseISO(assignmentToEdit!.date) : null);
  
  const availableTimeSlots = useMemo(() => {
    if (!assignmentDate || !selectedType || !programScheduleSlots) return [];
    
    const dayOfWeekKey = DAY_OF_WEEK_MAP[getDay(assignmentDate)];
    const filterType = selectedType === 'publica' ? 'general' : selectedType;
    
    return programScheduleSlots
      .filter(slot => slot.dayOfWeek === dayOfWeekKey && slot.type === filterType)
      .sort((a,b) => a.startTime.localeCompare(b.startTime));
  }, [selectedType, assignmentDate, programScheduleSlots]);

  useEffect(() => {
      if (isOpen) {
        if (assignmentToEdit) {
            form.reset({
                time: assignmentToEdit.time,
                type: assignmentToEdit.type,
                territoryId: assignmentToEdit.locationId || NO_SELECTION,
                casaId: assignmentToEdit.casaId || NO_SELECTION,
                userId: assignmentToEdit.userId || NO_SELECTION,
                notes: assignmentToEdit.notes || "",
            });
        } else {
            form.reset({
                time: NO_SELECTION,
                type: "publica",
                territoryId: NO_SELECTION,
                casaId: NO_SELECTION,
                userId: NO_SELECTION,
                notes: "",
            });
        }
      }
  }, [isOpen, assignmentToEdit, form]);

  useEffect(() => {
    const currentTime = form.getValues('time');
    if (currentTime && currentTime !== NO_SELECTION && !availableTimeSlots.some(slot => slot.startTime === currentTime)) {
        form.setValue('time', NO_SELECTION, { shouldValidate: true });
    }
  }, [availableTimeSlots, form, selectedType]);


  const assignedInMonth = useMemo(() => {
    if (!date) return { captainIds: new Set(), casaIds: new Set(), territoryIds: new Set() };
    
    const monthStart = startOfDay(startOfMonth(date));
    const monthEnd = endOfDay(endOfMonth(date));
    
    const captainIds = new Set<string>();
    const casaIds = new Set<string>();
    const territoryIds = new Set<string>();

    allAssignments.forEach(a => {
        const assignmentDate = parseISO(a.date);
        if (isWithinInterval(assignmentDate, { start: monthStart, end: monthEnd })) {
            if (a.userId) captainIds.add(a.userId);
            if (a.casaId) casaIds.add(a.casaId);
            if (a.locationId) territoryIds.add(a.locationId);
        }
    });

    return { captainIds, casaIds, territoryIds };
  }, [allAssignments, date]);

  const lastWorkedDates = useMemo(() => {
    const map = new Map<string, string>();
    allTerritories.forEach(territory => {
      const reports = allAssignments
        .filter(a => a.locationId === territory.id && a.lastReportData?.reportedAt)
      
      if (reports.length > 0) {
        reports.sort((a,b) => (b.lastReportData!.reportedAt as Timestamp).toMillis() - (a.lastReportData!.reportedAt as Timestamp).toMillis());
        map.set(territory.id, format((reports[0].lastReportData!.reportedAt as Timestamp).toDate(), 'dd/MM/yy'));
      }
    });
    return map;
  }, [allAssignments, allTerritories]);

  const availableTerritoriesForSelection = useMemo(() => {
    return allTerritories.filter(t => {
      if (t.isBlocked) return false;
      const isCorrectType = t.type === (selectedType === 'rural' ? 'rural' : 'urban');
      if (!isCorrectType) return false;
      return true;
    }).sort((a, b) => {
      const dateA = lastWorkedDates.get(a.id) ? parse(lastWorkedDates.get(a.id)!, 'dd/MM/yy', new Date()).getTime() : 0;
      const dateB = lastWorkedDates.get(b.id) ? parse(lastWorkedDates.get(b.id)!, 'dd/MM/yy', new Date()).getTime() : 0;
      return dateA - dateB;
    });
  }, [allTerritories, selectedType, lastWorkedDates]);


 const availableCasasForSelection = useMemo(() => {
    if (!assignmentDate) return { associated: [], others: [] };

    const availableOnDate = allCasas.filter(c => {
        if (c.blockInfo?.forSystem) return false;
        const isUnavailable = c.unavailabilityPeriods?.some(period => {
            const start = startOfDay(period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate));
            const end = endOfDay(period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate));
            return isWithinInterval(assignmentDate, { start, end });
        });
        if (isUnavailable) return false;
        return true;
    });

    if (!selectedTerritoryId || selectedTerritoryId === NO_SELECTION) {
        return { associated: [], others: availableOnDate.sort((a,b) => a.ownerName.localeCompare(b.ownerName)) };
    }

    const territory = allTerritories.find(t => t.id === selectedTerritoryId);
    const associatedIds = new Set(territory?.associatedCasaIds || []);

    const associated = availableOnDate.filter(c => associatedIds.has(c.id)).sort((a,b) => a.ownerName.localeCompare(b.ownerName));
    const others = availableOnDate.filter(c => !associatedIds.has(c.id)).sort((a,b) => a.ownerName.localeCompare(b.ownerName));
    
    return { associated, others };
}, [allCasas, assignmentDate, selectedTerritoryId, allTerritories]);

  
  const availablePublishers = useMemo(() => {
    if (!assignmentDate || !selectedTime || selectedTime === NO_SELECTION) {
      return [];
    }

    // First, filter publishers based on their general status and unavailability for the day
    let filteredByDay = allPublishers.filter(p => {
        const isAllowedStatus = p.status === 'Activo' || (p.status === 'Pendiente Invitación' && p.isAssignable);
        if (!isAllowedStatus) return false;
        if (p.blockInfo?.forSystem) return false;
        const isUnavailable = p.availability?.unavailabilityPeriods?.some(period => {
            const start = startOfDay(period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate));
            const end = endOfDay(period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate));
            return isWithinInterval(assignmentDate, { start, end });
        });
        if (isUnavailable) return false;
        return true;
    });

    // Now, filter by the specific time slot
    if (selectedType) {
        const dayOfWeekKey = DAY_OF_WEEK_MAP[getDay(assignmentDate)];
        const filterType = selectedType === 'publica' ? 'general' : selectedType;
        const selectedSlot = programScheduleSlots.find(slot => 
            slot.dayOfWeek === dayOfWeekKey && 
            slot.type === filterType && 
            slot.startTime === selectedTime
        );

        if (selectedSlot) {
            filteredByDay = filteredByDay.filter(p => 
                p.availability?.availableSlotIds?.includes(selectedSlot.id)
            );
        } else {
            return []; // No matching slot found for this time, so no one is available.
        }
    }
    
    return filteredByDay;

  }, [allPublishers, assignmentDate, selectedTime, selectedType, programScheduleSlots]);
  
  const selectedCaptain = useMemo(() => {
      if (!selectedUserId) return null;
      return allPublishers.find(p => p.id === selectedUserId || p.firebaseAuthUid === selectedUserId);
  }, [selectedUserId, allPublishers]);

  async function onSubmit(values: ManualAssignmentFormValues) {
    if (!date && !assignmentToEdit) return;
    setIsSubmitting(true);
    const dateToSubmit = date || parseISO(assignmentToEdit!.date);
    
    await onAssignmentSubmit({ 
        id: assignmentToEdit?.id, 
        date: dateToSubmit,
        time: values.time,
        type: values.type,
        territoryId: values.territoryId,
        casaId: values.casaId,
        userId: values.userId,
        notes: values.notes,
        status: assignmentToEdit?.status,
    });
    setIsSubmitting(false);
  }

  const dialogDescription = (isEditMode && assignmentToEdit)
    ? `Editando asignación para ${assignmentToEdit.userName}`
    : date 
        ? `Añadiendo asignación para el ${format(date, 'PPP', {locale: es})}`
        : 'Añadiendo asignación manual.';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Asignación" : "Añadir Asignación Manual"}</DialogTitle>
          <DialogDescription>
             {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="publica">Pública</SelectItem><SelectItem value="rural">Rural</SelectItem><SelectItem value="zoom">Zoom</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="time" render={({ field }) => (
                 <FormItem><FormLabel>Hora</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedType || availableTimeSlots.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={!selectedType ? "Selecciona tipo" : (availableTimeSlots.length > 0 ? "Selecciona hora" : "No hay horarios")} /></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value={NO_SELECTION}>-- No Seleccionado --</SelectItem>
                    {availableTimeSlots.map(t => <SelectItem key={t.id} value={t.startTime}>{t.startTime}</SelectItem>)}
                 </SelectContent></Select><FormMessage /></FormItem>
             )}/>
            </div>
            
            {selectedType !== 'zoom' && (
              <>
                <FormField
                    control={form.control}
                    name="territoryId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Territorio</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar territorio" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value={NO_SELECTION}>-- No Seleccionado --</SelectItem>
                                {availableTerritoriesForSelection.map(loc => {
                                const territoryDisplayName = loc.number ? `U-${loc.number}` : loc.name;
                                const lastWorkedDisplay = lastWorkedDates.get(loc.id) || 'Nunca';
                                const fullDisplayName = `${territoryDisplayName} (Últ. vez: ${lastWorkedDisplay})`;
                                return (
                                    <SelectItem key={loc.id} value={loc.id}>
                                        {fullDisplayName}
                                    </SelectItem>
                                );
                                })}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="casaId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Casa de Reunión</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar casa de reunión" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value={NO_SELECTION}>-- No Seleccionado --</SelectItem>
                             {availableCasasForSelection.associated.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>Casas Cercanas Sugeridas</SelectLabel>
                                    {availableCasasForSelection.associated.map(loc => {
                                        const name = loc.ownerName || loc.address;
                                        return <SelectItem key={loc.id} value={loc.id}>{name}</SelectItem>;
                                    })}
                                </SelectGroup>
                            )}
                            {availableCasasForSelection.others.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>Otras Casas Disponibles</SelectLabel>
                                    {availableCasasForSelection.others.map(loc => {
                                        const name = loc.ownerName || loc.address;
                                        return <SelectItem key={loc.id} value={loc.id}>{name}</SelectItem>;
                                    })}
                                </SelectGroup>
                            )}
                            {availableCasasForSelection.associated.length === 0 && availableCasasForSelection.others.length === 0 && (
                                <div className="text-center text-xs text-muted-foreground p-2">No hay casas disponibles para la fecha seleccionada.</div>
                            )}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </>
            )}
            
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publicador Encargado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTime || selectedTime === NO_SELECTION}>
                    <FormControl><SelectTrigger><SelectValue placeholder={!selectedTime || selectedTime === NO_SELECTION ? "Selecciona hora primero" : "Seleccionar publicador"} /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value={NO_SELECTION}>-- No Seleccionado --</SelectItem>
                        {availablePublishers.map(p => (
                          <SelectItem key={p.id} value={p.firebaseAuthUid || p.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{p.name}</span>
                                {(assignedInMonth.captainIds.has(p.id) || (p.firebaseAuthUid && assignedInMonth.captainIds.has(p.firebaseAuthUid))) && (
                                  <TooltipProvider><Tooltip>
                                      <TooltipTrigger asChild><span className="h-2 w-2 rounded-full bg-amber-500 ml-2" /></TooltipTrigger>
                                      <TooltipContent><p>Ya asignado este mes</p></TooltipContent>
                                  </Tooltip></TooltipProvider>
                                )}
                              </div>
                          </SelectItem>
                        ))}
                        {selectedTime && selectedTime !== NO_SELECTION && availablePublishers.length === 0 && (
                             <div className="text-center text-xs text-muted-foreground p-2">No hay publicadores disponibles para este horario.</div>
                        )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Añade notas o instrucciones..." {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4"/> {isEditMode ? "Guardar Cambios" : "Crear Asignación"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
