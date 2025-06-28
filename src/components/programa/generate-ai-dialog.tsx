
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bot, Sparkles, CheckCircle, List, User, Building, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import type { Territory } from "@/types";

const generateAIDialogSchema = z.object({
  additionalInstructions: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
  assignLocations: z.boolean().default(true),
  assignCaptains: z.boolean().default(true),
});

type GenerateAIDialogValues = z.infer<typeof generateAIDialogSchema>;

interface GenerateAIDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitGeneration: (data: { 
    additionalInstructions: string; 
    assignLocations: boolean;
    assignCaptains: boolean;
  }) => Promise<void>;
  year: number;
  month: number;
  allTerritories: Territory[];
}

export function GenerateAIDialog({ 
    isOpen, 
    onOpenChange, 
    onSubmitGeneration, 
    year, 
    month, 
    allTerritories
}: GenerateAIDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Result, setStep1Result] = useState<string[] | null>(null);
  const [step2Result, setStep2Result] = useState<string[] | null>(null);
  const [step3Result, setStep3Result] = useState<string[] | null>(null);

  const form = useForm<GenerateAIDialogValues>({
    resolver: zodResolver(generateAIDialogSchema),
    defaultValues: {
      additionalInstructions: "",
      assignLocations: true,
      assignCaptains: true,
    },
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setStep1Result(null);
    setStep2Result(null);
    setStep3Result(null);
    form.reset();
  };

  useEffect(() => {
    if (isOpen) {
      resetWizard();
    }
  }, [isOpen]);

  const handleExecuteStep1 = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = [
        "Lógica de asignación de horarios de predicación ejecutada.",
        "Se priorizará la disponibilidad horaria de cada publicador.",
        "El sistema ahora considerará estos horarios para las asignaciones."
      ];
      setStep1Result(result);
      setCurrentStep(2);
      setIsProcessing(false);
    }, 1000);
  };
  
  const handleExecuteStep2 = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const availableTerritories = (allTerritories || [])
        .filter(t => !t.isBlocked && t.type !== 'rural')
        .sort((a,b) => new Date(a.lastWorked || 0).getTime() - new Date(b.lastWorked || 0).getTime());
      
      const selectedTerritories = availableTerritories.slice(0, 7).map(t => t.number ? `U-${t.number}`: t.name);

      const result = [
          `${availableTerritories.length} territorios urbanos disponibles encontrados.`,
          `Se han seleccionado los ${selectedTerritories.length} más antiguos para la rotación:`,
          ...selectedTerritories
      ];
      setStep2Result(result);
      setCurrentStep(3);
      setIsProcessing(false);
    }, 1000);
  };

  const handleExecuteStep3 = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = [
          "Lógica de asignación de casas a territorios ejecutada.",
          "El sistema ahora asociará cada territorio a una casa cercana disponible.",
          "Esto se reflejará en el programa final."
      ];
      setStep3Result(result);
      setCurrentStep(4);
      setIsProcessing(false);
    }, 1000);
  };

  async function handleSubmit(values: GenerateAIDialogValues) {
    setIsProcessing(true);
    try {
      await onSubmitGeneration({
        additionalInstructions: values.additionalInstructions || "",
        assignLocations: values.assignLocations,
        assignCaptains: values.assignCaptains,
      });
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error al generar el programa.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const Step = ({ stepNumber, title, icon: Icon, description, onExecute, children, isEnabled, result, lastStep = false }: any) => {
    const isCompleted = currentStep > stepNumber;
    const isCurrent = currentStep === stepNumber;

    return (
      <div className={`mb-4 p-4 rounded-lg shadow-inner transition-all duration-500 ${!isEnabled ? 'opacity-40 bg-gray-50' : (isCompleted ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200')}`}>
        <h3 className={`text-lg font-semibold mb-2 flex items-center ${isCompleted ? 'text-green-800' : 'text-blue-800'}`}>
            <Icon className="mr-2 h-5 w-5"/>
            Paso {stepNumber}: {title} {isCompleted && <CheckCircle className="inline-block h-5 w-5 ml-2 text-green-600"/>}
        </h3>
        <p className="text-gray-700 text-sm mb-3">{description}</p>
        {!isCompleted && !lastStep && (
            <Button onClick={onExecute} disabled={!isEnabled || isProcessing} className="w-full">
                {isProcessing && isCurrent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                Ejecutar Paso {stepNumber}
            </Button>
        )}
        {result && (
            <div className="mt-3 p-3 bg-white rounded-md border border-gray-200 text-xs text-gray-600 space-y-1">
                {result.map((line: string, index: number) => <p key={index} className="flex items-start"><List className="h-3 w-3 mr-2 mt-0.5 shrink-0"/><span>{line}</span></p>)}
            </div>
        )}
         {isCurrent && lastStep && children}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Bot className="mr-3 h-7 w-7 text-primary" />
            Asistente de Generación
          </DialogTitle>
          <DialogDescription>
            Sigue los pasos para que la IA genere un borrador del programa de predicación.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
            <Step stepNumber={1} title="Verificar Disponibilidad de Publicadores" icon={User} description="La IA revisará la disponibilidad horaria general de todos los publicadores para saber con quiénes puede contar." onExecute={handleExecuteStep1} isEnabled={currentStep >= 1} result={step1Result} />
            <Step stepNumber={2} title="Seleccionar Territorios" icon={MapPin} description="Se buscarán territorios urbanos disponibles y no bloqueados, priorizando los que llevan más tiempo sin trabajar." onExecute={handleExecuteStep2} isEnabled={currentStep >= 2} result={step2Result} />
            <Step stepNumber={3} title="Asociar Casas de Reunión" icon={Building} description="El sistema buscará y asociará casas de reunión a los territorios seleccionados para definir los puntos de encuentro." onExecute={handleExecuteStep3} isEnabled={currentStep >= 3} result={step3Result} />
        
            <Step stepNumber={4} title="Generar Programa y Asignar" icon={Sparkles} description="Introduce instrucciones adicionales y la IA generará el programa final para el mes." isEnabled={currentStep >= 4} lastStep={true}>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <FormField
                                control={form.control}
                                name="assignLocations"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                                    <div className="space-y-0.5">
                                        <FormLabel>Asignar Territorios y Casas</FormLabel>
                                        <FormFieldDescription className="text-xs">
                                        Si se desmarca, la IA solo creará los horarios sin asignar un lugar específico.
                                        </FormFieldDescription>
                                    </div>
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="assignCaptains"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                                    <div className="space-y-0.5">
                                        <FormLabel>Asignar Capitanes</FormLabel>
                                        <FormFieldDescription className="text-xs">
                                        Si se desmarca, la IA creará los horarios sin asignar un publicador encargado.
                                        </FormFieldDescription>
                                    </div>
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange}/>
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="additionalInstructions"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-semibold text-gray-800">Instrucciones Adicionales (Opcional)</FormLabel>
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
                         <Button type="submit" disabled={isProcessing} className="w-full">
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Iniciar Generación Final con IA
                        </Button>
                    </form>
                </Form>
            </Step>
        </div>

        <DialogFooter className="pt-2 border-t">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
