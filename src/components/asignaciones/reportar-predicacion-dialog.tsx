
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
import type { UserAssignment, Territory, ReportedAssignmentData, SingleTerritoryReportDetails, AdditionalTerritoryInfo, PreachingAssignedType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, MapPin, CalendarDays, Clock, Edit3, CloudOff, Map as MapIcon, ChevronDown, ChevronUp, Eye, ListChecks, XCircle, CheckSquare, Columns2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Image from 'next/image';
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const singleTerritoryReportSchema = z.object({
  territoryId: z.string(),
  territoryName: z.string(),
  territoryNotWorked: z.boolean().optional().default(false),
  workedBlocksIds: z.array(z.string()).optional().default([]),
});

const reportFormSchema = z.object({
  reports: z.array(singleTerritoryReportSchema),
  generalNotes: z.string().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal('')),
  additionalTerritorySelectedInAssignment: z.boolean().optional().default(false),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;
type FormReportItem = z.output<typeof singleTerritoryReportSchema>;


interface TerritoryToReportDisplayInternal extends AdditionalTerritoryInfo {
    isMain: boolean;
    displayableBlockNumbers: number[];
}

interface ReportarPredicacionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  assignment: UserAssignment | null;
  territory: Territory | null;
  onReportSubmit: (data: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'>) => void;
  initialReportData?: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'> | null;
}

type ReportMode = 'completo' | 'parcial' | 'no_trabajado';


export function ReportarPredicacionDialog({
  isOpen,
  onOpenChange,
  assignment,
  territory,
  onReportSubmit,
  initialReportData,
}: ReportarPredicacionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialReportData;
  const [openTerritorySections, setOpenTerritorySections] = useState<Record<string, boolean>>({});
  const [visibleMaps, setVisibleMaps] = useState<Record<string, boolean>>({});
  const [reportModes, setReportModes] = useState<Record<string, ReportMode>>({});

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      reports: [],
      generalNotes: "",
      additionalTerritorySelectedInAssignment: false,
    },
  });
  
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "reports",
  });

  const territoriesToReportForDialog = useMemo((): TerritoryToReportDisplayInternal[] => {
    if (!assignment) return [];
    const toReport: TerritoryToReportDisplayInternal[] = [];

    if (territory) {
      let mainDisplayableBlocks: number[];
      mainDisplayableBlocks = Array.from({ length: territory.totalBlocks || 0 }, (_, i) => i + 1);
      
      toReport.push({
        id: territory.id,
        name: territory.name,
        number: territory.number,
        type: territory.type,
        mapImageUrl: territory.mapImageUrl,
        dataAiHint: territory.dataAiHint,
        totalBlocks: territory.totalBlocks,
        isMain: true,
        displayableBlockNumbers: mainDisplayableBlocks,
        approxHouseCount: territory.approxHouseCount,
        blockHouseCounts: territory.blockHouseCounts,
      });
    }

    if (assignment.additionalTerritorySelected) {
      const additional = assignment.additionalTerritorySelected;
      let additionalDisplayableBlocks: number[];

      if (additional.isPartial && additional.pendingBlockNumbers && additional.pendingBlockNumbers.length > 0) {
        additionalDisplayableBlocks = additional.pendingBlockNumbers;
      } else {
        additionalDisplayableBlocks = Array.from({ length: additional.totalBlocks || 0 }, (_, i) => i + 1);
      }
      
      toReport.push({
        ...additional,
        isMain: false,
        displayableBlockNumbers: additionalDisplayableBlocks,
      });
    }
    return toReport;
  }, [assignment, territory]);


  useEffect(() => {
    if (isOpen && assignment) {
      const initialReportsForForm: FormReportItem[] = [];
      const initialOpenSections: Record<string, boolean> = {};
      const initialVisibleMaps: Record<string, boolean> = {};
      const initialModes: Record<string, ReportMode> = {};

      territoriesToReportForDialog.forEach((terrInfo) => {
        const existingReportForThisTerritory = initialReportData?.reports?.find(r => r.territoryId === terrInfo.id);
        
        initialReportsForForm.push({
          territoryId: terrInfo.id,
          territoryName: terrInfo.name, 
          territoryNotWorked: existingReportForThisTerritory?.territoryNotWorked ?? false,
          workedBlocksIds: existingReportForThisTerritory?.workedBlocksIds || [],
        });

        if (existingReportForThisTerritory?.territoryNotWorked) {
            initialModes[terrInfo.id] = 'no_trabajado';
        } else if (existingReportForThisTerritory && terrInfo.displayableBlockNumbers.length > 0 && existingReportForThisTerritory.workedBlocksIds?.length === terrInfo.displayableBlockNumbers.length) {
            initialModes[terrInfo.id] = 'completo';
        } else {
            initialModes[terrInfo.id] = 'parcial';
        }
        
        initialOpenSections[terrInfo.id] = true; 
        initialVisibleMaps[terrInfo.id] = false; 
      });
      
      replace(initialReportsForForm); 
      form.setValue("generalNotes", initialReportData?.generalNotes || "");
      form.setValue("additionalTerritorySelectedInAssignment", !!assignment?.additionalTerritorySelected);
      
      setReportModes(initialModes);
      setOpenTerritorySections(initialOpenSections);
      setVisibleMaps(initialVisibleMaps);

    } else if (!isOpen) {
       replace([]); 
       form.reset({ reports: [], generalNotes: "", additionalTerritorySelectedInAssignment: false });
       setReportModes({});
       setOpenTerritorySections({});
       setVisibleMaps({});
    }
  }, [isOpen, initialReportData, form, territoriesToReportForDialog, assignment, replace]);


  const toggleTerritorySection = (territoryId: string) => {
    setOpenTerritorySections(prev => ({ ...prev, [territoryId]: !prev[territoryId] }));
  };

  const toggleMapVisibility = (territoryId: string) => {
    setVisibleMaps(prev => ({ ...prev, [territoryId]: !prev[territoryId] }));
  };
  
  const handleModeChange = (reportIndex: number, newMode: ReportMode) => {
    const territoryId = territoriesToReportForDialog[reportIndex].id;
    setReportModes(prev => ({ ...prev, [territoryId]: newMode }));

    if (newMode === 'no_trabajado') {
        form.setValue(`reports.${reportIndex}.territoryNotWorked`, true);
        form.setValue(`reports.${reportIndex}.workedBlocksIds`, []);
    } else if (newMode === 'completo') {
        const territoryInfo = territoriesToReportForDialog[reportIndex];
        const allBlockIds = territoryInfo.displayableBlockNumbers.map(
            (blockNumber) => `block-${territoryInfo.id}-${blockNumber}`
        );
        form.setValue(`reports.${reportIndex}.territoryNotWorked`, false);
        form.setValue(`reports.${reportIndex}.workedBlocksIds`, allBlockIds);
    } else { // 'parcial'
        form.setValue(`reports.${reportIndex}.territoryNotWorked`, false);
        // On purpose, we don't clear the blocks if they switch from 'completo' to 'parcial'
    }
  };

  const formatLocationName = (name: string, type: PreachingAssignedType) => {
    if (type === 'publica' && name.toLowerCase().startsWith('territorio urbano ')) {
        return `U-${name.split(' ').pop()}`;
    }
    return name;
  };

  async function handleSubmit(values: ReportFormValues) {
    if (!assignment) return;
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 600)); 
      onReportSubmit({
        reports: values.reports.map(r => ({
            ...r,
            workedBlocksIds: r.territoryNotWorked ? [] : r.workedBlocksIds || [] 
        })),
        generalNotes: values.generalNotes,
        additionalTerritorySelected: values.additionalTerritorySelectedInAssignment,
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
  
  const additionalTerritoryName = assignment.additionalTerritorySelected
    ? (assignment.additionalTerritorySelected.type === 'urban' && assignment.additionalTerritorySelected.number
        ? `U-${assignment.additionalTerritorySelected.number}`
        : assignment.additionalTerritorySelected.name)
    : '';

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
            <p className="flex items-center"><MapIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Lugar Principal: <span className="font-semibold ml-1">{formatLocationName(assignment.locationName, assignment.type)}</span></p>
            {assignment.additionalTerritorySelected && (
                 <p className="flex items-center"><MapIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Lugar Adicional: <span className="font-semibold ml-1">{additionalTerritoryName}</span></p>
            )}
            <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/> Fecha: <span className="font-semibold ml-1">{format(assignmentDateTime, "EEEE, dd 'de' MMMM", { locale: es })}</span></p>
            <p className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/> Hora: <span className="font-semibold ml-1">{assignment.time} hrs.</span></p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-1 pr-1">
            {fields.map((fieldItem, index) => {
              const currentTerritoryInfo = territoriesToReportForDialog.find(t => t.id === form.getValues(`reports.${index}.territoryId`));

              if (!currentTerritoryInfo) return null; 

              const isSectionOpen = openTerritorySections[currentTerritoryInfo.id] ?? true;
              const currentMode = reportModes[currentTerritoryInfo.id] ?? 'parcial';
              const isMapVisible = visibleMaps[currentTerritoryInfo.id] ?? false;
              const displayableBlockNumbersForThisTerritory = currentTerritoryInfo.displayableBlockNumbers;
              
              const territoryDisplayName = currentTerritoryInfo.type === 'urban' && currentTerritoryInfo.number 
                ? `U-${currentTerritoryInfo.number}` 
                : currentTerritoryInfo.name;


              return (
                <div key={fieldItem.id} className="rounded-md border shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleTerritorySection(currentTerritoryInfo.id)}
                    className="flex items-center justify-between w-full p-3 bg-muted/50 hover:bg-muted/70 rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <h3 className="text-base font-semibold text-primary">
                      Reporte para: {territoryDisplayName}
                      {currentTerritoryInfo.isMain ? " (Principal)" : " (Adicional)"}
                    </h3>
                    {isSectionOpen ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                  </button>

                  {isSectionOpen && (
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">Estado del Trabajo</FormLabel>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Button
                                type="button"
                                variant={currentMode === 'no_trabajado' ? 'destructive' : 'outline'}
                                onClick={() => handleModeChange(index, 'no_trabajado')}
                                className="w-full text-xs h-9"
                                >
                                <XCircle className="mr-1.5 h-4 w-4" /> No Trabajado
                                </Button>
                                <Button
                                type="button"
                                variant={currentMode === 'parcial' ? 'default' : 'outline'}
                                onClick={() => handleModeChange(index, 'parcial')}
                                className="w-full text-xs h-9"
                                >
                                <Columns2 className="mr-1.5 h-4 w-4" /> Trabajo Parcial
                                </Button>
                                <Button
                                type="button"
                                variant={currentMode === 'completo' ? 'default' : 'outline'}
                                onClick={() => handleModeChange(index, 'completo')}
                                className={cn("w-full text-xs h-9", currentMode === 'completo' ? 'bg-green-600 hover:bg-green-700' : '')}
                                >
                                <CheckSquare className="mr-1.5 h-4 w-4" /> Trabajo Completo
                                </Button>
                            </div>
                        </div>

                        {currentTerritoryInfo.mapImageUrl && (
                          <div className="mb-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleMapVisibility(currentTerritoryInfo.id)}
                              className="text-xs"
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              {isMapVisible ? "Ocultar Mapa" : "Ver Mapa"} de {currentTerritoryInfo.name}
                            </Button>
                            {isMapVisible && (
                              <div className="mt-2 relative w-full aspect-[4/3] rounded-md overflow-hidden border shadow-sm">
                                <Image
                                  src={currentTerritoryInfo.mapImageUrl}
                                  alt={`Mapa de ${currentTerritoryInfo.name}`}
                                  layout="fill"
                                  objectFit="contain"
                                  data-ai-hint={currentTerritoryInfo.dataAiHint || "map sketch"}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {currentMode === 'parcial' && (
                            <>
                                {(displayableBlockNumbersForThisTerritory.length > 0) ? (
                                <FormField
                                    control={form.control}
                                    name={`reports.${index}.workedBlocksIds`}
                                    render={({ field: blocksField }) => (
                                    <FormItem>
                                        <div className="mb-2 flex justify-between items-center">
                                        <div>
                                            <FormLabel className="text-sm font-medium">
                                                Selección de Manzanas Trabajadas
                                            </FormLabel>
                                            <FormFieldDescription>
                                                Marca solo las manzanas que se predicaron.
                                            </FormFieldDescription>
                                        </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 border rounded-md shadow-sm bg-muted/20 max-h-40 overflow-y-auto">
                                        {displayableBlockNumbersForThisTerritory.map((blockNumber) => {
                                            const blockId = `block-${currentTerritoryInfo.id}-${blockNumber}`;
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
                                                        const currentSelection = innerField.value || [];
                                                        return checked
                                                            ? innerField.onChange([...currentSelection, blockId])
                                                            : innerField.onChange(currentSelection.filter(id => id !== blockId));
                                                        }}
                                                        id={blockId}
                                                    />
                                                    </FormControl>
                                                    <FormLabel htmlFor={blockId} className="font-normal text-xs cursor-pointer select-none">
                                                    Manzana {blockNumber}
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
                                ) : (
                                     <p className="text-sm text-muted-foreground text-center py-3 border rounded-md bg-muted/30">
                                        Este territorio ({currentTerritoryInfo.name}) no tiene manzanas definidas para seleccionar.
                                    </p>
                                )}
                            </>
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
                  <FormFieldDescription>Estas notas aplican a toda la actividad de predicación (todos los territorios reportados).</FormFieldDescription>
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
              <Button type="submit" disabled={isSubmitting || fields.length === 0}>
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
