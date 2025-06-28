
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, PlusCircle, Trash2, CalendarIcon, CalendarOff } from "lucide-react";
import { useState, useEffect } from "react";
import type { UserProfile, UnavailabilityPeriod } from "@/types";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const unavailabilityPeriodSchema = z.object({
  id: z.string().optional(),
  startDate: z.date({ required_error: "Fecha de inicio es obligatoria." }),
  endDate: z.date({ required_error: "Fecha de fin es obligatoria." }),
  reason: z.string().max(100, "Máximo 100 caracteres.").optional().or(z.literal('')),
}).refine(data => data.endDate >= data.startDate, {
  message: "La fecha de fin debe ser igual o posterior a la de inicio.",
  path: ["endDate"],
});

const unavailabilityFormSchema = z.object({
  unavailabilityPeriods: z.array(unavailabilityPeriodSchema).optional().default([]),
});

type UnavailabilityFormValues = z.infer<typeof unavailabilityFormSchema>;

interface EditUserUnavailabilityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUnavailabilityUpdate: (userId: string, periods: UnavailabilityPeriod[]) => Promise<void>;
  userToEdit: UserProfile | null;
}

export function EditUserUnavailabilityDialog({ isOpen, onOpenChange, onUnavailabilityUpdate, userToEdit }: EditUserUnavailabilityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UnavailabilityFormValues>({
    resolver: zodResolver(unavailabilityFormSchema),
    defaultValues: {
      unavailabilityPeriods: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "unavailabilityPeriods",
  });

  useEffect(() => {
    if (userToEdit && isOpen) {
      form.reset({
        unavailabilityPeriods: (userToEdit.availability?.unavailabilityPeriods || []).map(p => ({
          id: p.id,
          startDate: p.startDate instanceof Timestamp ? p.startDate.toDate() : new Date(p.startDate),
          endDate: p.endDate instanceof Timestamp ? p.endDate.toDate() : new Date(p.endDate),
          reason: p.reason || "",
        })),
      });
    }
  }, [isOpen, userToEdit, form]);

  async function onSubmit(values: UnavailabilityFormValues) {
    if (!userToEdit) return;
    setIsSubmitting(true);
    try {
      const periodsToSave = (values.unavailabilityPeriods || []).map(p => ({
        ...p,
        startDate: Timestamp.fromDate(p.startDate),
        endDate: Timestamp.fromDate(p.endDate),
      }));
      await onUnavailabilityUpdate(userToEdit.id, periodsToSave as UnavailabilityPeriod[]);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar la indisponibilidad.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!userToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CalendarOff className="mr-2 h-6 w-6 text-primary" />
            Editar Indisponibilidad de {userToEdit.name}
          </DialogTitle>
          <DialogDescription>
            Gestiona los períodos en los que este usuario no estará disponible (vacaciones, etc.).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 pr-1">
            <div className="space-y-3 max-h-[55vh] overflow-y-auto p-1">
              {fields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end p-3 border rounded-md relative bg-muted/20">
                  <FormField control={form.control} name={`unavailabilityPeriods.${index}.startDate`} render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel className="text-xs">Inicio</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("text-left font-normal bg-card", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : "Seleccionar"}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`unavailabilityPeriods.${index}.endDate`} render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel className="text-xs">Fin</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("text-left font-normal bg-card", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : "Seleccionar"}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => form.getValues(`unavailabilityPeriods.${index}.startDate`) ? date < form.getValues(`unavailabilityPeriods.${index}.startDate`) : false} /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <div className="sm:col-span-2">
                    <FormField control={form.control} name={`unavailabilityPeriods.${index}.reason`} render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Razón (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Vacaciones" {...field} className="bg-card" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), startDate: new Date(), endDate: new Date(), reason: "" })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Período</Button>
            </div>
            <DialogFooter className="pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4" />Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
