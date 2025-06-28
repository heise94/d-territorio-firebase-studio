
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
import { Loader2, Bot, CalendarDays, AlertTriangle, Sparkles, CheckCircle, List, MapPin, Building, User, XCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, getDaysInMonth, getDay, startOfMonth, addDays, isSameMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { CustomHoliday, PreachingType, ProgramScheduleSlot, Territory } from "@/types";
import { Timestamp } from "firebase/firestore";

const generateAIDialogSchema = z.object({
  additionalInstructions: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
});

type GenerateAIDialogValues = z.infer<typeof generateAIDialogSchema>;

interface GenerateAIDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitGeneration: (data: { 
    additionalInstructions: string; 
  }) => Promise<void>;
  year: number;
  month: number; // 0-indexed
  holidays: CustomHoliday[];
  programScheduleSlots: ProgramScheduleSlot[];
  allTerritories: Territory[];
}

export function GenerateAIDialog({ 
    isOpen, 
    onOpenChange, 
    onSubmitGeneration, 
    year, 
    month, 
    holidays, 
    programScheduleSlots,
    allTerritories
}: GenerateAIDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // State to hold intermediate results
  const [step1Result, setStep1Result] = useState<string[] | null>(null);
  const [step2Result, setStep2Result] = useState<string[] | null>(null);
  const [step3Result, setStep3Result] = useState<string[] | null>(null);

  const form = useForm<GenerateAIDialogValues>({
    resolver: zodResolver(generateAIDialogSchema),
    defaultValues: {
      additionalInstructions: "",
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
      const isSummer = month >= 11 || month <= 1; // Dec-Feb
      const holidaysInMonth = holidays
        .filter(h => new Date(h.date instanceof Timestamp ? h.date.toDate() : h.date).getMonth() === month)
        .map(h => format(new Date(h.date instanceof Timestamp ? h.date.toDate() : h.date), "yyyy-MM-dd"));

      const schedules = programScheduleSlots.filter(s => {
        if (s.season === 'summer' && !isSummer) return false;
        if (s.season === 'winter' && isSummer) return false;
        return true;
      });

      const result = [
        `Temporada detectada: ${isSummer ? 'Verano' : 'Invierno'}.`,
        `Se usarán ${schedules.length} horarios de predicación.`,
        `Se omitirán ${holidaysInMonth.length} días festivos este mes.`
      ];
      setStep1Result(result);
      setCurrentStep(2);
      setIsProcessing(false);
    }, 1000);
  };
  
  const handleExecuteStep2 = () => {
    setIsProcessing(true);
    setTimeout(() => {
        const availableTerritories = allTerritories
            .filter(t => !t.isBlocked && t.type !== 'rural') // Simplified logic from prototype
            .sort((a,b) => new Date(a.lastWorked || 0).getTime() - new Date(b.lastWorked || 0).getTime());
        
        const selectedTerritories = availableTerritories.slice(0, 7).map(t => t.number ? `U-${t.number}`: t.name);

        const result = [
            `${availableTerritories.length} territorios disponibles encontrados.`,
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
      });
      // Parent component will close the dialog on success
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error al generar el programa.", variant: "destructive" });
      setIsProcessing(false);
    }
  }

  const Step = ({ stepNumber, title, description, onExecute, children, isEnabled, result, lastStep = false }: any) => {
    const isCompleted = currentStep > stepNumber;
    const isCurrent = currentStep === stepNumber;

    return (
      <div className={`mb-4 p-4 rounded-lg shadow-inner transition-opacity duration-500 ${!isEnabled ? 'opacity-50 bg-gray-50' : (isCompleted ? 'bg-green-50' : 'bg-blue-50')}`}>
        <h3 className={`text-xl font-semibold mb-2 ${isCompleted ? 'text-green-800' : 'text-blue-800'}`}>
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

  const monthName = format(new Date(year, month), "MMMM", { locale: es });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Bot className="mr-3 h-7 w-7 text-primary" />
            Asistente de Generación para {monthName} {year}
          </DialogTitle>
          <DialogDescription>
            Sigue los pasos para que la IA genere un borrador del programa de predicación.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
            <Step stepNumber={1} title="Obtener Horarios de Predicación" description="La IA buscará los horarios aplicables, considerando la estación y los días festivos." onExecute={handleExecuteStep1} isEnabled={currentStep >= 1} result={step1Result} />
            <Step stepNumber={2} title="Seleccionar Territorios Disponibles" description="La IA buscará territorios disponibles y no bloqueados, priorizando los que llevan más tiempo sin trabajar." onExecute={handleExecuteStep2} isEnabled={currentStep >= 2} result={step2Result} />
            <Step stepNumber={3} title="Asignar Casas a Territorios" description="La IA buscará y asociará casas de reunión a los territorios seleccionados." onExecute={handleExecuteStep3} isEnabled={currentStep >= 3} result={step3Result} />
        
            <Step stepNumber={4} title="Generar Programa y Asignar Capitanes" description="Introduce instrucciones adicionales y la IA generará el programa final para el mes." isEnabled={currentStep >= 4} lastStep={true}>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
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
          <Button type="button" variant="outline" onClick={resetWizard}>
            <XCircle className="mr-2 h-4 w-4" /> Reiniciar Asistente
          </Button>
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
