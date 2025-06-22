
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Territory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const addReportFormSchema = z.object({
  territoryId: z.string().min(1, "Debe seleccionar un territorio."),
  assignedTo: z.string().min(2, "El nombre del publicador es requerido.").max(100),
  assignedDate: z.date({ required_error: "La fecha de asignación es obligatoria." }),
  blocksWorked: z.string().max(100).optional(),
  blocksPending: z.string().max(100).optional(),
  isCompleted: z.boolean().default(false),
  completionDate: z.date().optional(),
}).refine(data => !data.isCompleted || (data.isCompleted && data.completionDate), {
  message: "Si el ciclo está completado, la fecha de finalización es obligatoria.",
  path: ["completionDate"],
});

export type ManualReportSubmitData = Omit<z.infer<typeof addReportFormSchema>, 'completionDate'> & {
  completionDate?: Date | null;
}

interface AddReportManuallyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  territories: Territory[];
  onSave: (data: ManualReportSubmitData) => void;
}

export function AddReportManuallyDialog({
  isOpen,
  onOpenChange,
  territories,
  onSave,
}: AddReportManuallyDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof addReportFormSchema>>({
    resolver: zodResolver(addReportFormSchema),
    defaultValues: {
      territoryId: "",
      assignedTo: "",
      assignedDate: new Date(),
      blocksWorked: "",
      blocksPending: "",
      isCompleted: false,
      completionDate: undefined,
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const watchedIsCompleted = form.watch("isCompleted");

  async function onSubmit(values: z.infer<typeof addReportFormSchema>) {
    setIsSubmitting(true);
    try {
      await onSave({
        ...values,
        completionDate: values.isCompleted ? values.completionDate : null,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Actividad Manualmente</DialogTitle>
          <DialogDescription>
            Selecciona un territorio y añade una nueva entrada de actividad. Esto iniciará un nuevo ciclo si el territorio está disponible.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 pr-1">
            <FormField
              control={form.control}
              name="territoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Territorio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un territorio..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {territories.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                           {t.number ? `N° ${t.number}` : t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (<FormItem><FormLabel>Asignado a</FormLabel><FormControl><Input placeholder="Nombre del publicador" {...field} /></FormControl><FormMessage /></FormItem>)}
              />
            <FormField
              control={form.control}
              name="assignedDate"
              render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Asignación</FormLabel><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} weekStartsOn={1} /></PopoverContent></Popover><FormMessage /></FormItem>)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <FormField control={form.control} name="blocksWorked" render={({ field }) => (<FormItem><FormLabel>Trabajado</FormLabel><FormControl><Input placeholder="Manzanas 1-3, todo..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="blocksPending" render={({ field }) => (<FormItem><FormLabel>Pendiente</FormLabel><FormControl><Input placeholder="Manzanas 4-5, nada..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
             <FormField control={form.control} name="isCompleted" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none"><FormLabel>¿Esta asignación completa el ciclo?</FormLabel></div>
                </FormItem>
              )}/>
            {watchedIsCompleted && (
                 <FormField control={form.control} name="completionDate" render={({ field }) => (
                    <FormItem className="flex flex-col pl-4 border-l-2 border-primary ml-2">
                        <FormLabel>Fecha de Finalización del Ciclo</FormLabel>
                         <Popover>
                            <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar</span>}</Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} weekStartsOn={1} disabled={(date) => form.getValues(`assignedDate`) ? date < form.getValues(`assignedDate`) : false} /></PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                 )} />
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Registro</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
