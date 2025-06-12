
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus2 } from "lucide-react"; // Changed icon
import { useState, useEffect } from "react";
import { USER_ROLES } from "@/lib/constants"; // For default role

// Schema for inviting a new user from the group context
const inviteUserFromGroupFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(100),
  email: z.string().email({ message: "Debe ser un email válido." }),
  phoneNumber: z.string().optional().or(z.literal('')), // Added phone number
});

type InviteUserFormValues = z.infer<typeof inviteUserFromGroupFormSchema>;

interface InviteUserFromGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUserInvitedFromGroup: (userData: Omit<InviteUserFormValues, ''>) => void; // Callback expects name & email
  currentGroupName: string;
}

export function AddPublishersToGroupDialog({ // Renamed from AddPublishersToGroupDialog for clarity
  isOpen,
  onOpenChange,
  onUserInvitedFromGroup,
  currentGroupName,
}: InviteUserFromGroupDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFromGroupFormSchema),
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
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

    onUserInvitedFromGroup({
        name: values.name,
        email: values.email,
        phoneNumber: values.phoneNumber || undefined,
    });
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus2 className="mr-2 h-6 w-6 text-primary" />
            Invitar Nuevo Publicador a {currentGroupName}
          </DialogTitle>
          <DialogDescription>
            Completa los detalles para enviar una invitación. El usuario será asignado automáticamente a este grupo y quedará pendiente de aprobación por el administrador para participar en asignaciones generales.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo del Publicador</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: María Silva" {...field} />
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
                  <FormLabel>Email del Publicador</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ejemplo@dominio.com" {...field} />
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
                    <Input placeholder="Ej: +56987654321" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4 border-t mt-auto">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Invitación y Añadir
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
