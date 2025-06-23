
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Filter, FileDown, PlusCircle, UploadCloud } from "lucide-react";
import type { Report, Territory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { collection, onSnapshot, query, writeBatch, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { ReporteActividadView, type ReporteActividadData } from "@/components/reportes/reporte-actividad-view";
import { ReporteS13View, type ConsolidatedS13Data, type ReporteS13Data } from "@/components/reportes/reporte-s13-view";
import { FiltrosReportesSheet, type ReportFilters } from "@/components/reportes/filtros-reportes-sheet";


export default function ReportesPage() {
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isLoadingTerritories, setIsLoadingTerritories] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const { toast } = useToast();
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingReports(false);
      setIsLoadingTerritories(false);
      return;
    }
    
    setIsLoadingReports(true);
    const reportsQuery = query(collection(db, "reports")); 
    
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setAllReports(fetchedReports);
      setIsLoadingReports(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      toast({ title: "Error al Cargar Reportes", description: "No se pudieron cargar los datos de los reportes desde Firestore.", variant: "destructive" });
      setIsLoadingReports(false);
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
        unsubscribeReports();
        unsubscribeTerritories();
    };
  }, [toast]);


  const handleSeedDatabase = async () => {
      if (!db) {
          toast({ title: "Error", description: "La base de datos no está disponible.", variant: "destructive" });
          return;
      }
      setIsSeeding(true);
      toast({ title: "Iniciando carga...", description: "Guardando datos de ejemplo en Firestore. Esto puede tardar un momento." });

      const { getReportsForSeeding } = await import('@/data/reports-data-processor');
      const reportsToSeed = getReportsForSeeding();
      
      const reportsCollection = collection(db, "reports");
      const batch = writeBatch(db);
      
      reportsToSeed.forEach(report => {
          const docRef = doc(reportsCollection, report.id); 
          batch.set(docRef, report);
      });

      try {
          await batch.commit();
          toast({ title: "Éxito", description: `${reportsToSeed.length} reportes han sido cargados a Firestore.`, variant: "default" });
      } catch (error) {
          console.error("Error seeding database: ", error);
          toast({ title: "Error en la Carga", description: "No se pudieron guardar los datos en la base de datos.", variant: "destructive" });
      } finally {
          setIsSeeding(false);
      }
  };


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
      let latestReport = reports.find(r => r.completedCurrentCycle === 'En curso');

      if (!latestReport) {
        latestReport = [...reports].sort((a, b) => {
          try {
            const dateAValid = a.completedCurrentCycle && a.completedCurrentCycle.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
            const dateBValid = b.completedCurrentCycle && b.completedCurrentCycle.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/);

            if (!dateAValid || a.completedCurrentCycle === 'Disponible') return 1;
            if (!dateBValid || b.completedCurrentCycle === 'Disponible') return -1;
            
            const dateA = new Date(a.completedCurrentCycle.split('/').reverse().join('-'));
            const dateB = new Date(b.completedCurrentCycle.split('/').reverse().join('-'));
            return dateB.getTime() - dateA.getTime();
          } catch(e) { return 0; }
        })[0];
      }
      
      if (latestReport) {
          const territoryDetails = allTerritories.find(t => t.number === territoryNumber);
          const isInProgress = latestReport.completedCurrentCycle === 'En curso';
          const lastCampaign = latestReport.campaigns[latestReport.campaigns.length - 1];

          let finalStatus: ReporteActividadData['status'] = 'Disponible';
          if (territoryDetails?.isBlocked) {
            finalStatus = 'Bloqueado';
          } else if (isInProgress) {
            finalStatus = 'En Curso';
          }
          
          let displayLastCompletedDate = "Nunca";
          if (!isInProgress && latestReport.completedCurrentCycle !== 'Disponible') {
            displayLastCompletedDate = latestReport.completedCurrentCycle;
          } else if (latestReport.lastCompletedHistoric && latestReport.lastCompletedHistoric !== "Nunca") {
            displayLastCompletedDate = latestReport.lastCompletedHistoric;
          }

          activityData.push({
            id: latestReport.id,
            territoryNumber: latestReport.territoryNumber.toString(),
            lastCompletedHistoric: displayLastCompletedDate,
            assignedTo: finalStatus === 'En Curso' ? lastCampaign?.assignedTo || "N/A" : "N/A",
            assignedDate: finalStatus === 'En Curso' ? lastCampaign?.assignedDate || "N/A" : "N/A",
            blocksWorked: finalStatus === 'En Curso' ? lastCampaign?.blocksWorked || "-" : "-",
            blocksPending: finalStatus === 'En Curso' ? lastCampaign?.blocksPending || "-" : "-",
            status: finalStatus,
            campaignHistory: latestReport.campaigns,
            blockReason: territoryDetails?.blockReason
          });
      }
    }
    
    return activityData.sort((a,b) => a.territoryNumber.localeCompare(b.territoryNumber, undefined, {numeric: true}));

  }, [filteredReports, allTerritories]);

  const processedS13Data: ConsolidatedS13Data[] = useMemo(() => {
    if (!Array.isArray(filteredReports)) return [];

    const groupedByTerritory = new Map<string, ReporteS13Data[]>();
    
    filteredReports
      .filter(report => report.completedCurrentCycle && !['En curso', 'Disponible'].includes(report.completedCurrentCycle))
      .forEach(report => {
        const cycleData = {
          id: report.id,
          territoryNumber: report.territoryNumber.toString(),
          lastCompletedHistoric: report.lastCompletedHistoric || "N/A",
          firstAssignedTo: report.campaigns[0]?.assignedTo || "N/A",
          firstAssignedDate: report.campaigns[0]?.assignedDate || "N/A",
          completedCurrentCycle: report.completedCurrentCycle,
          fullCampaignHistory: report.campaigns,
        };

        if (!groupedByTerritory.has(cycleData.territoryNumber)) {
            groupedByTerritory.set(cycleData.territoryNumber, []);
        }
        groupedByTerritory.get(cycleData.territoryNumber)!.push(cycleData);
    });

    const consolidatedData = Array.from(groupedByTerritory.entries()).map(([territoryNumber, cycles]) => {
        const sortedCycles = [...cycles].sort((a, b) => new Date(b.completedCurrentCycle.split('/').reverse().join('-')).getTime() - new Date(a.completedCurrentCycle.split('/').reverse().join('-')).getTime());
        return {
            territoryNumber: territoryNumber,
            lastCycle: sortedCycles[0] || undefined,
            penultimateCycle: sortedCycles[1] || undefined,
        };
    });

    return consolidatedData.sort((a,b) => a.territoryNumber.localeCompare(b.territoryNumber, undefined, {numeric: true}));
  }, [filteredReports]);


  const handleExportS13 = () => {
    const allCompletedCyclesForExport = filteredReports
      .filter(report => report.completedCurrentCycle !== 'En curso' && report.completedCurrentCycle !== 'Disponible')
      .map(report => ({
        id: report.id,
        territoryNumber: report.territoryNumber.toString(),
        lastCompletedHistoric: report.lastCompletedHistoric || "N/A",
        firstAssignedTo: report.campaigns[0]?.assignedTo || "N/A",
        firstAssignedDate: report.campaigns[0]?.assignedDate || "N/A",
        completedCurrentCycle: report.completedCurrentCycle,
        fullCampaignHistory: report.campaigns,
      }));

    if (allCompletedCyclesForExport.length === 0) {
      toast({ title: "Sin datos", description: "No hay datos de ciclos completados para exportar con los filtros actuales.", variant: "default" });
      return;
    }
    const csvData = allCompletedCyclesForExport.map(row => ({
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

  const isLoading = isLoadingReports || isLoadingTerritories;

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
           {allReports.length === 0 && !isLoading && (
              <Button onClick={handleSeedDatabase} disabled={isSeeding} variant="outline">
                {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isSeeding ? 'Cargando...' : 'Cargar Datos a Firestore'}
              </Button>
            )}
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
                Cada fila representa un territorio, mostrando sus últimos dos ciclos de trabajo completados.
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
