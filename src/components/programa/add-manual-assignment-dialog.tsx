
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
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { UserAssignment, PublisherDetail, Territory, Casa, PreachingAssignedType, ProgramScheduleSlot, Assignment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users, MountainSnow, Video, Home } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const manualAssignmentSchema = z.object({
  time: z.string().min(1, "La hora es obligatoria."),
  type: z.enum(["publica", "rural", "zoom"], { required_error: "Debe seleccionar un tipo." }),
  territoryId: z.string().min(1, "Debe seleccionar un territorio."),
  casaId: z.string().min(1, "Debe seleccionar una casa de reunión."),
  userId: z.string().min(1, "Debe seleccionar un publicador."),
  notes: z.string().max(500).optional(),
});

type ManualAssignmentFormValues = z.infer<typeof manualAssignmentSchema>;

export interface ManualAssignmentSubmitData {
    id?: string;
    date: Date;
    time: string;
    type: PreachingAssignedType;
    territoryId: string;
    casaId?: string;
    userId: string;
    notes?: string;
    status?: UserAssignment['status'];
}


interface AddManualAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssignmentSubmit: (data: ManualAssignmentSubmitData) => void;
  date: Date | null;
  assignmentToEdit?: UserAssignment | null;
  slot?: ProgramScheduleSlot | null;
  allPublishers: PublisherDetail[];
  allTerritories: Territory[];
  allCasas: Casa[];
  allAssignmentsForMonth: Assignment[];
}

const PreachingTypeIcon = ({ type }: { type: PreachingAssignedType | 'general' }) => {
  const iconClass = "mr-1.5 h-4 w-4 shrink-0 text-muted-foreground";
  if (type === "publica" || type === "general") return <Users className={iconClass} />;
  if (type === "rural") return <MountainSnow className={iconClass} />;
  if (type === "zoom") return <Video className={iconClass} />;
  return null;
};

export function AddManualAssignmentDialog({
  isOpen,
  onOpenChange,
  onAssignmentSubmit,
  date,
  assignmentToEdit,
  slot,
  allPublishers,
  allTerritories,
  allCasas,
  allAssignmentsForMonth,
}: AddManualAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!assignmentToEdit;
  
  const form = useForm<ManualAssignmentFormValues>({
    resolver: zodResolver(manualAssignmentSchema),
    defaultValues: {},
  });
  
  const { watch, setValue } = form;
  const selectedType = watch("type");
  const selectedUserId = watch("userId");

  useEffect(() => {
    if (isOpen) {
        if (assignmentToEdit) {
            form.reset({
                time: assignmentToEdit.time,
                type: assignmentToEdit.type,
                territoryId: assignmentToEdit.locationId,
                casaId: (assignmentToEdit as Assignment).casaId,
                userId: (assignmentToEdit as any).userId,
                notes: assignmentToEdit.notes,
            });
        } else if (slot) {
            form.reset({
                time: slot.startTime,
                type: slot.type === 'general' ? 'publica' : slot.type,
                territoryId: "",
                casaId: "",
                userId: "",
                notes: "",
            });
        } else {
            form.reset({
                time: "10:00",
                type: "publica",
                territoryId: "",
                casaId: "",
                userId: "",
                notes: "",
            });
        }
    }
  }, [isOpen, assignmentToEdit, slot, form]);

  const { assignedCaptainIdsInMonth, assignedCasaIdsInMonth, assignedTerritoryIdsInMonth } = useMemo(() => {
    const captainIds = new Set<string>();
    const casaIds = new Set<string>();
    const territoryIds = new Set<string>();

    allAssignmentsForMonth.forEach(a => {
        if (a.userId) captainIds.add(a.userId);
        if(a.casaId) casaIds.add(a.casaId);
        if (a.locationId && allTerritories.some(t => t.id === a.locationId)) {
            territoryIds.add(a.locationId);
        }
    });

    return { 
        assignedCaptainIdsInMonth: captainIds, 
        assignedCasaIdsInMonth: casaIds,
        assignedTerritoryIdsInMonth: territoryIds
    };
  }, [allAssignmentsForMonth, allTerritories]);

  const availableTerritoriesForSelection = useMemo(() => {
    return allTerritories
      .filter(t => {
        if (t.isBlocked) return false;
        const isCorrectType = t.type === (selectedType === 'rural' ? 'rural' : 'urban');
        if (!isCorrectType) return false;

        if (isEditMode && assignmentToEdit?.locationId === t.id) {
            return true;
        }
        return !assignedTerritoryIdsInMonth.has(t.id);
      })
      .sort((a, b) => {
        const dateA = a.lastWorked ? new Date(a.lastWorked).getTime() : 0;
        const dateB = b.lastWorked ? new Date(b.lastWorked).getTime() : 0;
        return dateA - dateB;
      })
      .slice(0, 20);
  }, [allTerritories, selectedType, assignedTerritoryIdsInMonth, isEditMode, assignmentToEdit]);

  const availablePublishersForSlot = useMemo(() => {
    const assignmentDate = startOfDay(date || new Date());

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

      if (!slot) return true;

      const hasSlot = p.availability?.availableSlotIds?.includes(slot.id);
      return hasSlot;
    });
  }, [allPublishers, date, slot]);
  
  const availableCasasForSlot = useMemo(() => {
      const assignmentDate = startOfDay(date || new Date());
      
      return allCasas.filter(c => {
          if (c.blockInfo?.forSystem) return false;

          const isUnavailable = c.unavailabilityPeriods?.some(period => {
              const start = startOfDay(period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate));
              const end = endOfDay(period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate));
              return isWithinInterval(assignmentDate, { start, end });
          });
          if (isUnavailable) return false;

          if (!slot) return true;

          const hasSlot = c.availableDays?.availableProgramSlotIds?.includes(slot.id);
          return hasSlot;
      });
  }, [allCasas, date, slot]);
  
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

  const dialogDescription = isEditMode 
    ? `Editando asignación para ${assignmentToEdit?.userName}`
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
             {(slot || isEditMode) && (
                <div className="grid grid-cols-2 gap-4 rounded-md border bg-muted/50 p-3">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Hora</p>
                        <p className="font-semibold">{form.getValues('time')}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Tipo</p>
                        <p className="font-semibold capitalize flex items-center">
                            <PreachingTypeIcon type={form.getValues('type')} />
                            {form.getValues('type')}
                        </p>
                    </div>
                </div>
             )}
            
            <FormField
              control={form.control}
              name="territoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Territorio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccionar territorio" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTerritoriesForSelection.map(loc => {
                        const name = loc.type === 'urban' && loc.number ? `U-${loc.number}: ${loc.name}` : loc.name;
                        const isAlreadyAssigned = assignedTerritoryIdsInMonth.has(loc.id);
                        return (
                          <SelectItem key={loc.id} value={loc.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{name}</span>
                              {isAlreadyAssigned && (
                                <TooltipProvider><Tooltip>
                                  <TooltipTrigger asChild><span className="h-2 w-2 rounded-full bg-amber-500 ml-2" /></TooltipTrigger>
                                  <TooltipContent><p>Ya asignado este mes</p></TooltipContent>
                                </Tooltip></TooltipProvider>
                              )}
                            </div>
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar casa de reunión" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {availableCasasForSlot.map(loc => {
                        const name = loc.ownerName || loc.address;
                        const isCaptainsHouse = selectedCaptain && loc.id === selectedCaptain.managedCasaId;
                        const isAlreadyAssigned = assignedCasaIdsInMonth.has(loc.id);
                        return (
                          <SelectItem
                            key={loc.id}
                            value={loc.id}
                            className={cn(isCaptainsHouse && "bg-green-100 dark:bg-green-800/50 text-green-900 dark:text-green-200 font-semibold")}
                          >
                            <div className="flex items-center justify-between w-full">
                                <span className="flex items-center">
                                    {isCaptainsHouse && <Home className="h-4 w-4 mr-2 text-green-700" />}
                                    {name}
                                </span>
                              {isAlreadyAssigned && !isCaptainsHouse && (
                                 <TooltipProvider><Tooltip>
                                    <TooltipTrigger asChild><span className="h-2 w-2 rounded-full bg-amber-500 ml-2" /></TooltipTrigger>
                                    <TooltipContent><p>Ya asignada este mes</p></TooltipContent>
                                </Tooltip></TooltipProvider>
                              )}
                            </div>
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
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publicador Encargado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar publicador" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {availablePublishersForSlot.map(p => (
                          <SelectItem key={p.id} value={p.firebaseAuthUid || p.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{p.name}</span>
                                {(assignedCaptainIdsInMonth.has(p.id) || (p.firebaseAuthUid && assignedCaptainIdsInMonth.has(p.firebaseAuthUid))) && (
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
