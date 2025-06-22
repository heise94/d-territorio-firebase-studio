
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Territory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, PlusCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
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
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [checkedBlocks, setCheckedBlocks] = useState<Set<number>>(new Set());

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
  
  const watchedTerritoryId = form.watch("territoryId");

  const sortedTerritories = useMemo(() => {
    return [...territories].sort((a, b) => {
      const numA = a.number || 'zzzz'; // Push non-numbered (like rural) to the end
      const numB = b.number || 'zzzz';
      return numA.localeCompare(numB, undefined, { numeric: true });
    });
  }, [territories]);

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSelectedTerritory(null);
      setCheckedBlocks(new Set());
    }
  }, [isOpen, form]);
  
  useEffect(() => {
    const territory = territories.find(t => t.id === watchedTerritoryId);
    setSelectedTerritory(territory || null);
    setCheckedBlocks(new Set()); 
  }, [watchedTerritoryId, territories]);

  useEffect(() => {
    if (!selectedTerritory) return;
    
    const allBlockNumbers = Array.from({ length: selectedTerritory.totalBlocks || 0 }, (_, i) => i + 1);
    const workedNumbers = Array.from(checkedBlocks).sort((a,b) => a-b);
    
    const isComplete = allBlockNumbers.length > 0 && workedNumbers.length === allBlockNumbers.length;
    form.setValue('isCompleted', isComplete);

    if (isComplete) {
      form.setValue('completionDate', form.getValues('assignedDate'));
    } else {
      form.setValue('completionDate', undefined);
    }
  }, [checkedBlocks, selectedTerritory, form]);

  const handleToggleAllBlocks = () => {
    if (!selectedTerritory || !selectedTerritory.totalBlocks) return;

    const allBlockNumbers = new Set(Array.from({ length: selectedTerritory.totalBlocks }, (_, i) => i + 1));
    
    if (checkedBlocks.size === allBlockNumbers.size) {
      setCheckedBlocks(new Set());
    } else {
      setCheckedBlocks(allBlockNumbers);
    }
  };


  async function onSubmit(values: z.infer<typeof addReportFormSchema>) {
    setIsSubmitting(true);
    try {
      const allBlockNumbers = Array.from({ length: selectedTerritory?.totalBlocks || 0 }, (_, i) => i + 1);
      const workedNumbers = Array.from(checkedBlocks).sort((a,b) => a-b);
      const pendingNumbers = allBlockNumbers.filter(n => !checkedBlocks.has(n));

      await onSave({
        ...values,
        blocksWorked: workedNumbers.join(', '),
        blocksPending: pendingNumbers.join(', '),
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
            Selecciona un territorio y añade una nueva entrada de actividad.
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
                      {sortedTerritories.map((t) => (
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
            
            {selectedTerritory && selectedTerritory.totalBlocks !== undefined && selectedTerritory.totalBlocks > 0 && (
                <FormItem>
                    <div className="flex justify-between items-center mb-2">
                         <FormLabel>Manzanas Trabajadas</FormLabel>
                         <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleToggleAllBlocks}>
                            Marcar Todas
                         </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 border p-3 rounded-md bg-muted/20 max-h-40 overflow-y-auto">
                        {Array.from({ length: selectedTerritory.totalBlocks }, (_, i) => i + 1).map(blockNum => (
                            <FormItem key={blockNum} className="flex items-center space-x-2 p-2 rounded-md bg-background shadow-sm">
                                <FormControl>
                                    <Checkbox
                                        id={`block-${blockNum}`}
                                        checked={checkedBlocks.has(blockNum)}
                                        onCheckedChange={(checked) => {
                                            const newSet = new Set(checkedBlocks);
                                            if (checked) {
                                                newSet.add(blockNum);
                                            } else {
                                                newSet.delete(blockNum);
                                            }
                                            setCheckedBlocks(newSet);
                                        }}
                                    />
                                </FormControl>
                                <FormLabel htmlFor={`block-${blockNum}`} className="text-sm font-normal cursor-pointer">
                                    Manzana {blockNum}
                                </FormLabel>
                            </FormItem>
                        ))}
                    </div>
                </FormItem>
            )}

            {form.watch('isCompleted') && (
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
