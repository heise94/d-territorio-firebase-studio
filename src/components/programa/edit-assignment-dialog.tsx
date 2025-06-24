
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit3 } from "lucide-react";
import { useState, useEffect } from "react";
import type { GenerateMonthlyAssignmentsOutput } from "@/ai/flows/generate-monthly-assignments";
import type { PublisherDetail } from "@/types";

type AssignmentItem = GenerateMonthlyAssignmentsOutput['captainAssignments'][string][0];

const editAssignmentSchema = z.object({
  captainId: z.string().min(1, "Debes seleccionar un capitán."),
});

type EditAssignmentFormValues = z.infer<typeof editAssignmentSchema>;

interface EditAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateAssignment: (updatedAssignment: AssignmentItem) => void;
  assignmentToEdit: AssignmentItem | null;
  availablePublishers: PublisherDetail[];
}

export function EditAssignmentDialog({
  isOpen,
  onOpenChange,
  onUpdateAssignment,
  assignmentToEdit,
  availablePublishers,
}: EditAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditAssignmentFormValues>({
    resolver: zodResolver(editAssignmentSchema),
    defaultValues: {
      captainId: "",
    },
  });

  useEffect(() => {
    if (assignmentToEdit && isOpen) {
      form.reset({
        captainId: assignmentToEdit.captainId,
      });
    }
  }, [isOpen, assignmentToEdit, form]);

  async function onSubmit(values: EditAssignmentFormValues) {
    if (!assignmentToEdit) return;
    setIsSubmitting(true);
    
    const selectedPublisher = availablePublishers.find(p => p.firebaseAuthUid === values.captainId || p.id === values.captainId);

    if (!selectedPublisher) {
        toast({ title: "Error", description: "El publicador seleccionado no es válido.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    const updatedAssignment: AssignmentItem = {
        ...assignmentToEdit,
        captainId: selectedPublisher.firebaseAuthUid || selectedPublisher.id,
        captainName: selectedPublisher.name,
    };
    
    onUpdateAssignment(updatedAssignment);
    setIsSubmitting(false);
    onOpenChange(false);
  }

  if (!assignmentToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit3 className="mr-2 h-5 w-5 text-primary" />
            Editar Asignación
          </DialogTitle>
          <DialogDescription>
            Cambia el capitán para la asignación del {assignmentToEdit.date} a las {assignmentToEdit.time}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <p className="text-sm">
              <span className="font-semibold">Lugar:</span> {assignmentToEdit.territoryName || assignmentToEdit.casaName}
            </p>
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
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
