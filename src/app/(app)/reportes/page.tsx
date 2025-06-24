
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Filter, FileDown, PlusCircle } from "lucide-react";
import type { Territory, Assignment, UserAssignment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parse, isBefore, startOfDay, parseISO, isAfter } from "date-fns";

import { ReporteActividadView, type ReporteActividadData } from "@/components/reportes/reporte-actividad-view";
import { ReporteS13View, type ConsolidatedS13Data, type ReporteS13Data } from "@/components/reportes/reporte-s13-view";
import { FiltrosReportesSheet, type ReportFilters } from "@/components/reportes/filtros-reportes-sheet";


export default function ReportesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const { toast } = useToast();
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);

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
    return filteredTerritories.map(territory => {
        const assignmentsForTerritory = allAssignments
            .filter(a => a.locationId === territory.id)
            .sort((a,b) => {
                const dateA = parse(a.date, "yyyy-MM-dd", new Date());
                const dateB = parse(b.date, "yyyy-MM-dd", new Date());
                if (dateB.getTime() !== dateA.getTime()) {
                    return dateB.getTime() - dateA.getTime();
                }
                return (b.time || "").localeCompare(a.time || "");
            });
        
        const allBlockNumbers = Array.from({ length: territory.totalBlocks || 0 }, (_, i) => i + 1);

        const assignmentsWithReports = assignmentsForTerritory
            .filter(a => a.lastReportData?.reportedAt)
            .sort((a, b) => (a.lastReportData!.reportedAt as Timestamp).toMillis() - (b.lastReportData!.reportedAt as Timestamp).toMillis()); // Oldest to newest
        
        let lastCompletionDate: Timestamp | null = null;
        let cumulativeWorkedBlocksForCycle = new Set<number>();

        for (const assignment of assignmentsWithReports) {
            const report = assignment.lastReportData!.reports.find(r => r.territoryId === territory.id);
            if (report && !report.territoryNotWorked) {
                const workedInThisAssignment = (report.workedBlocksIds || []).map(id => parseInt(id.split('-').pop()!));
                workedInThisAssignment.forEach(blockNum => cumulativeWorkedBlocksForCycle.add(blockNum));

                if (cumulativeWorkedBlocksForCycle.size >= (territory.totalBlocks || 0) && (territory.totalBlocks || 0) > 0) {
                    lastCompletionDate = assignment.lastReportData!.reportedAt as Timestamp;
                    cumulativeWorkedBlocksForCycle.clear(); // Reset for next cycle
                }
            }
        }
        
        const ultimaFechaCompletado = lastCompletionDate ? format(lastCompletionDate.toDate(), "dd/MM/yyyy") : "Nunca";

        const currentCycleAssignments = assignmentsForTerritory.filter(a => {
            const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
            if (isAfter(assignmentDateTime, new Date())) {
                return true; 
            }
            if (!a.lastReportData?.reportedAt) {
                return true; 
            }
            return lastCompletionDate ? (a.lastReportData.reportedAt as Timestamp).toMillis() > lastCompletionDate.toMillis() : true;
        });

        const workedBlocksInCurrentCycleFinal = new Set<number>();
        currentCycleAssignments.forEach(assignment => {
            const report = assignment.lastReportData?.reports.find(r => r.territoryId === territory.id);
             if (report && !report.territoryNotWorked) {
                (report.workedBlocksIds || []).forEach(blockId => {
                    workedBlocksInCurrentCycleFinal.add(parseInt(blockId.split('-').pop()!));
                });
            }
        });

        const workedBlockNumbers = Array.from(workedBlocksInCurrentCycleFinal).sort((a, b) => a - b);
        const pendingBlockNumbers = allBlockNumbers.filter(n => !workedBlockNumbers.includes(n));

        const latestAssignmentOverall = assignmentsForTerritory[0];
        
        let estado: ReporteActividadData['estado'] = 'Disponible';
        let asignadoA = "N/A";
        let fechaAsignacion = "N/A";

        if (territory.isBlocked) {
            estado = 'Bloqueado';
        } else if (latestAssignmentOverall) {
            const assignmentDateTime = parse(`${latestAssignmentOverall.date} ${latestAssignmentOverall.time}`, "yyyy-MM-dd HH:mm", new Date());
            
            if (isAfter(assignmentDateTime, startOfDay(new Date()))) {
                estado = 'En Curso';
                asignadoA = latestAssignmentOverall.userName || 'N/A';
                fechaAsignacion = format(parseISO(latestAssignmentOverall.date), 'dd/MM/yyyy');
            } else if (workedBlockNumbers.length > 0 && pendingBlockNumbers.length > 0) {
                 estado = 'Parcial';
                 const latestAssigneeInCycle = currentCycleAssignments[0];
                 asignadoA = latestAssigneeInCycle?.userName || 'N/A';
                 fechaAsignacion = latestAssigneeInCycle ? format(parseISO(latestAssigneeInCycle.date), 'dd/MM/yyyy') : 'N/A';
            } else if (workedBlockNumbers.length > 0 && pendingBlockNumbers.length === 0 && allBlockNumbers.length > 0) {
                 estado = 'Disponible'; 
            } else if (currentCycleAssignments.length > 0 && !currentCycleAssignments[0].lastReportData) {
                 estado = 'En Curso'; 
                 asignadoA = currentCycleAssignments[0].userName || 'N/A';
                 fechaAsignacion = format(parseISO(currentCycleAssignments[0].date), 'dd/MM/yyyy');
            }
        }
        
        if (estado === 'Disponible' || estado === 'Bloqueado') {
            asignadoA = "N/A";
            fechaAsignacion = "N/A";
        }

        const passesPublisherFilter = !filters.assignedTo || (asignadoA !== "N/A" && asignadoA.toLowerCase().includes(filters.assignedTo.toLowerCase()));
        if (!passesPublisherFilter) return null;

        return {
            id: territory.id,
            territoryNumber: territory.number || territory.name,
            ultimaFechaCompletado,
            asignadoA,
            fechaAsignacion,
            manzanasTrabajadas: workedBlockNumbers.length > 0 ? workedBlockNumbers.join(', ') : 'N/A',
            manzanasPendientes: pendingBlockNumbers.length > 0 ? pendingBlockNumbers.join(', ') : 'Ninguna',
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
          const workedInThisAssignment = (report.workedBlocksIds || []).map(id => parseInt(id.split('-').pop()!));
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
        firstAssignedDate: format(parseISO(endAssignment._cycleStartAssignment.date), 'dd/MM/yyyy'),
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
          dataToAdd.lastCycle?.firstAssignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase()) || 
          dataToAdd.penultimateCycle?.firstAssignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase());

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


  const handleExportS13 = () => {
    if (processedS13Data.length === 0) {
      toast({ title: "Sin datos", description: "No hay datos de ciclos completados para exportar con los filtros actuales.", variant: "default" });
      return;
    }

    const csvData = processedS13Data.flatMap(row => {
        const rows = [];
        if (row.lastCycle) {
            rows.push({
                "Territorio": row.territoryNumber,
                "Ciclo": "Último",
                "FechaCompletóCiclo": row.lastCycle.completedCurrentCycle,
                "PrimerAsignadoCiclo": row.lastCycle.firstAssignedTo,
                "FechaPrimeraAsignaciónCiclo": row.lastCycle.firstAssignedDate,
            });
        }
        if (row.penultimateCycle) {
            rows.push({
                "Territorio": row.territoryNumber,
                "Ciclo": "Penúltimo",
                "FechaCompletóCiclo": row.penultimateCycle.completedCurrentCycle,
                "PrimerAsignadoCiclo": row.penultimateCycle.firstAssignedTo,
                "FechaPrimeraAsignaciónCiclo": row.penultimateCycle.firstAssignedDate,
            });
        }
        return rows;
    });

    if (csvData.length === 0) {
      toast({ title: "Sin datos", description: "No hay ciclos válidos para exportar.", variant: "default" });
      return;
    }
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_S-13_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Exportación Iniciada", description: "El archivo CSV se está descargando." });
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => toast({title: "Próximamente", description: "La entrada manual de reportes estará disponible pronto."})} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Ingresar Reporte Manual
            </Button>
            <Button variant="outline" onClick={handleExportS13} size="sm" disabled={isLoading}>
              <FileDown className="mr-2 h-4 w-4" /> Exportar S-13 a CSV
            </Button>
          </div>
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
              <CardTitle>Historial de Ciclos Completados (S-13)</CardTitle>
              <CardDescription>
                Cada fila representa un territorio, mostrando sus últimos dos ciclos de trabajo completados (basado en la fecha del reporte).
              </CardDescription>
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
    </div>
  );
}
