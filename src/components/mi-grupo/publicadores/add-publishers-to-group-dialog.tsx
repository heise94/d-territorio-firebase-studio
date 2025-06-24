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
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus2 } from "lucide-react";
import { useState, useEffect } from "react";

const inviteUserFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(100),
  email: z.string().email({ message: "Debe ser un email válido." }),
  phoneNumber: z.string().min(9, { message: "El teléfono es obligatorio y debe ser válido." }),
});

type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;

interface AddPublishersToGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUserInvitedFromGroup: (data: InviteUserFormValues) => void;
  currentGroupName: string;
}

export function AddPublishersToGroupDialog({
  isOpen,
  onOpenChange,
  onUserInvitedFromGroup,
  currentGroupName,
}: AddPublishersToGroupDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  async function onSubmit(values: InviteUserFormValues) {
    setIsSubmitting(true);
    try {
        onUserInvitedFromGroup(values);
    } catch (error) {
        console.error("Error submitting invite:", error);
        toast({ title: "Error", description: "No se pudo procesar la invitación.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus2 className="mr-2 h-6 w-6 text-primary" />
            Invitar Publicador a "{currentGroupName}"
          </DialogTitle>
          <DialogDescription>
            Completa los detalles para registrar un nuevo publicador. El administrador deberá aprobarlo para que pueda acceder al sistema.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ejemplo@dominio.com" {...field} />
                  </FormControl>
                  <FormFieldDescription>Este será su nombre de usuario.</FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+56 9 1234 5678" {...field} />
                  </FormControl>
                  <FormFieldDescription>
                    Incluye el código de país. Se usará para enviar la invitación por WhatsApp.
                  </FormFieldDescription>
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
                Registrar y Enviar a Aprobación
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
