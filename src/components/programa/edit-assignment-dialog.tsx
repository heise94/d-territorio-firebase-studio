"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Loader2, Bot, CalendarDays, AlertTriangle } from "lucide-react"; // AlertTriangle added here
import { useState, useEffect, useMemo } from "react";
import { format, getDaysInMonth, getDay, startOfMonth, addDays } from "date-fns";
import { es } from "date-fns/locale";
import type { ProgramScheduleSlot } from "@/types";

const generateAIDialogSchema = z.object({
  additionalInstructions: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
  designatedRuralWeekendDays: z.array(z.string()).optional().default([]),
});

type GenerateAIDialogValues = z.infer<typeof generateAIDialogSchema>;

interface GenerateAIDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitGeneration: (data: { additionalInstructions: string; designatedRuralWeekendDays: string[] }) => Promise<void>;
  year: number;
  month: number; // 0-indexed
  programScheduleSlots: ProgramScheduleSlot[]; // For checking configured rural weekend days
}

export function GenerateAIDialog({ isOpen, onOpenChange, onSubmitGeneration, year, month, programScheduleSlots }: GenerateAIDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GenerateAIDialogValues>({
    resolver: zodResolver(generateAIDialogSchema),
    defaultValues: {
      additionalInstructions: "",
      designatedRuralWeekendDays: [],
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({ additionalInstructions: "", designatedRuralWeekendDays: [] });
    }
  }, [isOpen, form]);

  const weekendDaysForSelection = useMemo(() => {
    const days: { date: Date; dayName: string; type: 'saturday' | 'sunday' }[] = [];
    const firstDayOfMonth = startOfMonth(new Date(year, month));
    const numDaysInMonth = getDaysInMonth(firstDayOfMonth);

    // Check if there's any rural slot configured for Saturday or Sunday in general
    const hasSaturdayRuralSlot = programScheduleSlots.some(slot => slot.dayOfWeek === 'saturday' && slot.type === 'rural');
    const hasSundayRuralSlot = programScheduleSlots.some(slot => slot.dayOfWeek === 'sunday' && slot.type === 'rural');

    for (let i = 0; i < numDaysInMonth; i++) {
      const currentDate = addDays(firstDayOfMonth, i);
      const dayOfWeek = getDay(currentDate); // 0 for Sunday, 6 for Saturday

      if (dayOfWeek === 6 && hasSaturdayRuralSlot) { // Saturday
        days.push({ date: currentDate, dayName: format(currentDate, "EEEE, d 'de' MMMM", { locale: es }), type: 'saturday' });
      } else if (dayOfWeek === 0 && hasSundayRuralSlot) { // Sunday
        days.push({ date: currentDate, dayName: format(currentDate, "EEEE, d 'de' MMMM", { locale: es }), type: 'sunday' });
      }
    }
    return days;
  }, [year, month, programScheduleSlots]);

  async function handleSubmit(values: GenerateAIDialogValues) {
    setIsSubmitting(true);
    try {
      await onSubmitGeneration({
        additionalInstructions: values.additionalInstructions || "",
        designatedRuralWeekendDays: values.designatedRuralWeekendDays || [],
      });
      // The parent (programa/page.tsx) will handle closing the dialog on success/failure of the AI call.
    } catch (error) {
      console.error("Error in dialog submission that calls parent:", error);
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud desde el diálogo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      // Do not call onOpenChange(false) here; let the parent decide based on AI call result.
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && !isSubmitting) { // Only reset if not submitting, as parent might close it
      form.reset({ additionalInstructions: "", designatedRuralWeekendDays: [] });
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
            Generar Programa con IA para {monthName} {year}
          </DialogTitle>
          <DialogDescription>
            La IA asignará un capitán por cada horario de predicación configurado. Puedes dar instrucciones adicionales y designar días de fin de semana para predicación rural especial.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-2 pr-1">
            {weekendDaysForSelection.length > 0 ? (
              <div className="space-y-3">
                <FormLabel className="text-base font-semibold flex items-center">
                  <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                  Designar Predicación Rural de Fin de Semana
                </FormLabel>
                <FormFieldDescription>
                  Selecciona los sábados/domingos que tendrán un enfoque rural especial (ej. rotación de grupo, asignación de SG). Estos días deben tener un horario de tipo "rural" configurado en Ajustes.
                </FormFieldDescription>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-3 shadow-sm bg-muted/30">
                  {weekendDaysForSelection.map((day) => (
                    <FormField
                      key={day.date.toISOString()}
                      control={form.control}
                      name="designatedRuralWeekendDays"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(format(day.date, "yyyy-MM-dd"))}
                              onCheckedChange={(checked) => {
                                const dateString = format(day.date, "yyyy-MM-dd");
                                const currentSelection = field.value || [];
                                return checked
                                  ? field.onChange([...currentSelection, dateString])
                                  : field.onChange(
                                      currentSelection.filter((value) => value !== dateString)
                                    );
                              }}
                              id={`rural-day-${day.date.toISOString()}`}
                            />
                          </FormControl>
                          <FormLabel htmlFor={`rural-day-${day.date.toISOString()}`} className="font-normal text-sm cursor-pointer w-full">
                            {day.dayName} ({day.type === 'saturday' ? 'Sábado' : 'Domingo'})
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </div>
            ) : (
              <div className="p-3 border rounded-md bg-amber-50 border-amber-200 text-amber-700 text-sm">
                <AlertTriangle className="inline h-4 w-4 mr-1.5" />
                 No hay Sábados o Domingos con horarios rurales configurados en Ajustes para el mes de {monthName}. La designación de días rurales especiales no está disponible.
              </div>
            )}

            <FormField
              control={form.control}
              name="additionalInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Instrucciones Adicionales para la IA (Opcional)</FormLabel>
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
