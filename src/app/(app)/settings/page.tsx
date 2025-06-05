
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, CalendarCog, ShieldAlert, Users as UsersIconLucide, Palette, Hourglass, PlusCircle, Trash2, Video, MountainSnow, Users as UsersTypeIcon, AlertTriangle } from "lucide-react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { ProgramScheduleSlot, DayOfWeek, PreachingType, ScheduleSlotStatus } from "@/types";
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

const scheduleSlotFormSchema = z.object({
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], {
    required_error: "Debes seleccionar un día.",
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Debe ser formato HH:mm."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Debe ser formato HH:mm.").optional().or(z.literal('')),
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
  const defaultClass = "mr-2 h-5 w-5";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersTypeIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  if (type === 'zoom') return <Video className={combinedClass} />;
  return null;
};

export default function SettingsPage() {
  const [scheduleSlots, setScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const { toast } = useToast();

  const form = useForm<ScheduleSlotFormValues>({
    resolver: zodResolver(scheduleSlotFormSchema),
    defaultValues: {
      dayOfWeek: undefined,
      startTime: "",
      endTime: "",
      type: undefined,
      status: "fixed",
    },
  });

  const onSubmit: SubmitHandler<ScheduleSlotFormValues> = (data) => {
    const newSlot: ProgramScheduleSlot = {
      id: crypto.randomUUID(),
      dayOfWeek: data.dayOfWeek as DayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime || undefined,
      type: data.type as PreachingType,
      status: data.status as ScheduleSlotStatus,
    };
    setScheduleSlots((prev) => [...prev, newSlot].sort((a,b) => {
        const dayCompare = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayCompare !== 0) return dayCompare;
        return a.startTime.localeCompare(b.startTime);
    }));
    toast({ title: "Horario Añadido", description: `Nuevo horario para ${dayOfWeekLabels[data.dayOfWeek as DayOfWeek]} a las ${data.startTime} (simulación).` });
    form.reset();
  };

  const handleDeleteSlot = (slotId: string) => {
    setScheduleSlots((prev) => prev.filter(slot => slot.id !== slotId));
    toast({ title: "Horario Eliminado", description: "El horario ha sido eliminado (simulación).", variant: "destructive" });
  };

  const groupedSlots = scheduleSlots.reduce((acc, slot) => {
    (acc[slot.dayOfWeek] = acc[slot.dayOfWeek] || []).push(slot);
    return acc;
  }, {} as Record<DayOfWeek, ProgramScheduleSlot[]>);


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
            Define los horarios fijos y tentativos para la predicación durante la semana. Estos horarios se usarán para generar el programa mensual y para que los publicadores indiquen su disponibilidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 border rounded-lg space-y-4 shadow bg-muted/20">
              <h3 className="text-lg font-medium mb-3">Añadir Nuevo Horario Semanal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Día de la Semana</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un día" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dayOrder.map(day => (
                            <SelectItem key={day} value={day}>{dayOfWeekLabels[day]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora Fin (Opcional)</FormLabel>
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
                 <Button type="submit" className="self-end mt-4 md:col-span-2 lg:col-span-1">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Añadir Horario
                </Button>
              </div>
            </form>
          </Form>

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-medium mb-3">Horarios Configurados</h3>
            {scheduleSlots.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay horarios configurados todavía.</p>
            ) : (
              <div className="space-y-4">
                {dayOrder.map(dayKey => (
                  groupedSlots[dayKey] && groupedSlots[dayKey].length > 0 && (
                    <div key={dayKey}>
                      <h4 className="text-md font-semibold mb-2 pb-1 border-b">{dayOfWeekLabels[dayKey]}</h4>
                      <ul className="space-y-2">
                        {groupedSlots[dayKey].map(slot => (
                          <li key={slot.id} className="flex justify-between items-center p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow bg-card">
                            <div className="flex items-center">
                              <PreachingTypeIcon type={slot.type} />
                              <span className="font-medium">{slot.startTime}{slot.endTime ? ` - ${slot.endTime}` : ''}</span>
                              <span className="text-muted-foreground mx-2">-</span>
                              <span className="capitalize">{slot.type}</span>
                              <Badge variant={slot.status === 'tentative' ? 'outline' : 'default'} className={`ml-3 capitalize ${slot.status === 'tentative' ? 'border-amber-500 text-amber-600' : ''}`}>
                                {slot.status === 'fixed' ? 'Fijo' : 'Tentativo'}
                                {slot.status === 'tentative' && <AlertTriangle className="ml-1.5 h-3.5 w-3.5" />}
                              </Badge>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSlot(slot.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder Cards for other settings */}
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
