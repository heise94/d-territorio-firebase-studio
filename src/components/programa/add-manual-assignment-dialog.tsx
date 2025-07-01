
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
import type { Assignment, UserProfile, Territory, Casa, PreachingAssignedType, ProgramScheduleSlot, DayOfWeek, Campaign } from "@/types";
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
  userId: z.string().min(1, "Debes seleccionar un publicador.").refine(val => val !== NO_SELECTION, "Debe seleccionar un publicador."),
  notes: z.string().max(500).optional(),
  filterMode: z.enum(["territory", "casa"]).default("territory"),
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
  campaigns: Campaign[];
  summerScheduleStartDate?: string;
  winterScheduleStartDate?: string;
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
  campaigns,
  summerScheduleStartDate,
  winterScheduleStartDate,
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
        filterMode: "territory",
    },
  });
  
  const { watch, setValue } = form;
  const selectedType = watch("type");
  const selectedUserId = watch("userId");
  const selectedTerritoryId = watch("territoryId");
  const selectedCasaId = watch("casaId");
  const selectedTime = watch("time");
  const filterMode = watch("filterMode");

  const assignmentDate = date || (assignmentToEdit ? parseISO(assignmentToEdit!.date) : null);
  
  const availableTimeSlots = useMemo(() => {
    if (!assignmentDate || !selectedType || !programScheduleSlots) return [];
    
    const dayOfWeekKey = DAY_OF_WEEK_MAP[getDay(assignmentDate)];
    const filterType = selectedType === 'publica' ? 'general' : selectedType;
    
    const isSummer = (date: Date, summerStart?: string, winterStart?: string): boolean => {
        if (!summerStart || !winterStart) return true;
        const dateMMDD = format(date, 'MM-dd');
        if (summerStart < winterStart) {
            return dateMMDD >= summerStart && dateMMDD < winterStart;
        } else {
            return dateMMDD >= summerStart || dateMMDD < winterStart;
        }
    };
    
    const currentSeason = isSummer(assignmentDate, summerScheduleStartDate, winterScheduleStartDate) ? 'summer' : 'winter';

    return programScheduleSlots
      .filter(slot => 
        slot.dayOfWeek === dayOfWeekKey && 
        slot.type === filterType &&
        (slot.season === 'all_year' || slot.season === currentSeason)
      )
      .sort((a,b) => a.startTime.localeCompare(b.startTime));
  }, [selectedType, assignmentDate, programScheduleSlots, summerScheduleStartDate, winterScheduleStartDate]);

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
                filterMode: "territory",
            });
        } else {
            form.reset({
                time: NO_SELECTION,
                type: "publica",
                territoryId: NO_SELECTION,
                casaId: NO_SELECTION,
                userId: NO_SELECTION,
                notes: "",
                filterMode: "territory",
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

  useEffect(() => {
    setValue('territoryId', NO_SELECTION);
    setValue('casaId', NO_SELECTION);
  }, [filterMode, setValue]);

  const assignedTerritoriesInMonthMap = useMemo(() => {
    if (!date) return new Map<string, string>(); // Map<territoryId, dateString>

    const monthStart = startOfDay(startOfMonth(date));
    const monthEnd = endOfDay(endOfMonth(date));
    const territoryMap = new Map<string, string>();

    const assignmentsInMonth = allAssignments.filter(a => {
        try {
            const assignmentDate = parseISO(a.date);
            return isWithinInterval(assignmentDate, { start: monthStart, end: monthEnd });
        } catch (e) { return false; }
    }).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

    assignmentsInMonth.forEach(a => {
        if (a.locationId && !territoryMap.has(a.locationId)) {
            territoryMap.set(a.locationId, format(parseISO(a.date), 'dd/MM/yy'));
        }
    });

    return territoryMap;
  }, [allAssignments, date]);

  const isDuringCampaign = useMemo(() => {
    if (!assignmentDate || !campaigns) return false;
    const currentAssignmentDate = startOfDay(assignmentDate);
    return campaigns.some(campaign => {
        const start = campaign.startDate instanceof Timestamp ? campaign.startDate.toDate() : new Date(campaign.startDate);
        const end = campaign.endDate instanceof Timestamp ? campaign.endDate.toDate() : new Date(campaign.endDate);
        const startDate = startOfDay(start);
        const endDate = endOfDay(end);
        return isWithinInterval(currentAssignmentDate, { start: startDate, end: endDate });
    });
  }, [assignmentDate, campaigns]);

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
  
  const availableCasasOnDate = useMemo(() => {
    if (!assignmentDate) return [];
    return allCasas.filter(c => {
        if (c.blockInfo?.forSystem) return false;
        const isUnavailable = c.unavailabilityPeriods?.some(period => {
            const start = startOfDay(period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate));
            const end = endOfDay(period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate));
            return isWithinInterval(assignmentDate, { start, end });
        });
        if (isUnavailable) return false;
        return true;
    }).sort((a,b) => a.ownerName.localeCompare(b.ownerName));
  }, [allCasas, assignmentDate]);
  
  const availableCasasForSelectedSlot = useMemo(() => {
    if (!assignmentDate || !selectedTime || selectedTime === NO_SELECTION) return [];

    const dayOfWeekKey = DAY_OF_WEEK_MAP[getDay(assignmentDate)];
    const filterType = selectedType === 'publica' ? 'general' : selectedType;
    const selectedSlot = programScheduleSlots.find(slot => 
        slot.dayOfWeek === dayOfWeekKey && 
        slot.type === filterType && 
        slot.startTime === selectedTime
    );

    if (!selectedSlot) return [];
    
    return availableCasasOnDate.filter(c => 
        c.availableDays?.availableProgramSlotIds?.includes(selectedSlot.id)
    );
  }, [availableCasasOnDate, assignmentDate, selectedTime, selectedType, programScheduleSlots]);

  const availableTerritoriesForSelection = useMemo(() => {
    return allTerritories.filter(t => {
      if (t.isBlocked) return false;
      const isCorrectType = t.type === (selectedType === 'rural' ? 'rural' : 'urban');
      if (!isCorrectType) return false;
      
      if (filterMode === 'casa') {
        if (selectedCasaId && selectedCasaId !== NO_SELECTION) {
          return t.associatedCasaIds?.includes(selectedCasaId) ?? false;
        }
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      const dateA = lastWorkedDates.get(a.id) ? parse(lastWorkedDates.get(a.id)!, 'dd/MM/yy', new Date()).getTime() : 0;
      const dateB = lastWorkedDates.get(b.id) ? parse(lastWorkedDates.get(b.id)!, 'dd/MM/yy', new Date()).getTime() : 0;
      return dateA - dateB;
    });
  }, [allTerritories, selectedType, lastWorkedDates, filterMode, selectedCasaId]);
  
  const availablePublishers = useMemo(() => {
    if (!assignmentDate || !selectedTime || selectedTime === NO_SELECTION) {
      return [];
    }

    const dayOfWeekKey = DAY_OF_WEEK_MAP[getDay(assignmentDate)];
    const filterType = selectedType === 'publica' ? 'general' : selectedType;
    const selectedSlot = programScheduleSlots.find(slot => 
        slot.dayOfWeek === dayOfWeekKey && 
        slot.type === filterType && 
        slot.startTime === selectedTime
    );

    if (!selectedSlot) {
        return [];
    }
    
    return allPublishers.filter(p => {
        const isAllowedStatus = p.status === 'Activo' || (p.status === 'Pendiente Invitación' && p.isAssignable);
        if (!isAllowedStatus) return false;
        if (p.blockInfo?.forSystem) return false;
        const isUnavailable = p.availability?.unavailabilityPeriods?.some(period => {
            const start = startOfDay(period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate));
            const end = endOfDay(period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate));
            return isWithinInterval(assignmentDate, { start, end });
        });
        if (isUnavailable) return false;

        return p.availability?.availableSlotIds?.includes(selectedSlot.id);
    });
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
        ? `Añadiendo asignación para el ${format(date, "PPP", {locale: es})}`
        : 'Añadiendo asignación manual.';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <TooltipProvider>
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
                 <FormItem><FormLabel>Hora</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedType || availableTimeSlots.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={!selectedType ? "Selecciona tipo primero" : (availableTimeSlots.length > 0 ? "Selecciona hora" : "No hay horarios")} /></SelectTrigger></FormControl><SelectContent>
                    {availableTimeSlots.length > 0 && <SelectItem value={NO_SELECTION}>Seleccionar hora</SelectItem>}
                    {availableTimeSlots.map(t => <SelectItem key={t.id} value={t.startTime}>{t.startTime}</SelectItem>)}
                 </SelectContent></Select><FormMessage /></FormItem>
             )}/>
            </div>
            
            {selectedType !== 'zoom' && (
              <div className="space-y-4 p-4 border rounded-md">
                <FormField
                    control={form.control}
                    name="filterMode"
                    render={({ field }) => (
                    <FormItem className="space-y-2">
                        <FormLabel>Asignar por</FormLabel>
                        <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="territory" id="r-territory" /></FormControl><Label htmlFor="r-territory" className="font-normal cursor-pointer">Territorio</Label></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="casa" id="r-casa" /></FormControl><Label htmlFor="r-casa" className="font-normal cursor-pointer">Casa</Label></FormItem>
                        </RadioGroup>
                        </FormControl>
                    </FormItem>
                    )}
                />
                 {filterMode === 'territory' ? (
                    <>
                    <FormField
                      control={form.control}
                      name="territoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Territorio</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar territorio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableTerritoriesForSelection.map((loc) => {
                                const lastWorkedStr = lastWorkedDates.get(loc.id) || 'Nunca';
                                const territoryName = loc.number ? `U-${loc.number}` : loc.name;
                                const assignedDateStr = assignedTerritoriesInMonthMap.get(loc.id);
                                const isAlreadyAssigned = !!assignedDateStr;
                                const showWarning = isAlreadyAssigned && !isDuringCampaign;
                                
                                return (
                                  <Tooltip key={loc.id}>
                                    <TooltipTrigger asChild>
                                      <SelectItem value={loc.id}>
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center gap-2">
                                            {showWarning && (
                                              <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                            )}
                                            <div>
                                              <span className="font-medium">{territoryName}</span>
                                              <span className="text-xs text-muted-foreground ml-2">
                                                (Últ. vez: {lastWorkedStr})
                                              </span>
                                              {showWarning && (
                                                <span className="text-xs text-amber-600 font-semibold ml-2">
                                                  - Asignado el {assignedDateStr}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    </TooltipTrigger>
                                    {showWarning && (
                                      <TooltipContent onPointerDown={(e) => e.preventDefault()}>
                                          <p>Asignado el {assignedDateStr}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
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
                        render={({ field }) => {
                            const territory = allTerritories.find(t => t.id === selectedTerritoryId);
                            const associatedIds = new Set(territory?.associatedCasaIds || []);
                            const suggestedCasas = availableCasasForSelectedSlot.filter(c => associatedIds.has(c.id));
                            
                            return (
                                <FormItem>
                                    <FormLabel>Casa de Reunión</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTerritoryId || selectedTerritoryId === NO_SELECTION || suggestedCasas.length === 0}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={!selectedTerritoryId || selectedTerritoryId === NO_SELECTION ? "Selecciona territorio y horario" : (suggestedCasas.length > 0 ? "Seleccionar casa sugerida" : "No hay casas cercanas para este horario")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {suggestedCasas.length > 0 && <SelectGroup><SelectLabel>Casas Cercanas Sugeridas</SelectLabel>{suggestedCasas.map(loc => (<SelectItem key={loc.id} value={loc.id}>{loc.ownerName}</SelectItem>))}</SelectGroup>}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            );
                        }}
                    />
                    </>
                 ) : (
                    <>
                    <FormField control={form.control} name="casaId" render={({ field }) => (
                      <FormItem><FormLabel>Casa de Reunión</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTime || selectedTime === NO_SELECTION || availableCasasForSelectedSlot.length === 0}>
                          <FormControl><SelectTrigger>
                              <SelectValue placeholder={!selectedTime || selectedTime === NO_SELECTION ? "Selecciona hora primero" : (availableCasasForSelectedSlot.length > 0 ? "Seleccionar casa" : "No hay casas disponibles para este horario")} />
                          </SelectTrigger></FormControl>
                          <SelectContent>{availableCasasForSelectedSlot.map(loc => (<SelectItem key={loc.id} value={loc.id}>{loc.ownerName}</SelectItem>))}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="territoryId" render={({ field }) => (<FormItem><FormLabel>Territorio (asociado a casa)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedCasaId || selectedCasaId === NO_SELECTION || availableTerritoriesForSelection.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={!selectedCasaId || selectedCasaId === NO_SELECTION ? "Selecciona casa primero" : (availableTerritoriesForSelection.length > 0 ? "Seleccionar territorio" : "No hay territorios asociados")} /></SelectTrigger></FormControl><SelectContent>{availableTerritoriesForSelection.map(loc => {
                       const isAlreadyAssigned = assignedTerritoriesInMonthMap.has(loc.id);
                       const assignedDateStr = assignedTerritoriesInMonthMap.get(loc.id);
                       const showWarning = isAlreadyAssigned && !isDuringCampaign;
                        return (
                          <Tooltip key={loc.id}>
                            <TooltipTrigger asChild>
                           <SelectItem value={loc.id}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    {showWarning && (
                                      <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                    )}
                                    <div>
                                      <span className="font-medium">{loc.number ? `U-${loc.number}` : loc.name}</span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        (Últ. vez: {lastWorkedDates.get(loc.id) || 'Nunca'})
                                      </span>
                                      {showWarning && (
                                        <span className="text-xs text-amber-600 font-semibold ml-2">
                                          - Asignado el {assignedDateStr}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            </TooltipTrigger>
                             {showWarning && (
                                <TooltipContent onPointerDown={(e) => e.preventDefault()}>
                                    <p>Asignado el {assignedDateStr}</p>
                                </TooltipContent>
                            )}
                           </Tooltip>
                        )
                    })}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    </>
                 )}
              </div>
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
                        {availablePublishers.map(p => {
                            const assignmentsThisMonth = allAssignments.filter(a => (a.userId === p.id || a.userId === p.firebaseAuthUid) && isWithinInterval(parseISO(a.date), { start: startOfMonth(assignmentDate!), end: endOfMonth(assignmentDate!) }) ).length;
                           return (
                            <Tooltip key={p.id}>
                               <TooltipTrigger asChild>
                                <SelectItem value={p.firebaseAuthUid || p.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{p.name}</span>
                                      {assignmentsThisMonth > 0 && (
                                        <span className="text-xs text-muted-foreground ml-2">({assignmentsThisMonth})</span>
                                      )}
                                    </div>
                                </SelectItem>
                               </TooltipTrigger>
                               {assignmentsThisMonth > 0 && (
                                <TooltipContent onPointerDown={(e) => e.preventDefault()}><p>Tiene {assignmentsThisMonth} asignacion(es) este mes.</p></TooltipContent>
                               )}
                            </Tooltip>
                        )})}
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
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
