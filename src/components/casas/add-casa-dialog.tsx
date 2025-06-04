
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Casa } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const casaFormSchema = z.object({
  ownerName: z.string().min(2, { message: "El nombre del propietario debe tener al menos 2 caracteres." }).max(100),
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200),
  city: z.string().max(50).optional(),
  status: z.enum(['available', 'do_not_call', 'contacted', 'needs_revisit']),
  availabilityNotes: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

type CasaFormValues = z.infer<typeof casaFormSchema>;

const CASA_STATUS_OPTIONS: { value: Casa['status']; label: string }[] = [
  { value: 'available', label: 'Disponible' },
  { value: 'do_not_call', label: 'No Visitar' },
  { value: 'contacted', label: 'Contactada' },
  { value: 'needs_revisit', label: 'Necesita Revisita' },
];

interface AddCasaDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCasaAdded: (casa: Casa) => void; // Callback para cuando se añade una casa
}

export function AddCasaDialog({ isOpen, onOpenChange, onCasaAdded }: AddCasaDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CasaFormValues>({
    resolver: zodResolver(casaFormSchema),
    defaultValues: {
      ownerName: "",
      address: "",
      city: "",
      status: "available",
      availabilityNotes: "",
      notes: "",
    },
  });

  async function onSubmit(values: CasaFormValues) {
    setIsSubmitting(true);
    console.log("Datos del formulario de casa:", values);

    // Simulación de guardado y creación del objeto Casa
    // En el futuro, esto interactuará con Firestore
    const newCasa: Casa = {
      id: crypto.randomUUID(), // ID temporal para la demo
      ...values,
      city: values.city || undefined,
      availabilityNotes: values.availabilityNotes || undefined,
      notes: values.notes || undefined,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    // Simular una demora de red
    await new Promise(resolve => setTimeout(resolve, 1000));

    onCasaAdded(newCasa); // Llama al callback
    toast({
      title: "Casa Añadida (Simulación)",
      description: `La casa para ${values.ownerName} ha sido registrada (simulación).`,
    });
    form.reset();
    onOpenChange(false); // Cierra el diálogo
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Casa</DialogTitle>
          <DialogDescription>
            Completa los detalles de la nueva casa para la predicación.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Propietario/Residente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Calle Falsa 123, Depto 4B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Springfield" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CASA_STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="availabilityNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas de Disponibilidad (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Mejor por las tardes, evitar siestas, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Generales (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Tiene perro, preguntar por el hijo mayor, etc." {...field} />
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
                Añadir Casa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
