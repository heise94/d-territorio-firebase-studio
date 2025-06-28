
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
import { Loader2, Save, Users, MountainSnow, Video } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";

const manualAssignmentSchema = z.object({
  time: z.string().min(1, "La hora es obligatoria."),
  type: z.enum(["publica", "rural", "zoom"], { required_error: "Debe seleccionar un tipo." }),
  locationType: z.enum(["territory", "casa"]),
  locationId: z.string().min(1, "Debe seleccionar un lugar."),
  userId: z.string().min(1, "Debe seleccionar un publicador."),
  notes: z.string().max(500).optional(),
});

type ManualAssignmentFormValues = z.infer<typeof manualAssignmentSchema>;

export interface ManualAssignmentSubmitData extends ManualAssignmentFormValues {
    id?: string;
    date: Date;
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
  
  const locationType = form.watch("locationType");
  const selectedType = form.watch("type");
  const selectedUserId = form.watch("userId");

  useEffect(() => {
    if (isOpen) {
        if (assignmentToEdit) {
            const locationIsTerritory = allTerritories.some(t => t.id === assignmentToEdit.locationId);
            form.reset({
                time: assignmentToEdit.time,
                type: assignmentToEdit.type,
                locationType: locationIsTerritory ? 'territory' : 'casa',
                locationId: assignmentToEdit.locationId,
                userId: (assignmentToEdit as any).userId,
                notes: assignmentToEdit.notes,
            });
        } else if (slot) {
            form.reset({
                time: slot.startTime,
                type: slot.type === 'general' ? 'publica' : slot.type,
                locationType: "territory",
                locationId: "",
                userId: "",
                notes: "",
            });
        } else {
            form.reset({
                time: "10:00",
                type: "publica",
                locationType: "territory",
                locationId: "",
                userId: "",
                notes: "",
            });
        }
    }
  }, [isOpen, assignmentToEdit, slot, allTerritories, form]);
  
  useEffect(() => {
    form.setValue("locationId", "");
  }, [locationType, form]);

  const assignedTerritoryIdsInMonth = useMemo(() => {
    return new Set(allAssignmentsForMonth.map(a => a.locationId));
  }, [allAssignmentsForMonth]);

  const availableTerritoriesForSelection = useMemo(() => {
    return allTerritories
      .filter(t => {
        const isCorrectType = t.type === (selectedType === 'rural' ? 'rural' : 'urban');
        const isNotBlocked = !t.isBlocked;
        const isNotAlreadyAssigned = !assignedTerritoryIdsInMonth.has(t.id);
        
        if (isEditMode && assignmentToEdit?.locationId === t.id) {
            return isCorrectType && isNotBlocked;
        }

        return isCorrectType && isNotBlocked && isNotAlreadyAssigned;
      })
      .sort((a, b) => {
        const dateA = a.lastWorked ? new Date(a.lastWorked).getTime() : 0;
        const dateB = b.lastWorked ? new Date(b.lastWorked).getTime() : 0;
        return dateA - dateB;
      })
      .slice(0, 20);
  }, [allTerritories, selectedType, assignedTerritoryIdsInMonth, isEditMode, assignmentToEdit]);

  const availablePublishersForSlot = useMemo(() => {
    if (!date || !slot) return allPublishers;

    const assignmentDate = startOfDay(date);

    return allPublishers.filter(p => {
      const isUnavailable = p.availability?.unavailabilityPeriods?.some(period => {
        const start = startOfDay(period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate));
        const end = endOfDay(period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate));
        return isWithinInterval(assignmentDate, { start, end });
      });

      if (isUnavailable) return false;

      const hasSlot = p.availability?.availableSlotIds?.includes(slot.id);
      return hasSlot;
    });
  }, [allPublishers, date, slot]);
  
  const availableCasasForSlot = useMemo(() => {
      if (!date || !slot) return [];

      const assignmentDate = startOfDay(date);

      return allCasas.filter(c => {
          if (c.blockInfo?.forSystem) return false;

          const isUnavailable = c.unavailabilityPeriods?.some(period => {
              const start = startOfDay(period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate));
              const end = endOfDay(period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate));
              return isWithinInterval(assignmentDate, { start, end });
          });
          if (isUnavailable) return false;

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
        ...values, 
        id: assignmentToEdit?.id, 
        date: dateToSubmit,
        status: assignmentToEdit?.status,
    });
    setIsSubmitting(false);
  }

  const availableLocations = locationType === 'territory' 
    ? availableTerritoriesForSelection 
    : availableCasasForSlot;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Asignación" : "Añadir Asignación Manual"}</DialogTitle>
          <DialogDescription>
             {isEditMode ? `Editando asignación para ${assignmentToEdit?.userName}` : (date ? (slot ? `Añadiendo asignación para el ${format(date, 'PPP', {locale: es})}` : 'Añadiendo asignación manual.') : 'Añadiendo asignación manual.')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
             {(slot) && (
                <div className="grid grid-cols-2 gap-4 rounded-md border bg-muted/50 p-3">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Hora</p>
                        <p className="font-semibold">{slot.startTime}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Tipo</p>
                        <p className="font-semibold capitalize flex items-center"><PreachingTypeIcon type={slot.type} />{slot.type === 'general' ? 'publica' : slot.type}</p>
                    </div>
                </div>
             )}

             {(!slot && !isEditMode) && (
                 <div className="grid grid-cols-2 gap-4">
                     <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="HH:MM" /></SelectTrigger></FormControl>
                            <SelectContent>{Array.from({length: 15}, (_, i) => `${(i+7).toString().padStart(2,'0')}:00`).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="publica">Pública</SelectItem>
                                <SelectItem value="rural">Rural</SelectItem>
                                <SelectItem value="zoom">Zoom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
             )}
             
             {selectedType !== 'zoom' && (
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                        <FormItem><FormLabel>Lugar</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="territory">Territorio</SelectItem><SelectItem value="casa">Casa</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                        <FormItem><FormLabel>&nbsp;</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={`Seleccionar ${locationType === 'territory' ? 'territorio' : 'casa'}`} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {availableLocations.map(loc => {
                            const name = loc.type === 'urban' && (loc as Territory).number ? `U-${(loc as Territory).number}: ${loc.name}` : (loc as Casa).ownerName || loc.name;
                            const isCaptainsHouse = locationType === 'casa' && selectedCaptain && loc.id === selectedCaptain.managedCasaId;
                            return <SelectItem key={loc.id} value={loc.id} className={cn(isCaptainsHouse && "bg-green-100 text-green-900 font-semibold")}>{name}</SelectItem>
                          })}
                        </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )}
                    />
                </div>
             )}

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publicador Encargado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar publicador" /></SelectTrigger></FormControl>
                    <SelectContent>{availablePublishersForSlot.map(p => <SelectItem key={p.id} value={p.firebaseAuthUid || p.id}>{p.name}</SelectItem>)}</SelectContent>
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
