
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
import type { CustomHoliday } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon as CalendarIconLucide } from "lucide-react"; 
import { useState, useEffect } from "react";
import { format as formatDateFn } from 'date-fns'; 
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const holidayFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(100),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  description: z.string().max(500).optional().or(z.literal('')),
});

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

interface AddHolidayDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onHolidaySubmit: (holiday: Omit<CustomHoliday, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  holidayToEdit?: CustomHoliday | null;
}

export function AddHolidayDialog({ isOpen, onOpenChange, onHolidaySubmit, holidayToEdit }: AddHolidayDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!holidayToEdit;

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: "",
      date: undefined,
      description: "",
    },
  });

  useEffect(() => {
    if (holidayToEdit && isOpen) {
      form.reset({
        name: holidayToEdit.name || "",
        date: holidayToEdit.date instanceof Timestamp ? holidayToEdit.date.toDate() : new Date(holidayToEdit.date) || undefined,
        description: holidayToEdit.description || "",
      });
    } else if (!isOpen) {
      form.reset(); 
    }
  }, [holidayToEdit, isOpen, form]);

  async function onSubmit(values: HolidayFormValues) {
    setIsSubmitting(true);

    const holidayData: Omit<CustomHoliday, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } = {
      id: isEditMode && holidayToEdit ? holidayToEdit.id : undefined,
      name: values.name,
      date: values.date, // Pass as Date
      description: values.description || null,
    };
    
    try {
      await onHolidaySubmit(holidayData);
    } catch (e) {
       toast({title: "Error", description: "Ocurrió un error al guardar el festivo.", variant: "destructive"})
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
        form.reset(); 
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Festivo" : "Añadir Nuevo Festivo"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles del festivo." : "Completa los detalles para el nuevo día festivo."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 pr-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Festivo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Día de la Conmemoración" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
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
                            formatDateFn(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
                          <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalles adicionales sobre el festivo..." {...field} rows={2} />
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
                {isEditMode ? "Guardar Cambios" : "Añadir Festivo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
