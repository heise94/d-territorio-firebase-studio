
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users as UsersTypeIcon, MountainSnow, Video, AlertTriangle, CalendarOff } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import type { UserAvailability, ProgramScheduleSlot, DayOfWeek, PreachingType, ScheduleSlotStatus } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";

// Re-defining or importing constants similar to settings page for consistency
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

// Mock data for program schedule slots - replace with actual data fetching later
const MOCK_PROGRAM_SCHEDULE_SLOTS: ProgramScheduleSlot[] = [
  { id: 'mon-0900-gen', dayOfWeek: 'monday', startTime: '09:00', type: 'general', status: 'fixed' },
  { id: 'mon-1500-zoom', dayOfWeek: 'monday', startTime: '15:00', type: 'zoom', status: 'tentative' },
  { id: 'tue-1000-rur', dayOfWeek: 'tuesday', startTime: '10:00', type: 'rural', status: 'fixed' },
  { id: 'wed-0930-gen', dayOfWeek: 'wednesday', startTime: '09:30', type: 'general', status: 'fixed' },
  { id: 'wed-1600-gen', dayOfWeek: 'wednesday', startTime: '16:00', type: 'general', status: 'tentative' },
  { id: 'thu-1400-zoom', dayOfWeek: 'thursday', startTime: '14:00', type: 'zoom', status: 'fixed' },
  { id: 'fri-1000-gen', dayOfWeek: 'friday', startTime: '10:00', type: 'general', status: 'fixed' },
  { id: 'fri-1700-rur', dayOfWeek: 'friday', startTime: '17:00', type: 'rural', status: 'tentative' },
  { id: 'sat-1000-gen', dayOfWeek: 'saturday', startTime: '10:00', type: 'general', status: 'fixed' },
  { id: 'sat-1100-rur', dayOfWeek: 'saturday', startTime: '11:00', type: 'rural', status: 'fixed' },
  { id: 'sun-1500-zoom', dayOfWeek: 'sunday', startTime: '15:00', type: 'zoom', status: 'fixed' },
];

const availabilityFormSchema = z.object({
  availableSlotIds: z.array(z.string()).optional().default([]),
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

const WEEK_DAYS_ORDERED: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function DisponibilidadPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userProfile, isLoadingPermissions } = usePermissions();

  // TODO: Fetch programScheduleSlots from Firestore settings instead of MOCK_PROGRAM_SCHEDULE_SLOTS
  const programScheduleSlots = useMemo(() => MOCK_PROGRAM_SCHEDULE_SLOTS.sort((a,b) => {
    const dayCompare = WEEK_DAYS_ORDERED.indexOf(a.dayOfWeek) - WEEK_DAYS_ORDERED.indexOf(b.dayOfWeek);
    if (dayCompare !== 0) return dayCompare;
    return a.startTime.localeCompare(b.startTime);
  }), []);


  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      availableSlotIds: [],
    },
  });

  useEffect(() => {
    if (userProfile?.availability?.general && !isLoadingPermissions) { // Temp check for old structure, can be removed later
        console.warn("User has old availability structure. Please migrate to slot IDs.");
    }

    if (userProfile?.availability?.availableSlotIds && !isLoadingPermissions) {
      form.reset({
        availableSlotIds: userProfile.availability.availableSlotIds || [],
      });
    } else if (!isLoadingPermissions) {
      form.reset({ availableSlotIds: [] });
    }
  }, [userProfile, form, isLoadingPermissions]);

  async function onSubmit(values: AvailabilityFormValues) {
    setIsSubmitting(true);
    console.log("Disponibilidad guardada (simulación):", values.availableSlotIds);
    
    // TODO: Aquí iría la lógica para guardar `values.availableSlotIds` en Firestore para el usuario actual
    // Ejemplo: await updateDoc(doc(db, "users", userProfile.id), { "availability.availableSlotIds": values.availableSlotIds, updatedAt: serverTimestamp() });

    await new Promise(resolve => setTimeout(resolve, 700)); 

    toast({
      title: "Disponibilidad Actualizada",
      description: "Tus horarios disponibles han sido guardados (simulación).",
    });
    setIsSubmitting(false);
  }

  if (isLoadingPermissions) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Mi Disponibilidad</h1>
        <p className="text-muted-foreground mt-1">
          Selecciona los horarios del programa en los que estás disponible para participar.
        </p>
      </div>

      <Card className="shadow-lg max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Seleccionar Horarios Disponibles</CardTitle>
          <CardDescription>
            Marca los turnos específicos para los que ofreces tu disponibilidad.
            Los horarios tentativos están marcados con una alerta.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 py-4">
              {programScheduleSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-lg border border-dashed">
                    <CalendarOff className="h-16 w-16 text-muted-foreground/70 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-1">No hay horarios de programa configurados.</p>
                    <p className="text-sm text-muted-foreground">
                        Contacta al administrador para configurar los horarios del programa en la sección de Ajustes.
                    </p>
                </div>
              ) : (
                WEEK_DAYS_ORDERED.map(dayKey => {
                  const slotsForDay = programScheduleSlots.filter(slot => slot.dayOfWeek === dayKey);
                  if (slotsForDay.length === 0) {
                    return (
                      <div key={dayKey} className="rounded-md border p-4 shadow-sm bg-card">
                        <h3 className="text-lg font-semibold mb-2">{dayOfWeekLabels[dayKey]}</h3>
                        <p className="text-sm text-muted-foreground text-center py-3">No hay horarios programados para este día.</p>
                      </div>
                    );
                  }
                  return (
                    <div key={dayKey} className="rounded-md border p-4 shadow-sm bg-card">
                      <h3 className="text-lg font-semibold mb-3">{dayOfWeekLabels[dayKey]}</h3>
                      <div className="space-y-3">
                        {slotsForDay.map(slot => (
                          <FormField
                            key={slot.id}
                            control={form.control}
                            name="availableSlotIds"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-muted/20 hover:bg-muted/30 transition-colors shadow-sm">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(slot.id)}
                                    onCheckedChange={(checked) => {
                                      const currentSelection = field.value || [];
                                      return checked
                                        ? field.onChange([...currentSelection, slot.id])
                                        : field.onChange(currentSelection.filter(id => id !== slot.id));
                                    }}
                                    id={`slot-${slot.id}`}
                                  />
                                </FormControl>
                                <FormLabel htmlFor={`slot-${slot.id}`} className="font-normal text-sm cursor-pointer flex-grow flex items-center justify-between w-full">
                                  <div className="flex items-center">
                                    <PreachingTypeIcon type={slot.type} className="text-foreground/80" />
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
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isSubmitting || programScheduleSlots.length === 0} size="lg" className="w-full sm:w-auto">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Save className="mr-2 h-5 w-5" />
                )}
                Guardar Cambios
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
