
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { GroupAssignment, ProgramScheduleSlot, PublisherDetail, Casa, PreachingType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon as CalendarIconLucide } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, parse, getDay, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const groupAssignmentFormSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  programSlotId: z.string().min(1, "Debes seleccionar un horario."),
  captainUserId: z.string().min(1, "Debes seleccionar un encargado."),
  casaId: z.string().optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
});

type GroupAssignmentFormValues = z.infer<typeof groupAssignmentFormSchema>;

const DAY_OF_WEEK_MAP: Record<number, ProgramScheduleSlot['dayOfWeek']> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

interface AddGroupAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssignmentSubmit: (data: Omit<GroupAssignment, 'id' | 'groupId' | 'createdAt' | 'createdBy'>) => void;
  currentMonth: number; // 0-indexed
  currentYear: number;
  availableSlots: ProgramScheduleSlot[]; // Slots definidos por el admin
  groupPublishers: PublisherDetail[];
  groupCasas: Casa[];
}

export function AddGroupAssignmentDialog({
  isOpen,
  onOpenChange,
  onAssignmentSubmit,
  currentMonth,
  currentYear,
  availableSlots,
  groupPublishers,
  groupCasas,
}: AddGroupAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GroupAssignmentFormValues>({
    resolver: zodResolver(groupAssignmentFormSchema),
    defaultValues: {
      date: undefined,
      programSlotId: "",
      captainUserId: "",
      casaId: "",
      notes: "",
    },
  });

  const selectedDate = form.watch("date");

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfWeekNumber = getDay(selectedDate);
    const dayKey = DAY_OF_WEEK_MAP[dayOfWeekNumber];
    return availableSlots.filter(slot => slot.dayOfWeek === dayKey).sort((a,b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDate, availableSlots]);

  useEffect(() => {
    if (!isOpen) {
      form.reset({ date: undefined, programSlotId: "", captainUserId: "", casaId: "", notes: "" });
    } else {
      // Optionally set a default date when dialog opens, e.g., first day of currentMonth/currentYear
      // const firstDay = startOfMonth(new Date(currentYear, currentMonth));
      // if (isWithinInterval(firstDay, { start: startOfMonth(new Date(currentYear, currentMonth)), end: endOfMonth(new Date(currentYear, currentMonth)) })) {
      //   form.setValue("date", firstDay);
      // }
    }
  }, [isOpen, form, currentMonth, currentYear]);

  // Reset slot if selected day changes and chosen slot is no longer valid
  useEffect(() => {
    if (selectedDate && form.getValues("programSlotId")) {
        const currentSlotId = form.getValues("programSlotId");
        const isValidSlot = slotsForSelectedDay.some(s => s.id === currentSlotId);
        if (!isValidSlot) {
            form.setValue("programSlotId", "", { shouldValidate: true });
        }
    }
  }, [selectedDate, slotsForSelectedDay, form]);


  async function onSubmit(values: GroupAssignmentFormValues) {
    setIsSubmitting(true);
    const selectedSlot = availableSlots.find(s => s.id === values.programSlotId);
    const selectedPublisher = groupPublishers.find(p => p.id === values.captainUserId);
    const selectedCasa = groupCasas.find(c => c.id === values.casaId);

    if (!selectedSlot) {
      toast({ title: "Error", description: "Horario seleccionado no válido.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
     if (!selectedPublisher) {
      toast({ title: "Error", description: "Encargado seleccionado no válido.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const assignmentData: Omit<GroupAssignment, 'id' | 'groupId' | 'createdAt' | 'createdBy'> = {
      date: format(values.date, "yyyy-MM-dd"),
      programSlotId: selectedSlot.id,
      preachingType: selectedSlot.type,
      time: selectedSlot.startTime,
      captainUserId: values.captainUserId,
      captainName: selectedPublisher?.name || "Desconocido",
      casaId: values.casaId || undefined,
      casaName: selectedCasa?.ownerName || undefined,
      notes: values.notes || undefined,
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    onAssignmentSubmit(assignmentData);
    onOpenChange(false); // Close dialog after submit
    setIsSubmitting(false);
  }

  const monthStart = startOfMonth(new Date(currentYear, currentMonth));
  const monthEnd = endOfMonth(new Date(currentYear, currentMonth));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Asignación al Grupo</DialogTitle>
          <DialogDescription>
            Completa los detalles para la asignación manual de tu grupo.
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
                        disabled={(date) => date < monthStart || date > monthEnd}
                        initialFocus
                        month={monthStart} // Ensure calendar opens to the selected month
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="programSlotId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horario y Tipo de Predicación</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!selectedDate || slotsForSelectedDay.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedDate ? "Selecciona una fecha primero" : slotsForSelectedDay.length === 0 ? "No hay horarios para este día" : "Selecciona un horario"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {slotsForSelectedDay.map(slot => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {slot.startTime} - {slot.type} ({slot.status === 'tentative' ? 'Tentativo' : 'Fijo'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedDate && <FormFieldDescription className="text-xs">Debes seleccionar una fecha para ver los horarios disponibles.</FormFieldDescription>}
                  {selectedDate && slotsForSelectedDay.length === 0 && <FormFieldDescription className="text-xs text-destructive">No hay horarios configurados por el administrador para este día de la semana.</FormFieldDescription>}
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={groupCasas.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={groupCasas.length === 0 ? "No hay casas en el grupo" : "Selecciona una casa"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       <SelectItem value="">Ninguna</SelectItem>
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
                Añadir Asignación
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

