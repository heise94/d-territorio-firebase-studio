
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Filter, FileDown } from "lucide-react";
import type { Territory, Assignment, UserAssignment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parse, isBefore, startOfDay, isAfter } from "date-fns";

import { ReporteActividadView, type ReporteActividadData } from "@/components/reportes/reporte-actividad-view";
import { ReporteS13View, type ConsolidatedS13Data, type ReporteS13Data } from "@/components/reportes/reporte-s13-view";
import { FiltrosReportesSheet, type ReportFilters } from "@/components/reportes/filtros-reportes-sheet";

// Imports for the new dialog
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function ReportesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const { toast } = useToast();
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);

  // State for the new S13 print dialog
  const [isPrintS13DialogOpen, setIsPrintS13DialogOpen] = useState(false);
  const [selectedServiceYear, setSelectedServiceYear] = useState<string>(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 = Jan, 8 = Sep
    // If month is before September, the current service year is the previous calendar year.
    return (currentMonth < 8 ? currentYear - 1 : currentYear).toString();
  });


  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    const assignmentsQuery = query(collection(db, "assignments"));
    const territoriesQuery = query(collection(db, "territories"));

    let assignmentsLoaded = false;
    let territoriesLoaded = false;

    const checkLoadingState = () => {
      if (assignmentsLoaded && territoriesLoaded) {
        setIsLoading(false);
      }
    };

    const unsubAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
        const fetchedAssignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
        setAllAssignments(fetchedAssignments);
        assignmentsLoaded = true;
        checkLoadingState();
    }, (error) => {
        console.error("Error fetching assignments:", error);
        toast({ title: "Error al Cargar Asignaciones", variant: "destructive"});
        assignmentsLoaded = true;
        checkLoadingState();
    });

    const unsubTerritories = onSnapshot(territoriesQuery, (snapshot) => {
        const fetchedTerritories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Territory));
        setAllTerritories(fetchedTerritories);
        territoriesLoaded = true;
        checkLoadingState();
    }, (error) => {
        console.error("Error fetching territories:", error);
        toast({ title: "Error al Cargar Territorios", variant: "destructive"});
        territoriesLoaded = true;
        checkLoadingState();
    });

    return () => {
        unsubAssignments();
        unsubTerritories();
    };
  }, [toast]);


  const filteredTerritories = useMemo(() => {
    if (!filters) return allTerritories;
    return allTerritories.filter(territory => {
      if (filters.territoryNumber && !territory.number?.toLowerCase().includes(filters.territoryNumber.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [allTerritories, filters]);


  const processedActividadData: ReporteActividadData[] = useMemo(() => {
    return filteredTerritories.map((territory): ReporteActividadData | null => {
        const assignmentsForTerritory = allAssignments
            .filter(a => a.locationId === territory.id)
            .sort((a,b) => {
                const dateA = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
                const dateB = parse(`${b.date} ${b.time}`, "yyyy-MM-dd HH:mm", new Date());
                if (dateB.getTime() !== dateA.getTime()) {
                    return dateB.getTime() - dateA.getTime();
                }
                return (b.time || "").localeCompare(a.time || "");
            });
        
        const allBlockNumbers = Array.from({ length: territory.totalBlocks || 0 }, (_, i) => i + 1);

        const assignmentsWithReports = assignmentsForTerritory
            .filter(a => a.lastReportData?.reportedAt)
            .sort((a, b) => {
                const dateA = a.lastReportData!.reportedAt as Timestamp;
                const dateB = b.lastReportData!.reportedAt as Timestamp;
                return dateA.toMillis() - dateB.toMillis()
            });
        
        let lastCompletionDate: Timestamp | null = null;
        let cumulativeWorkedBlocksForCycle = new Set<number>();

        for (const assignment of assignmentsWithReports) {
            const report = assignment.lastReportData!.reports.find(r => r.territoryId === territory.id);
            if (report && !report.territoryNotWorked) {
                const workedInThisAssignment = (report.workedBlocksIds || []).map(id => parseInt(id.split('-').pop()!, 10));
                workedInThisAssignment.forEach(blockNum => cumulativeWorkedBlocksForCycle.add(blockNum));

                if ((territory.totalBlocks || 0) > 0 && cumulativeWorkedBlocksForCycle.size >= (territory.totalBlocks || 0)) {
                    lastCompletionDate = assignment.lastReportData!.reportedAt as Timestamp;
                    cumulativeWorkedBlocksForCycle.clear();
                }
            }
        }
        
        const ultimaFechaCompletado = lastCompletionDate ? format(lastCompletionDate.toDate(), "dd/MM/yyyy") : "Nunca";

        const currentCycleAssignments = assignmentsForTerritory.filter(a => {
            if (!a.lastReportData?.reportedAt) {
                return true; 
            }
            return lastCompletionDate ? (a.lastReportData.reportedAt as Timestamp).toMillis() > lastCompletionDate.toMillis() : true;
        });

        const workedBlocksInCurrentCycle = new Set<number>();
        currentCycleAssignments.forEach(assignment => {
            const report = assignment.lastReportData?.reports.find(r => r.territoryId === territory.id);
             if (report && !report.territoryNotWorked) {
                (report.workedBlocksIds || []).forEach(blockId => {
                    workedBlocksInCurrentCycle.add(parseInt(blockId.split('-').pop()!));
                });
            }
        });

        const workedBlockNumbers = Array.from(workedBlocksInCurrentCycle).sort((a, b) => a - b);
        const pendingBlockNumbers = allBlockNumbers.filter(n => !workedBlockNumbers.includes(n));
        
        let estado: ReporteActividadData['estado'] = 'Disponible';
        let asignadoA = "N/A";
        let fechaAsignacion = "N/A";
        let manzanasTrabajadas = 'N/A';
        let manzanasPendientes = 'Ninguna';

        const lastAssignmentInCycle = currentCycleAssignments[0];

        if (territory.isBlocked) {
            estado = 'Bloqueado';
            manzanasPendientes = allBlockNumbers.length > 0 ? allBlockNumbers.join(', ') : 'N/A';
        } else if (lastAssignmentInCycle && isAfter(parse(`${lastAssignmentInCycle.date} ${lastAssignmentInCycle.time}`, "yyyy-MM-dd HH:mm", new Date()), new Date())) {
            estado = 'En Curso';
            asignadoA = lastAssignmentInCycle.userName || 'N/A';
            fechaAsignacion = format(parse(lastAssignmentInCycle.date, "yyyy-MM-dd", new Date()), 'dd/MM/yyyy');
            manzanasPendientes = allBlockNumbers.join(', ');
        } else if (lastAssignmentInCycle && isBefore(parse(`${lastAssignmentInCycle.date} ${lastAssignmentInCycle.time}`, "yyyy-MM-dd HH:mm", new Date()), startOfDay(new Date())) && !lastAssignmentInCycle.lastReportData) {
            estado = 'En Curso';
            asignadoA = lastAssignmentInCycle.userName || 'N/A';
            fechaAsignacion = format(parse(lastAssignmentInCycle.date, "yyyy-MM-dd", new Date()), 'dd/MM/yyyy');
            manzanasPendientes = allBlockNumbers.join(', ');
        } else if (workedBlockNumbers.length > 0 && pendingBlockNumbers.length > 0) {
            estado = 'Parcial';
            asignadoA = lastAssignmentInCycle?.userName || 'N/A';
            fechaAsignacion = lastAssignmentInCycle ? format(parse(lastAssignmentInCycle.date, "yyyy-MM-dd", new Date()), 'dd/MM/yyyy') : 'N/A';
            manzanasTrabajadas = workedBlockNumbers.join(', ');
            manzanasPendientes = pendingBlockNumbers.join(', ');
        } else {
             estado = 'Disponible';
        }
        
        const passesPublisherFilter = !filters.assignedTo || (asignadoA !== "N/A" && asignadoA.toLowerCase().includes(filters.assignedTo.toLowerCase()));
        if (!passesPublisherFilter) return null;

        return {
            id: territory.id,
            territoryNumber: territory.number || territory.name,
            ultimaFechaCompletado,
            asignadoA,
            fechaAsignacion,
            manzanasTrabajadas,
            manzanasPendientes,
            estado,
            blockReason: territory.blockReason,
            campaignHistory: assignmentsForTerritory.filter(a => a.lastReportData).map(a => ({
                assignedTo: a.userName,
                assignedDate: a.date,
            })),
        }
    }).filter((item): item is ReporteActividadData => item !== null)
      .sort((a,b) => (a.territoryNumber || "").localeCompare(b.territoryNumber || "", undefined, {numeric: true}));

  }, [filteredTerritories, allAssignments, filters.assignedTo]);


  const processedS13Data: ConsolidatedS13Data[] = useMemo(() => {
    const s13Data: ConsolidatedS13Data[] = [];

    for (const territory of filteredTerritories) {
      if (!territory.totalBlocks || territory.totalBlocks === 0) continue;

      const assignmentsWithReports = allAssignments
        .filter(a => a.locationId === territory.id && a.lastReportData?.reportedAt)
        .sort((a, b) => (a.lastReportData!.reportedAt as Timestamp).toMillis() - (b.lastReportData!.reportedAt as Timestamp).toMillis());

      if (assignmentsWithReports.length === 0) continue;

      const completedCycles: any[] = [];
      let currentCycleWorkedBlocks = new Set<number>();
      let currentCycleStartAssignment: Assignment | null = null;

      for (const assignment of assignmentsWithReports) {
        if (!currentCycleStartAssignment) {
          currentCycleStartAssignment = assignment;
        }
        const report = assignment.lastReportData!.reports.find(r => r.territoryId === territory.id);
        if (report && !report.territoryNotWorked) {
          const workedInThisAssignment = (report.workedBlocksIds || []).map(id => parseInt(id.split('-').pop()!, 10));
          workedInThisAssignment.forEach(blockNum => currentCycleWorkedBlocks.add(blockNum));

          if (currentCycleWorkedBlocks.size >= territory.totalBlocks) {
            completedCycles.push({
              ...assignment,
              _cycleStartAssignment: currentCycleStartAssignment,
            });
            currentCycleWorkedBlocks.clear();
            currentCycleStartAssignment = null;
          }
        }
      }
      
      if (completedCycles.length === 0) continue;

      const transformToS13 = (endAssignment: any): ReporteS13Data => ({
        id: endAssignment.id,
        territoryNumber: territory.number || territory.name,
        lastCompletedHistoric: territory.lastWorked || 'N/A',
        firstAssignedTo: endAssignment._cycleStartAssignment.userName || 'N/A',
        firstAssignedDate: format(parse(endAssignment._cycleStartAssignment.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy'),
        completedCurrentCycle: format((endAssignment.lastReportData!.reportedAt as Timestamp).toDate(), "dd/MM/yyyy"),
        fullCampaignHistory: [],
      });
      
      const lastTwoCycles = completedCycles.slice(-2).reverse();

      const dataToAdd: ConsolidatedS13Data = {
          territoryId: territory.id,
          territoryNumber: territory.number || territory.name,
          lastCycle: lastTwoCycles[0] ? transformToS13(lastTwoCycles[0]) : undefined,
          penultimateCycle: lastTwoCycles[1] ? transformToS13(lastTwoCycles[1]) : undefined,
      };

      const passesPublisherFilter = !filters.assignedTo || 
          (dataToAdd.lastCycle && dataToAdd.lastCycle.firstAssignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase())) || 
          (dataToAdd.penultimateCycle && dataToAdd.penultimateCycle.firstAssignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase()));

      if (!passesPublisherFilter) continue;
      
      const passesDateFilter = () => {
          if (!filters.fromDate && !filters.toDate) return true;
          const lastCycleDate = dataToAdd.lastCycle ? parse(dataToAdd.lastCycle.completedCurrentCycle, 'dd/MM/yyyy', new Date()) : null;
          if (!lastCycleDate) return false;
          if (filters.fromDate && lastCycleDate < filters.fromDate) return false;
          if (filters.toDate && lastCycleDate > filters.toDate) return false;
          return true;
      };

      if (!passesDateFilter()) continue;
      
      s13Data.push(dataToAdd);
    }
    
    return s13Data.sort((a,b) => a.territoryNumber.localeCompare(b.territoryNumber, undefined, {numeric: true}));

  }, [allAssignments, filteredTerritories, filters]);


  const serviceYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years.map(String);
  }, []);

  const handleGeneratePrintableReport = () => {
    if (!selectedServiceYear) {
      toast({ title: "Error", description: "Por favor, selecciona un año de servicio.", variant: "destructive" });
      return;
    }
    // In a real app, you might want to pass more parameters, like filters
    window.open(`/reportes/s13-imprimible?serviceYear=${selectedServiceYear}`, '_blank');
    setIsPrintS13DialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Página de Reportes</CardTitle>
          <CardDescription>
            Herramientas para visualizar, analizar y exportar datos de la actividad en los territorios. Los datos se cargan automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setIsFiltersSheetOpen(true)} variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Mostrar Filtros
          </Button>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="detalle" className="w-full">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="detalle">Registro de Actividad Detallado</TabsTrigger>
            <TabsTrigger value="s13">Registro S-13 (Completados)</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="detalle">
          <Card>
            <CardHeader>
              <CardTitle>Estado Actual de los Territorios</CardTitle>
              <CardDescription>
                Muestra el estado más reciente de cada territorio, priorizando los que están actualmente "En curso" o "Bloqueados".
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                <ReporteActividadView data={processedActividadData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="s13">
           <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                  <div>
                    <CardTitle>Historial de Ciclos Completados (S-13)</CardTitle>
                    <CardDescription>
                      Cada fila representa un territorio, mostrando sus últimos dos ciclos de trabajo completados (basado en la fecha del reporte).
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setIsPrintS13DialogOpen(true)} size="sm" disabled={isLoading}>
                    <FileDown className="mr-2 h-4 w-4" /> Exportar S-13
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                <ReporteS13View data={processedS13Data} allAssignments={allAssignments} allTerritories={allTerritories} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <FiltrosReportesSheet 
        isOpen={isFiltersSheetOpen}
        onOpenChange={setIsFiltersSheetOpen}
        onApplyFilters={setFilters}
        currentFilters={filters}
      />
      
      <Dialog open={isPrintS13DialogOpen} onOpenChange={setIsPrintS13DialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Reporte S-13 Imprimible</DialogTitle>
            <DialogDescriptionComponent>
              Selecciona el año de servicio para el cual deseas generar el reporte. El año de servicio va del 1 de septiembre al 31 de agosto.
            </DialogDescriptionComponent>
          </DialogHeader>
          <div className="py-4">
            <div className="grid items-center gap-4">
              <Label htmlFor="service-year-select" className="text-left">
                Año de Servicio
              </Label>
              <Select value={selectedServiceYear} onValueChange={setSelectedServiceYear}>
                <SelectTrigger id="service-year-select">
                  <SelectValue placeholder="Selecciona un año" />
                </SelectTrigger>
                <SelectContent>
                  {serviceYearOptions.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintS13DialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGeneratePrintableReport}>Generar Reporte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
