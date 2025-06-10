
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { UserAssignment, Territory, ReportedAssignmentData } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, MapPin, CalendarDays, Clock, Edit3 } from "lucide-react";
import { useState, useEffect } from "react";
import Image from 'next/image';
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";

const reportFormSchema = z.object({
  workedBlocksIds: z.array(z.string()).min(0, "Debes seleccionar al menos una manzana si se trabajó alguna."),
  notes: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface ReportarPredicacionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  assignment: UserAssignment | null;
  territory: Territory | null;
  onReportSubmit: (data: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'>) => void;
}

export function ReportarPredicacionDialog({
  isOpen,
  onOpenChange,
  assignment,
  territory,
  onReportSubmit,
}: ReportarPredicacionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      workedBlocksIds: [],
      notes: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({ workedBlocksIds: [], notes: "" });
    }
    // No pre-llenamos datos de un reporte anterior, siempre es un reporte nuevo.
  }, [isOpen, form]);

  async function handleSubmit(values: ReportFormValues) {
    if (!assignment) return;
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 600)); // Simular delay
      onReportSubmit({
        workedBlocksIds: values.workedBlocksIds,
        notes: values.notes,
      });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo enviar el reporte.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
        onOpenChange(false); // Cerrar diálogo después de enviar
    }
  }

  if (!assignment) return null;

  const assignmentDateTime = parse(`${assignment.date} ${assignment.time}`, "yyyy-MM-dd HH:mm", new Date());

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            Reportar Predicación
          </DialogTitle>
          <DialogDescription>
            Informa qué manzanas se trabajaron para el territorio asignado.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3 text-sm border-b pb-4 mb-4">
            <p className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground"/> Territorio: <span className="font-semibold ml-1">{territory?.name || assignment.locationName}</span></p>
            <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/> Fecha: <span className="font-semibold ml-1">{format(assignmentDateTime, "EEEE, dd 'de' MMMM", { locale: es })}</span></p>
            <p className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/> Hora: <span className="font-semibold ml-1">{assignment.time} hrs.</span></p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-1 pr-1">
            {territory?.mapImageUrl && (
              <div className="mb-4">
                <FormLabel className="text-base font-medium">Mapa del Territorio (Guía)</FormLabel>
                <div className="mt-2 relative w-full aspect-[4/3] rounded-md overflow-hidden border shadow-sm">
                  <Image
                    src={territory.mapImageUrl}
                    alt={`Mapa de ${territory.name}`}
                    layout="fill"
                    objectFit="contain"
                    data-ai-hint={territory.dataAiHint || "map sketch"}
                  />
                </div>
              </div>
            )}

            {territory && (territory.totalBlocks || 0) > 0 && (
              <FormField
                control={form.control}
                name="workedBlocksIds"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-2">
                        <FormLabel className="text-base font-medium">Manzanas Trabajadas</FormLabel>
                        <FormFieldDescription>
                            Selecciona todas las manzanas que fueron predicadas.
                        </FormFieldDescription>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 border rounded-md shadow-sm bg-muted/20 max-h-48 overflow-y-auto">
                      {Array.from({ length: territory.totalBlocks! }, (_, index) => {
                        const blockId = `block-${index}`;
                        return (
                          <FormField
                            key={blockId}
                            control={form.control}
                            name="workedBlocksIds"
                            render={({ field: innerField }) => ( // Renombrar field para evitar conflicto
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-2 rounded-md bg-card hover:bg-card/90 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={innerField.value?.includes(blockId)}
                                    onCheckedChange={(checked) => {
                                      const currentSelection = innerField.value || [];
                                      return checked
                                        ? innerField.onChange([...currentSelection, blockId])
                                        : innerField.onChange(currentSelection.filter(id => id !== blockId));
                                    }}
                                    id={blockId}
                                  />
                                </FormControl>
                                <FormLabel htmlFor={blockId} className="font-normal text-sm cursor-pointer select-none">
                                  Manzana {index + 1}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
             {(territory?.totalBlocks ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3 border rounded-md bg-muted/30">
                    Este territorio no tiene manzanas definidas para seleccionar. Puedes usar las notas.
                </p>
            )}


            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium flex items-center">
                    <Edit3 className="mr-2 h-4 w-4 text-primary" />
                    Notas Adicionales (Opcional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones, experiencias, no en casa, etc."
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
                Enviar Reporte
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

