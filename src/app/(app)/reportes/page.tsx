
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Filter, FileDown, PlusCircle } from "lucide-react";
import type { Report } from "@/types";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

import { ReporteActividadView, type ReporteActividadData } from "@/components/reportes/reporte-actividad-view";
import { ReporteS13View, type ReporteS13Data } from "@/components/reportes/reporte-s13-view";
import { FiltrosReportesSheet, type ReportFilters } from "@/components/reportes/filtros-reportes-sheet";
import { processReportData } from "@/data/reports-data-processor";


export default function ReportesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const { toast } = useToast();

  const allReports = useMemo(() => {
    setIsLoading(true);
    const { territories } = processReportData({});
    setIsLoading(false);
    return territories;
  }, []);

  const filteredReports = useMemo(() => {
    if (!Array.isArray(allReports)) return [];
    return allReports.filter(report => {
      if (filters.territoryNumber && !report.territoryNumber.toString().includes(filters.territoryNumber)) return false;
      if (filters.assignedTo && !report.campaigns.some(c => c.assignedTo?.toLowerCase().includes(filters.assignedTo!.toLowerCase()))) return false;
      
      const lastCampaignDate = report.campaigns.length > 0 && report.campaigns[report.campaigns.length - 1].assignedDate
        ? new Date(report.campaigns[report.campaigns.length - 1].assignedDate!.split('/').reverse().join('-'))
        : null;

      if (filters.fromDate && lastCampaignDate && lastCampaignDate < filters.fromDate) return false;
      if (filters.toDate && lastCampaignDate && lastCampaignDate > filters.toDate) return false;
      
      return true;
    });
  }, [allReports, filters]);


  const processedActividadData: ReporteActividadData[] = useMemo(() => {
    if (!Array.isArray(filteredReports)) return [];

    const reportsByTerritory = new Map<string, Report[]>();
    filteredReports.forEach(report => {
      const key = report.territoryNumber.toString();
      if (!reportsByTerritory.has(key)) {
        reportsByTerritory.set(key, []);
      }
      reportsByTerritory.get(key)!.push(report);
    });

    const activityData: ReporteActividadData[] = [];
    
    for (const [territoryNumber, reports] of reportsByTerritory.entries()) {
      let latestReport = reports.find(r => r.completedCurrentCycle === 'En curso' || r.completedCurrentCycle === 'Disponible');

      if (!latestReport) {
        latestReport = [...reports].sort((a, b) => {
          try {
            const dateA = new Date(a.completedCurrentCycle.split('/').reverse().join('-'));
            const dateB = new Date(b.completedCurrentCycle.split('/').reverse().join('-'));
            return dateB.getTime() - dateA.getTime();
          } catch(e) { return 0; }
        })[0];
      }
      
      if (latestReport) {
          const lastCampaign = latestReport.campaigns[latestReport.campaigns.length - 1];
          const isInProgress = latestReport.completedCurrentCycle === 'En curso';
          
          activityData.push({
            id: latestReport.id,
            territoryNumber: latestReport.territoryNumber.toString(),
            lastCompletedHistoric: latestReport.lastCompletedHistoric || "Nunca",
            assignedTo: isInProgress ? lastCampaign?.assignedTo || "N/A" : "N/A",
            assignedDate: isInProgress ? lastCampaign?.assignedDate || "N/A" : "N/A",
            blocksWorked: isInProgress ? lastCampaign?.blocksWorked || "-" : "-",
            blocksPending: isInProgress ? lastCampaign?.blocksPending || "-" : "-",
            status: isInProgress ? "En Curso" : "Disponible",
            campaignHistory: latestReport.campaigns,
          });
      }
    }
    
    return activityData.sort((a,b) => a.territoryNumber.localeCompare(b.territoryNumber, undefined, {numeric: true}));

  }, [filteredReports]);

  const processedS13Data: ReporteS13Data[] = useMemo(() => {
    if (!Array.isArray(filteredReports)) return [];
    return filteredReports
      .filter(report => report.completedCurrentCycle !== 'En curso' && report.completedCurrentCycle !== 'Disponible')
      .map(report => {
        const firstCampaign = report.campaigns[0];
        return {
          id: report.id,
          territoryNumber: report.territoryNumber.toString(),
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
      "FueCampañaEspecial": row.fullCampaignHistory[0]?.isSpecialCampaign ? "Sí" : "No",
      "NombreCampaña": row.fullCampaignHistory[0]?.campaignName || "",
    }));
    
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
                <ReporteS13View data={processedS13Data} allReports={allReports || []} />
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
