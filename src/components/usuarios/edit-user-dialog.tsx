
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
import { Loader2, UserCog } from "lucide-react";
import { useState, useEffect } from "react";
import { USER_ROLES_LIST, UserRole } from "@/lib/constants";
import type { UserProfile, PreachingGroup } from "@/types";

const editUserFormSchema = z.object({
  name: z.string(),
  email: z.string(),
  role: z.custom<UserRole>((val) => USER_ROLES_LIST.includes(val as UserRole), {
    message: "Debe seleccionar un rol válido.",
  }),
  assignedGroupId: z.string().optional(),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUserUpdate: (userId: string, data: Partial<Pick<UserProfile, 'role' | 'assignedGroupId'>>) => void;
  userToEdit: UserProfile | null;
  availableGroups: PreachingGroup[];
}

const NO_GROUP_SELECTED = "__NO_GROUP__";

export function EditUserDialog({ isOpen, onOpenChange, onUserUpdate, userToEdit, availableGroups }: EditUserDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: undefined,
      assignedGroupId: "",
    },
  });

  useEffect(() => {
    if (userToEdit && isOpen) {
      form.reset({
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
        assignedGroupId: userToEdit.assignedGroupId || NO_GROUP_SELECTED,
      });
    }
  }, [isOpen, userToEdit, form]);

  async function onSubmit(values: EditUserFormValues) {
    if (!userToEdit) return;
    setIsSubmitting(true);
    
    const updateData: Partial<Pick<UserProfile, 'role' | 'assignedGroupId'>> = {
        role: values.role,
        assignedGroupId: values.assignedGroupId === NO_GROUP_SELECTED ? "" : values.assignedGroupId,
    };

    try {
        await onUserUpdate(userToEdit.id, updateData);
        onOpenChange(false);
    } catch(e) {
        toast({
            title: "Error al actualizar",
            description: "No se pudo guardar los cambios del usuario.",
            variant: "destructive"
        })
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
             <UserCog className="mr-2 h-6 w-6 text-primary" />
            Editar Usuario
          </DialogTitle>
          <DialogDescription>
            Modifica el rol y el grupo asignado para {userToEdit?.name}.
          </DialogDescription>
        </DialogHeader>
        {userToEdit && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input readOnly disabled value={userToEdit.name} /></FormControl>
            </FormItem>
             <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input readOnly disabled value={userToEdit.email} /></FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol del Usuario</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <FormLabel>Grupo Asignado (Opcional)</FormLabel>
                   <Select 
                    onValueChange={(value) => field.onChange(value)} 
                    value={field.value}
                    disabled={availableGroups.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={availableGroups.length === 0 ? "No hay grupos disponibles" : "Seleccionar grupo"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_GROUP_SELECTED}>Ninguno</SelectItem>
                      {availableGroups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
