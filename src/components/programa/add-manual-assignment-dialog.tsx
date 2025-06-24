
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { GenerateMonthlyAssignmentsOutput } from "@/ai/flows/generate-monthly-assignments";
import type { PublisherDetail, Casa, Territory, PreachingType } from "@/types";

type AssignmentItem = GenerateMonthlyAssignmentsOutput['captainAssignments'][string][0];

const addManualAssignmentSchema = z.object({
  hour: z.string().min(1, "La hora es obligatoria."),
  minute: z.string().min(1, "El minuto es obligatorio."),
  captainId: z.string().min(1, "Debes seleccionar un capitán."),
  preachingType: z.enum(['publica', 'rural', 'zoom']),
  locationId: z.string().optional(),
});

type AddManualAssignmentFormValues = z.infer<typeof addManualAssignmentSchema>;

interface AddManualAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddAssignment: (newAssignment: AssignmentItem) => void;
  day: string | null;
  availablePublishers: PublisherDetail[];
  availableCasas: Casa[];
  availableTerritories: Territory[];
}

export function AddManualAssignmentDialog({
  isOpen,
  onOpenChange,
  onAddAssignment,
  day,
  availablePublishers,
  availableCasas,
  availableTerritories,
}: AddManualAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddManualAssignmentFormValues>({
    resolver: zodResolver(addManualAssignmentSchema),
    defaultValues: {
      hour: "10",
      minute: "00",
      captainId: undefined,
      preachingType: 'publica',
      locationId: undefined,
    },
  });
  
  const watchedPreachingType = form.watch("preachingType");
  const showLocationSelect = useMemo(() => watchedPreachingType !== 'zoom', [watchedPreachingType]);

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        hour: "10",
        minute: "00",
        captainId: undefined,
        preachingType: 'publica',
        locationId: undefined,
      });
    }
  }, [isOpen, form]);

  useEffect(() => {
    if (!showLocationSelect) {
      form.setValue('locationId', undefined);
    }
  }, [showLocationSelect, form]);

  async function onSubmit(values: AddManualAssignmentFormValues) {
    if (!day) return;
    setIsSubmitting(true);

    const selectedPublisher = availablePublishers.find(p => p.firebaseAuthUid === values.captainId || p.id === values.captainId);
    if (!selectedPublisher) {
        toast({ title: "Error", description: "El publicador seleccionado no es válido.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    let casa: Casa | undefined;
    let territory: Territory | undefined;

    if (showLocationSelect && values.locationId) {
        if (values.locationId.startsWith('casa-')) {
            casa = availableCasas.find(c => c.id === values.locationId!.replace('casa-', ''));
        } else if (values.locationId.startsWith('territory-')) {
            territory = availableTerritories.find(t => t.id === values.locationId!.replace('territory-', ''));
        }
    }

    const newAssignment: AssignmentItem = {
      id: crypto.randomUUID(),
      date: day,
      captainId: selectedPublisher.firebaseAuthUid || selectedPublisher.id,
      captainName: selectedPublisher.name,
      time: `${values.hour}:${values.minute}`,
      status: 'pending',
      preachingType: values.preachingType,
      casaName: casa?.ownerName,
      casaAddress: casa?.address,
      territoryName: territory?.name,
    };
    
    onAddAssignment(newAssignment);
    setIsSubmitting(false);
    onOpenChange(false);
  }

  if (!day) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <PlusCircle className="mr-2 h-5 w-5 text-primary" />
            Añadir Asignación Manual
          </DialogTitle>
          <DialogDescription>
            Creando una asignación para el {format(parseISO(day), "EEEE, dd 'de' MMMM", { locale: es })}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div>
                <FormLabel>Hora (Formato 24h)</FormLabel>
                 <div className="grid grid-cols-2 gap-4 mt-2">
                     <FormField
                        control={form.control}
                        name="hour"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Hora</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="HH" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {Array.from({ length: 16 }, (_, i) => (i + 7).toString().padStart(2, '0')).map(hour => (
                                            <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="minute"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Minuto</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="MM" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {['00', '15', '30', '45'].map(minute => (
                                            <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                 </div>
            </div>
            <FormField
              control={form.control}
              name="captainId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capitán Asignado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un capitán" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePublishers.map((pub) => (
                        <SelectItem key={pub.firebaseAuthUid || pub.id} value={pub.firebaseAuthUid || pub.id}>
                          {pub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="publica">Pública</SelectItem>
                      <SelectItem value="rural">Rural</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showLocationSelect && (
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar de Reunión</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecciona un lugar..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <FormLabel className="px-2 py-1.5 text-xs font-semibold">Casas</FormLabel>
                          {availableCasas.length > 0 ? (
                            availableCasas.map((casa) => (
                              <SelectItem key={`casa-${casa.id}`} value={`casa-${casa.id}`}>{casa.ownerName}</SelectItem>
                            ))
                          ) : <p className="text-xs text-muted-foreground px-2 py-1.5">No hay casas disponibles</p>}
                        </SelectGroup>
                        <SelectGroup>
                          <FormLabel className="px-2 py-1.5 text-xs font-semibold">Territorios</FormLabel>
                          {availableTerritories.length > 0 ? (
                            availableTerritories.map((terr) => (
                              <SelectItem key={`territory-${terr.id}`} value={`territory-${terr.id}`}>{terr.name}</SelectItem>
                            ))
                          ) : <p className="text-xs text-muted-foreground px-2 py-1.5">No hay territorios disponibles</p>}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
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
