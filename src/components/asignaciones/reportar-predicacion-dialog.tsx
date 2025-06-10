
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { UserAssignment, Territory, ReportedAssignmentData, SingleTerritoryReportDetails, AdditionalTerritoryInfo } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, MapPin, CalendarDays, Clock, Edit3, CloudOff, Map as MapIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import Image from 'next/image';
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

const singleTerritoryReportSchema = z.object({
  territoryId: z.string(),
  territoryName: z.string(),
  territoryNotWorked: z.boolean().optional().default(false),
  workedBlocksIds: z.array(z.string()).optional().default([]),
});

const reportFormSchema = z.object({
  reports: z.array(singleTerritoryReportSchema),
  generalNotes: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface ReportarPredicacionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  assignment: UserAssignment | null;
  territory: Territory | null; // Main territory details
  onReportSubmit: (data: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'>) => void;
  initialReportData?: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'> | null;
}

interface TerritoryToReport extends AdditionalTerritoryInfo {
    isMain: boolean;
}


export function ReportarPredicacionDialog({
  isOpen,
  onOpenChange,
  assignment,
  territory, // Main territory details
  onReportSubmit,
  initialReportData,
}: ReportarPredicacionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialReportData;
  const [openTerritorySections, setOpenTerritorySections] = useState<Record<string, boolean>>({});


  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      reports: [],
      generalNotes: "",
    },
  });
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "reports",
  });

  const territoriesToReport = useMemo((): TerritoryToReport[] => {
    const toReport: TerritoryToReport[] = [];
    if (territory && assignment) { // Main territory
      toReport.push({
        id: territory.id,
        name: territory.name,
        number: territory.number,
        type: territory.type,
        mapImageUrl: territory.mapImageUrl,
        totalBlocks: territory.totalBlocks,
        isMain: true,
      });
    }
    if (assignment?.additionalTerritorySelected) {
      toReport.push({
        ...assignment.additionalTerritorySelected,
        isMain: false,
      });
    }
    return toReport;
  }, [assignment, territory]);


  useEffect(() => {
    if (isOpen) {
      const initialReports: SingleTerritoryReportDetails[] = [];
      const initialOpenSections: Record<string, boolean> = {};

      territoriesToReport.forEach((terr, index) => {
        const existingReportForThisTerritory = initialReportData?.reports?.find(r => r.territoryId === terr.id);
        initialReports.push({
          territoryId: terr.id,
          territoryName: terr.name,
          territoryNotWorked: existingReportForThisTerritory?.territoryNotWorked || false,
          workedBlocksIds: existingReportForThisTerritory?.workedBlocksIds || [],
        });
        initialOpenSections[terr.id] = index === 0; // Open first territory by default
      });
      
      form.reset({
        reports: initialReports,
        generalNotes: initialReportData?.generalNotes || "",
      });
      setOpenTerritorySections(initialOpenSections);

    } else {
       form.reset({ reports: [], generalNotes: "" });
       setOpenTerritorySections({});
    }
  }, [isOpen, initialReportData, form, territoriesToReport]);


  useEffect(() => {
    form.getValues("reports").forEach((report, index) => {
      if (report.territoryNotWorked) {
        form.setValue(`reports.${index}.workedBlocksIds`, [], { shouldDirty: true });
      }
    });
  }, [form.watch("reports"), form]);

  const toggleTerritorySection = (territoryId: string) => {
    setOpenTerritorySections(prev => ({ ...prev, [territoryId]: !prev[territoryId] }));
  };


  async function handleSubmit(values: ReportFormValues) {
    if (!assignment) return;
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 600)); 
      onReportSubmit({
        reports: values.reports.map(r => ({
            ...r,
            workedBlocksIds: r.territoryNotWorked ? [] : r.workedBlocksIds
        })),
        generalNotes: values.generalNotes,
      });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo enviar el reporte.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
        onOpenChange(false); 
    }
  }

  if (!assignment) return null;

  const assignmentDateTime = parse(`${assignment.date} ${assignment.time}`, "yyyy-MM-dd HH:mm", new Date());
  const dialogTitleText = isEditMode ? "Modificar Reporte de Predicación" : "Reportar Predicación";
  const submitButtonText = isEditMode ? "Guardar Cambios" : "Enviar Reporte";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            {dialogTitleText}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? "Actualiza la información del reporte." : "Informa sobre la predicación en el/los territorio(s) asignado(s)."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3 text-sm border-b pb-4 mb-4">
            <p className="flex items-center"><MapIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Lugar Principal: <span className="font-semibold ml-1">{assignment.locationName}</span></p>
            {assignment.additionalTerritorySelected && (
                 <p className="flex items-center"><MapIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Lugar Adicional: <span className="font-semibold ml-1">{assignment.additionalTerritorySelected.name}</span></p>
            )}
            <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/> Fecha: <span className="font-semibold ml-1">{format(assignmentDateTime, "EEEE, dd 'de' MMMM", { locale: es })}</span></p>
            <p className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/> Hora: <span className="font-semibold ml-1">{assignment.time} hrs.</span></p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-1 pr-1">
            {fields.map((field, index) => {
              const currentTerritoryInfo = territoriesToReport.find(t => t.id === field.territoryId);
              const isSectionOpen = openTerritorySections[field.territoryId] ?? index === 0;
              const territoryNotWorked = form.watch(`reports.${index}.territoryNotWorked`);

              return (
                <div key={field.id} className="rounded-md border shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleTerritorySection(field.territoryId)}
                    className="flex items-center justify-between w-full p-3 bg-muted/50 hover:bg-muted/70 rounded-t-md"
                  >
                    <h3 className="text-base font-semibold text-primary">
                      Reporte para: {currentTerritoryInfo?.name}
                      {currentTerritoryInfo?.type === 'urban' && currentTerritoryInfo.number && ` (U-${currentTerritoryInfo.number})`}
                      {currentTerritoryInfo?.isMain ? " (Principal)" : " (Adicional)"}
                    </h3>
                    {isSectionOpen ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                  </button>

                  {isSectionOpen && (
                    <div className="p-4 space-y-4">
                        <FormField
                        control={form.control}
                        name={`reports.${index}.territoryNotWorked`}
                        render={({ field: checkboxField }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-amber-500/10 border-amber-500/30">
                            <FormControl>
                                <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={checkboxField.onChange}
                                id={`territoryNotWorked-${field.territoryId}`}
                                />
                            </FormControl>
                            <div className="space-y-0.5">
                                <FormLabel htmlFor={`territoryNotWorked-${field.territoryId}`} className="font-medium cursor-pointer text-amber-700 dark:text-amber-400 flex items-center">
                                <CloudOff className="mr-2 h-4 w-4" />
                                ¿No se pudo trabajar este territorio?
                                </FormLabel>
                                <FormFieldDescription className="text-xs text-amber-600 dark:text-amber-500">
                                Marca si no se predicó en "{currentTerritoryInfo?.name}".
                                </FormFieldDescription>
                            </div>
                            </FormItem>
                        )}
                        />

                        {currentTerritoryInfo?.mapImageUrl && (
                        <div className={`mb-4 ${territoryNotWorked ? 'opacity-50' : ''}`}>
                            <FormLabel className="text-sm font-medium">Mapa de {currentTerritoryInfo.name}</FormLabel>
                            <div className="mt-1 relative w-full aspect-[4/3] rounded-md overflow-hidden border shadow-sm">
                            <Image
                                src={currentTerritoryInfo.mapImageUrl}
                                alt={`Mapa de ${currentTerritoryInfo.name}`}
                                layout="fill"
                                objectFit="contain"
                                data-ai-hint={territory?.dataAiHint || "map sketch"} // Use main territory hint or generic
                            />
                            </div>
                        </div>
                        )}

                        {(currentTerritoryInfo?.totalBlocks ?? 0) > 0 && (
                        <FormField
                            control={form.control}
                            name={`reports.${index}.workedBlocksIds`}
                            render={({ field: blocksField }) => (
                            <FormItem className={`${territoryNotWorked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <div className="mb-2">
                                <FormLabel className="text-sm font-medium">Manzanas Trabajadas en {currentTerritoryInfo.name}</FormLabel>
                                <FormFieldDescription className={`${territoryNotWorked ? 'text-muted-foreground/70' : ''}`}>
                                    Selecciona todas las manzanas predicadas. {territoryNotWorked ? "(Deshabilitado)" : ""}
                                </FormFieldDescription>
                                </div>
                                <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 border rounded-md shadow-sm bg-muted/20 max-h-40 overflow-y-auto ${territoryNotWorked ? 'pointer-events-none' : ''}`}>
                                {Array.from({ length: currentTerritoryInfo!.totalBlocks! }, (_, blockIdx) => {
                                    const blockId = `block-${field.territoryId}-${blockIdx}`;
                                    return (
                                    <FormField
                                        key={blockId}
                                        control={form.control}
                                        name={`reports.${index}.workedBlocksIds`}
                                        render={({ field: innerField }) => ( 
                                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-2 rounded-md bg-card hover:bg-card/90 transition-colors">
                                            <FormControl>
                                            <Checkbox
                                                checked={innerField.value?.includes(blockId)}
                                                onCheckedChange={(checked) => {
                                                if (territoryNotWorked) return;
                                                const currentSelection = innerField.value || [];
                                                return checked
                                                    ? innerField.onChange([...currentSelection, blockId])
                                                    : innerField.onChange(currentSelection.filter(id => id !== blockId));
                                                }}
                                                id={blockId}
                                                disabled={territoryNotWorked}
                                            />
                                            </FormControl>
                                            <FormLabel htmlFor={blockId} className={`font-normal text-xs cursor-pointer select-none ${territoryNotWorked ? 'text-muted-foreground/70' : ''}`}>
                                            Manzana {blockIdx + 1}
                                            </FormLabel>
                                        </FormItem>
                                        )}
                                    />
                                    );
                                })}
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        )}
                         {(currentTerritoryInfo?.totalBlocks ?? 0) === 0 && !territoryNotWorked && (
                            <p className="text-sm text-muted-foreground text-center py-3 border rounded-md bg-muted/30">
                                Este territorio ({currentTerritoryInfo?.name}) no tiene manzanas definidas para seleccionar.
                            </p>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
            
            <Separator className="my-6"/>

            <FormField
              control={form.control}
              name="generalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium flex items-center">
                    <Edit3 className="mr-2 h-4 w-4 text-primary" />
                    Notas Generales (Opcional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones generales, experiencias destacadas, no en casa generales, etc."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormFieldDescription>Estas notas aplican a toda la actividad de predicación (ambos territorios si aplica).</FormFieldDescription>
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
                {submitButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

