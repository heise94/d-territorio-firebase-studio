
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { UserAssignment, Territory, ReportedAssignmentData } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, MapPin, CalendarDays, Clock, Edit3, CloudOff } from "lucide-react";
import { useState, useEffect } from "react";
import Image from 'next/image';
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";

const reportFormSchema = z.object({
  territoryNotWorked: z.boolean().optional().default(false),
  workedBlocksIds: z.array(z.string()).optional().default([]),
  notes: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface ReportarPredicacionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  assignment: UserAssignment | null;
  territory: Territory | null;
  onReportSubmit: (data: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'>) => void;
  initialReportData?: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'> | null;
}

export function ReportarPredicacionDialog({
  isOpen,
  onOpenChange,
  assignment,
  territory,
  onReportSubmit,
  initialReportData,
}: ReportarPredicacionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialReportData;

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      territoryNotWorked: false,
      workedBlocksIds: [],
      notes: "",
    },
  });

  const territoryNotWorked = form.watch("territoryNotWorked");

  useEffect(() => {
    if (isOpen) {
      if (initialReportData) {
        form.reset({
          territoryNotWorked: initialReportData.territoryNotWorked || false,
          workedBlocksIds: initialReportData.workedBlocksIds || [],
          notes: initialReportData.notes || "",
        });
      } else {
        form.reset({
          territoryNotWorked: false,
          workedBlocksIds: [],
          notes: "",
        });
      }
    }
  }, [isOpen, initialReportData, form]);

  useEffect(() => {
    if (territoryNotWorked) {
      form.setValue("workedBlocksIds", []);
    }
  }, [territoryNotWorked, form]);


  async function handleSubmit(values: ReportFormValues) {
    if (!assignment) return;
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 600)); 
      onReportSubmit({
        territoryNotWorked: values.territoryNotWorked,
        workedBlocksIds: values.territoryNotWorked ? [] : values.workedBlocksIds || [],
        notes: values.notes,
      });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo enviar el reporte.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
        onOpenChange(false); 
    }
  }

  if (!assignment) return null;

  const assignmentDateTime = parse(`${assignment.date} ${assignment.time}`, "yyyy-MM-dd HH:mm", new Date());
  const dialogTitleText = isEditMode ? "Modificar Reporte de Predicación" : "Reportar Predicación";
  const submitButtonText = isEditMode ? "Guardar Cambios" : "Enviar Reporte";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            {dialogTitleText}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? "Actualiza la información del reporte." : "Informa sobre la predicación en el territorio asignado."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3 text-sm border-b pb-4 mb-4">
            <p className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground"/> Territorio: <span className="font-semibold ml-1">{territory?.name || assignment.locationName}</span></p>
            <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/> Fecha: <span className="font-semibold ml-1">{format(assignmentDateTime, "EEEE, dd 'de' MMMM", { locale: es })}</span></p>
            <p className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/> Hora: <span className="font-semibold ml-1">{assignment.time} hrs.</span></p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-1 pr-1">
            <FormField
              control={form.control}
              name="territoryNotWorked"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-amber-500/10 border-amber-500/30">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="territoryNotWorked"
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel htmlFor="territoryNotWorked" className="font-medium cursor-pointer text-amber-700 dark:text-amber-400 flex items-center">
                      <CloudOff className="mr-2 h-4 w-4" />
                      ¿No se pudo trabajar el territorio?
                    </FormLabel>
                    <FormFieldDescription className="text-xs text-amber-600 dark:text-amber-500">
                      Marca esta opción si, por ejemplo, por mal clima u otra razón, el territorio no fue predicado.
                    </FormFieldDescription>
                  </div>
                </FormItem>
              )}
            />

            {territory?.mapImageUrl && (
              <div className={`mb-4 ${territoryNotWorked ? 'opacity-50' : ''}`}>
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
                  <FormItem className={`${territoryNotWorked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="mb-2">
                        <FormLabel className="text-base font-medium">Manzanas Trabajadas</FormLabel>
                        <FormFieldDescription className={`${territoryNotWorked ? 'text-muted-foreground/70' : ''}`}>
                            Selecciona todas las manzanas que fueron predicadas. {territoryNotWorked ? "(Deshabilitado)" : ""}
                        </FormFieldDescription>
                    </div>
                    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 border rounded-md shadow-sm bg-muted/20 max-h-48 overflow-y-auto ${territoryNotWorked ? 'pointer-events-none' : ''}`}>
                      {Array.from({ length: territory.totalBlocks! }, (_, index) => {
                        const blockId = `block-${index}`;
                        return (
                          <FormField
                            key={blockId}
                            control={form.control}
                            name="workedBlocksIds"
                            render={({ field: innerField }) => ( 
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-2 rounded-md bg-card hover:bg-card/90 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={innerField.value?.includes(blockId)}
                                    onCheckedChange={(checked) => {
                                      if (territoryNotWorked) return;
                                      const currentSelection = innerField.value || [];
                                      return checked
                                        ? innerField.onChange([...currentSelection, blockId])
                                        : innerField.onChange(currentSelection.filter(id => id !== blockId));
                                    }}
                                    id={blockId}
                                    disabled={territoryNotWorked}
                                  />
                                </FormControl>
                                <FormLabel htmlFor={blockId} className={`font-normal text-sm cursor-pointer select-none ${territoryNotWorked ? 'text-muted-foreground/70' : ''}`}>
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
             {(territory?.totalBlocks ?? 0) === 0 && !territoryNotWorked && (
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
                    Notas Adicionales {territoryNotWorked ? "(Ej: Razón por la que no se trabajó)" : "(Opcional)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={territoryNotWorked ? "Ej: Lluvia intensa durante todo el horario." : "Observaciones, experiencias, no en casa, etc."}
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
                {submitButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

