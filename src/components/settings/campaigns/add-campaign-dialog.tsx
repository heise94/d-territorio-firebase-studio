
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
import type { Campaign, CampaignType } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const campaignFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(100),
  type: z.enum(['invitation', 'superintendent_visit', 'special'], { required_error: "Debes seleccionar un tipo de campaña." }),
  startDate: z.date({ required_error: "La fecha de inicio es obligatoria." }),
  endDate: z.date({ required_error: "La fecha de fin es obligatoria." }),
  description: z.string().max(500).optional().or(z.literal('')),
  superintendentName: z.string().max(100).optional().or(z.literal('')),
  specialCampaignTerritoriesPerDay: z.coerce.number().int().min(0, "Debe ser 0 o más.").optional().default(0),
  isActive: z.boolean().default(true), // Re-added
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
  onCampaignSubmit: (campaign: Campaign) => void;
  campaignToEdit?: Campaign | null;
}

const CampaignTypeLabels: Record<CampaignType, string> = {
  invitation: "Invitación (Conmemoración/Asamblea)",
  superintendent_visit: "Visita de Superintendente",
  special: "Campaña Especial"
};

export function AddCampaignDialog({ isOpen, onOpenChange, onCampaignSubmit, campaignToEdit }: AddCampaignDialogProps) {
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
      isActive: true, // Re-added default
    },
  });

  const watchedCampaignType = form.watch("type");

  useEffect(() => {
    if (campaignToEdit && isOpen) {
      form.reset({
        name: campaignToEdit.name || "",
        type: campaignToEdit.type || undefined,
        startDate: campaignToEdit.startDate?.toDate() || undefined,
        endDate: campaignToEdit.endDate?.toDate() || undefined,
        description: campaignToEdit.description || "",
        superintendentName: campaignToEdit.superintendentName || "",
        specialCampaignTerritoriesPerDay: campaignToEdit.specialCampaignTerritoriesPerDay || 0,
        isActive: campaignToEdit.isActive === undefined ? true : campaignToEdit.isActive, // Re-added logic
      });
    } else if (!isOpen) {
      form.reset({ // Reset to full defaults when closing
        name: "",
        type: undefined,
        startDate: undefined,
        endDate: undefined,
        description: "",
        superintendentName: "",
        specialCampaignTerritoriesPerDay: 0,
        isActive: true,
      });
    }
  }, [campaignToEdit, isOpen, form]);

  async function onSubmit(values: CampaignFormValues) {
    setIsSubmitting(true);

    const submittedCampaign: Campaign = {
      id: isEditMode && campaignToEdit ? campaignToEdit.id : crypto.randomUUID(),
      name: values.name,
      type: values.type,
      startDate: Timestamp.fromDate(values.startDate),
      endDate: Timestamp.fromDate(values.endDate),
      description: values.description || undefined,
      superintendentName: values.type === 'superintendent_visit' ? values.superintendentName || undefined : undefined,
      specialCampaignTerritoriesPerDay: values.specialCampaignTerritoriesPerDay,
      isActive: values.isActive, // Re-added
      createdAt: isEditMode && campaignToEdit ? campaignToEdit.createdAt : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    await new Promise(resolve => setTimeout(resolve, 600));

    onCampaignSubmit(submittedCampaign);
    toast({
      title: isEditMode ? "Campaña Actualizada" : "Campaña Añadida",
      description: `La campaña "${values.name}" ha sido ${isEditMode ? 'actualizada' : 'registrada'} (simulación).`,
    });
    
    if (!isEditMode) form.reset(); 
    onOpenChange(false); 
    setIsSubmitting(false);
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
        isActive: true,
      });
    }
    onOpenChange(open);
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
                              format(field.value, "PPP", { timeZone: 'UTC' }) 
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
                              format(field.value, "PPP", { timeZone: 'UTC' })
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
                  <FormLabel>Territorios Específicos por Día (Campaña)</FormLabel>
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
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Campaña Activa</FormLabel>
                    <FormFieldDescription>
                      Indica si esta campaña está actualmente activa y debe ser considerada por la IA.
                    </FormFieldDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
