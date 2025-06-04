
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
  FormDescription as FormFieldDescription, // Renamed to avoid conflict
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
import { Checkbox } from "@/components/ui/checkbox";
import type { Casa, CasaAvailability, DayAvailability } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2, Ban } from "lucide-react";
import { useState } from "react";

const dayAvailabilitySchema = z.object({
  am: z.boolean().optional().default(false),
  pm: z.boolean().optional().default(false),
});

const casaFormSchema = z.object({
  ownerName: z.string().min(2, { message: "El nombre del propietario debe tener al menos 2 caracteres." }).max(100),
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200),
  city: z.string().max(50).optional(),
  status: z.enum(['available', 'do_not_call', 'contacted', 'needs_revisit']),
  availability: z.object({
    monday: dayAvailabilitySchema,
    tuesday: dayAvailabilitySchema,
    wednesday: dayAvailabilitySchema,
    thursday: dayAvailabilitySchema,
    friday: dayAvailabilitySchema,
  }).optional(),
  nearbyTerritoryIds: z.string().max(500).optional().describe("IDs o nombres de territorios cercanos, separados por comas"),
  notes: z.string().max(1000).optional(),
});

type CasaFormValues = z.infer<typeof casaFormSchema>;

const CASA_STATUS_OPTIONS: { value: Casa['status']; label: string }[] = [
  { value: 'available', label: 'Disponible' },
  { value: 'do_not_call', label: 'No Visitar' },
  { value: 'contacted', label: 'Contactada' },
  { value: 'needs_revisit', label: 'Necesita Revisita' },
];

const WEEK_DAYS = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
] as const; // `as const` ensures types are literals like 'monday'

interface AddCasaDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCasaAdded: (casa: Casa) => void; 
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
      availability: {
        monday: { am: false, pm: false },
        tuesday: { am: false, pm: false },
        wednesday: { am: false, pm: false },
        thursday: { am: false, pm: false },
        friday: { am: false, pm: false },
      },
      nearbyTerritoryIds: "",
      notes: "",
    },
  });

  async function onSubmit(values: CasaFormValues) {
    setIsSubmitting(true);
    console.log("Datos del formulario de casa:", values);

    const newCasa: Casa = {
      id: crypto.randomUUID(), 
      ...values,
      city: values.city || undefined,
      availability: values.availability as CasaAvailability, // Cast as it's optional in form but we provide defaults
      nearbyTerritoryIds: values.nearbyTerritoryIds || undefined,
      notes: values.notes || undefined,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    onCasaAdded(newCasa); 
    toast({
      title: "Casa Añadida (Simulación)",
      description: `La casa para ${values.ownerName} ha sido registrada (simulación).`,
    });
    form.reset();
    onOpenChange(false); 
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Casa</DialogTitle>
          <DialogDescription>
            Completa los detalles de la nueva casa para la predicación.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2 pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

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
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad/Sector (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Santiago Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div>
              <FormLabel className="text-base font-medium">Disponibilidad (Lunes a Viernes)</FormLabel>
              <FormFieldDescription>
                Marca los bloques horarios en que la casa estaría disponible para reuniones de grupo.
              </FormFieldDescription>
              <div className="mt-3 space-y-3 rounded-md border p-4 shadow-sm bg-muted/20">
                {WEEK_DAYS.map(day => (
                  <div key={day.id} className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                    <FormLabel className="font-normal col-span-1">{day.label}</FormLabel>
                    <FormField
                      control={form.control}
                      name={`availability.${day.id}.am`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 col-span-1">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal text-sm">AM</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`availability.${day.id}.pm`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 col-span-1">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal text-sm">PM</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="nearbyTerritoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Territorios Cercanos</FormLabel>
                   <FormFieldDescription>
                    Nombres o IDs de territorios fácilmente accesibles desde esta casa (ej: T-101, T-102, Centro Alto).
                  </FormFieldDescription>
                  <FormControl>
                    <Textarea placeholder="Separados por comas o listados..." {...field} />
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
                  <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                   <FormFieldDescription>
                    Cualquier otra información relevante sobre la casa o su uso.
                  </FormFieldDescription>
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
                Añadir Casa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
