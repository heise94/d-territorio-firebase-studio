
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
import { Checkbox } from "@/components/ui/checkbox";
import type { Casa, CasaAvailability } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const dayAvailabilitySchema = z.object({
  am: z.boolean().optional().default(false),
  pm: z.boolean().optional().default(false),
});

const casaFormSchema = z.object({
  ownerName: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(100),
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200),
  phoneNumber: z.string().max(20).optional().or(z.literal('')),
  availableDays: z.object({
    monday: dayAvailabilitySchema,
    tuesday: dayAvailabilitySchema,
    wednesday: dayAvailabilitySchema,
    thursday: dayAvailabilitySchema,
    friday: dayAvailabilitySchema,
    // saturday: dayAvailabilitySchema, // Keep if needed based on PRD, removed for Lu-Vi focus
    // sunday: dayAvailabilitySchema,   // Keep if needed based on PRD, removed for Lu-Vi focus
  }).optional(),
  associatedTerritories: z.string().optional().describe("Territorios asociados, separados por comas"),
  notes: z.string().max(1000).optional(),
  isSuitableForRural: z.boolean().optional().default(false),
  // isBlockedForGeneralAI: z.boolean().optional().default(false), // Removed
});

type CasaFormValues = z.infer<typeof casaFormSchema>;

const WEEK_DAYS = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  // { id: 'saturday', label: 'Sábado' }, // Keep if needed
  // { id: 'sunday', label: 'Domingo' },   // Keep if needed
] as const;

interface AddCasaDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCasaSubmit: (casa: Casa) => void;
  casaToEdit?: Casa | null;
}

export function AddCasaDialog({ isOpen, onOpenChange, onCasaSubmit, casaToEdit }: AddCasaDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!casaToEdit;

  const form = useForm<CasaFormValues>({
    resolver: zodResolver(casaFormSchema),
    defaultValues: {
      ownerName: "",
      address: "",
      phoneNumber: "",
      availableDays: {
        monday: { am: false, pm: false },
        tuesday: { am: false, pm: false },
        wednesday: { am: false, pm: false },
        thursday: { am: false, pm: false },
        friday: { am: false, pm: false },
      },
      associatedTerritories: "",
      notes: "",
      isSuitableForRural: false,
      // isBlockedForGeneralAI: false, // Removed
    },
  });

  useEffect(() => {
    if (casaToEdit && isOpen) {
      form.reset({
        ownerName: casaToEdit.ownerName || "",
        address: casaToEdit.address || "",
        phoneNumber: casaToEdit.phoneNumber || "",
        availableDays: casaToEdit.availableDays || {
          monday: { am: false, pm: false },
          tuesday: { am: false, pm: false },
          wednesday: { am: false, pm: false },
          thursday: { am: false, pm: false },
          friday: { am: false, pm: false },
        },
        associatedTerritories: casaToEdit.associatedTerritories?.join(", ") || "",
        notes: casaToEdit.notes || "",
        isSuitableForRural: casaToEdit.isSuitableForRural || false,
        // isBlockedForGeneralAI: casaToEdit.isBlockedForGeneralAI || false, // Removed
      });
    } else if (!isOpen) {
      form.reset(); 
    }
  }, [casaToEdit, isOpen, form]);

  async function onSubmit(values: CasaFormValues) {
    setIsSubmitting(true);

    const submittedCasa: Casa = {
      id: isEditMode && casaToEdit ? casaToEdit.id : crypto.randomUUID(),
      ownerName: values.ownerName,
      address: values.address,
      phoneNumber: values.phoneNumber || undefined,
      availableDays: values.availableDays as CasaAvailability,
      associatedTerritories: values.associatedTerritories?.split(',').map(t => t.trim()).filter(t => t) || [],
      notes: values.notes || undefined,
      isSuitableForRural: values.isSuitableForRural,
      // isBlockedForGeneralAI: values.isBlockedForGeneralAI, // Removed
      isBlocked: isEditMode && casaToEdit ? casaToEdit.isBlocked : false, 
      createdAt: isEditMode && casaToEdit ? casaToEdit.createdAt : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    await new Promise(resolve => setTimeout(resolve, 700));

    onCasaSubmit(submittedCasa);
    toast({
      title: isEditMode ? "Casa Actualizada" : "Casa Añadida",
      description: `La casa para ${values.ownerName} ha sido ${isEditMode ? 'actualizada' : 'registrada'} (simulación).`,
    });
    
    if (!isEditMode) form.reset(); 
    onOpenChange(false);
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && !isEditMode) form.reset(); 
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Casa" : "Añadir Nueva Casa"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles de la casa." : "Completa los detalles de la nueva casa para la predicación."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2 pr-2">
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Propietario/Residente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Familia Pérez" {...field} />
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
                  <FormLabel>Dirección Completa</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Calle Falsa 123, Depto 4B, Comuna" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: +56 9 1234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel className="text-base font-medium">Disponibilidad (Lunes a Viernes)</FormLabel>
              <FormFieldDescription>
                Marca los bloques horarios en que la casa estaría disponible.
              </FormFieldDescription>
              <div className="mt-3 space-y-3 rounded-md border p-4 shadow-sm bg-muted/20">
                {WEEK_DAYS.map(day => (
                  <div key={day.id} className="grid grid-cols-1 sm:grid-cols-3 items-center gap-x-4 gap-y-2">
                    <FormLabel className="font-normal col-span-1 sm:text-right sm:pr-2">{day.label}</FormLabel>
                    <FormField
                      control={form.control}
                      name={`availableDays.${day.id}.am`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 col-span-1">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} id={`${day.id}-am`} />
                          </FormControl>
                          <FormLabel htmlFor={`${day.id}-am`} className="font-normal text-sm cursor-pointer">AM (Mañana)</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`availableDays.${day.id}.pm`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 col-span-1">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} id={`${day.id}-pm`} />
                          </FormControl>
                          <FormLabel htmlFor={`${day.id}-pm`} className="font-normal text-sm cursor-pointer">PM (Tarde)</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="associatedTerritories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Territorios Cercanos/Asociados</FormLabel>
                   <FormFieldDescription>
                    Nombres o IDs de territorios, separados por comas (ej: T-101, Centro Alto, T-205).
                  </FormFieldDescription>
                  <FormControl>
                    <Textarea placeholder="Ej: T-101, Centro Alto, T-205" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isSuitableForRural"
              render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                  <FormControl>
                      <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      />
                  </FormControl>
                  <div className="space-y-0.5">
                      <FormLabel>Apta para Predicación Rural</FormLabel>
                      <FormFieldDescription>
                      Marcar si esta casa puede usarse para grupos de territorios rurales.
                      </FormFieldDescription>
                  </div>
                  </FormItem>
              )}
            />
           
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Entrada por el pasaje, preguntar por citófono 1A, etc." {...field} />
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
                {isEditMode ? "Guardar Cambios" : "Añadir Casa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

