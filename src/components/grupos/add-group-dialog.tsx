
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PreachingGroup } from "@/types";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const groupFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  superintendentId: z.string().max(50).optional().or(z.literal('')), 
  auxiliaryId: z.string().max(50).optional().or(z.literal('')), 
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

interface AddGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onGroupSubmit: (group: PreachingGroup) => void;
  groupToEdit?: PreachingGroup | null;
}

const mockUsers = [
    { id: 'uidElena', name: 'Elena Campos' },
    { id: 'uidCarlos', name: 'Carlos Rivas' },
    { id: 'uidLaura', name: 'Laura Méndez' },
    { id: 'uidPedro', name: 'Pedro Herrera' },
    { id: 'userTest1', name: 'Usuario Prueba Uno' },
    { id: 'userTest2', name: 'Usuaria Prueba Dos' },
];

const NO_USER_VALUE = "___NO_USER_SELECTED___";

export function AddGroupDialog({ isOpen, onOpenChange, onGroupSubmit, groupToEdit }: AddGroupDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!groupToEdit;

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      superintendentId: "",
      auxiliaryId: "",
    },
  });

  useEffect(() => {
    if (groupToEdit && isOpen) {
      form.reset({
        name: groupToEdit.name || "",
        description: groupToEdit.description || "",
        superintendentId: groupToEdit.superintendentId || "",
        auxiliaryId: groupToEdit.auxiliaryId || "",
      });
    } else if (!isOpen && !isEditMode) { 
      form.reset();
    }
  }, [groupToEdit, isOpen, form, isEditMode]);

  async function onSubmit(values: GroupFormValues) {
    setIsSubmitting(true);

    const submittedGroup: PreachingGroup = {
      id: isEditMode && groupToEdit ? groupToEdit.id : crypto.randomUUID(),
      name: values.name,
      description: values.description || undefined,
      superintendentId: values.superintendentId || undefined,
      auxiliaryId: values.auxiliaryId || undefined,
      createdAt: isEditMode && groupToEdit ? groupToEdit.createdAt : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    await new Promise(resolve => setTimeout(resolve, 600));

    onGroupSubmit(submittedGroup);
    toast({
      title: isEditMode ? "Grupo Actualizado" : "Grupo Añadido",
      description: `El grupo "${values.name}" ha sido ${isEditMode ? 'actualizado' : 'registrado'} (simulación).`,
    });
    
    if (!isEditMode) form.reset(); 
    onOpenChange(false); 
    setIsSubmitting(false);
  }
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
        if (!isEditMode) { 
            form.reset();
        }
    }
    onOpenChange(open);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Grupo" : "Añadir Nuevo Grupo"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles del grupo." : "Completa los detalles del nuevo grupo de predicación."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Grupo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Grupo Los Conquistadores" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Ej: Grupo encargado de la zona céntrica los fines de semana." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="superintendentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Superintendente (SG) (Opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === NO_USER_VALUE ? "" : value)}
                    value={field.value} // Use value for controlled component
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar Superintendente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem key={NO_USER_VALUE} value={NO_USER_VALUE}>Nadie Asignado</SelectItem>
                      {mockUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
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
              name="auxiliaryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auxiliar (Opcional)</FormLabel>
                   <Select
                    onValueChange={(value) => field.onChange(value === NO_USER_VALUE ? "" : value)}
                    value={field.value} // Use value for controlled component
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar Auxiliar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem key={NO_USER_VALUE} value={NO_USER_VALUE}>Nadie Asignado</SelectItem>
                      {mockUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {isEditMode ? "Guardar Cambios" : "Añadir Grupo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
