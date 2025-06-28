
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bot, Sparkles, AlertTriangle, CalendarDays } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, getDaysInMonth, getDay, startOfMonth, addDays } from "date-fns";
import { es } from "date-fns/locale";
import type { ProgramScheduleSlot, CustomHoliday, Territory, PreachingType } from "@/types";

const generateAIDialogSchema = z.object({
  additionalInstructions: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
  assignLocations: z.boolean().default(true),
  assignCaptains: z.boolean().default(true),
  holidayOverrides: z.array(z.object({
    date: z.string(),
    time: z.string(),
    type: z.enum(['general', 'rural', 'zoom']),
  })).optional(),
  designatedRuralWeekendDays: z.array(z.string()).optional().default([]),
});

type GenerateAIDialogValues = z.infer<typeof generateAIDialogSchema>;

interface GenerateAIDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitGeneration: (data: { 
    assignCaptains: boolean;
    assignLocations: boolean;
    additionalInstructions: string; 
    holidayOverrides?: Array<{date: string, time: string, type: PreachingType}>;
    designatedRuralWeekendDays: string[];
  }) => Promise<void>;
  year: number;
  month: number;
  holidays: CustomHoliday[];
  programScheduleSlots: ProgramScheduleSlot[];
  allTerritories: Territory[];
}

export function GenerateAIDialog({ 
    isOpen, 
    onOpenChange, 
    onSubmitGeneration, 
    year, 
    month,
    holidays,
    programScheduleSlots
}: GenerateAIDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GenerateAIDialogValues>({
    resolver: zodResolver(generateAIDialogSchema),
    defaultValues: {
      additionalInstructions: "",
      assignLocations: true,
      assignCaptains: true,
      designatedRuralWeekendDays: [],
      holidayOverrides: [],
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const monthName = format(new Date(year, month), "MMMM", { locale: es });
  
  const holidaysInMonth = useMemo(() => {
    return holidays.filter(h => {
        const d = new Date(h.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });
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
      if (dayOfWeek === 6 && hasSaturdayRuralSlot) { days.push({ date: currentDate, dayName: format(currentDate, "EEEE, d 'de' MMMM", { locale: es }), type: 'saturday' }); }
      else if (dayOfWeek === 0 && hasSundayRuralSlot) { days.push({ date: currentDate, dayName: format(currentDate, "EEEE, d 'de' MMMM", { locale: es }), type: 'sunday' });}
    }
    return days;
  }, [year, month, programScheduleSlots]);

  async function handleSubmit(values: GenerateAIDialogValues) {
    setIsSubmitting(true);
    
    // Logic to prepare holiday overrides could be added here if needed, based on a form field.
    // For now, it's an empty array passed up.

    try {
      await onSubmitGeneration({
        assignCaptains: values.assignCaptains,
        assignLocations: values.assignLocations,
        additionalInstructions: values.additionalInstructions || "",
        designatedRuralWeekendDays: values.designatedRuralWeekendDays || [],
        // holidayOverrides: ... // This would come from form state if implemented
      });
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error al generar el programa.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Bot className="mr-3 h-6 w-6 text-primary" />
            Generar Programa Automático para {monthName} {year}
          </DialogTitle>
          <DialogDescription>
             Define instrucciones y habilita la predicación en días festivos y fines de semana rurales especiales.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-2 pr-1">
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                <FormLabel className="text-base font-semibold">Opciones de Generación</FormLabel>
                <FormField
                    control={form.control}
                    name="assignLocations"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Asignar Territorios y Casas</FormLabel><FormFieldDescription className="text-xs">Si se desmarca, la IA solo creará los horarios sin asignar un lugar específico.</FormFieldDescription></div>
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="assignCaptains"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Asignar Capitanes</FormLabel><FormFieldDescription className="text-xs">Si se desmarca, la IA creará los horarios sin asignar un publicador encargado.</FormFieldDescription></div>
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                        </FormItem>
                    )}
                />
            </div>
            
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                <FormLabel className="text-base font-semibold">Configuración Especial de Días</FormLabel>
                {holidaysInMonth.length > 0 && (
                    <div className="space-y-2">
                        <FormLabel className="text-sm font-medium">Días Festivos:</FormLabel>
                        {holidaysInMonth.map(holiday => (
                            <FormItem key={holiday.id} className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded-md bg-background">
                                <FormControl><Checkbox /></FormControl>
                                <FormLabel className="font-normal text-sm w-full">{holiday.name} ({format(new Date(holiday.date), "EEEE, d", {locale: es})})</FormLabel>
                                <FormFieldDescription className="text-xs !mt-0 text-right">Marcar para programar predicación en este día.</FormFieldDescription>
                            </FormItem>
                        ))}
                    </div>
                )}
                 {weekendDaysForSelection.length > 0 && (
                    <div className="space-y-2 pt-2">
                         <FormLabel className="text-sm font-medium">Fines de Semana Rurales:</FormLabel>
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                         {weekendDaysForSelection.map((day) => (
                            <FormField
                                key={day.date.toISOString()}
                                control={form.control}
                                name="designatedRuralWeekendDays"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-background/80 transition-colors">
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
                                    <FormLabel htmlFor={`rural-day-${day.date.toISOString()}`} className="font-normal text-xs cursor-pointer w-full">
                                        {day.dayName} <span className="text-muted-foreground">(Designar como rural especial)</span>
                                    </FormLabel>
                                    </FormItem>
                                )}
                            />
                        ))}
                        </div>
                    </div>
                 )}
                  {holidaysInMonth.length === 0 && weekendDaysForSelection.length === 0 && (
                     <p className="text-xs text-muted-foreground text-center py-3">No hay festivos ni fines de semana rurales configurados para este mes.</p>
                  )}
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
