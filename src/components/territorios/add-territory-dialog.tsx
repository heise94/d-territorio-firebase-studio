
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Territory, TerritoryType } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const territoryFormSchema = z.object({
  type: z.enum(["urban", "rural"], { required_error: "El tipo es obligatorio." }),
  number: z.string().optional(),
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(100),
  mapImageUrl: z.string().url({ message: "Debe ser una URL válida." }).optional().or(z.literal('')),
  googleMapsLink: z.string().url({ message: "Debe ser una URL válida." }).optional().or(z.literal('')),
  totalBlocks: z.coerce.number().int().min(0, "Debe ser 0 o más.").optional(),
  blockHouseCountsString: z.string().optional().refine(val => !val || /^\d+(,\d+)*$/.test(val), {
    message: "Debe ser números separados por comas (ej: 10,12,8)."
  }),
  doNotCallAddressesString: z.string().optional(),
  warningsString: z.string().optional(),
  groupIdsString: z.string().optional(),
  colorClass: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === "urban" && (!data.number || data.number.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El número es obligatorio para territorios urbanos.",
      path: ["number"],
    });
  }
  if (data.blockHouseCountsString && data.totalBlocks !== undefined) {
    const counts = data.blockHouseCountsString.split(',').map(s => s.trim()).filter(s => s);
    if (counts.length !== data.totalBlocks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Debe haber ${data.totalBlocks} conteos de casas, uno por cada manzana.`,
        path: ["blockHouseCountsString"],
      });
    }
  }
});

type TerritoryFormValues = z.infer<typeof territoryFormSchema>;

interface AddTerritoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTerritorySubmit: (territory: Territory) => void;
  territoryToEdit?: Territory | null;
}

export function AddTerritoryDialog({ isOpen, onOpenChange, onTerritorySubmit, territoryToEdit }: AddTerritoryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!territoryToEdit;

  const form = useForm<TerritoryFormValues>({
    resolver: zodResolver(territoryFormSchema),
    defaultValues: {
      type: "urban",
      number: "",
      name: "",
      mapImageUrl: "",
      googleMapsLink: "",
      totalBlocks: 0,
      blockHouseCountsString: "",
      doNotCallAddressesString: "",
      warningsString: "",
      groupIdsString: "",
      colorClass: "bg-sky-100",
    },
  });

  const watchedType = form.watch("type");

  useEffect(() => {
    if (territoryToEdit && isOpen) {
      form.reset({
        type: territoryToEdit.type || "urban",
        number: territoryToEdit.number || "",
        name: territoryToEdit.name || "",
        mapImageUrl: territoryToEdit.mapImageUrl || "",
        googleMapsLink: territoryToEdit.googleMapsLink || "",
        totalBlocks: territoryToEdit.totalBlocks || 0,
        blockHouseCountsString: territoryToEdit.blockHouseCounts?.join(", ") || "",
        doNotCallAddressesString: territoryToEdit.doNotCallAddresses?.join("\n") || "",
        warningsString: territoryToEdit.warnings?.join("\n") || "",
        groupIdsString: territoryToEdit.groupIds?.join(", ") || "",
        colorClass: territoryToEdit.colorClass || "bg-sky-100",
      });
    } else if (!isOpen) {
      form.reset(); // Reset to default values when dialog is closed and not in edit mode
    }
  }, [territoryToEdit, isOpen, form]);

  async function onSubmit(values: TerritoryFormValues) {
    setIsSubmitting(true);

    const blockHouseCounts = values.blockHouseCountsString?.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) || [];
    const approxHouseCount = blockHouseCounts.reduce((sum, count) => sum + count, 0);

    const submittedTerritory: Territory = {
      id: isEditMode && territoryToEdit ? territoryToEdit.id : crypto.randomUUID(),
      type: values.type,
      number: values.type === "urban" ? values.number : undefined,
      name: values.name,
      mapImageUrl: values.mapImageUrl || undefined,
      googleMapsLink: values.googleMapsLink || undefined,
      totalBlocks: values.totalBlocks,
      blockHouseCounts: blockHouseCounts,
      approxHouseCount: approxHouseCount,
      doNotCallAddresses: values.doNotCallAddressesString?.split('\n').map(s => s.trim()).filter(s => s) || [],
      warnings: values.warningsString?.split('\n').map(s => s.trim()).filter(s => s) || [],
      isBlocked: isEditMode && territoryToEdit ? territoryToEdit.isBlocked : false, // Default to not blocked
      // blockReason and unblockDate handled by block/unblock actions
      groupIds: values.groupIdsString?.split(',').map(s => s.trim()).filter(s => s) || [],
      colorClass: values.colorClass || undefined,
      lastWorked: isEditMode && territoryToEdit ? territoryToEdit.lastWorked : undefined, // Not editable here
      createdAt: isEditMode && territoryToEdit ? territoryToEdit.createdAt : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 700));

    onTerritorySubmit(submittedTerritory);
    toast({
      title: isEditMode ? "Territorio Actualizado" : "Territorio Añadido",
      description: `El territorio "${values.name}" ha sido ${isEditMode ? 'actualizado' : 'registrado'} (simulación).`,
    });
    
    if (!isEditMode) form.reset(); 
    onOpenChange(false); // Close dialog
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && !isEditMode) form.reset(); 
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Territorio" : "Añadir Nuevo Territorio"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles del territorio." : "Completa los detalles del nuevo territorio."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 pr-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Territorio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="urban">Urbano</SelectItem>
                      <SelectItem value="rural">Rural</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedType === "urban" && (
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Territorio (si urbano)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 101, A23" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Territorio</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Centro Alto, Sector Las Lomas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mapImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de Imagen del Mapa (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://ejemplo.com/mapa.png" {...field} />
                  </FormControl>
                  <FormFieldDescription>Puedes usar una URL de placehold.co para pruebas.</FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="googleMapsLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enlace de Google Maps (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://maps.app.goo.gl/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalBlocks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total de Manzanas (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ej: 5" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="blockHouseCountsString"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteo de Casas por Manzana (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: 10,12,8,15,11 (separados por coma)" {...field} rows={2}/>
                  </FormControl>
                  <FormFieldDescription>Si ingresaste "Total de Manzanas", asegúrate que el número de conteos coincida.</FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="doNotCallAddressesString"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direcciones "No Visitar" (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Una dirección por línea..." {...field} rows={3}/>
                  </FormControl>
                   <FormFieldDescription>Cada línea se tratará como una dirección separada.</FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warningsString"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Advertencias/Notas Importantes (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Una advertencia por línea..." {...field} rows={3}/>
                  </FormControl>
                  <FormFieldDescription>Cada línea se tratará como una advertencia separada.</FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="groupIdsString"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IDs de Grupos Asociados (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: G1, G2, G5 (separados por coma)" {...field} />
                  </FormControl>
                  <FormFieldDescription>IDs de los grupos de predicación que trabajan este territorio.</FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="colorClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clase de Color para UI (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: bg-blue-100, text-green-700" {...field} />
                  </FormControl>
                  <FormFieldDescription>Clase Tailwind para personalizar la tarjeta (ej: `bg-sky-100`).</FormFieldDescription>
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
                {isEditMode ? "Guardar Cambios" : "Añadir Territorio"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
