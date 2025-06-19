
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
  FormDescription as FormFieldDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { Casa, CasaAvailability, PreachingGroup, UnavailabilityPeriod, ProgramScheduleSlot, DayOfWeek, PreachingType } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, PlusCircle, Trash2, AlertTriangle, Users as UsersTypeIcon, MountainSnow, Video, MessageSquareWarning } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NO_GROUP_SELECTED_VALUE = "__NO_GROUP_SELECTED__";

const unavailabilityPeriodSchema = z.object({
  id: z.string().optional(), 
  startDate: z.date({ required_error: "Fecha de inicio es obligatoria." }),
  endDate: z.date({ required_error: "Fecha de fin es obligatoria." }),
  reason: z.string().max(100, "Máximo 100 caracteres.").optional().or(z.literal('')),
}).refine(data => data.endDate >= data.startDate, {
  message: "Fecha de fin debe ser igualo posterior a la de inicio.",
  path: ["endDate"],
});

const casaFormSchema = z.object({
  ownerName: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(100),
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }).max(200),
  phoneNumber: z.string().max(20).optional().or(z.literal('')),
  availableProgramSlotIds: z.array(z.string()).optional().default([]),
  notes: z.string().max(1000).optional().or(z.literal('')),
  notesForSS: z.string().max(1000).optional().or(z.literal('')), // New field
  isSuitableForRural: z.boolean().optional().default(false),
  addedByGroupId: z.string().optional().or(z.literal('')),
  unavailabilityPeriods: z.array(unavailabilityPeriodSchema).optional().default([]),
});

type CasaFormValues = z.infer<typeof casaFormSchema>;

const WEEK_DAYS_ORDERED: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayOfWeekLabels: Record<DayOfWeek, string> = {
  monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves",
  friday: "Viernes", saturday: "Sábado", sunday: "Domingo",
};

const PreachingTypeIconDialog = ({ type, className }: { type: PreachingType, className?: string }) => {
  const defaultClass = "mr-2 h-5 w-5 shrink-0"; 
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersTypeIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  // Zoom type is intentionally omitted as it's not relevant for physical house availability
  return null;
};


interface AddCasaDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCasaSubmit: (casa: Partial<Casa> & Pick<Casa, 'id' | 'ownerName' | 'address' | 'isBlocked' | 'createdAt' | 'updatedAt'>) => void;
  casaToEdit?: Casa | null;
  availableGroups: PreachingGroup[];
  programScheduleSlots: ProgramScheduleSlot[]; 
}

export function AddCasaDialog({ 
  isOpen, 
  onOpenChange, 
  onCasaSubmit, 
  casaToEdit, 
  availableGroups,
  programScheduleSlots 
}: AddCasaDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!casaToEdit;

  const form = useForm<CasaFormValues>({
    resolver: zodResolver(casaFormSchema),
    defaultValues: {
      ownerName: "",
      address: "",
      phoneNumber: "",
      availableProgramSlotIds: [],
      notes: "",
      notesForSS: "", // Initialize new field
      isSuitableForRural: false,
      addedByGroupId: "",
      unavailabilityPeriods: [],
    },
  });

  const { fields: unavailabilityFields, append: appendUnavailability, remove: removeUnavailability } = useFieldArray({
    control: form.control,
    name: "unavailabilityPeriods",
  });

  const casaSpecificScheduleSlots = useMemo(() => {
    return programScheduleSlots.filter(slot => slot.type !== 'zoom');
  }, [programScheduleSlots]);


  useEffect(() => {
    if (casaToEdit && isOpen) {
      form.reset({
        ownerName: casaToEdit.ownerName || "",
        address: casaToEdit.address || "",
        phoneNumber: casaToEdit.phoneNumber || "",
        availableProgramSlotIds: casaToEdit.availableDays?.availableProgramSlotIds?.filter(slotId => 
          casaSpecificScheduleSlots.some(s => s.id === slotId)
        ) || [],
        notes: casaToEdit.notes || "",
        notesForSS: casaToEdit.notesForSS || "", // Populate new field
        isSuitableForRural: casaToEdit.isSuitableForRural || false,
        addedByGroupId: casaToEdit.addedByGroupId || "",
        unavailabilityPeriods: (casaToEdit.unavailabilityPeriods || []).map(p => ({
          id: p.id,
          startDate: p.startDate instanceof Timestamp ? p.startDate.toDate() : new Date(p.startDate),
          endDate: p.endDate instanceof Timestamp ? p.endDate.toDate() : new Date(p.endDate),
          reason: p.reason || "",
        })),
      });
    } else if (!isOpen) {
      form.reset({ 
        ownerName: "",
        address: "",
        phoneNumber: "",
        availableProgramSlotIds: [],
        notes: "",
        notesForSS: "", // Reset new field
        isSuitableForRural: false,
        addedByGroupId: "",
        unavailabilityPeriods: [],
      });
    }
  }, [casaToEdit, isOpen, form, casaSpecificScheduleSlots]);

  async function onSubmit(values: CasaFormValues) {
    setIsSubmitting(true);

    const submittedCasaData: Partial<Casa> & Pick<Casa, 'id' | 'ownerName' | 'address' | 'isBlocked' | 'createdAt' | 'updatedAt'> = {
      id: isEditMode && casaToEdit ? casaToEdit.id : crypto.randomUUID(),
      ownerName: values.ownerName,
      address: values.address,
      isBlocked: isEditMode && casaToEdit ? casaToEdit.isBlocked : false, 
      createdAt: isEditMode && casaToEdit ? casaToEdit.createdAt : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (values.phoneNumber && values.phoneNumber.trim() !== "") {
      submittedCasaData.phoneNumber = values.phoneNumber;
    }
    
    submittedCasaData.availableDays = { availableProgramSlotIds: values.availableProgramSlotIds || [] };
    
    if (values.notes && values.notes.trim() !== "") {
      submittedCasaData.notes = values.notes;
    }
    if (values.notesForSS && values.notesForSS.trim() !== "") { // Handle new field
      submittedCasaData.notesForSS = values.notesForSS;
    } else {
      submittedCasaData.notesForSS = undefined; // Explicitly set to undefined if empty for Firestore
    }

    if (values.isSuitableForRural !== undefined) {
      submittedCasaData.isSuitableForRural = values.isSuitableForRural;
    }
    if (values.addedByGroupId && values.addedByGroupId !== NO_GROUP_SELECTED_VALUE && values.addedByGroupId.trim() !== "") {
        submittedCasaData.addedByGroupId = values.addedByGroupId;
    } else {
        submittedCasaData.addedByGroupId = undefined; 
    }
    
    if (!isEditMode) {
        submittedCasaData.lastVisitedAt = undefined;
    }

    submittedCasaData.unavailabilityPeriods = (values.unavailabilityPeriods || []).map(p => ({
      id: p.id || crypto.randomUUID(),
      startDate: Timestamp.fromDate(p.startDate),
      endDate: Timestamp.fromDate(p.endDate),
      reason: p.reason || undefined,
    }));
    
    onCasaSubmit(submittedCasaData);
    
    if (!isEditMode) form.reset(); 
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) { 
            if (!isEditMode) form.reset();
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    <Textarea placeholder="Ej: Calle Falsa 123, Depto 4B, Comuna" {...field} rows={2} />
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
            
            <FormField
              control={form.control}
              name="addedByGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar a Grupo de Predicación (Opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === NO_GROUP_SELECTED_VALUE ? "" : value)} 
                    value={field.value || NO_GROUP_SELECTED_VALUE}
                    disabled={availableGroups.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={availableGroups.length === 0 ? "No hay grupos disponibles" : "Seleccionar grupo"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_GROUP_SELECTED_VALUE}>Ningún grupo específico</SelectItem>
                      {availableGroups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormFieldDescription className="text-xs">
                    Si esta casa es gestionada o usada principalmente por un grupo, selecciónalo aquí.
                  </FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel className="text-sm font-medium">Disponibilidad por Horarios del Programa</FormLabel>
              <FormFieldDescription className="text-xs">
                Selecciona los horarios específicos del programa (excepto Zoom) en los que esta casa estaría disponible.
              </FormFieldDescription>
              {casaSpecificScheduleSlots.length === 0 ? (
                 <p className="text-sm text-muted-foreground text-center py-3 border rounded-md bg-muted/30">No hay horarios de programa (no Zoom) configurados en Ajustes.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-3 p-3 border rounded-md shadow-sm bg-muted/20">
                  {WEEK_DAYS_ORDERED.map(dayKey => {
                    const slotsForDay = casaSpecificScheduleSlots.filter(slot => slot.dayOfWeek === dayKey);
                    if (slotsForDay.length === 0) return null;
                    return (
                      <div key={dayKey} className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground/90 pt-1">{dayOfWeekLabels[dayKey]}</h4>
                        {slotsForDay.map(slot => (
                          <FormField
                            key={slot.id}
                            control={form.control}
                            name="availableProgramSlotIds"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2.5 rounded-md bg-card hover:bg-card/90 transition-colors shadow-sm">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(slot.id)}
                                    onCheckedChange={(checked) => {
                                      const currentSelection = field.value || [];
                                      return checked
                                        ? field.onChange([...currentSelection, slot.id])
                                        : field.onChange(currentSelection.filter(id => id !== slot.id));
                                    }}
                                    id={`casa-slot-${slot.id}`}
                                  />
                                </FormControl>
                                <FormLabel htmlFor={`casa-slot-${slot.id}`} className="font-normal text-sm cursor-pointer flex-grow flex items-center justify-between w-full">
                                  <div className="flex items-center">
                                    <PreachingTypeIconDialog type={slot.type} className="text-foreground/80"/>
                                    <span className="font-medium">{slot.startTime}</span>
                                    <span className="text-muted-foreground mx-1.5">-</span>
                                    <span className="capitalize text-foreground/90">{slot.type}</span>
                                  </div>
                                  {slot.status === 'tentative' && (
                                    <Badge variant="outline" className="ml-auto text-amber-600 border-amber-500 px-1.5 py-0.5 text-xs">
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Tentativo
                                    </Badge>
                                  )}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
               <FormMessage>{form.formState.errors.availableProgramSlotIds?.message}</FormMessage>
            </div>


            <div className="space-y-3 rounded-md border p-4 shadow-sm">
              <FormLabel className="text-sm font-medium">Períodos de Indisponibilidad</FormLabel>
              <FormFieldDescription className="text-xs">
                Define fechas en las que la casa no estará disponible (ej: vacaciones).
              </FormFieldDescription>
              {unavailabilityFields.map((item, index) => (
                <div key={item.id} className="space-y-3 p-3 border rounded-md bg-muted/20 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`unavailabilityPeriods.${index}.startDate`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs">Inicio</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("text-left font-normal h-9 text-xs", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-1.5 h-3.5 w-3.5" />{field.value ? format(field.value, "dd/MM/yy", { locale: es }) : "Seleccionar"}</Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} weekStartsOn={1} /></PopoverContent>
                          </Popover>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`unavailabilityPeriods.${index}.endDate`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs">Fin</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("text-left font-normal h-9 text-xs", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-1.5 h-3.5 w-3.5" />{field.value ? format(field.value, "dd/MM/yy", { locale: es }) : "Seleccionar"}</Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => form.getValues(`unavailabilityPeriods.${index}.startDate`) ? date < form.getValues(`unavailabilityPeriods.${index}.startDate`) : false} locale={es} weekStartsOn={1} /></PopoverContent>
                          </Popover>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`unavailabilityPeriods.${index}.reason`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Razón (Opcional)</FormLabel>
                        <FormControl><Input placeholder="Ej: Vacaciones familiares" {...field} className="h-8 text-xs" /></FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeUnavailability(index)} className="absolute top-1 right-1 h-6 w-6 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendUnavailability({ id: crypto.randomUUID(), startDate: new Date(), endDate: new Date(), reason: '' })} className="mt-2 text-xs"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Período</Button>
            </div>
            
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
                      <FormFieldDescription className="text-xs">
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
                  <FormLabel>Notas Adicionales (Visibles para todos)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Entrada por el pasaje, preguntar por citófono 1A, etc." {...field} rows={2}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notesForSS"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <MessageSquareWarning className="mr-2 h-4 w-4 text-amber-600" />
                    Notas para SS (Superintendente de Servicio) (Opcional)
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Información específica para el Superintendente de Servicio..." {...field} rows={2}/>
                  </FormControl>
                  <FormFieldDescription className="text-xs">Estas notas solo serán visibles para el SS y el Encargado de Territorio.</FormFieldDescription>
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
              <Button type="submit" disabled={isSubmitting || (casaSpecificScheduleSlots.length === 0 && programScheduleSlots.length > 0 && !isEditMode)}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Guardar Cambios" : "Añadir Casa"}
              </Button>
            </DialogFooter>
            {casaSpecificScheduleSlots.length === 0 && programScheduleSlots.length > 0 && (
                 <p className="text-xs text-destructive text-center pt-2">No se pueden añadir casas nuevas si solo hay horarios de tipo Zoom configurados en Ajustes, ya que las casas no aplican para Zoom.</p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
    
