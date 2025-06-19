
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
import type { UserAvailability, ProgramScheduleSlot, DayOfWeek, PreachingType, ScheduleSlotStatus, SettingsDoc } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function DisponibilidadPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userProfile, isLoadingPermissions: isLoadingUserProfile } = usePermissions();

  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isLoadingProgramSlots, setIsLoadingProgramSlots] = useState(true);

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      availableSlotIds: [],
    },
  });

  useEffect(() => {
    async function fetchProgramSlots() {
      if (!db || Object.keys(db).length === 0) {
        toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
        setIsLoadingProgramSlots(false);
        return;
      }
      setIsLoadingProgramSlots(true);
      try {
        const settingsDocRef = doc(db, "settings", "programConfig");
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const settingsData = docSnap.data() as SettingsDoc;
          const slots = settingsData.programScheduleSlots || [];
          setProgramScheduleSlots(slots.sort((a,b) => {
            const dayCompare = WEEK_DAYS_ORDERED.indexOf(a.dayOfWeek) - WEEK_DAYS_ORDERED.indexOf(b.dayOfWeek);
            if (dayCompare !== 0) return dayCompare;
            return a.startTime.localeCompare(b.startTime);
          }));
        } else {
          setProgramScheduleSlots([]);
          toast({ title: "Ajustes no encontrados", description: "No se encontraron los ajustes del programa. Contacta al administrador.", variant: "default" });
        }
      } catch (error) {
        console.error("Error fetching program schedule slots:", error);
        toast({ title: "Error al Cargar Horarios", description: "No se pudieron cargar los horarios del programa.", variant: "destructive" });
        setProgramScheduleSlots([]);
      } finally {
        setIsLoadingProgramSlots(false);
      }
    }
    fetchProgramSlots();
  }, [toast]);

  useEffect(() => {
    if (userProfile?.availability?.availableSlotIds && !isLoadingUserProfile) {
      form.reset({
        availableSlotIds: userProfile.availability.availableSlotIds || [],
      });
    } else if (!isLoadingUserProfile) {
      form.reset({ availableSlotIds: [] });
    }
  }, [userProfile, form, isLoadingUserProfile]);

  async function onSubmit(values: AvailabilityFormValues) {
    if (!userProfile || !userProfile.id) {
      toast({ title: "Error de Usuario", description: "No se pudo identificar al usuario.", variant: "destructive" });
      return;
    }
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    try {
      const userDocRef = doc(db, "users", userProfile.id);
      await updateDoc(userDocRef, {
        "availability.availableSlotIds": values.availableSlotIds || [],
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Disponibilidad Actualizada",
        description: "Tus horarios disponibles han sido guardados.",
      });
    } catch (error) {
      console.error("Error saving availability:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar tu disponibilidad.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingUserProfile || isLoadingProgramSlots) {
    return (
      <div className="space-y-8">
         <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">Mi Disponibilidad</h1>
            <p className="text-muted-foreground mt-1">Cargando configuración...</p>
        </div>
        <Card className="shadow-lg max-w-3xl mx-auto">
            <CardHeader><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
            <CardContent className="space-y-6 py-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
            </CardContent>
            <CardFooter className="border-t pt-6"><Skeleton className="h-10 w-36" /></CardFooter>
        </Card>
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
