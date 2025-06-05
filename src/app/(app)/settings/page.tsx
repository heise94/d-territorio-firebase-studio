
"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, CalendarCog, ShieldAlert, Users as UsersIconLucide, Palette, Hourglass, PlusCircle, Trash2, Video, MountainSnow, Users as UsersTypeIcon, AlertTriangle, Edit2, GanttChartSquare, Save } from "lucide-react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { ProgramScheduleSlot, DayOfWeek, PreachingType, ScheduleSlotStatus } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// Schema for the slot form (inside the dialog)
const scheduleSlotFormSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Debe ser formato HH:mm."),
  type: z.enum(['general', 'rural', 'zoom'], { required_error: "Debes seleccionar un tipo." }),
  status: z.enum(['fixed', 'tentative'], { required_error: "Debes seleccionar un estado." }),
});

type ScheduleSlotFormValues = z.infer<typeof scheduleSlotFormSchema>;

const dayOfWeekLabels: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const dayOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PreachingTypeIcon = ({ type, className }: { type: PreachingType, className?: string }) => {
  const defaultClass = "mr-2 h-5 w-5 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersTypeIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  if (type === 'zoom') return <Video className={combinedClass} />;
  return null;
};

export default function SettingsPage() {
  const [scheduleSlots, setScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isAddSlotDialogOpen, setIsAddSlotDialogOpen] = useState(false);
  const [dayForNewSlot, setDayForNewSlot] = useState<DayOfWeek | null>(null);
  const { toast } = useToast();
  const [isSubmittingDialog, setIsSubmittingDialog] = useState(false);
  
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<DayOfWeek[]>([]);
  const [isSavingGroupOrganizedDays, setIsSavingGroupOrganizedDays] = useState(false);


  const form = useForm<ScheduleSlotFormValues>({
    resolver: zodResolver(scheduleSlotFormSchema),
    defaultValues: {
      startTime: "",
      type: undefined,
      status: "fixed",
    },
  });

  const handleOpenAddDialog = (day: DayOfWeek) => {
    setDayForNewSlot(day);
    form.reset({startTime: "", type: undefined, status: "fixed"}); 
    setIsAddSlotDialogOpen(true);
  };

  const onSubmitDialog: SubmitHandler<ScheduleSlotFormValues> = async (data) => {
    if (!dayForNewSlot) return;
    setIsSubmittingDialog(true);

    const newSlot: ProgramScheduleSlot = {
      id: crypto.randomUUID(),
      dayOfWeek: dayForNewSlot,
      startTime: data.startTime,
      type: data.type as PreachingType,
      status: data.status as ScheduleSlotStatus,
    };

    await new Promise(resolve => setTimeout(resolve, 500));

    setScheduleSlots((prev) => [...prev, newSlot].sort((a,b) => {
        const dayCompare = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayCompare !== 0) return dayCompare;
        return a.startTime.localeCompare(b.startTime);
    }));
    toast({ title: "Horario Añadido", description: `Nuevo horario para ${dayOfWeekLabels[dayForNewSlot]} a las ${data.startTime} (simulación).` });
    
    setIsSubmittingDialog(false);
    setIsAddSlotDialogOpen(false);
    form.reset();
  };

  const handleDeleteSlot = (slotId: string) => {
    setScheduleSlots((prev) => prev.filter(slot => slot.id !== slotId));
    toast({ title: "Horario Eliminado", description: "El horario ha sido eliminado (simulación).", variant: "destructive" });
  };

  const handleGroupOrganizedDayChange = (day: DayOfWeek, checked: boolean) => {
    setGroupOrganizedDays(prev => 
      checked ? [...prev, day] : prev.filter(d => d !== day)
    );
  };

  const handleSaveGroupOrganizedDays = async () => {
    setIsSavingGroupOrganizedDays(true);
    // Simulate API call to save groupOrganizedDays to Firestore
    await new Promise(resolve => setTimeout(resolve, 700));
    console.log("Días organizados por grupo guardados (simulación):", groupOrganizedDays);
    toast({
      title: "Configuración Guardada",
      description: "Los días de predicación organizados por grupos han sido actualizados (simulación).",
    });
    setIsSavingGroupOrganizedDays(false);
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Configuración General</h1>
        <p className="text-muted-foreground mt-1">
          Ajusta los parámetros y preferencias de D-TERRITORIO.
        </p>
      </div>

      <Separator />

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <CalendarCog className="mr-3 h-6 w-6 text-primary" />
            Ajustes del Programa Semanal
          </CardTitle>
          <CardDescription>
            Define los horarios fijos y tentativos para la predicación durante la semana, y qué días son organizados por los grupos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dayOrder.map(dayKey => {
              const slotsForDay = scheduleSlots.filter(slot => slot.dayOfWeek === dayKey).sort((a,b) => a.startTime.localeCompare(b.startTime));
              return (
                <Card key={dayKey} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{dayOfWeekLabels[dayKey]}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2 min-h-[100px]">
                    {slotsForDay.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No hay horarios para este día.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {slotsForDay.map(slot => (
                          <li key={slot.id} className="flex justify-between items-center p-2 border rounded-md text-xs shadow-sm hover:shadow-md transition-shadow bg-card/80">
                            <div className="flex items-center">
                              <PreachingTypeIcon type={slot.type} className="h-4 w-4"/>
                              <span className="font-medium">{slot.startTime}</span>
                              <span className="text-muted-foreground mx-1">-</span>
                              <span className="capitalize text-muted-foreground/80">{slot.type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Badge variant={slot.status === 'tentative' ? 'outline' : 'default'} className={`capitalize text-[0.7rem] px-1.5 py-0.5 ${slot.status === 'tentative' ? 'border-amber-500 text-amber-600' : ''}`}>
                                    {slot.status === 'fixed' ? 'Fijo' : 'Tentativo'}
                                    {slot.status === 'tentative' && <AlertTriangle className="ml-1 h-3 w-3" />}
                                </Badge>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteSlot(slot.id)} className="h-6 w-6 text-destructive hover:text-destructive/80">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                  <CardFooter className="border-t pt-3">
                    <Button size="sm" onClick={() => handleOpenAddDialog(dayKey)} className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir Horario
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <Separator className="my-8" />

          <div>
            <h3 className="text-lg font-medium mb-1 flex items-center">
                <GanttChartSquare className="mr-2 h-5 w-5 text-primary" />
                Días Organizados por Grupos de Predicación
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Marca los días en que la organización de la predicación recae directamente en los grupos.
              La IA no asignará horarios centralizados para estos días.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 p-4 border rounded-md shadow-sm bg-muted/20">
              {dayOrder.map(dayKey => (
                <div key={`group-day-${dayKey}`} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
                  <Checkbox
                    id={`group-organized-${dayKey}`}
                    checked={groupOrganizedDays.includes(dayKey)}
                    onCheckedChange={(checked) => {
                      handleGroupOrganizedDayChange(dayKey, !!checked);
                    }}
                  />
                  <label
                    htmlFor={`group-organized-${dayKey}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {dayOfWeekLabels[dayKey]}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveGroupOrganizedDays} disabled={isSavingGroupOrganizedDays}>
                {isSavingGroupOrganizedDays && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Guardar Días Grupales
                </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      <Dialog open={isAddSlotDialogOpen} onOpenChange={(isOpen) => {
          setIsAddSlotDialogOpen(isOpen);
          if (!isOpen) {
            form.reset();
            setDayForNewSlot(null);
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Añadir Nuevo Horario para {dayForNewSlot ? dayOfWeekLabels[dayForNewSlot] : ''}
            </DialogTitle>
            <DialogDescription>
              Completa los detalles para el nuevo horario.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitDialog)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Predicación</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="rural">Rural</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado del Horario</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fijo</SelectItem>
                        <SelectItem value="tentative">Tentativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmittingDialog}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmittingDialog}>
                  {isSubmittingDialog && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Añadir Horario
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      {/* Placeholder Cards for other settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Briefcase className="mr-3 h-6 w-6 text-primary" />
              Gestión de Campañas
            </CardTitle>
            <CardDescription>
              Define y administra campañas especiales de predicación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Próximamente...</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <ShieldAlert className="mr-3 h-6 w-6 text-primary" />
              Roles y Permisos
            </CardTitle>
            <CardDescription>
              Administra los roles de usuario y sus permisos detallados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Próximamente...</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <UsersIconLucide className="mr-3 h-6 w-6 text-primary" />
              Días Festivos Personalizados
            </CardTitle>
            <CardDescription>
              Añade días festivos específicos que afecten la programación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Próximamente...</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Palette className="mr-3 h-6 w-6 text-primary" />
              Apariencia y Tema
            </CardTitle>
            <CardDescription>
              Personaliza los colores y el tema de la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Próximamente...</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Hourglass className="mr-3 h-6 w-6 text-primary" />
              Tiempos y Duraciones
            </CardTitle>
            <CardDescription>
              Define duraciones predeterminadas para turnos, reuniones, etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Próximamente...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
