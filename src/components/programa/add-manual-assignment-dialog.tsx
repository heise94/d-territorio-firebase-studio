
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Assignment, UserProfile, Territory, Casa, PreachingAssignedType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users, MountainSnow, Video, Home, MapPin } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, parse, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const NO_SELECTION = "__NO_SELECTION__";

const manualAssignmentSchema = z.object({
  time: z.string().min(1, "La hora es obligatoria."),
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
}: AddManualAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!assignmentToEdit;
  const [selectionMode, setSelectionMode] = useState<'territory' | 'casa'>('territory');
  
  const form = useForm<ManualAssignmentFormValues>({
    resolver: zodResolver(manualAssignmentSchema),
    defaultValues: {},
  });
  
  const { watch, setValue } = form;
  const selectedType = watch("type");
  const selectedUserId = watch("userId");
  const selectedCasaId = watch("casaId");
  const selectedTerritoryId = watch("territoryId");

  const timeOptions = useMemo(() => {
    const options = [];
    for(let h=7; h<=21; h++){
        for(let m=0; m<60; m+=15){
            const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            options.push(timeStr);
        }
    }
    return options;
  },[]);


  useEffect(() => {
    if (isOpen) {
        if (assignmentToEdit) {
            form.reset({
                time: assignmentToEdit.time,
                type: assignmentToEdit.type,
                territoryId: assignmentToEdit.locationId || NO_SELECTION,
                casaId: (assignmentToEdit as Assignment).casaId || NO_SELECTION,
                userId: (assignmentToEdit as any).userId || NO_SELECTION,
                notes: assignmentToEdit.notes,
            });
        } else {
            form.reset({
                time: "10:00",
                type: "publica",
                territoryId: NO_SELECTION,
                casaId: NO_SELECTION,
                userId: NO_SELECTION,
                notes: "",
            });
        }
        setSelectionMode('territory');
    }
  }, [isOpen, assignmentToEdit, form]);
  
  useEffect(() => {
    if (!isOpen) return;
    if (selectionMode === 'territory') {
        setValue("casaId", NO_SELECTION, { shouldValidate: true });
    } else {
        setValue("territoryId", NO_SELECTION, { shouldValidate: true });
    }
  }, [selectedTerritoryId, selectedCasaId, selectionMode, setValue, isOpen]);


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
    const baseFiltered = allTerritories.filter(t => {
      if (t.isBlocked) return false;
      const isCorrectType = t.type === (selectedType === 'rural' ? 'rural' : 'urban');
      if (!isCorrectType) return false;
      return true;
    });

    const sortByLastWorked = (a: Territory, b: Territory) => {
      const dateA = lastWorkedDates.get(a.id) ? parse(lastWorkedDates.get(a.id)!, 'dd/MM/yy', new Date()).getTime() : 0;
      const dateB = lastWorkedDates.get(b.id) ? parse(lastWorkedDates.get(b.id)!, 'dd/MM/yy', new Date()).getTime() : 0;
      return dateA - dateB;
    };
    
    if (selectionMode === 'casa') {
        if (!selectedCasaId || selectedCasaId === NO_SELECTION) return [];
        return baseFiltered.filter(t => t.associatedCasaIds?.includes(selectedCasaId)).sort(sortByLastWorked);
    }
    
    return baseFiltered.filter(t => isEditMode ? true : !assignedInMonth.territoryIds.has(t.id)).sort(sortByLastWorked).slice(0, 20);

  }, [allTerritories, selectedType, isEditMode, selectionMode, selectedCasaId, lastWorkedDates, assignedInMonth.territoryIds]);


  const availableCasasForSelection = useMemo(() => {
      const assignmentDate = startOfDay(date || new Date());
      
      let casas = allCasas.filter(c => {
          if (c.blockInfo?.forSystem) return false;

          const isUnavailable = c.unavailabilityPeriods?.some(period => {
              const start = startOfDay(period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate));
              const end = endOfDay(period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate));
              return isWithinInterval(assignmentDate, { start, end });
          });
          if (isUnavailable) return false;
          return true;
      });

      if (selectionMode === 'territory' && selectedTerritoryId && selectedTerritoryId !== NO_SELECTION) {
          const selectedTerr = allTerritories.find(t => t.id === selectedTerritoryId);
          if (selectedTerr?.associatedCasaIds && selectedTerr.associatedCasaIds.length > 0) {
              const associatedCasas = casas.filter(c => selectedTerr.associatedCasaIds!.includes(c.id));
              if (associatedCasas.length > 0) return associatedCasas;
          }
      }
      return casas;
  }, [allCasas, date, selectionMode, selectedTerritoryId, allTerritories]);
  
  const availablePublishers = useMemo(() => {
    const assignmentDate = startOfDay(date || new Date());
    return allPublishers.filter(p => {
        const isAllowedStatus = p.status === 'Activo' || (p.isAssignable);
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
  }, [allPublishers, date]);
  
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
        
  const TerritoryField = () => (
    <FormField
        control={form.control}
        name="territoryId"
        render={({ field }) => (
        <FormItem>
            <FormLabel>
                {selectionMode === 'territory' ? '1. Territorio' : '2. Territorio'}
            </FormLabel>
            <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={selectionMode === 'casa' && (!selectedCasaId || selectedCasaId === NO_SELECTION)}
            >
                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar territorio" /></SelectTrigger></FormControl>
                <SelectContent>
                    <SelectItem value={NO_SELECTION}>-- No Seleccionado --</SelectItem>
                    {availableTerritoriesForSelection.map(loc => {
                    const territoryDisplayName = loc.number ? `U-${loc.number}` : loc.name;
                    const lastWorkedDisplay = lastWorkedDates.get(loc.id) || 'Nunca';
                    const fullDisplayName = `${territoryDisplayName} (${lastWorkedDisplay})`;
                    return (
                        <SelectItem key={loc.id} value={loc.id}>
                            {fullDisplayName}
                        </SelectItem>
                    );
                    })}
                </SelectContent>
            </Select>
            <FormFieldDescription className="text-xs">
                {selectionMode === 'casa'
                    ? "Territorios asociados a la casa seleccionada."
                    : "Los 20 territorios más antiguos sin trabajar."
                }
            </FormFieldDescription>
            <FormMessage />
        </FormItem>
        )}
    />
  );
  
  const CasaField = () => (
     <FormField
        control={form.control}
        name="casaId"
        render={({ field }) => (
        <FormItem>
            <FormLabel>{selectionMode === 'casa' ? '1. Casa de Reunión' : '2. Casa de Reunión'}</FormLabel>
            <Select
            onValueChange={field.onChange}
            value={field.value}
            disabled={selectionMode === 'territory' && (!selectedTerritoryId || selectedTerritoryId === NO_SELECTION)}
            >
            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar casa de reunión" /></SelectTrigger></FormControl>
            <SelectContent>
                <SelectItem value={NO_SELECTION}>-- No Seleccionado --</SelectItem>
                {availableCasasForSelection.map(loc => {
                const name = loc.ownerName || loc.address;
                return (
                    <SelectItem key={loc.id} value={loc.id}>
                    {name}
                    </SelectItem>
                );
                })}
            </SelectContent>
            </Select>
            <FormFieldDescription className="text-xs">
                {selectionMode === 'territory'
                    ? "Casas cercanas al territorio seleccionado (o todas si no hay)."
                    : "Casas disponibles para la fecha y horario."
                }
            </FormFieldDescription>
            <FormMessage />
        </FormItem>
        )}
    />
  );


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
              <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem><FormLabel>Hora</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="HH:MM" /></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="publica">Pública</SelectItem><SelectItem value="rural">Rural</SelectItem><SelectItem value="zoom">Zoom</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )}/>
            </div>
            
            {selectedType !== 'zoom' && (
              <>
                <RadioGroup
                    defaultValue="territory"
                    value={selectionMode}
                    onValueChange={(value: 'territory' | 'casa') => setSelectionMode(value)}
                    className="grid grid-cols-2 gap-2"
                >
                    <Label htmlFor="mode_territory" className={cn("border rounded-md p-3 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors", selectionMode === 'territory' && "bg-primary text-primary-foreground border-primary")}>
                        <MapPin className="mr-2 h-4 w-4"/> Iniciar por Territorio
                    </Label>
                    <RadioGroupItem value="territory" id="mode_territory" className="sr-only"/>
                    
                    <Label htmlFor="mode_casa" className={cn("border rounded-md p-3 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors", selectionMode === 'casa' && "bg-primary text-primary-foreground border-primary")}>
                       <Home className="mr-2 h-4 w-4"/> Iniciar por Casa
                    </Label>
                    <RadioGroupItem value="casa" id="mode_casa" className="sr-only"/>
                </RadioGroup>
                
                {selectionMode === 'territory' ? (
                    <>
                        <TerritoryField />
                        <CasaField />
                    </>
                ) : (
                    <>
                        <CasaField />
                        <TerritoryField />
                    </>
                )}
              </>
            )}
            
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publicador Encargado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar publicador" /></SelectTrigger></FormControl>
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
