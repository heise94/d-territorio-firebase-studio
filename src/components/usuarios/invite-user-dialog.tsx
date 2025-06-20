
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react"; // Changed icon
import { useState, useEffect } from "react";
import { USER_ROLES_LIST, UserRole } from "@/lib/constants";
import type { UserProfile } from "@/types";

const addUserFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).max(100),
  email: z.string().email({ message: "Debe ser un email válido." }),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
    .regex(/[a-z]/, { message: "Debe contener al menos una minúscula."})
    .regex(/[A-Z]/, { message: "Debe contener al menos una mayúscula."})
    .regex(/[0-9]/, { message: "Debe contener al menos un número."}),
  confirmPassword: z.string(),
  role: z.custom<UserRole>((val) => USER_ROLES_LIST.includes(val as UserRole), {
    message: "Debe seleccionar un rol válido.",
  }),
  assignedGroupId: z.string().optional(),
  phoneNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type AddUserFormValues = z.infer<typeof addUserFormSchema>;

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUserAdded: (user: Omit<AddUserFormValues, 'confirmPassword'>) => void; // Passes password
}

export function InviteUserDialog({ isOpen, onOpenChange, onUserAdded }: AddUserDialogProps) { // Renamed onUserInvited to onUserAdded
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: undefined,
      assignedGroupId: "",
      phoneNumber: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  async function onSubmit(values: AddUserFormValues) {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API call

    const { confirmPassword, ...userData } = values;
    onUserAdded(userData); // Call the parent handler with user data including password

    // Toast for successful creation will be handled by the parent page after actual Firebase op.
    onOpenChange(false);
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
             <UserPlus className="mr-2 h-6 w-6 text-primary" />
            Añadir Nuevo Usuario
          </DialogTitle>
          <DialogDescription>
            Completa los detalles para crear una nueva cuenta de usuario. Deberás comunicar la contraseña temporal al usuario.
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña Temporal</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mín. 8 caracteres, mayús., minús., núm." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Contraseña Temporal</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Repite la contraseña" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol del Usuario</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_ROLES_LIST.map((roleName) => (
                        <SelectItem key={roleName} value={roleName}>
                          {roleName}
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
              name="assignedGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID de Grupo Asignado (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: G1, GrupoAlfa" {...field} />
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
                  <FormLabel>Número de Teléfono (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: +56912345678" {...field} />
                  </FormControl>
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
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
