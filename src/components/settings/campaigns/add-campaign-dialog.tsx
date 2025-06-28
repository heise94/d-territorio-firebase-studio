
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Campaign, CampaignType, Territory } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const campaignFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(100),
  type: z.enum(['invitation', 'superintendent_visit', 'special'], { required_error: "Debes seleccionar un tipo de campaña." }),
  startDate: z.date({ required_error: "La fecha de inicio es obligatoria." }),
  endDate: z.date({ required_error: "La fecha de fin es obligatoria." }),
  description: z.string().max(500).optional().or(z.literal('')),
  superintendentName: z.string().max(100).optional().or(z.literal('')),
  specialCampaignTerritoriesPerDay: z.coerce.number().int().min(0, "Debe ser 0 o más.").optional().default(0),
  specificTerritoryIds: z.array(z.string()).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
      path: ["endDate"],
    });
  }
  if (data.type === 'superintendent_visit') {
    if (!data.superintendentName || data.superintendentName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre del superintendente es obligatorio para este tipo de campaña.",
        path: ["superintendentName"],
      });
    }
  }
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface AddCampaignDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCampaignSubmit: (campaign: Omit<Campaign, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  campaignToEdit?: Campaign | null;
  availableTerritories: Territory[];
}

const CampaignTypeLabels: Record<CampaignType, string> = {
  invitation: "Invitación (Conmemoración/Asamblea)",
  superintendent_visit: "Visita de Superintendente",
  special: "Campaña Especial"
};

export function AddCampaignDialog({ isOpen, onOpenChange, onCampaignSubmit, campaignToEdit, availableTerritories }: AddCampaignDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!campaignToEdit;

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      type: undefined,
      startDate: undefined,
      endDate: undefined,
      description: "",
      superintendentName: "",
      specialCampaignTerritoriesPerDay: 0,
      specificTerritoryIds: [],
    },
  });

  const watchedCampaignType = form.watch("type");

  useEffect(() => {
    if (campaignToEdit && isOpen) {
      form.reset({
        name: campaignToEdit.name || "",
        type: campaignToEdit.type || undefined,
        startDate: campaignToEdit.startDate instanceof Timestamp ? campaignToEdit.startDate.toDate() : new Date(campaignToEdit.startDate) || undefined,
        endDate: campaignToEdit.endDate instanceof Timestamp ? campaignToEdit.endDate.toDate() : new Date(campaignToEdit.endDate) || undefined,
        description: campaignToEdit.description || "",
        superintendentName: campaignToEdit.superintendentName || "",
        specialCampaignTerritoriesPerDay: campaignToEdit.specialCampaignTerritoriesPerDay === undefined || campaignToEdit.specialCampaignTerritoriesPerDay === null ? 0 : campaignToEdit.specialCampaignTerritoriesPerDay,
        specificTerritoryIds: campaignToEdit.specificTerritoryIds || [],
      });
    } else if (!isOpen) {
      form.reset({ 
        name: "",
        type: undefined,
        startDate: undefined,
        endDate: undefined,
        description: "",
        superintendentName: "",
        specialCampaignTerritoriesPerDay: 0,
        specificTerritoryIds: [],
      });
    }
  }, [campaignToEdit, isOpen, form]);

  async function onSubmit(values: CampaignFormValues) {
    setIsSubmitting(true);

    const campaignData: Omit<Campaign, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> & { id?: string } = {
      id: isEditMode && campaignToEdit ? campaignToEdit.id : undefined,
      name: values.name,
      type: values.type,
      startDate: values.startDate,
      endDate: values.endDate,
      specialCampaignTerritoriesPerDay: values.specialCampaignTerritoriesPerDay,
      specificTerritoryIds: values.specificTerritoryIds,
      description: values.description || null,
      superintendentName: values.type === 'superintendent_visit' ? (values.superintendentName || null) : null,
    };
    
    try {
      await onCampaignSubmit(campaignData);
    } catch (e) {
        toast({title: "Error", description: "Ocurrió un error al guardar la campaña.", variant: "destructive"})
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset({
        name: "",
        type: undefined,
        startDate: undefined,
        endDate: undefined,
        description: "",
        superintendentName: "",
        specialCampaignTerritoriesPerDay: 0,
        specificTerritoryIds: [],
      });
    }
    onOpenChange(open);
  };
  
  const getSelectedTerritoriesText = (selectedIds: string[] | undefined) => {
    if (!selectedIds || selectedIds.length === 0) return "Seleccionar territorios...";
    if (selectedIds.length === 1) {
      const terr = availableTerritories.find(t => t.id === selectedIds[0]);
      return terr ? (terr.number ? `U-${terr.number}` : terr.name) : "Seleccionar territorios...";
    }
    return `${selectedIds.length} territorios seleccionados`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Campaña" : "Añadir Nueva Campaña"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles de la campaña." : "Completa los detalles para la nueva campaña."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 pr-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Campaña</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Invitación Conmemoración 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Campaña</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(CampaignTypeLabels) as CampaignType[]).map(typeKey => (
                        <SelectItem key={typeKey} value={typeKey}>
                          {CampaignTypeLabels[typeKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            
            {watchedCampaignType === 'superintendent_visit' && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/30 mt-2">
                <FormField
                  control={form.control}
                  name="superintendentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Superintendente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Hno. Ejemplo Superintendente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="specialCampaignTerritoriesPerDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Territorios por Día (Numérico)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="Ej: 2" {...field} 
                     onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                  </FormControl>
                  <FormFieldDescription>
                    Número de territorios a asignar para esta campaña cada día que esté activa. Usar 0 para lógica estándar.
                  </FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specificTerritoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Territorios Específicos (Opcional)</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-between" disabled={availableTerritories.length === 0}>
                          {getSelectedTerritoriesText(field.value)}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                      <DropdownMenuLabel>Territorios Disponibles</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableTerritories.map((territory) => (
                        <DropdownMenuCheckboxItem
                          key={territory.id}
                          checked={field.value?.includes(territory.id)}
                          onCheckedChange={(checked) => {
                            const currentSelection = field.value || [];
                            return checked
                              ? field.onChange([...currentSelection, territory.id])
                              : field.onChange(currentSelection.filter(id => id !== territory.id));
                          }}
                          onSelect={(e) => e.preventDefault()} 
                        >
                          {territory.number ? `U-${territory.number}` : territory.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormFieldDescription>Selecciona territorios específicos a usar durante esta campaña.</FormFieldDescription>
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
                    <Textarea placeholder="Detalles adicionales sobre la campaña..." {...field} rows={2} />
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
                {isEditMode ? "Guardar Cambios" : "Añadir Campaña"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
