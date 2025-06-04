
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
import { Loader2, UploadCloud, XCircle } from "lucide-react";
import { useState, useEffect, ChangeEvent } from "react";
import Image from 'next/image';

const territoryFormSchema = z.object({
  type: z.enum(["urban", "rural"], { required_error: "El tipo es obligatorio." }),
  number: z.string().optional(),
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(100),
  mapImageUrl: z.string().optional().or(z.literal('')), // Accepts Data URI or empty string
  googleMapsLink: z.string().url({ message: "Debe ser una URL válida." }).optional().or(z.literal('')),
  totalBlocks: z.coerce.number().int().min(0, "Debe ser 0 o más.").optional(),
  blockHouseCountsString: z.string().optional().refine(val => !val || /^\d+(,\d+)*$/.test(val), {
    message: "Debe ser números separados por comas (ej: 10,12,8)."
  }),
  doNotCallAddressesString: z.string().optional(),
  warningsString: z.string().optional(),
  groupIdsString: z.string().optional(),
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
  const [mapImagePreview, setMapImagePreview] = useState<string | null>(null);
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
      });
      if (territoryToEdit.mapImageUrl) {
        setMapImagePreview(territoryToEdit.mapImageUrl);
      } else {
        setMapImagePreview(null);
      }
    } else if (!isOpen) {
      form.reset();
      setMapImagePreview(null);
    }
  }, [territoryToEdit, isOpen, form]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setMapImagePreview(dataUri);
        form.setValue('mapImageUrl', dataUri, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    } else {
      setMapImagePreview(null);
      form.setValue('mapImageUrl', '', { shouldValidate: true });
    }
  };

  const clearImage = () => {
    setMapImagePreview(null);
    form.setValue('mapImageUrl', '', { shouldValidate: true });
    const fileInput = document.getElementById('mapImageUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ""; // Reset file input
    }
  };

  async function onSubmit(values: TerritoryFormValues) {
    setIsSubmitting(true);

    const blockHouseCounts = values.blockHouseCountsString?.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) || [];
    const approxHouseCount = blockHouseCounts.reduce((sum, count) => sum + count, 0);

    const submittedTerritory: Territory = {
      id: isEditMode && territoryToEdit ? territoryToEdit.id : crypto.randomUUID(),
      type: values.type,
      number: values.type === "urban" ? values.number : undefined,
      name: values.name,
      mapImageUrl: values.mapImageUrl || undefined, // Will be Data URI or undefined
      googleMapsLink: values.googleMapsLink || undefined,
      totalBlocks: values.totalBlocks,
      blockHouseCounts: blockHouseCounts,
      approxHouseCount: approxHouseCount,
      doNotCallAddresses: values.doNotCallAddressesString?.split('\n').map(s => s.trim()).filter(s => s) || [],
      warnings: values.warningsString?.split('\n').map(s => s.trim()).filter(s => s) || [],
      isBlocked: isEditMode && territoryToEdit ? territoryToEdit.isBlocked : false,
      groupIds: values.groupIdsString?.split(',').map(s => s.trim()).filter(s => s) || [],
      lastWorked: isEditMode && territoryToEdit ? territoryToEdit.lastWorked : undefined,
      createdAt: isEditMode && territoryToEdit ? territoryToEdit.createdAt : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await new Promise(resolve => setTimeout(resolve, 700));

    onTerritorySubmit(submittedTerritory);
    toast({
      title: isEditMode ? "Territorio Actualizado" : "Territorio Añadido",
      description: `El territorio "${values.name}" ha sido ${isEditMode ? 'actualizado' : 'registrado'} (simulación).`,
    });

    if (!isEditMode) {
        form.reset();
        setMapImagePreview(null);
    }
    onOpenChange(false);
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            if (!isEditMode) form.reset();
            setMapImagePreview(null); // Clear preview when dialog closes
        }
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

            <FormItem>
              <FormLabel>Imagen del Mapa (Opcional)</FormLabel>
              <FormControl>
                <Input
                  id="mapImageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary/10 file:text-primary
                    hover:file:bg-primary/20"
                />
              </FormControl>
              <FormFieldDescription>Sube una imagen del mapa del territorio.</FormFieldDescription>
              {mapImagePreview && (
                <div className="mt-2 relative w-full aspect-video rounded-md overflow-hidden border p-1">
                  <Image src={mapImagePreview} alt="Vista previa del mapa" layout="fill" objectFit="contain" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 bg-background/70 hover:bg-background/90 h-7 w-7"
                    onClick={clearImage}
                  >
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="sr-only">Quitar imagen</span>
                  </Button>
                </div>
              )}
              <FormMessage>{form.formState.errors.mapImageUrl?.message}</FormMessage>
            </FormItem>

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

    