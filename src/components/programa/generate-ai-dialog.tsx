
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
import { format, getDaysInMonth, getDay, startOfMonth, addDays, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import type { CustomHoliday, PreachingType } from "@/types";
import { Timestamp } from "firebase/firestore";

const holidayOverrideSchema = z.object({
  date: z.string(),
  name: z.string(),
  enabled: z.boolean().default(false),
  time: z.string().optional(),
  type: z.enum(['general', 'rural', 'zoom']).optional(),
}).refine(data => {
    if (!data.enabled) return true;
    return !!data.time && !!data.type;
}, {
    message: "Si se habilita, la hora y el tipo son obligatorios.",
    path: ["time"], // You can point to a general path or a specific one
});


const generateAIDialogSchema = z.object({
  additionalInstructions: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
  holidayOverrides: z.array(holidayOverrideSchema).optional(),
});

type GenerateAIDialogValues = z.infer<typeof generateAIDialogSchema>;

interface GenerateAIDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitGeneration: (data: { additionalInstructions: string; holidayOverrides?: Array<{date: string, time: string, type: PreachingType}> }) => Promise<void>;
  year: number;
  month: number; // 0-indexed
  holidays: CustomHoliday[];
}

export function GenerateAIDialog({ isOpen, onOpenChange, onSubmitGeneration, year, month, holidays }: GenerateAIDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GenerateAIDialogValues>({
    resolver: zodResolver(generateAIDialogSchema),
    defaultValues: {
      additionalInstructions: "",
      holidayOverrides: [],
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

  useEffect(() => {
    if (isOpen) {
        const overrides = holidaysForMonth.map(h => ({
            date: format(h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date), "yyyy-MM-dd"),
            name: h.name,
            enabled: false,
            time: '10:00', // Default time
            type: 'general' as PreachingType, // Default type
        }));
        replace(overrides);
    } else {
        form.reset({ additionalInstructions: "", holidayOverrides: [] });
    }
  }, [isOpen, holidaysForMonth, form, replace]);


  async function handleSubmit(values: GenerateAIDialogValues) {
    setIsSubmitting(true);
    try {
      const activeHolidayOverrides = (values.holidayOverrides || [])
        .filter(override => override.enabled && override.time && override.type)
        .map(override => ({
            date: override.date,
            time: override.time!,
            type: override.type!,
        }));

      await onSubmitGeneration({
        additionalInstructions: values.additionalInstructions || "",
        holidayOverrides: activeHolidayOverrides,
      });
    } catch (error) {
      console.error("Error in dialog submission:", error);
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
       setIsSubmitting(false); // Only set false on error, parent will close on success
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && !isSubmitting) {
      form.reset({ additionalInstructions: "", holidayOverrides: [] });
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
             Define instrucciones y habilita la predicación en días festivos con horarios personalizados.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-2 pr-1">

            {fields.length > 0 && (
                <div className="space-y-3">
                    <FormLabel className="text-base font-semibold flex items-center">
                        <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                        Predicación en Días Festivos
                    </FormLabel>
                    <FormFieldDescription>
                        Habilita y personaliza la predicación para los días festivos de este mes.
                    </FormFieldDescription>
                    <div className="max-h-52 overflow-y-auto space-y-2 rounded-md border p-3 shadow-sm bg-muted/30">
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
                                        <div className="grid grid-cols-2 gap-3 pl-8 pt-2">
                                             <FormField
                                                control={form.control}
                                                name={`holidayOverrides.${index}.time`}
                                                render={({ field: timeField }) => (
                                                    <FormItem><FormLabel className="text-xs">Hora</FormLabel><FormControl><Input {...timeField} placeholder="11:00" className="h-8 text-xs" /></FormControl><FormMessage /></FormItem>
                                                )}
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
                    </div>
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
