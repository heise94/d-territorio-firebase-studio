
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Assembly } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const assemblyFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(150),
  startDate: z.date({ required_error: "La fecha de inicio es obligatoria." }),
  endDate: z.date({ required_error: "La fecha de fin es obligatoria." }),
  description: z.string().max(500).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
      path: ["endDate"],
    });
  }
});

type AssemblyFormValues = z.infer<typeof assemblyFormSchema>;

interface AddAssemblyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssemblySubmit: (assembly: Omit<Assembly, 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: Timestamp; updatedAt?: Timestamp }) => Promise<void>;
  assemblyToEdit?: Assembly | null;
}

export function AddAssemblyDialog({ isOpen, onOpenChange, onAssemblySubmit, assemblyToEdit }: AddAssemblyDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!assemblyToEdit;

  const form = useForm<AssemblyFormValues>({
    resolver: zodResolver(assemblyFormSchema),
    defaultValues: {
      name: "",
      startDate: undefined,
      endDate: undefined,
      description: "",
    },
  });

  useEffect(() => {
    if (assemblyToEdit && isOpen) {
      form.reset({
        name: assemblyToEdit.name || "",
        startDate: assemblyToEdit.startDate instanceof Timestamp ? assemblyToEdit.startDate.toDate() : new Date(assemblyToEdit.startDate) || undefined,
        endDate: assemblyToEdit.endDate instanceof Timestamp ? assemblyToEdit.endDate.toDate() : new Date(assemblyToEdit.endDate) || undefined,
        description: assemblyToEdit.description || "",
      });
    } else if (!isOpen) {
      form.reset({
        name: "",
        startDate: undefined,
        endDate: undefined,
        description: "",
      });
    }
  }, [assemblyToEdit, isOpen, form]);

  async function onSubmit(values: AssemblyFormValues) {
    setIsSubmitting(true);

    const assemblyData: Omit<Assembly, 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: Timestamp; updatedAt?: Timestamp } = {
      id: isEditMode && assemblyToEdit ? assemblyToEdit.id : undefined, // Let parent handle ID generation for new
      name: values.name,
      startDate: values.startDate, // Pass as Date
      endDate: values.endDate,     // Pass as Date
    };
    if (isEditMode && assemblyToEdit) {
        assemblyData.createdAt = assemblyToEdit.createdAt; // Preserve original createdAt on edit
    }

    if (values.description && values.description.trim() !== "") {
      assemblyData.description = values.description;
    }
    
    try {
      await onAssemblySubmit(assemblyData);
    } catch (e) {
      toast({title: "Error", description: "Ocurrió un error al guardar la asamblea.", variant: "destructive"})
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset({
        name: "",
        startDate: undefined,
        endDate: undefined,
        description: "",
      });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Asamblea" : "Añadir Nueva Asamblea"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles de la asamblea." : "Completa los detalles para la nueva asamblea."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 pr-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre/Tema de la Asamblea</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Asamblea de Circuito 'Amemos a Jehová...'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es }) 
                            ) : (
                              <span>Selecciona fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                           disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) && !isEditMode }
                          initialFocus
                          locale={es}
                          weekStartsOn={1}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Selecciona fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            (form.getValues("startDate") ? date < form.getValues("startDate") : date < new Date(new Date().setDate(new Date().getDate() -1)) )
                          }
                          initialFocus
                          locale={es}
                          weekStartsOn={1}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalles adicionales sobre la asamblea..." {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Guardar Cambios" : "Añadir Asamblea"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


