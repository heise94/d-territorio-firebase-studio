
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import type { Territory, TerritoryType, Casa, PreachingGroup } from "@/types"; 
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, XCircle, ChevronDown } from "lucide-react";
import { useState, useEffect, ChangeEvent, useMemo } from "react";
import Image from 'next/image';
import { cn } from "@/lib/utils";

const territoryFormSchema = z.object({
  type: z.enum(["urban", "rural"], { required_error: "El tipo es obligatorio." }),
  number: z.string().optional(),
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(100),
  mapImageUrl: z.string().optional().or(z.literal('')),
  googleMapsLink: z.string().url({ message: "Debe ser una URL válida." }).optional().or(z.literal('')),
  totalBlocks: z.coerce.number().int().min(0, "Debe ser 0 o más.").optional().default(0),
  blockHouseCounts: z.array(z.preprocess(
    (val) => (val === "" || val === undefined || val === null || isNaN(Number(val))) ? undefined : Number(val),
    z.number().int().min(0, "Debe ser un número >= 0.").optional()
  )).optional(),
  doNotCallAddressesString: z.string().optional(),
  warningsString: z.string().optional(),
  groupIds: z.array(z.string()).optional().default([]),
  associatedCasaIds: z.array(z.string()).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.type === "urban" && (!data.number || data.number.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El número es obligatorio para territorios urbanos.",
      path: ["number"],
    });
  }
  if (data.blockHouseCounts && data.totalBlocks !== undefined && data.blockHouseCounts.length !== data.totalBlocks) {
    // This validation might be too strict if we allow partial saves or dynamic row changes.
    // For now, let's assume totalBlocks drives the array length.
  }
});

type TerritoryFormValues = z.infer<typeof territoryFormSchema>;

interface AddTerritoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTerritorySubmit: (territory: Partial<Territory> & Pick<Territory, 'id' | 'type' | 'name' | 'isBlocked' | 'createdAt' | 'updatedAt' | 'blockReason'>) => void;
  territoryToEdit?: Territory | null;
  availableCasas: Casa[]; 
  availableGroups: PreachingGroup[]; 
}

export function AddTerritoryDialog({ 
    isOpen, 
    onOpenChange, 
    onTerritorySubmit, 
    territoryToEdit,
    availableCasas, 
    availableGroups 
}: AddTerritoryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapImagePreview, setMapImagePreview] = useState<string | null>(null);
  const isEditMode = !!territoryToEdit?.id;

  const form = useForm<TerritoryFormValues>({
    resolver: zodResolver(territoryFormSchema),
    defaultValues: {
      type: "urban",
      number: "",
      name: "",
      mapImageUrl: "",
      googleMapsLink: "",
      totalBlocks: 0,
      blockHouseCounts: [],
      doNotCallAddressesString: "",
      warningsString: "",
      groupIds: [],
      associatedCasaIds: [],
    },
  });

  const watchedType = form.watch("type");
  const watchedTotalBlocks = form.watch("totalBlocks");
  const watchedBlockHouseCounts = form.watch("blockHouseCounts");

  useEffect(() => {
    if (territoryToEdit && isOpen) {
      const initialTotalBlocks = territoryToEdit.totalBlocks || 0;
      let initialBlockCounts: (number | undefined)[] = [];

      if (territoryToEdit.blockHouseCounts && territoryToEdit.blockHouseCounts.length > 0) {
          initialBlockCounts = territoryToEdit.blockHouseCounts.map(c => (c === null || c === undefined) ? undefined : Number(c));
      }
      // Ensure array length matches totalBlocks, filling with undefined if necessary
      if (initialBlockCounts.length < initialTotalBlocks) {
          initialBlockCounts = [...initialBlockCounts, ...Array(initialTotalBlocks - initialBlockCounts.length).fill(undefined)];
      } else if (initialBlockCounts.length > initialTotalBlocks) {
          initialBlockCounts = initialBlockCounts.slice(0, initialTotalBlocks);
      }
      
      form.reset({
        type: territoryToEdit.type || "urban",
        number: territoryToEdit.number || "",
        name: territoryToEdit.name || "",
        mapImageUrl: territoryToEdit.mapImageUrl || "",
        googleMapsLink: territoryToEdit.googleMapsLink || "",
        totalBlocks: initialTotalBlocks,
        blockHouseCounts: initialBlockCounts,
        doNotCallAddressesString: territoryToEdit.doNotCallAddresses?.join("\n") || "",
        warningsString: territoryToEdit.warnings?.join("\n") || "",
        groupIds: territoryToEdit.groupIds || [],
        associatedCasaIds: territoryToEdit.associatedCasaIds || [],
      });
      if (territoryToEdit.mapImageUrl) {
        setMapImagePreview(territoryToEdit.mapImageUrl);
      } else {
        setMapImagePreview(null);
      }
    } else if (!isOpen) {
      form.reset({
        type: "urban", number: "", name: "", mapImageUrl: "", googleMapsLink: "",
        totalBlocks: 0, blockHouseCounts: [], doNotCallAddressesString: "", warningsString: "",
        groupIds: [], associatedCasaIds: [],
      });
      setMapImagePreview(null);
    }
  }, [territoryToEdit, isOpen, form]);

  useEffect(() => {
    if (!isOpen) return;
    const currentBlockCounts = form.getValues("blockHouseCounts") || [];
    const newTotal = Math.max(0, watchedTotalBlocks || 0);
  
    if (currentBlockCounts.length !== newTotal) {
      const newCountsArray: (number | undefined)[] = Array(newTotal);
      for (let i = 0; i < newTotal; i++) {
        const existingVal = currentBlockCounts[i];
        newCountsArray[i] = (existingVal === undefined || existingVal === null || isNaN(Number(existingVal)))
          ? undefined
          : Number(existingVal);
      }
      form.setValue("blockHouseCounts", newCountsArray, { shouldValidate: true, shouldDirty: form.formState.isDirty });
    }
  }, [watchedTotalBlocks, isOpen, form]);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Imagen Demasiado Grande",
          description: "Por favor, selecciona una imagen de menos de 2MB.",
        });
        clearImage();
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setMapImagePreview(dataUri);
        form.setValue('mapImageUrl', dataUri, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    } else {
      clearImage();
    }
  };

  const clearImage = () => {
    setMapImagePreview(null);
    form.setValue('mapImageUrl', '', { shouldValidate: true });
    const fileInput = document.getElementById('mapImageUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  async function onSubmit(values: TerritoryFormValues) {
    setIsSubmitting(true);

    const processedBlockHouseCounts = (values.blockHouseCounts || []).map(count => 
      count === undefined || count === null || isNaN(count) ? 0 : count
    );
    const approxHouseCount = processedBlockHouseCounts.reduce((sum, count) => sum + count, 0);
    const idForSubmit = territoryToEdit?.id && isEditMode ? territoryToEdit.id : crypto.randomUUID();
    
    const territoryDataToSubmit: Partial<Territory> & Pick<Territory, 'id' | 'type' | 'name' | 'isBlocked' | 'createdAt' | 'updatedAt' | 'blockReason'> = {
      id: idForSubmit,
      type: values.type,
      name: values.name,
      totalBlocks: values.totalBlocks,
      blockHouseCounts: processedBlockHouseCounts,
      approxHouseCount: approxHouseCount,
      doNotCallAddresses: values.doNotCallAddressesString?.split('\n').map(s => s.trim()).filter(s => s) || [],
      warnings: values.warningsString?.split('\n').map(s => s.trim()).filter(s => s) || [],
      isBlocked: territoryToEdit?.id && isEditMode ? territoryToEdit.isBlocked : false,
      blockReason: territoryToEdit?.id && isEditMode && territoryToEdit.isBlocked ? territoryToEdit.blockReason : undefined,
      groupIds: values.groupIds || [],
      associatedCasaIds: values.associatedCasaIds || [],
      createdAt: territoryToEdit?.id && isEditMode ? territoryToEdit.createdAt : Timestamp.now(),
      updatedAt: Timestamp.now(),
      dataAiHint: "map sketch", 
    };

    if (values.type === "urban" && values.number && values.number.trim() !== "") {
      territoryDataToSubmit.number = values.number.trim();
    }
    if (values.mapImageUrl && values.mapImageUrl.trim() !== "") {
      territoryDataToSubmit.mapImageUrl = values.mapImageUrl.trim();
    }
    if (values.googleMapsLink && values.googleMapsLink.trim() !== "") {
      territoryDataToSubmit.googleMapsLink = values.googleMapsLink.trim();
    }

    if (!isEditMode) {
        territoryDataToSubmit.lastWorked = undefined;
        territoryDataToSubmit.unblockDate = undefined;
    } else if (isEditMode && territoryToEdit?.lastWorked) {
        territoryDataToSubmit.lastWorked = territoryToEdit.lastWorked;
    } else if (isEditMode && territoryToEdit?.unblockDate) {
        territoryDataToSubmit.unblockDate = territoryToEdit.unblockDate;
    }
    
    onTerritorySubmit(territoryDataToSubmit);

    if (!isEditMode) {
        form.reset();
        setMapImagePreview(null);
    }
    setIsSubmitting(false);
  }

  const getSelectedItemsText = (selectedIds: string[] | undefined, allItems: { id: string; name: string }[], placeholder: string) => {
    if (!selectedIds || selectedIds.length === 0) return placeholder;
    if (selectedIds.length === 1) {
      const item = allItems.find(c => c.id === selectedIds[0]);
      return item ? item.name : placeholder;
    }
    return `${selectedIds.length} seleccionados`;
  };

  const currentApproxHouseCountInDialog = useMemo(() => {
    return (watchedBlockHouseCounts || []).reduce((sum, count) => sum + (Number(count) || 0), 0);
  }, [watchedBlockHouseCounts]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            if (!isEditMode) form.reset(); 
            setMapImagePreview(null);
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Territorio" : "Añadir Nuevo Territorio"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles del territorio." : "Completa los detalles del nuevo territorio."}
            {territoryToEdit && !isEditMode && <span className="block text-sm text-blue-600 mt-1">Estás creando una copia de "{territoryToEdit.name}". Ajusta el nombre y el número.</span>}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
              <FormFieldDescription>Sube una imagen del mapa (máx. 2MB).</FormFieldDescription>
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
                  <FormLabel>Total de Manzanas</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="Ej: 5" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {(watchedTotalBlocks || 0) > 0 && (
              <p className="text-sm text-muted-foreground -mt-3 mb-1 ml-1">
                Suma de casas ingresadas: <span className="font-semibold text-foreground">{currentApproxHouseCountInDialog}</span>
              </p>
            )}


            {(watchedTotalBlocks || 0) > 0 && (
              <div className="space-y-3 rounded-md border p-3 shadow-sm bg-muted/20">
                <FormLabel className="text-sm font-medium">Conteo de Casas por Manzana</FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
                  {Array.from({ length: watchedTotalBlocks || 0 }, (_, index) => (
                    <FormField
                      key={`blockHouseCounts-${index}`}
                      control={form.control}
                      name={`blockHouseCounts.${index}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-normal">
                            Mz. {index + 1}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                              value={field.value === undefined || field.value === null ? '' : String(field.value)}
                              onChange={e => {
                                const val = e.target.value;
                                field.onChange(val === '' ? undefined : parseInt(val, 10));
                              }}
                              className="h-9 text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

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
              name="associatedCasaIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Casas Cercanas (Opcional)</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-between" disabled={availableCasas.length === 0}>
                          {getSelectedItemsText(field.value, availableCasas.map(c => ({id:c.id, name: c.ownerName})), availableCasas.length === 0 ? "No hay casas" : "Seleccionar casas...")}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                      <DropdownMenuLabel>Casas Disponibles</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableCasas.map((casa) => (
                        <DropdownMenuCheckboxItem
                          key={casa.id}
                          checked={field.value?.includes(casa.id)}
                          onCheckedChange={(checked) => {
                            const currentSelection = field.value || [];
                            return checked
                              ? field.onChange([...currentSelection, casa.id])
                              : field.onChange(currentSelection.filter(id => id !== casa.id));
                          }}
                          onSelect={(e) => e.preventDefault()} 
                        >
                          {casa.ownerName} {casa.address ? `(${casa.address})` : ''}
                        </DropdownMenuCheckboxItem>
                      ))}
                      {availableCasas.length === 0 && <DropdownMenuLabel className="text-xs text-muted-foreground text-center py-2">No hay casas disponibles</DropdownMenuLabel>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormFieldDescription>Selecciona las casas de reunión cercanas o relevantes.</FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="groupIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupos Asociados (Opcional)</FormLabel>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-between" disabled={availableGroups.length === 0}>
                           {getSelectedItemsText(field.value, availableGroups, availableGroups.length === 0 ? "No hay grupos" : "Seleccionar grupos...")}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                      <DropdownMenuLabel>Grupos Disponibles</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableGroups.map((group) => (
                        <DropdownMenuCheckboxItem
                          key={group.id}
                          checked={field.value?.includes(group.id)}
                           onCheckedChange={(checked) => {
                            const currentSelection = field.value || [];
                            return checked
                              ? field.onChange([...currentSelection, group.id])
                              : field.onChange(currentSelection.filter(id => id !== group.id));
                          }}
                          onSelect={(e) => e.preventDefault()}
                        >
                          {group.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                      {availableGroups.length === 0 && <DropdownMenuLabel className="text-xs text-muted-foreground text-center py-2">No hay grupos disponibles</DropdownMenuLabel>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormFieldDescription>Selecciona los grupos de predicación que trabajan este territorio.</FormFieldDescription>
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

