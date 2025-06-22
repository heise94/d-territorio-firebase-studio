
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { Territory, ReportEntry, CampaignAssignment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const campaignAssignmentSchema = z.object({
  assignedTo: z.string().min(1, "Asignado a es requerido.").optional().or(z.literal(null)).or(z.literal('')),
  assignedDate: z.date().optional().or(z.literal(null)),
  blocksWorked: z.string().optional().or(z.literal(null)),
  blocksPending: z.string().optional().or(z.literal(null)),
});


const reportEntryFormSchema = z.object({
  lastCompletedHistoric: z.date().optional().nullable(),
  isCompleted: z.boolean().default(false),
  completedCurrentCycle: z.date().optional().nullable(),
  campaigns: z.array(campaignAssignmentSchema),
}).refine(data => {
    if (data.isCompleted && !data.completedCurrentCycle) {
        return false;
    }
    return true;
}, {
    message: "Si el ciclo está completado, debe especificar la fecha.",
    path: ["completedCurrentCycle"],
});

type ReportEntryFormValues = z.infer<typeof reportEntryFormSchema>;

interface EditReportEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  territory: Territory;
  activeReport: ReportEntry | null;
  onSave: (data: ReportEntry) => void;
}

export function EditReportEntryDialog({
  isOpen,
  onOpenChange,
  territory,
  activeReport,
  onSave,
}: EditReportEntryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!activeReport;

  const form = useForm<ReportEntryFormValues>({
    resolver: zodResolver(reportEntryFormSchema),
    defaultValues: {
      lastCompletedHistoric: null,
      isCompleted: false,
      completedCurrentCycle: null,
      campaigns: [{ assignedTo: "", assignedDate: null, blocksWorked: "", blocksPending: "" }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "campaigns"
  });

  useEffect(() => {
    if (isOpen) {
      if (activeReport) {
        form.reset({
          lastCompletedHistoric: activeReport.lastCompletedHistoric,
          isCompleted: activeReport.status === "Completado",
          completedCurrentCycle: activeReport.status === "Completado" && activeReport.completedCurrentCycle instanceof Date ? activeReport.completedCurrentCycle : null,
          campaigns: activeReport.campaigns.length > 0 ? activeReport.campaigns : [{ assignedTo: "", assignedDate: null, blocksWorked: "", blocksPending: "" }],
        });
      } else {
        form.reset({
          lastCompletedHistoric: null,
          isCompleted: false,
          completedCurrentCycle: null,
          campaigns: [{ assignedTo: "", assignedDate: null, blocksWorked: "", blocksPending: "" }],
        });
      }
    }
  }, [isOpen, activeReport, form]);

  const watchedIsCompleted = form.watch("isCompleted");

  async function onSubmit(values: ReportEntryFormValues) {
    setIsSubmitting(true);
    
    const finalData: ReportEntry = {
        id: activeReport?.id,
        territoryId: territory.id,
        territoryNumber: territory.number || territory.name,
        lastCompletedHistoric: values.lastCompletedHistoric,
        status: values.isCompleted ? "Completado" : "En Curso",
        completedCurrentCycle: values.isCompleted ? (values.completedCurrentCycle || new Date()) : "En curso",
        campaigns: values.campaigns.map(c => ({...c, blocksPending: c.blocksPending ?? null})),
    };
    
    try {
      await onSave(finalData);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Ingresar/Editar Reporte: Territorio {territory.number || territory.name}
          </DialogTitle>
          <DialogDescription>
            Introduce los datos históricos y el estado actual de este territorio.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
             <FormField
                control={form.control}
                name="lastCompletedHistoric"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Última Vez Completado (Histórico)</FormLabel>
                     <Popover>
                      <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}</Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={2015} toYear={new Date().getFullYear()} initialFocus locale={es} weekStartsOn={1} /></PopoverContent>
                    </Popover>
                    <FormFieldDescription>Fecha en que se completó el ciclo ANTERIOR al que estás registrando ahora.</FormFieldDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-3">
                <FormLabel>Asignaciones del Ciclo Actual</FormLabel>
                {fields.map((item, index) => (
                    <div key={item.id} className="p-3 border rounded-md relative space-y-3">
                        <FormField control={form.control} name={`campaigns.${index}.assignedTo`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Asignado a</FormLabel><FormControl><Input placeholder="Nombre del publicador" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`campaigns.${index}.assignedDate`} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel className="text-xs">Fecha Asignación</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} weekStartsOn={1} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`campaigns.${index}.blocksWorked`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Trabajado</FormLabel><FormControl><Input placeholder="Manzanas 1-3, todo..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`campaigns.${index}.blocksPending`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Pendiente</FormLabel><FormControl><Input placeholder="Manzanas 4-5, nada..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                        {fields.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>}
                    </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={() => append({assignedTo: "", assignedDate: null, blocksWorked: "", blocksPending: ""})}><PlusCircle className="mr-2 h-4 w-4" />Añadir Asignación al Ciclo</Button>
              </div>

              <FormField control={form.control} name="isCompleted" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none"><FormLabel>¿Ciclo Actual Completado?</FormLabel><FormFieldDescription>Marca si este ciclo de trabajo ya terminó.</FormFieldDescription></div>
                </FormItem>
              )}/>
            
            {watchedIsCompleted && (
                 <FormField control={form.control} name="completedCurrentCycle" render={({ field }) => (
                    <FormItem className="flex flex-col pl-4 border-l-2 border-primary ml-2">
                        <FormLabel>Fecha de Finalización del Ciclo</FormLabel>
                         <Popover>
                            <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar</span>}</Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} weekStartsOn={1} /></PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                 )} />
            )}

            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Datos</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
