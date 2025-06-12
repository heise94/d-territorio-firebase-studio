
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";

const addPublishersFormSchema = z.object({
  selectedUserIds: z.array(z.string()).min(1, { message: "Debes seleccionar al menos un publicador." }),
});

type AddPublishersFormValues = z.infer<typeof addPublishersFormSchema>;

interface AddPublishersToGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPublishersSelected: (selectedUserIds: string[]) => void;
  currentGroupId: string;
  allUsers: UserProfile[]; // All users in the system
  publishersInCurrentGroup: UserProfile[]; // Users already in the current group
}

const getInitials = (name?: string) => {
    if (!name) return "??";
    const nameParts = name.split(" ");
    if (nameParts.length > 1) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export function AddPublishersToGroupDialog({
  isOpen,
  onOpenChange,
  onPublishersSelected,
  currentGroupId,
  allUsers,
  publishersInCurrentGroup,
}: AddPublishersToGroupDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<AddPublishersFormValues>({
    resolver: zodResolver(addPublishersFormSchema),
    defaultValues: {
      selectedUserIds: [],
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({ selectedUserIds: [] });
      setSearchTerm("");
    }
  }, [isOpen, form]);

  const usersAvailableToAdd = useMemo(() => {
    const idsInCurrentGroup = new Set(publishersInCurrentGroup.map(p => p.id));
    return allUsers
      .filter(user => !idsInCurrentGroup.has(user.id)) // Exclude users already in this group
      .filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [allUsers, publishersInCurrentGroup, searchTerm]);

  async function onSubmit(values: AddPublishersFormValues) {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    onPublishersSelected(values.selectedUserIds);
    setIsSubmitting(false);
    // Toast is handled by parent
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="mr-2 h-6 w-6 text-primary" />
            Añadir Publicadores al Grupo
          </DialogTitle>
          <DialogDescription>
            Selecciona los publicadores que deseas añadir a este grupo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Buscar por nombre o email..."
                className="pl-8 w-full mb-3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow pr-2 -mr-2 mb-4">
              {usersAvailableToAdd.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                    <UserX className="h-12 w-12 mb-2" />
                    <p className="font-medium">No hay publicadores disponibles para añadir.</p>
                    <p className="text-xs">Todos los usuarios ya están en este grupo o no hay más usuarios en el sistema que coincidan con la búsqueda.</p>
                </div>
              ) : (
                <div className="space-y-2">
                {usersAvailableToAdd.map((user) => (
                    <FormField
                    key={user.id}
                    control={form.control}
                    name="selectedUserIds"
                    render={({ field }) => {
                        return (
                        <FormItem
                            className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => { // Manual click handler for the whole item
                                const currentSelection = field.value || [];
                                const isChecked = currentSelection.includes(user.id);
                                if (isChecked) {
                                    field.onChange(currentSelection.filter(id => id !== user.id));
                                } else {
                                    field.onChange([...currentSelection, user.id]);
                                }
                            }}
                        >
                            <FormControl>
                            <Checkbox
                                checked={field.value?.includes(user.id)}
                                // onCheckedChange managed by FormItem onClick for better UX
                                readOnly // Checkbox itself is readOnly, click handled by parent
                                className="pointer-events-none" // Ensure checkbox doesn't intercept clicks
                            />
                            </FormControl>
                            <div className="flex items-center gap-2 flex-grow">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={(user as any).avatarUrl} alt={user.name} />
                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <FormLabel className="font-normal text-sm cursor-pointer">{user.name}</FormLabel>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                                {user.assignedGroupId && (
                                    <Badge variant="outline" className="ml-auto text-xs">
                                        En Grupo: {user.assignedGroupId}
                                    </Badge>
                                )}
                            </div>
                        </FormItem>
                        );
                    }}
                    />
                ))}
                </div>
              )}
            </ScrollArea>
            <FormMessage className="text-center pb-2">{form.formState.errors.selectedUserIds?.message}</FormMessage>
            
            <DialogFooter className="pt-4 border-t mt-auto">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || usersAvailableToAdd.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Añadir Seleccionados
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

