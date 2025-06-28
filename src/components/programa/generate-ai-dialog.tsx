"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bot, CalendarDays, AlertTriangle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, getDaysInMonth, getDay, startOfMonth, addDays, isSameMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { CustomHoliday, PreachingType, ProgramScheduleSlot } from "@/types";
import { Timestamp } from "firebase/firestore";

const holidayOverrideSchema = z.object({
  date: z.string(),
  name: z.string(),
  enabled: z.boolean().default(false),
  hour: z.string().optional(),
  minute: z.string().optional(),
  type: z.enum(['general', 'rural', 'zoom']).optional(),
}).refine(data => {
    if (!data.enabled) return true;
    return !!data.hour && !!data.minute && !!data.type;
}, {
    message: "Si se habilita, la hora, minuto y tipo son obligatorios.",
    path: ["hour"],
});


const generateAIDialogSchema = z.object({
  assignLocations: z.boolean().default(true),
  assignCaptains: z.boolean().default(true),
  additionalInstructions: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
  holidayOverrides: z.array(holidayOverrideSchema).optional(),
  designatedRuralWeekendDays: z.array(z.string()).optional().default([]),
});

type GenerateAIDialogValues = z.infer<typeof generateAIDialogSchema>;

interface GenerateAIDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitGeneration: (data: { 
    additionalInstructions: string; 
    holidayOverrides?: Array<{date: string, time: string, type: PreachingType}>; 
    designatedRuralWeekendDays: string[];
    assignLocations: boolean;
    assignCaptains: boolean;
  }) => Promise<void>;
  year: number;
  month: number; // 0-indexed
  holidays: CustomHoliday[];
  programScheduleSlots: ProgramScheduleSlot[];
}

export function GenerateAIDialog({ isOpen, onOpenChange, onSubmitGeneration, year, month, holidays, programScheduleSlots }: GenerateAIDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GenerateAIDialogValues>({
    resolver: zodResolver(generateAIDialogSchema),
    defaultValues: {
      assignLocations: true,
      assignCaptains: true,
      additionalInstructions: "",
      holidayOverrides: [],
      designatedRuralWeekendDays: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "holidayOverrides",
  });

  const holidaysForMonth = useMemo(() => {
    return holidays
      .filter(h => {
        const holidayDate = h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date);
        return isSameMonth(holidayDate, new Date(year, month));
      })
      .sort((a,b) => (a.date as Date).getTime() - (b.date as Date).getTime());
  }, [holidays, year, month]);

  const weekendDaysForSelection = useMemo(() => {
    const days: { date: Date; dayName: string; type: 'saturday' | 'sunday' }[] = [];
    const firstDayOfMonth = startOfMonth(new Date(year, month));
    const numDaysInMonth = getDaysInMonth(firstDayOfMonth);

    const hasSaturdayRuralSlot = programScheduleSlots.some(slot => slot.dayOfWeek === 'saturday' && slot.type === 'rural');
    const hasSundayRuralSlot = programScheduleSlots.some(slot => slot.dayOfWeek === 'sunday' && slot.type === 'rural');

    for (let i = 0; i < numDaysInMonth; i++) {
      const currentDate = addDays(firstDayOfMonth, i);
      const dayOfWeek = getDay(currentDate);

      if (dayOfWeek === 6 && hasSaturdayRuralSlot) {
        days.push({ date: currentDate, dayName: format(currentDate, "EEEE, d 'de' MMMM", { locale: es }), type: 'saturday' });
      } else if (dayOfWeek === 0 && hasSundayRuralSlot) {
        days.push({ date: currentDate, dayName: format(currentDate, "EEEE, d 'de' MMMM", { locale: es }), type: 'sunday' });
      }
    }
    return days;
  }, [year, month, programScheduleSlots]);

  useEffect(() => {
    if (isOpen) {
        const overrides = holidaysForMonth.map(h => ({
            date: format(h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date), "yyyy-MM-dd"),
            name: h.name,
            enabled: false,
            hour: '10',
            minute: '00',
            type: 'general' as PreachingType,
        }));
        replace(overrides);
        form.reset({
            assignLocations: true,
            assignCaptains: true,
            additionalInstructions: "",
            holidayOverrides: overrides,
            designatedRuralWeekendDays: [],
        });
    } else {
        form.reset({ assignLocations: true, assignCaptains: true, additionalInstructions: "", holidayOverrides: [], designatedRuralWeekendDays: [] });
    }
  }, [isOpen, holidaysForMonth, form, replace]);


  async function handleSubmit(values: GenerateAIDialogValues) {
    setIsSubmitting(true);
    try {
      const activeHolidayOverrides = (values.holidayOverrides || [])
        .filter(override => override.enabled && override.hour && override.minute && override.type)
        .map(override => ({
            date: override.date,
            time: `${override.hour!}:${override.minute!}`,
            type: override.type!,
        }));

      await onSubmitGeneration({
        additionalInstructions: values.additionalInstructions || "",
        holidayOverrides: activeHolidayOverrides,
        designatedRuralWeekendDays: values.designatedRuralWeekendDays || [],
        assignLocations: values.assignLocations,
        assignCaptains: values.assignCaptains,
      });
    } catch (error) {
      console.error("Error in dialog submission:", error);
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
       setIsSubmitting(false);
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && !isSubmitting) {
      form.reset({ assignLocations: true, assignCaptains: true, additionalInstructions: "", holidayOverrides: [], designatedRuralWeekendDays: [] });
    }
    onOpenChange(open);
  };
  
  const monthName = format(new Date(year, month), "MMMM", { locale: es });

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bot className="mr-2 h-6 w-6 text-primary" />
            Generar Programa Automático para {monthName} {year}
          </DialogTitle>
          <DialogDescription>
             Define instrucciones y habilita la predicación en días festivos y fines de semana rurales especiales.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-2 pr-1">
             <div className="space-y-3">
              <FormLabel className="text-base font-semibold flex items-center">
                 <Bot className="mr-2 h-5 w-5 text-primary" />
                Opciones de Generación
              </FormLabel>
              <div className="space-y-2 rounded-md border p-3 shadow-sm bg-muted/30">
                <FormField
                    control={form.control}
                    name="assignLocations"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 rounded-md">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div className="space-y-0.5 leading-none">
                                <FormLabel className="cursor-pointer">Asignar Territorios y Casas</FormLabel>
                                <FormFieldDescription className="text-xs">Si se desmarca, la IA solo creará los horarios sin asignar un lugar específico.</FormFieldDescription>
                            </div>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="assignCaptains"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 rounded-md">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div className="space-y-0.5 leading-none">
                                <FormLabel className="cursor-pointer">Asignar Capitanes</FormLabel>
                                <FormFieldDescription className="text-xs">Si se desmarca, la IA creará los horarios sin asignar un publicador encargado.</FormFieldDescription>
                            </div>
                        </FormItem>
                    )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <FormLabel className="text-base font-semibold flex items-center">
                <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                Configuración Especial de Días
              </FormLabel>
              <div className="max-h-52 overflow-y-auto space-y-2 rounded-md border p-3 shadow-sm bg-muted/30">
                {holidaysForMonth.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground px-1 pb-1">Días Festivos:</p>
                    {fields.map((field, index) => {
                      const isEnabled = form.watch(`holidayOverrides.${index}.enabled`);
                      return (
                        <div key={field.id} className="p-3 border bg-card rounded-md space-y-2">
                          <FormField
                            control={form.control}
                            name={`holidayOverrides.${index}.enabled`}
                            render={({ field: checkboxField }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl><Checkbox checked={checkboxField.value} onCheckedChange={checkboxField.onChange} /></FormControl>
                                <div className="space-y-0.5 leading-none">
                                  <FormLabel className="cursor-pointer">{form.getValues(`holidayOverrides.${index}.name`)} ({format(parseISO(form.getValues(`holidayOverrides.${index}.date`)), "EEEE d", {locale: es})})</FormLabel>
                                  <FormFieldDescription className="text-xs">Marcar para programar predicación en este día.</FormFieldDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          {isEnabled && (
                            <div className="grid grid-cols-3 gap-3 pl-8 pt-2">
                               <FormField
                                control={form.control}
                                name={`holidayOverrides.${index}.hour`}
                                render={({ field: hourField }) => (<FormItem><FormLabel className="text-xs">Hora</FormLabel>
                                  <Select onValueChange={hourField.onChange} value={hourField.value}>
                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="HH" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {Array.from({ length: 16 }, (_, i) => (i + 7).toString().padStart(2, '0')).map(hour => (<SelectItem key={hour} value={hour}>{hour}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                <FormMessage /></FormItem>)}
                              />
                               <FormField
                                control={form.control}
                                name={`holidayOverrides.${index}.minute`}
                                render={({ field: minuteField }) => (<FormItem><FormLabel className="text-xs">Minuto</FormLabel>
                                  <Select onValueChange={minuteField.onChange} value={minuteField.value}>
                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="MM" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {['00', '15', '30', '45'].map(minute => (<SelectItem key={minute} value={minute}>{minute}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                <FormMessage /></FormItem>)}
                              />
                              <FormField
                                control={form.control}
                                name={`holidayOverrides.${index}.type`}
                                render={({ field: typeField }) => (
                                  <FormItem><FormLabel className="text-xs">Tipo</FormLabel>
                                  <Select onValueChange={typeField.onChange} value={typeField.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="rural">Rural</SelectItem><SelectItem value="zoom">Zoom</SelectItem></SelectContent></Select>
                                  <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {weekendDaysForSelection.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground px-1 pt-2 pb-1">Fines de Semana Rurales:</p>
                    {weekendDaysForSelection.map((day) => (
                      <FormField
                        key={day.date.toISOString()}
                        control={form.control}
                        name="designatedRuralWeekendDays"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2.5 rounded-md hover:bg-muted/50 transition-colors bg-card">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(format(day.date, "yyyy-MM-dd"))}
                                onCheckedChange={(checked) => {
                                  const dateString = format(day.date, "yyyy-MM-dd");
                                  return checked
                                    ? field.onChange([...(field.value || []), dateString])
                                    : field.onChange((field.value || []).filter((value) => value !== dateString));
                                }}
                                id={`rural-day-${day.date.toISOString()}`}
                              />
                            </FormControl>
                            <FormLabel htmlFor={`rural-day-${day.date.toISOString()}`} className="font-normal text-sm cursor-pointer w-full">
                              {day.dayName} (Designar como rural especial)
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </>
                )}
                {holidaysForMonth.length === 0 && weekendDaysForSelection.length === 0 && (
                   <p className="text-sm text-muted-foreground text-center py-4">No hay días festivos o fines de semana rurales configurados para este mes.</p>
                )}

              </div>
            </div>

            <FormField
              control={form.control}
              name="additionalInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Instrucciones Adicionales (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Priorizar territorios no trabajados recientemente. Considerar asignar al Hno. X el día Y."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Generación con IA
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}