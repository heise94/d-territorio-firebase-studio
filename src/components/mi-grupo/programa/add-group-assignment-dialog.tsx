
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { GroupAssignment, PublisherDetail, Casa, PreachingType, DayOfWeek } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon as CalendarIconLucide } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, parse, getDay, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const groupAssignmentFormSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato 24h (ej: 09:00, 14:30)."}),
  preachingType: z.enum(['general', 'rural', 'zoom'], { required_error: "Debes seleccionar un tipo."}),
  captainUserId: z.string().min(1, "Debes seleccionar un encargado."),
  casaId: z.string().optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
});

type GroupAssignmentFormValues = z.infer<typeof groupAssignmentFormSchema>;

const DAY_OF_WEEK_MAP_NUM_TO_KEY: Record<number, DayOfWeek> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

const NO_CASA_SELECTED_VALUE = "__NO_CASA_SELECTED__";

interface AddGroupAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssignmentSubmit: (data: Omit<GroupAssignment, 'groupId' | 'createdAt' | 'createdBy'> & { id?: string }) => void;
  currentMonth: number; // 0-indexed
  currentYear: number;
  groupPublishers: PublisherDetail[];
  groupCasas: Casa[];
  groupOrganizedDays: DayOfWeek[]; 
  assignmentToEdit?: GroupAssignment | null;
  initialDate?: Date | null;
}

export function AddGroupAssignmentDialog({
  isOpen,
  onOpenChange,
  onAssignmentSubmit,
  currentMonth,
  currentYear,
  groupPublishers,
  groupCasas,
  groupOrganizedDays,
  assignmentToEdit,
  initialDate,
}: AddGroupAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!assignmentToEdit;

  const form = useForm<GroupAssignmentFormValues>({
    resolver: zodResolver(groupAssignmentFormSchema),
    defaultValues: {
      date: undefined,
      time: "",
      preachingType: undefined,
      captainUserId: "",
      casaId: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (assignmentToEdit) {
        form.reset({
          date: parse(assignmentToEdit.date, 'yyyy-MM-dd', new Date()),
          time: assignmentToEdit.time,
          preachingType: assignmentToEdit.preachingType,
          captainUserId: assignmentToEdit.captainUserId,
          casaId: assignmentToEdit.casaId || "",
          notes: assignmentToEdit.notes || "",
        });
      } else {
        form.reset({
          date: initialDate || undefined,
          time: "",
          preachingType: undefined,
          captainUserId: "",
          casaId: "",
          notes: ""
        });
      }
    }
  }, [isOpen, assignmentToEdit, initialDate, form]);

  const isDateDisabled = (date: Date): boolean => {
    if (!groupOrganizedDays || groupOrganizedDays.length === 0) {
      return false; 
    }
    const dayOfWeekNumber = getDay(date);
    const dayKey = DAY_OF_WEEK_MAP_NUM_TO_KEY[dayOfWeekNumber];
    return !groupOrganizedDays.includes(dayKey);
  };

  async function onSubmit(values: GroupAssignmentFormValues) {
    setIsSubmitting(true);
    const selectedPublisher = groupPublishers.find(p => p.id === values.captainUserId);
    const selectedCasa = values.casaId && values.casaId !== NO_CASA_SELECTED_VALUE ? groupCasas.find(c => c.id === values.casaId) : undefined;

     if (!selectedPublisher) {
      toast({ title: "Error", description: "Encargado seleccionado no válido.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const assignmentData: Omit<GroupAssignment, 'groupId' | 'createdAt' | 'createdBy'> & { id?: string } = {
      id: isEditMode ? assignmentToEdit?.id : undefined, 
      date: format(values.date, "yyyy-MM-dd"),
      preachingType: values.preachingType,
      time: values.time,
      captainUserId: values.captainUserId,
      captainName: selectedPublisher?.name || "Desconocido",
      casaId: selectedCasa?.id || undefined,
      casaName: selectedCasa?.ownerName || undefined,
      notes: values.notes || undefined,
    };

    await new Promise(resolve => setTimeout(resolve, 500));
    onAssignmentSubmit(assignmentData);
    setIsSubmitting(false);
  }

  const monthStart = startOfMonth(new Date(currentYear, currentMonth));
  const monthEnd = endOfMonth(new Date(currentYear, currentMonth));
  const dialogTitle = isEditMode ? "Editar Asignación del Grupo" : "Añadir Nueva Asignación al Grupo";
  const submitButtonText = isEditMode ? "Guardar Cambios" : "Añadir Asignación";


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles de la asignación." : "Completa los detalles para la asignación manual de tu grupo."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 pr-1">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de la Asignación</FormLabel>
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
                            format(field.value, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
                          <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                            !isWithinInterval(date, { start: monthStart, end: monthEnd }) ||
                            isDateDisabled(date)
                        }
                        initialFocus
                        month={monthStart}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormFieldDescription className="text-xs">
                    Solo se pueden seleccionar días del mes actual que estén habilitados por el administrador para la predicación por grupos.
                  </FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora de Inicio (Formato 24h)</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="HH:mm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preachingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Predicación</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General (Pública)</SelectItem>
                      <SelectItem value="rural">Rural</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="captainUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Encargado (Capitán)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={groupPublishers.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={groupPublishers.length === 0 ? "No hay publicadores en el grupo" : "Selecciona un publicador"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groupPublishers.map(pub => (
                        <SelectItem key={pub.id} value={pub.id}>
                          {pub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {groupPublishers.length === 0 && <FormFieldDescription className="text-xs text-destructive">Añade publicadores a tu grupo en "Mi Grupo &gt; Publicadores".</FormFieldDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="casaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Casa de Reunión (Opcional)</FormLabel>
                  <Select
                    onValueChange={(selectedValue) => {
                      field.onChange(selectedValue === NO_CASA_SELECTED_VALUE ? "" : selectedValue);
                    }}
                    value={field.value || NO_CASA_SELECTED_VALUE}
                    disabled={groupCasas.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={groupCasas.length === 0 ? "No hay casas en el grupo" : "Selecciona una casa"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       <SelectItem value={NO_CASA_SELECTED_VALUE}>Ninguna</SelectItem>
                      {groupCasas.map(casa => (
                        <SelectItem key={casa.id} value={casa.id}>
                          {casa.ownerName} ({casa.address})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   {groupCasas.length === 0 && <FormFieldDescription className="text-xs text-destructive">Añade casas a tu grupo en "Mi Grupo &gt; Casas".</FormFieldDescription>}
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
                  <FormControl>
                    <Textarea placeholder="Cualquier detalle importante para esta asignación..." {...field} rows={3} />
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
                {submitButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
