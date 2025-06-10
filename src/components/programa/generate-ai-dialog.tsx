
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bot } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const generateAIDialogSchema = z.object({
  numberOfCaptains: z.coerce.number().int().min(1, "Debe haber al menos 1 capitán.").max(5, "Máximo 5 capitanes."),
  additionalInstructions: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
});

type GenerateAIDialogValues = z.infer<typeof generateAIDialogSchema>;

interface GenerateAIDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitGeneration: (data: { numberOfCaptains: number; additionalInstructions: string; }) => Promise<void>;
  year: number;
  month: number; // 0-indexed
}

export function GenerateAIDialog({ isOpen, onOpenChange, onSubmitGeneration, year, month }: GenerateAIDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GenerateAIDialogValues>({
    resolver: zodResolver(generateAIDialogSchema),
    defaultValues: {
      numberOfCaptains: 2,
      additionalInstructions: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({ numberOfCaptains: 2, additionalInstructions: "" });
    }
  }, [isOpen, form]);

  async function handleSubmit(values: GenerateAIDialogValues) {
    setIsSubmitting(true);
    try {
      await onSubmitGeneration({
        numberOfCaptains: values.numberOfCaptains,
        additionalInstructions: values.additionalInstructions || "",
      });
      // Toast for success will be handled by the parent component after successful generation
    } catch (error) {
      console.error("Error in dialog submission that calls parent:", error);
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud desde el diálogo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      // Parent will close the dialog on success/failure of generation
    }
  }
  
  const handleDialogClose = (open: boolean) => {
    if (!open && !isSubmitting) { // Only reset if not submitting, parent handles close on submit
        form.reset({ numberOfCaptains: 2, additionalInstructions: "" });
    }
    onOpenChange(open);
  };

  const monthName = format(new Date(year, month), "MMMM", { locale: es });

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bot className="mr-2 h-6 w-6 text-primary" />
            Generar Programa con IA para {monthName} {year}
          </DialogTitle>
          <DialogDescription>
            Configura los parámetros para que la IA genere el programa mensual.
            La IA considerará las campañas, festivos, y disponibilidad configurada.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="numberOfCaptains"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capitanes por Día Regular</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="5" placeholder="Ej: 2" {...field} />
                  </FormControl>
                  <FormFieldDescription>
                    Número de capitanes a asignar para los días de semana que no sean festivos o especiales.
                  </FormFieldDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="additionalInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instrucciones Adicionales para la IA (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Priorizar territorios no trabajados recientemente. Considerar asignar al Hno. X el día Y."
                      {...field}
                      rows={4}
                    />
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
                Iniciar Generación con IA
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
