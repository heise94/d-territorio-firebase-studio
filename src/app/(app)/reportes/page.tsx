
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Filter, FileDown, PlusCircle } from "lucide-react";
import type { Territory, Assignment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parse, isBefore, startOfDay } from "date-fns";

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
    const now = new Date();

    return filteredTerritories.map(territory => {
        const assignmentsForTerritory = allAssignments
            .filter(a => a.locationId === territory.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const relevantAssignment = assignmentsForTerritory.find(a => {
            try {
                const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
                const isPast = isBefore(assignmentDateTime, startOfDay(now));
                
                if (!isPast && (a.status === 'accepted' || a.status === 'pending' || a.status === 'replacement_requested')) {
                    return true;
                }
                if (isPast && a.status === 'accepted' && !a.lastReportData) {
                    return true;
                }
            } catch (e) {
                console.warn(`Could not parse date for assignment ${a.id}: ${a.date}`);
                return false;
            }
            return false;
        });
        
        let status: ReporteActividadData['status'] = 'Disponible';
        let assignedTo = "N/A";
        let assignedDate = "N/A";
        let blocksWorked: string | number = "N/A";
        let blocksPending: string | number = "N/A";


        if (territory.isBlocked) {
            status = 'Bloqueado';
        } else if (relevantAssignment) {
            status = 'En Curso';
            assignedTo = relevantAssignment.userName || 'N/A';
            assignedDate = relevantAssignment.date;

            const totalTerritoryBlocks = territory.totalBlocks || 0;
            
            const reportData = allAssignments.find(a => a.id === relevantAssignment.id)?.lastReportData;

            if (reportData) {
                const territoryReport = reportData.reports.find(r => r.territoryId === territory.id);
                if (territoryReport) {
                    if (territoryReport.territoryNotWorked) {
                        blocksWorked = "No trabajado";
                        blocksPending = totalTerritoryBlocks;
                    } else {
                        const workedCount = territoryReport.workedBlocksIds?.length || 0;
                        blocksWorked = workedCount;
                        blocksPending = totalTerritoryBlocks - workedCount;
                    }
                } else {
                    blocksWorked = 0;
                    blocksPending = totalTerritoryBlocks;
                }
            } else {
                blocksWorked = 0;
                blocksPending = totalTerritoryBlocks;
            }
        }

        const passesPublisherFilter = !filters.assignedTo || (status === 'En Curso' && assignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase()));
        if (!passesPublisherFilter) return null;

        return {
            id: territory.id,
            territoryNumber: territory.number || territory.name,
            lastCompletedHistoric: territory.lastWorked || "Nunca",
            assignedTo,
            assignedDate,
            blocksWorked: String(blocksWorked),
            blocksPending: String(blocksPending),
            status,
            campaignHistory: assignmentsForTerritory.filter(a => a.lastReportData).map(a => ({
                assignedTo: a.userName,
                assignedDate: a.date,
            })),
            blockReason: territory.blockReason,
        }
    }).filter((item): item is ReporteActividadData => item !== null)
      .sort((a,b) => (a.territoryNumber || "").localeCompare(b.territoryNumber || "", undefined, {numeric: true}));

  }, [filteredTerritories, allAssignments, filters.assignedTo]);


  const processedS13Data: ConsolidatedS13Data[] = useMemo(() => {
    const reportsByTerritory = new Map<string, Assignment[]>();

    allAssignments.forEach(a => {
        if (a.lastReportData && a.locationId && !a.lastReportData.reports.some(r => r.territoryId === a.locationId && r.territoryNotWorked)) {
            if(!reportsByTerritory.has(a.locationId)) {
                reportsByTerritory.set(a.locationId, []);
            }
            reportsByTerritory.get(a.locationId)!.push(a);
        }
    });
    
    const consolidatedData: ConsolidatedS13Data[] = [];

    for(const [territoryId, assignments] of reportsByTerritory.entries()) {
        const territory = allTerritories.find(t => t.id === territoryId);
        if (!territory) continue;

        const sortedAssignments = assignments.sort((a,b) => {
            const dateA = a.lastReportData!.reportedAt as Timestamp;
            const dateB = b.lastReportData!.reportedAt as Timestamp;
            return dateB.toMillis() - dateA.toMillis();
        });

        const transformAssignmentToS13 = (assignment: Assignment): ReporteS13Data => ({
            id: assignment.id,
            territoryNumber: territory.number || territory.name,
            lastCompletedHistoric: territory.lastWorked || 'N/A',
            firstAssignedTo: assignment.userName || 'N/A',
            firstAssignedDate: assignment.date,
            completedCurrentCycle: format((assignment.lastReportData!.reportedAt as Timestamp).toDate(), "dd/MM/yyyy"),
            fullCampaignHistory: [{
                assignedTo: assignment.userName,
                assignedDate: assignment.date,
            }]
        });

        consolidatedData.push({
            territoryId: territory.id,
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

    