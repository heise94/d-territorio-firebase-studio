
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Filter, FileDown, PlusCircle } from "lucide-react";
import type { Territory, Assignment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

import { ReporteActividadView, type ReporteActividadData } from "@/components/reportes/reporte-actividad-view";
import { ReporteS13View, type ConsolidatedS13Data, type ReporteS13Data } from "@/components/reportes/reporte-s13-view";
import { FiltrosReportesSheet, type ReportFilters } from "@/components/reportes/filtros-reportes-sheet";


export default function ReportesPage() {
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingTerritories, setIsLoadingTerritories] = useState(true);
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const { toast } = useToast();
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingAssignments(false);
      setIsLoadingTerritories(false);
      return;
    }
    
    setIsLoadingAssignments(true);
    const assignmentsQuery = query(collection(db, "assignments")); 
    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      const fetchedAssignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
      setAllAssignments(fetchedAssignments);
      setIsLoadingAssignments(false);
    }, (error) => {
      console.error("Error fetching assignments:", error);
      toast({ title: "Error al Cargar Asignaciones", description: "No se pudieron cargar los datos de las asignaciones desde Firestore.", variant: "destructive" });
      setIsLoadingAssignments(false);
    });

    setIsLoadingTerritories(true);
    const territoriesQuery = query(collection(db, "territories"));
    const unsubscribeTerritories = onSnapshot(territoriesQuery, (snapshot) => {
      const fetchedTerritories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Territory));
      setAllTerritories(fetchedTerritories);
      setIsLoadingTerritories(false);
    }, (error) => {
        console.error("Error fetching territories:", error);
        toast({ title: "Error al Cargar Territorios", description: "No se pudieron cargar los datos de los territorios.", variant: "destructive" });
        setIsLoadingTerritories(false);
    });


    return () => {
        unsubscribeAssignments();
        unsubscribeTerritories();
    };
  }, [toast]);


  const filteredTerritories = useMemo(() => {
    if (!filters) return allTerritories;
    return allTerritories.filter(territory => {
      if (filters.territoryNumber && !territory.number?.toLowerCase().includes(filters.territoryNumber.toLowerCase())) {
        return false;
      }
      // Note: assignedTo and date filters are applied in the specific data processors below
      return true;
    });
  }, [allTerritories, filters]);


  const processedActividadData: ReporteActividadData[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparisons

    return filteredTerritories.map(territory => {
        const assignmentsForTerritory = allAssignments
            .filter(a => a.locationId === territory.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const futureAssignment = assignmentsForTerritory.find(a => new Date(a.date) >= today && a.status !== 'rejected' && a.status !== 'cancelled_by_admin');
        
        let status: ReporteActividadData['status'] = 'Disponible';
        let assignedTo = "N/A";
        let assignedDate = "N/A";

        if (territory.isBlocked) {
            status = 'Bloqueado';
        } else if (futureAssignment) {
            status = 'En Curso';
            assignedTo = futureAssignment.userName || 'N/A';
            assignedDate = futureAssignment.date;
        }

        const passesPublisherFilter = !filters.assignedTo || (status === 'En Curso' && assignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase()));
        if (!passesPublisherFilter) return null;

        return {
            id: territory.id,
            territoryNumber: territory.number || territory.name,
            lastCompletedHistoric: territory.lastWorked || "Nunca",
            assignedTo,
            assignedDate,
            blocksWorked: "N/A", // This is not applicable for a "current status" view.
            blocksPending: "N/A", // This is not applicable for a "current status" view.
            status,
            campaignHistory: assignmentsForTerritory.filter(a => a.lastReportData).map(a => ({
                assignedTo: a.userName,
                assignedDate: a.date,
            })),
            blockReason: territory.blockReason,
        }
    }).filter((item): item is ReporteActividadData => item !== null)
      .sort((a,b) => a.territoryNumber.localeCompare(b.territoryNumber, undefined, {numeric: true}));

  }, [filteredTerritories, allAssignments, filters.assignedTo]);


  const processedS13Data: ConsolidatedS13Data[] = useMemo(() => {
    const assignmentsWithReports = allAssignments.filter(a => a.lastReportData && a.locationId);
    const reportsByTerritory = new Map<string, Assignment[]>();

    assignmentsWithReports.forEach(a => {
        const terrId = a.locationId!;
        if(!reportsByTerritory.has(terrId)) {
            reportsByTerritory.set(terrId, []);
        }
        reportsByTerritory.get(terrId)!.push(a);
    });
    
    const consolidatedData: ConsolidatedS13Data[] = [];

    for(const [territoryId, assignments] of reportsByTerritory.entries()) {
        const territory = allTerritories.find(t => t.id === territoryId);
        if (!territory) continue;

        const sortedAssignments = assignments.sort((a,b) => b.lastReportData!.reportedAt.toMillis() - a.lastReportData!.reportedAt.toMillis());

        const transformAssignmentToS13 = (assignment: Assignment): ReporteS13Data => ({
            id: assignment.id,
            territoryNumber: territory.number || territory.name,
            lastCompletedHistoric: territory.lastWorked || 'N/A', // This is the last time any work was reported, not necessarily the last full cycle. Best effort.
            firstAssignedTo: assignment.userName || 'N/A',
            firstAssignedDate: assignment.date,
            completedCurrentCycle: format(assignment.lastReportData!.reportedAt.toDate(), "dd/MM/yyyy"),
            fullCampaignHistory: [{
                assignedTo: assignment.userName,
                assignedDate: assignment.date,
            }]
        });

        consolidatedData.push({
            territoryNumber: territory.number || territory.name,
            lastCycle: sortedAssignments[0] ? transformAssignmentToS13(sortedAssignments[0]) : undefined,
            penultimateCycle: sortedAssignments[1] ? transformAssignmentToS13(sortedAssignments[1]) : undefined,
        });
    }

    return consolidatedData.filter(d => {
        if (filters.territoryNumber && !d.territoryNumber.toLowerCase().includes(filters.territoryNumber.toLowerCase())) return false;
        
        if (filters.assignedTo) {
            const name = filters.assignedTo.toLowerCase();
            const match = d.lastCycle?.firstAssignedTo.toLowerCase().includes(name) || d.penultimateCycle?.firstAssignedTo.toLowerCase().includes(name);
            if (!match) return false;
        }

        if(filters.fromDate || filters.toDate) {
            const lastCycleDate = d.lastCycle ? new Date(d.lastCycle.completedCurrentCycle.split('/').reverse().join('-')) : null;
            if (filters.fromDate && lastCycleDate && lastCycleDate < filters.fromDate) return false;
            if (filters.toDate && lastCycleDate && lastCycleDate > filters.toDate) return false;
        }
        
        return true;
    }).sort((a,b) => a.territoryNumber.localeCompare(b.territoryNumber, undefined, {numeric: true}));

  }, [allAssignments, allTerritories, filters]);


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

  const isLoading = isLoadingAssignments || isLoadingTerritories;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Página de Reportes</CardTitle>
          <CardDescription>
            Herramientas para visualizar, analizar y exportar datos de la actividad en los territorios.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setIsFiltersSheetOpen(true)}>
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
            <Button variant="outline" onClick={handleExportS13} size="sm">
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
                <ReporteS13View data={processedS13Data} allAssignments={allAssignments} />
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
