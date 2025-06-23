
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Filter, FileDown } from "lucide-react";
import type { Report, CampaignAssignmentInReport } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Papa from "papaparse";

import { ReporteActividadView, type ReporteActividadData } from "@/components/reportes/reporte-actividad-view";
import { ReporteS13View, type ReporteS13Data } from "@/components/reportes/reporte-s13-view";
import { FiltrosReportesSheet, type ReportFilters } from "@/components/reportes/filtros-reportes-sheet";

// MOCK DATA - Replace with Firestore fetching
const MOCK_REPORTS_DATA: Report[] = [
  { id: 'RPT-001', territoryNumber: '101', lastCompletedHistoric: '15/01/2024', campaigns: [ { assignedTo: 'Ana Pérez', assignedDate: '01/06/2024', blocksWorked: 'Manzanas 1 y 2', blocksPending: 'Manzanas 3, 4, 5', }, { assignedTo: 'Luis Gómez', assignedDate: '15/06/2024', blocksWorked: 'Manzana 3', blocksPending: 'Manzanas 4, 5', }, ], completedCurrentCycle: 'En curso', },
  { id: 'RPT-002', territoryNumber: '102', lastCompletedHistoric: '05/11/2023', campaigns: [ { assignedTo: 'Carlos Díaz', assignedDate: '10/04/2024', blocksWorked: 'Todas', blocksPending: 'Ninguna', }, ], completedCurrentCycle: '25/05/2024', },
  { id: 'RPT-003', territoryNumber: '103', lastCompletedHistoric: 'N/A', campaigns: [ { assignedTo: 'Elena Jara', assignedDate: '01/02/2024', blocksWorked: 'Todo el sector rural', blocksPending: 'Ninguno', }, ], completedCurrentCycle: '28/02/2024', },
  { id: 'RPT-004', territoryNumber: '101', lastCompletedHistoric: '20/07/2023', campaigns: [ { assignedTo: 'Sofía Castro (SG G1)', assignedDate: '01/12/2023', blocksWorked: 'Manzanas 1-3', blocksPending: 'Manzanas 4-5', }, { assignedTo: 'Ana Pérez', assignedDate: '20/12/2023', blocksWorked: 'Manzanas 4-5', blocksPending: 'Ninguna', }, ], completedCurrentCycle: '15/01/2024', },
];


export default function ReportesPage() {
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const { toast } = useToast();

  useEffect(() => {
    // In a real scenario, you'd fetch from Firestore here.
    // For now, we use mock data.
    setTimeout(() => {
        setAllReports(MOCK_REPORTS_DATA);
        setIsLoading(false);
    }, 1000);

    /*
    // Firestore implementation (to be used when ready)
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    
    const reportsQuery = query(collection(db, "reports"), orderBy("territoryNumber"));
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Report));
      setAllReports(fetchedReports);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      toast({ title: "Error", description: "No se pudieron cargar los reportes.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
    */
  }, [toast]);


  const filteredReports = useMemo(() => {
    return allReports.filter(report => {
      if (filters.territoryNumber && !report.territoryNumber.includes(filters.territoryNumber)) return false;
      if (filters.assignedTo && !report.campaigns.some(c => c.assignedTo?.toLowerCase().includes(filters.assignedTo!.toLowerCase()))) return false;
      
      const lastCampaignDate = report.campaigns.length > 0 
        ? new Date(report.campaigns[report.campaigns.length - 1].assignedDate!.split('/').reverse().join('-'))
        : null;

      if (filters.fromDate && lastCampaignDate && lastCampaignDate < filters.fromDate) return false;
      if (filters.toDate && lastCampaignDate && lastCampaignDate > filters.toDate) return false;
      
      return true;
    });
  }, [allReports, filters]);


  const processedActividadData: ReporteActividadData[] = useMemo(() => {
    const latestCyclesMap = new Map<string, Report>();
    
    filteredReports.forEach(report => {
      const existing = latestCyclesMap.get(report.territoryNumber);
      if (!existing || (report.completedCurrentCycle === 'En curso' && existing.completedCurrentCycle !== 'En curso')) {
        latestCyclesMap.set(report.territoryNumber, report);
      } else if (report.completedCurrentCycle !== 'En curso' && existing.completedCurrentCycle !== 'En curso') {
        const reportDate = new Date(report.completedCurrentCycle.split('/').reverse().join('-'));
        const existingDate = new Date(existing.completedCurrentCycle.split('/').reverse().join('-'));
        if (reportDate > existingDate) {
          latestCyclesMap.set(report.territoryNumber, report);
        }
      }
    });

    return Array.from(latestCyclesMap.values()).map(report => {
      const lastCampaign = report.campaigns[report.campaigns.length - 1];
      const isInProgress = report.completedCurrentCycle === 'En curso';
      return {
        id: report.id,
        territoryNumber: report.territoryNumber,
        lastCompletedHistoric: report.lastCompletedHistoric || "N/A",
        assignedTo: isInProgress ? lastCampaign?.assignedTo || "N/A" : "N/A",
        assignedDate: isInProgress ? lastCampaign?.assignedDate || "N/A" : "N/A",
        blocksWorked: isInProgress ? lastCampaign?.blocksWorked || "-" : "-",
        blocksPending: isInProgress ? lastCampaign?.blocksPending || "-" : "-",
        status: isInProgress ? "En Curso" : "Disponible",
        campaignHistory: report.campaigns,
      };
    });
  }, [filteredReports]);

  const processedS13Data: ReporteS13Data[] = useMemo(() => {
    return filteredReports
      .filter(report => report.completedCurrentCycle !== 'En curso')
      .map(report => {
        const firstCampaign = report.campaigns[0];
        return {
          id: report.id,
          territoryNumber: report.territoryNumber,
          lastCompletedHistoric: report.lastCompletedHistoric || "N/A",
          firstAssignedTo: firstCampaign?.assignedTo || "N/A",
          firstAssignedDate: firstCampaign?.assignedDate || "N/A",
          completedCurrentCycle: report.completedCurrentCycle,
          fullCampaignHistory: report.campaigns,
        };
      })
      .sort((a,b) => new Date(b.completedCurrentCycle.split('/').reverse().join('-')).getTime() - new Date(a.completedCurrentCycle.split('/').reverse().join('-')).getTime());
  }, [filteredReports]);

  const handleExportS13 = () => {
    if (processedS13Data.length === 0) {
      toast({ title: "Sin datos", description: "No hay datos en la vista S-13 para exportar.", variant: "default" });
      return;
    }
    const csvData = processedS13Data.map(row => ({
      "Territorio": row.territoryNumber,
      "FechaCompletóHistórica": row.lastCompletedHistoric,
      "PrimerAsignadoCiclo": row.firstAssignedTo,
      "FechaPrimeraAsignaciónCiclo": row.firstAssignedDate,
      "FechaCompletóCiclo": row.completedCurrentCycle,
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_S13_${new Date().toISOString().split('T')[0]}.csv`);
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
            Herramientas para visualizar, analizar y exportar datos de la actividad en los territorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsFiltersSheetOpen(true)}>
            <Filter className="mr-2 h-4 w-4" /> Mostrar Filtros
          </Button>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="detalle" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="detalle">Registro de Actividad Detallado</TabsTrigger>
            <TabsTrigger value="s13">Registro S-13 (Completados)</TabsTrigger>
          </TabsList>
          <Button variant="outline" onClick={handleExportS13} size="sm">
            <FileDown className="mr-2 h-4 w-4" /> Exportar S-13 a CSV
          </Button>
        </div>

        <TabsContent value="detalle">
          <Card>
            <CardHeader>
              <CardTitle>Estado Actual de los Territorios</CardTitle>
              <CardDescription>
                Muestra el estado más reciente de cada territorio, priorizando los que están actualmente "En curso".
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
                Cada fila representa un ciclo de trabajo completado para un territorio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                <ReporteS13View data={processedS13Data} allReports={allReports} />
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

    