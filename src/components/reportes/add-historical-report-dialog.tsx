
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
  FormDescription,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, History } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Territory, UserProfile } from "@/types";

// Schema for the form inside the dialog
const historicalReportSchema = z.object({
  publisherId: z.string().min(1, "Debes seleccionar un publicador."),
  assignmentDate: z.date({ required_error: "La fecha es obligatoria." }),
  territoryNotWorked: z.boolean().default(false),
  workedBlocksIds: z.array(z.string()).optional().default([]),
  generalNotes: z.string().max(1000, "Máximo 1000 caracteres.").optional(),
});

export type HistoricalReportFormValues = z.infer<typeof historicalReportSchema>;

export interface HistoricalReportSubmitData extends HistoricalReportFormValues {}

interface AddHistoricalReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddHistoricalReport: (data: HistoricalReportSubmitData) => void;
  territory: Territory | null;
  allPublishers: UserProfile[];
}

export function AddHistoricalReportDialog({
  isOpen,
  onOpenChange,
  onAddHistoricalReport,
  territory,
  allPublishers,
}: AddHistoricalReportDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<HistoricalReportFormValues>({
    resolver: zodResolver(historicalReportSchema),
    defaultValues: {
      publisherId: undefined,
      assignmentDate: new Date(),
      territoryNotWorked: false,
      workedBlocksIds: [],
      generalNotes: "",
    },
  });
  
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);
  
  const territoryNotWorked = form.watch("territoryNotWorked");
  useEffect(() => {
    if (territoryNotWorked) {
        form.setValue("workedBlocksIds", []);
    }
  }, [territoryNotWorked, form]);

  async function onSubmit(values: HistoricalReportFormValues) {
    if (!territory) return;
    setIsSubmitting(true);
    try {
      await onAddHistoricalReport(values);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting historical report:", error);
      toast({ title: "Error", description: "No se pudo añadir el registro.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!territory) return null;

  const allBlockNumbers = Array.from({ length: territory.totalBlocks || 0 }, (_, i) => i + 1);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <History className="mr-2 h-6 w-6 text-primary" />
            Añadir Registro Histórico
          </DialogTitle>
          <DialogDescription>
            Creando un nuevo registro de asignación y reporte para el territorio: <span className="font-semibold text-foreground">{territory.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 pr-1">
            <FormField
              control={form.control}
              name="publisherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publicador Asignado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={allPublishers.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={allPublishers.length === 0 ? "No hay publicadores" : "Selecciona un publicador"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allPublishers.map(pub => (
                        <SelectItem key={pub.id} value={pub.id}>
                          {pub.name}
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
              name="assignmentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Asignación/Trabajo</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus locale={es} weekStartsOn={1}/>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="territoryNotWorked"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange}/>
                    </FormControl>
                    <div className="space-y-0.5">
                        <FormLabel className="font-medium cursor-pointer">Marcar como "No Trabajado"</FormLabel>
                        <FormDescription>Selecciona si el territorio fue asignado pero no se pudo trabajar.</FormDescription>
                    </div>
                    </FormItem>
                )}
            />

            {(allBlockNumbers.length > 0) && (
              <FormField
                control={form.control}
                name="workedBlocksIds"
                render={() => (
                  <FormItem className={`${territoryNotWorked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="mb-2">
                      <FormLabel className="text-sm font-medium">Manzanas Trabajadas</FormLabel>
                    </div>
                    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 border rounded-md shadow-sm bg-muted/20 max-h-40 overflow-y-auto ${territoryNotWorked ? 'pointer-events-none' : ''}`}>
                      {allBlockNumbers.map((blockNumber) => {
                        const blockId = `block-${territory.id}-${blockNumber}`;
                        return (
                          <FormField
                            key={blockId}
                            control={form.control}
                            name="workedBlocksIds"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-2 rounded-md bg-card hover:bg-card/90 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(blockId)}
                                    onCheckedChange={(checked) => {
                                      if (territoryNotWorked) return;
                                      const currentSelection = field.value || [];
                                      return checked
                                        ? field.onChange([...currentSelection, blockId])
                                        : field.onChange(currentSelection.filter(id => id !== blockId));
                                    }}
                                    disabled={territoryNotWorked}
                                  />
                                </FormControl>
                                <FormLabel className={`font-normal text-xs cursor-pointer select-none ${territoryNotWorked ? 'text-muted-foreground/70' : ''}`}>
                                  Manzana {blockNumber}
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
            
            <FormField
              control={form.control}
              name="generalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Generales (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cualquier nota relevante sobre este registro histórico..." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Añadir Registro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
