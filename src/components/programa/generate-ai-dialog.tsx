
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bot } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const generateAIDialogSchema = z.object({
  additionalInstructions: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
});

type GenerateAIDialogValues = z.infer<typeof generateAIDialogSchema>;

interface GenerateAIDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitGeneration: (data: { additionalInstructions: string; }) => Promise<void>;
}

export function GenerateAIDialog({ isOpen, onOpenChange, onSubmitGeneration }: GenerateAIDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GenerateAIDialogValues>({
    resolver: zodResolver(generateAIDialogSchema),
    defaultValues: {
      additionalInstructions: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({ additionalInstructions: "" });
    }
  }, [isOpen, form]);


  async function handleSubmit(values: GenerateAIDialogValues) {
    setIsSubmitting(true);
    try {
      await onSubmitGeneration({
        additionalInstructions: values.additionalInstructions || "",
      });
    } catch (error) {
      console.error("Error in dialog submission that calls parent:", error);
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud desde el diálogo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && !isSubmitting) {
      form.reset({ additionalInstructions: "" });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bot className="mr-2 h-6 w-6 text-primary" />
            Generar Programa con IA
          </DialogTitle>
          <DialogDescription>
            La IA asignará un capitán por cada horario de predicación configurado. Puedes dar instrucciones adicionales para guiar la generación.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-2 pr-1">
            <FormField
              control={form.control}
              name="additionalInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Instrucciones Adicionales para la IA (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Priorizar territorios no trabajados recientemente. Considerar asignar al Hno. X el día Y."
                      {...field}
                      rows={3}
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
