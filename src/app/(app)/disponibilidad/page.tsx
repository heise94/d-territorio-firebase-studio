
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription as FormFieldDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import type { CasaAvailability } from "@/types"; // Reusing CasaAvailability for user
import { usePermissions } from "@/hooks/use-permissions"; // To get current userProfile

const dayAvailabilitySchema = z.object({
  am: z.boolean().optional().default(false),
  pm: z.boolean().optional().default(false),
});

const availabilityFormSchema = z.object({
  monday: dayAvailabilitySchema,
  tuesday: dayAvailabilitySchema,
  wednesday: dayAvailabilitySchema,
  thursday: dayAvailabilitySchema,
  friday: dayAvailabilitySchema,
  saturday: dayAvailabilitySchema,
  sunday: dayAvailabilitySchema,
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

const WEEK_DAYS_FULL = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' },
] as const;

export default function DisponibilidadPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userProfile, isLoadingPermissions } = usePermissions();

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: { // Initial default values
      monday: { am: false, pm: false },
      tuesday: { am: false, pm: false },
      wednesday: { am: false, pm: false },
      thursday: { am: false, pm: false },
      friday: { am: false, pm: false },
      saturday: { am: false, pm: false },
      sunday: { am: false, pm: false },
    },
  });

  useEffect(() => {
    if (userProfile?.availability && !isLoadingPermissions) {
      // Ensure all days are present in userProfile.availability, defaulting if not
      const currentAvailability = userProfile.availability;
      const defaultDay = { am: false, pm: false };
      form.reset({
        monday: currentAvailability.monday || defaultDay,
        tuesday: currentAvailability.tuesday || defaultDay,
        wednesday: currentAvailability.wednesday || defaultDay,
        thursday: currentAvailability.thursday || defaultDay,
        friday: currentAvailability.friday || defaultDay,
        saturday: currentAvailability.saturday || defaultDay,
        sunday: currentAvailability.sunday || defaultDay,
      });
    } else if (!isLoadingPermissions && !userProfile?.availability) {
      // If profile is loaded but no availability, reset to full default
      form.reset({
        monday: { am: false, pm: false },
        tuesday: { am: false, pm: false },
        wednesday: { am: false, pm: false },
        thursday: { am: false, pm: false },
        friday: { am: false, pm: false },
        saturday: { am: false, pm: false },
        sunday: { am: false, pm: false },
      });
    }
  }, [userProfile, form, isLoadingPermissions]);

  async function onSubmit(values: AvailabilityFormValues) {
    setIsSubmitting(true);
    console.log("Disponibilidad guardada (simulación):", values);
    
    // TODO: Aquí iría la lógica para guardar `values` en Firestore para el usuario actual
    // Ejemplo: await updateDoc(doc(db, "users", userProfile.id), { availability: values, updatedAt: serverTimestamp() });

    await new Promise(resolve => setTimeout(resolve, 700)); // Simular delay de red

    toast({
      title: "Disponibilidad Actualizada",
      description: "Tus horarios disponibles han sido guardados (simulación).",
    });
    setIsSubmitting(false);
  }

  if (isLoadingPermissions) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Mi Disponibilidad</h1>
        <p className="text-muted-foreground mt-1">
          Indica los días y horarios en los que generalmente estás disponible para participar.
        </p>
      </div>

      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Configurar Horarios Disponibles</CardTitle>
          <CardDescription>
            Marca los bloques en los que puedes colaborar. Esta información ayudará a organizar mejor el programa.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 py-4">
              {WEEK_DAYS_FULL.map(day => (
                <div key={day.id} className="rounded-md border p-4 shadow-sm bg-card">
                  <FormLabel className="text-lg font-semibold mb-3 block">{day.label}</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField
                      control={form.control}
                      name={`${day.id}.am`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                              id={`${day.id}-am`}
                            />
                          </FormControl>
                          <FormLabel htmlFor={`${day.id}-am`} className="font-normal text-sm cursor-pointer flex-grow">
                            Bloque AM <span className="text-xs text-muted-foreground">(Mañana)</span>
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`${day.id}.pm`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                              id={`${day.id}-pm`}
                            />
                          </FormControl>
                          <FormLabel htmlFor={`${day.id}-pm`} className="font-normal text-sm cursor-pointer flex-grow">
                            Bloque PM <span className="text-xs text-muted-foreground">(Tarde)</span>
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isSubmitting} size="lg" className="w-full sm:w-auto">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Save className="mr-2 h-5 w-5" />
                )}
                Guardar Cambios
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
