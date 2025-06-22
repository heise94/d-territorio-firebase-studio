
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
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users as UsersTypeIcon, MountainSnow, Video, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import type { UserProfile, ProgramScheduleSlot, DayOfWeek, PreachingType } from "@/types";
import { Badge } from "@/components/ui/badge";

const dayOfWeekLabels: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const PreachingTypeIcon = ({ type, className }: { type: PreachingType, className?: string }) => {
  const defaultClass = "mr-2 h-5 w-5 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersTypeIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  if (type === 'zoom') return <Video className={combinedClass} />;
  return null;
};

const availabilityFormSchema = z.object({
  availableSlotIds: z.array(z.string()).optional().default([]),
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

const WEEK_DAYS_ORDERED: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface EditUserAvailabilityDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onAvailabilityUpdate: (userId: string, availability: { availableSlotIds: string[] }) => Promise<void>;
    userToEdit: UserProfile | null;
    programScheduleSlots: ProgramScheduleSlot[];
}

export function EditUserAvailabilityDialog({ isOpen, onOpenChange, onAvailabilityUpdate, userToEdit, programScheduleSlots }: EditUserAvailabilityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      availableSlotIds: [],
    },
  });

  useEffect(() => {
    if (userToEdit && isOpen) {
      form.reset({
        availableSlotIds: userToEdit.availability?.availableSlotIds || [],
      });
    }
  }, [isOpen, userToEdit, form]);

  async function onSubmit(values: AvailabilityFormValues) {
    if (!userToEdit) return;
    setIsSubmitting(true);
    try {
        await onAvailabilityUpdate(userToEdit.id, { availableSlotIds: values.availableSlotIds || [] });
        onOpenChange(false);
    } catch (error) {
        toast({ title: "Error", description: "No se pudo actualizar la disponibilidad.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (!userToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Disponibilidad de {userToEdit.name}</DialogTitle>
          <DialogDescription>
            Selecciona los horarios del programa en los que este usuario está disponible.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 pr-1">
            <div className="space-y-4 max-h-[55vh] overflow-y-auto p-1">
              {programScheduleSlots.length === 0 ? (
                 <p className="text-sm text-muted-foreground text-center py-6">No hay horarios de programa configurados en Ajustes.</p>
              ) : (
                WEEK_DAYS_ORDERED.map(dayKey => {
                  const slotsForDay = programScheduleSlots.filter(slot => slot.dayOfWeek === dayKey);
                  if (slotsForDay.length === 0) return null;
                  
                  return (
                    <div key={dayKey} className="rounded-md border p-3 shadow-sm bg-card">
                      <h3 className="text-md font-semibold mb-2">{dayOfWeekLabels[dayKey]}</h3>
                      <div className="space-y-2">
                        {slotsForDay.map(slot => (
                          <FormField
                            key={slot.id}
                            control={form.control}
                            name="availableSlotIds"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-2.5 bg-muted/30 hover:bg-muted/40 transition-colors shadow-sm">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(slot.id)}
                                    onCheckedChange={(checked) => {
                                      const currentSelection = field.value || [];
                                      return checked
                                        ? field.onChange([...currentSelection, slot.id])
                                        : field.onChange(currentSelection.filter(id => id !== slot.id));
                                    }}
                                    id={`slot-${userToEdit.id}-${slot.id}`}
                                  />
                                </FormControl>
                                <FormLabel htmlFor={`slot-${userToEdit.id}-${slot.id}`} className="font-normal text-sm cursor-pointer flex-grow flex items-center justify-between w-full">
                                  <div className="flex items-center">
                                    <PreachingTypeIcon type={slot.type} className="text-foreground/80 h-4 w-4" />
                                    <span className="font-medium">{slot.startTime}</span>
                                    <span className="text-muted-foreground mx-1.5">-</span>
                                    <span className="capitalize text-foreground/90">{slot.type}</span>
                                  </div>
                                  {slot.status === 'tentative' && (
                                    <Badge variant="outline" className="ml-auto text-amber-600 border-amber-500 px-1.5 py-0.5 text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Tentativo
                                    </Badge>
                                  )}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <DialogFooter className="pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || programScheduleSlots.length === 0}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
