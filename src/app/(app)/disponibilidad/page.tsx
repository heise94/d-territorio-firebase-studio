
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users as UsersTypeIcon, MountainSnow, Video, AlertTriangle, CalendarOff, Home, Trash2, PlusCircle, CalendarIcon, User, Building, UserX } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import type { UserAvailability, ProgramScheduleSlot, DayOfWeek, PreachingType, ScheduleSlotStatus, SettingsDoc, Casa, UnavailabilityPeriod } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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

const unavailabilityPeriodSchema = z.object({
  id: z.string().optional(),
  startDate: z.date({ required_error: "Fecha de inicio es obligatoria." }),
  endDate: z.date({ required_error: "Fecha de fin es obligatoria." }),
  reason: z.string().max(100, "Máximo 100 caracteres.").optional().or(z.literal('')),
}).refine(data => data.endDate >= data.startDate, {
  message: "Fecha de fin debe ser igual o posterior a la de inicio.",
  path: ["endDate"],
});


const personalAvailabilityFormSchema = z.object({
  availableSlotIds: z.array(z.string()).optional().default([]),
  unavailabilityPeriods: z.array(unavailabilityPeriodSchema).optional().default([]),
});

type PersonalAvailabilityFormValues = z.infer<typeof personalAvailabilityFormSchema>;

const casaManagementFormSchema = z.object({
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200),
  availableProgramSlotIds: z.array(z.string()).optional().default([]),
  unavailabilityPeriods: z.array(unavailabilityPeriodSchema).optional().default([]),
});

type CasaManagementFormValues = z.infer<typeof casaManagementFormSchema>;

const WEEK_DAYS_ORDERED: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function DisponibilidadPage() {
  const { toast } = useToast();
  const [isSubmittingPersonal, setIsSubmittingPersonal] = useState(false);
  const [isSubmittingCasa, setIsSubmittingCasa] = useState(false);
  const { userProfile, isLoadingPermissions: isLoadingUserProfile } = usePermissions();

  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isLoadingProgramSlots, setIsLoadingProgramSlots] = useState(true);

  const [managedCasa, setManagedCasa] = useState<Casa | null>(null);
  const [isLoadingCasa, setIsLoadingCasa] = useState(false);

  const personalAvailabilityForm = useForm<PersonalAvailabilityFormValues>({
    resolver: zodResolver(personalAvailabilityFormSchema),
    defaultValues: {
      availableSlotIds: [],
      unavailabilityPeriods: [],
    },
  });

  const { fields: unavailabilityUserFields, append: appendUserUnavailability, remove: removeUserUnavailability } = useFieldArray({
    control: personalAvailabilityForm.control,
    name: "unavailabilityPeriods",
  });

  const casaManagementForm = useForm<CasaManagementFormValues>({
    resolver: zodResolver(casaManagementFormSchema),
    defaultValues: {
      address: "",
      availableProgramSlotIds: [],
      unavailabilityPeriods: [],
    }
  });

  const { fields: unavailabilityCasaFields, append: appendCasaUnavailability, remove: removeCasaUnavailability } = useFieldArray({
    control: casaManagementForm.control,
    name: "unavailabilityPeriods",
  });
  
  const casaSpecificScheduleSlots = useMemo(() => {
    return programScheduleSlots.filter(slot => slot.type !== 'zoom');
  }, [programScheduleSlots]);

  // Fetch Program Slots
  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingProgramSlots(false);
      return;
    }
    setIsLoadingProgramSlots(true);
    const settingsDocRef = doc(db, "settings", "programConfig");
    const unsubscribeSlots = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const settingsData = docSnap.data() as SettingsDoc;
          setProgramScheduleSlots(settingsData.programScheduleSlots || []);
        } else {
          setProgramScheduleSlots([]);
        }
        setIsLoadingProgramSlots(false);
    }, (error) => {
        console.error("Error fetching program schedule slots:", error);
        toast({ title: "Error al Cargar Horarios", description: "No se pudieron cargar los horarios del programa.", variant: "destructive" });
        setIsLoadingProgramSlots(false);
    });
    return () => unsubscribeSlots();
  }, [toast]);

  // Fetch Managed Casa
  useEffect(() => {
    let unsubscribeCasa: (() => void) | undefined;
    if (userProfile?.managedCasaId) {
      setIsLoadingCasa(true);
      const casaDocRef = doc(db, "casas", userProfile.managedCasaId);
      unsubscribeCasa = onSnapshot(casaDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setManagedCasa({ id: docSnap.id, ...docSnap.data() } as Casa);
        } else {
          setManagedCasa(null);
          toast({ title: "Casa no encontrada", description: "La casa que gestionabas ya no existe.", variant: "destructive" });
        }
        setIsLoadingCasa(false);
      }, (error) => {
        console.error("Error fetching managed casa:", error);
        setIsLoadingCasa(false);
      });
    } else {
      setManagedCasa(null);
    }
    return () => {
      if (unsubscribeCasa) unsubscribeCasa();
    };
  }, [userProfile?.managedCasaId, toast]);

  // Populate Forms
  useEffect(() => {
    if (userProfile && !isLoadingUserProfile) {
      personalAvailabilityForm.reset({
        availableSlotIds: userProfile.availability?.availableSlotIds || [],
        unavailabilityPeriods: (userProfile.availability?.unavailabilityPeriods || []).map(p => ({
          id: p.id,
          startDate: p.startDate instanceof Timestamp ? p.startDate.toDate() : new Date(p.startDate),
          endDate: p.endDate instanceof Timestamp ? p.endDate.toDate() : new Date(p.endDate),
          reason: p.reason || "",
        })),
      });
    }
  }, [userProfile, personalAvailabilityForm, isLoadingUserProfile]);

  useEffect(() => {
    if (managedCasa) {
      casaManagementForm.reset({
        address: managedCasa.address || "",
        availableProgramSlotIds: managedCasa.availableDays?.availableProgramSlotIds || [],
        unavailabilityPeriods: (managedCasa.unavailabilityPeriods || []).map(p => ({
          id: p.id,
          startDate: p.startDate instanceof Timestamp ? p.startDate.toDate() : new Date(p.startDate),
          endDate: p.endDate instanceof Timestamp ? p.endDate.toDate() : new Date(p.endDate),
          reason: p.reason || "",
        })),
      });
    }
  }, [managedCasa, casaManagementForm]);

  async function onPersonalAvailabilitySubmit(values: PersonalAvailabilityFormValues) {
    if (!userProfile || !userProfile.id) {
      toast({ title: "Error de Usuario", description: "No se pudo identificar al usuario.", variant: "destructive" });
      return;
    }
    setIsSubmittingPersonal(true);
    const userDocRef = doc(db, "users", userProfile.id);
    await updateDoc(userDocRef, {
      "availability.availableSlotIds": values.availableSlotIds || [],
      "availability.unavailabilityPeriods": (values.unavailabilityPeriods || []).map(p => ({
        ...p,
        startDate: Timestamp.fromDate(p.startDate),
        endDate: Timestamp.fromDate(p.endDate),
      })),
      updatedAt: serverTimestamp()
    }).then(() => {
        toast({ title: "Disponibilidad Actualizada", description: "Tus horarios disponibles han sido guardados." });
    }).catch(error => {
        console.error("Error saving user availability:", error);
        toast({ title: "Error al Guardar", description: "No se pudo guardar tu disponibilidad.", variant: "destructive" });
    }).finally(() => {
        setIsSubmittingPersonal(false);
    });
  }

  async function onCasaManagementSubmit(values: CasaManagementFormValues) {
    if (!managedCasa) {
      toast({ title: "Error", description: "No hay una casa que gestionar.", variant: "destructive" });
      return;
    }
    setIsSubmittingCasa(true);
    const casaDocRef = doc(db, "casas", managedCasa.id);
    await updateDoc(casaDocRef, {
      address: values.address,
      "availableDays.availableProgramSlotIds": values.availableProgramSlotIds || [],
      unavailabilityPeriods: (values.unavailabilityPeriods || []).map(p => ({
        ...p,
        startDate: Timestamp.fromDate(p.startDate),
        endDate: Timestamp.fromDate(p.endDate),
      })),
      updatedAt: serverTimestamp()
    }).then(() => {
        toast({ title: "Casa Actualizada", description: "Los detalles de tu casa han sido actualizados." });
    }).catch(error => {
        console.error("Error saving casa details:", error);
        toast({ title: "Error al Guardar", description: "No se pudieron guardar los detalles de la casa.", variant: "destructive" });
    }).finally(() => {
        setIsSubmittingCasa(false);
    });
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
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">Mi Disponibilidad</h1>
            <p className="text-muted-foreground mt-1">
                Gestiona tus horarios personales y, si aplica, la disponibilidad de tu casa de reunión.
            </p>
        </div>

        <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full md:w-[500px] grid-cols-2">
                <TabsTrigger value="personal">
                    <User className="mr-2 h-4 w-4" />
                    Disponibilidad Personal
                </TabsTrigger>
                {managedCasa && (
                    <TabsTrigger value="casa">
                        <Building className="mr-2 h-4 w-4" />
                        Disponibilidad Casa
                    </TabsTrigger>
                )}
            </TabsList>
            <TabsContent value="personal" className="mt-6">
                <Form {...personalAvailabilityForm}>
                <form onSubmit={personalAvailabilityForm.handleSubmit(onPersonalAvailabilitySubmit)}>
                    <Card className="shadow-lg max-w-3xl mx-auto mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center text-xl"><CalendarIcon className="mr-3 h-6 w-6 text-primary" />Horarios Semanales</CardTitle>
                            <CardDescription>Selecciona los horarios fijos en los que puedes participar en la predicación.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 py-6">
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
                                        control={personalAvailabilityForm.control}
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
                    </Card>

                    <Card className="shadow-lg max-w-3xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center text-xl"><UserX className="mr-3 h-6 w-6 text-primary" />Mis Períodos de Indisponibilidad</CardTitle>
                            <CardDescription>Añade fechas en las que no estarás disponible (vacaciones, etc.). La IA no te asignará en estos períodos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-3">
                                {unavailabilityUserFields.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end p-3 border rounded-md relative bg-muted/20">
                                        <FormField control={personalAvailabilityForm.control} name={`unavailabilityPeriods.${index}.startDate`} render={({ field }) => (
                                            <FormItem className="flex flex-col"><FormLabel className="text-xs">Inicio</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("text-left font-normal bg-card", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", {locale: es}) : "Seleccionar"}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={personalAvailabilityForm.control} name={`unavailabilityPeriods.${index}.endDate`} render={({ field }) => (
                                            <FormItem className="flex flex-col"><FormLabel className="text-xs">Fin</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("text-left font-normal bg-card", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", {locale: es}) : "Seleccionar"}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => personalAvailabilityForm.getValues(`unavailabilityPeriods.${index}.startDate`) ? date < personalAvailabilityForm.getValues(`unavailabilityPeriods.${index}.startDate`) : false} /></PopoverContent></Popover><FormMessage /></FormItem>
                                        )}/>
                                        <div className="sm:col-span-2">
                                            <FormField control={personalAvailabilityForm.control} name={`unavailabilityPeriods.${index}.reason`} render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Razón (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Vacaciones" {...field} className="bg-card"/></FormControl><FormMessage /></FormItem>
                                            )}/>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeUserUnavailability(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendUserUnavailability({ startDate: new Date(), endDate: new Date(), reason: ""})}><PlusCircle className="mr-2 h-4 w-4" />Añadir Período</Button>
                            </div>
                        </CardContent>
                         <CardFooter className="border-t pt-6">
                            <Button type="submit" disabled={isSubmittingPersonal || programScheduleSlots.length === 0} size="lg" className="w-full sm:w-auto">
                                {isSubmittingPersonal ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (<Save className="mr-2 h-5 w-5" />)}
                                Guardar mi Disponibilidad
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
                </Form>
            </TabsContent>
            
            <TabsContent value="casa" className="mt-6">
                {isLoadingCasa && (
                    <Card className="shadow-lg max-w-3xl mx-auto">
                    <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                    <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                    </Card>
                )}

                {managedCasa && (
                    <Card className="shadow-lg max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                            <Home className="mr-3 h-6 w-6 text-primary" />
                            Disponibilidad Casa
                        </CardTitle>
                        <CardDescription>
                            Aquí puedes actualizar la dirección, disponibilidad y períodos de vacaciones de tu casa: <span className="font-semibold text-foreground">{managedCasa.ownerName}</span>.
                        </CardDescription>
                    </CardHeader>
                    <Form {...casaManagementForm}>
                        <form onSubmit={casaManagementForm.handleSubmit(onCasaManagementSubmit)}>
                        <CardContent className="space-y-6 py-4">
                            <FormField control={casaManagementForm.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dirección</FormLabel>
                                <FormControl><Textarea placeholder="Ej: Calle Falsa 123, Depto 4B" {...field} rows={2} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )} />

                            <div className="space-y-3">
                            <FormLabel className="font-medium">Disponibilidad de la Casa (Horarios del Programa)</FormLabel>
                            <FormDescription>Selecciona los horarios en que tu casa está disponible.</FormDescription>
                            <div className="max-h-60 overflow-y-auto space-y-2 p-2 border rounded-md">
                                {WEEK_DAYS_ORDERED.map(dayKey => {
                                    const slotsForDay = casaSpecificScheduleSlots.filter(slot => slot.dayOfWeek === dayKey);
                                    if(slotsForDay.length === 0) return null;
                                    return (<div key={`casa-${dayKey}`} className="space-y-2">
                                    <h4 className="text-sm font-semibold">{dayOfWeekLabels[dayKey]}</h4>
                                        {slotsForDay.map(slot => (
                                        <FormField key={slot.id} control={casaManagementForm.control} name="availableProgramSlotIds" render={({ field }) => (
                                            <FormItem className="flex items-center space-x-3 space-y-0 pl-2">
                                            <FormControl><Checkbox checked={field.value?.includes(slot.id)} onCheckedChange={(checked) => {
                                                return checked ? field.onChange([...field.value || [], slot.id]) : field.onChange((field.value || []).filter(id => id !== slot.id))
                                            }} /></FormControl>
                                            <FormLabel className="font-normal text-sm">{slot.startTime} - {slot.type}</FormLabel>
                                            </FormItem>
                                        )} />
                                        ))}
                                    </div>)
                                })}
                            </div>
                            </div>

                            <div className="space-y-3">
                                <FormLabel className="font-medium">Períodos de Indisponibilidad (Vacaciones, etc.)</FormLabel>
                                {unavailabilityCasaFields.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end p-3 border rounded-md relative">
                                        <FormField control={casaManagementForm.control} name={`unavailabilityPeriods.${index}.startDate`} render={({ field }) => (
                                            <FormItem className="flex flex-col"><FormLabel className="text-xs">Inicio</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", {locale: es}) : "Seleccionar"}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={casaManagementForm.control} name={`unavailabilityPeriods.${index}.endDate`} render={({ field }) => (
                                            <FormItem className="flex flex-col"><FormLabel className="text-xs">Fin</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", {locale: es}) : "Seleccionar"}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => casaManagementForm.getValues(`unavailabilityPeriods.${index}.startDate`) ? date < casaManagementForm.getValues(`unavailabilityPeriods.${index}.startDate`) : false} /></PopoverContent></Popover><FormMessage /></FormItem>
                                        )}/>
                                        <div className="sm:col-span-2">
                                            <FormField control={casaManagementForm.control} name={`unavailabilityPeriods.${index}.reason`} render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Razón (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Vacaciones" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCasaUnavailability(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendCasaUnavailability({ startDate: new Date(), endDate: new Date(), reason: ""})}><PlusCircle className="mr-2 h-4 w-4" />Añadir Período</Button>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-6">
                            <Button type="submit" disabled={isSubmittingCasa} size="lg" className="w-full sm:w-auto">
                                {isSubmittingCasa && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                Guardar Cambios de la Casa
                            </Button>
                        </CardFooter>
                        </form>
                    </Form>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
    </div>
  );
}
