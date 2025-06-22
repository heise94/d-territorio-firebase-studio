
// src/app/(app)/reportes/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Filter, FileText, Eye, History, Loader2, Pencil, AlertTriangle, BadgeCent, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";
import { collection, query, onSnapshot, doc, setDoc, Timestamp, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Territory, ReportEntry, CampaignAssignment, ProcessedDetailedReportView, S13TerritoryCycleSummary } from "@/types";
import { format, parse, isValid as isDateValid, compareDesc, getYear as getYearFromDateFn } from "date-fns";
import { es } from "date-fns/locale";
import { EditReportEntryDialog } from "@/components/reportes/edit-report-entry-dialog";
import { historicalReportData } from '@/lib/reports-data';
import { Badge } from "@/components/ui/badge";
import { CycleHistoryDialog } from "@/components/reportes/cycle-history-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";


const REPORTS_COLLECTION_NAME = "reports";

export default function ReportesPage() {
  const { toast } = useToast();
  const { hasPermission, isLoadingPermissions } = usePermissions();

  const [activeView, setActiveView] = useState<'detailedReports' | 's13Log'>('detailedReports');
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Data states
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [allReports, setAllReports] = useState<ReportEntry[]>([]);

  // Dialog states
  const [isReportEntryDialogOpen, setIsReportEntryDialogOpen] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<{ territory: Territory; report: ReportEntry | null } | null>(null);
  
  const [isCycleHistoryDialogOpen, setIsCycleHistoryDialogOpen] = useState(false);
  const [selectedTerritoryForHistory, setSelectedTerritoryForHistory] = useState<S13TerritoryCycleSummary | null>(null);


  useEffect(() => {
    if (isLoadingPermissions) return;
    if (!hasPermission(PERMISSIONS.VIEW_REPORTS)) {
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const territoriesQuery = query(collection(db, "territories"), orderBy("number", "asc"));
    const reportsQuery = query(collection(db, REPORTS_COLLECTION_NAME));

    const unsubscribeTerritories = onSnapshot(territoriesQuery, (snapshot) => {
      const fetchedTerritories = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Territory));
      setAllTerritories(fetchedTerritories);
    }, (error) => {
      console.error("Error fetching territories:", error);
      toast({ title: "Error al Cargar Territorios", variant: "destructive" });
    });

    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const fetchedReports = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          campaigns: (data.campaigns || []).map((c: any) => ({
            ...c,
            assignedDate: c.assignedDate instanceof Timestamp ? c.assignedDate.toDate() : (c.assignedDate ? new Date(c.assignedDate) : null),
          })),
          completedCurrentCycle: data.completedCurrentCycle instanceof Timestamp ? data.completedCurrentCycle.toDate() : data.completedCurrentCycle,
          lastCompletedHistoric: data.lastCompletedHistoric instanceof Timestamp ? data.lastCompletedHistoric.toDate() : data.lastCompletedHistoric,
        } as ReportEntry;
      });
      setAllReports(fetchedReports);
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      toast({ title: "Error al Cargar Reportes", variant: "destructive" });
      setIsLoadingData(false);
    });

    return () => {
      unsubscribeTerritories();
      unsubscribeReports();
    };
  }, [isLoadingPermissions, hasPermission, toast]);

  const processedDetailedData: ProcessedDetailedReportView[] = useMemo(() => {
    const historicalDataMap = new Map<string, any[]>();
    historicalReportData.forEach(item => {
      historicalDataMap.set(String(item.numeroTerritorio), item.asignaciones);
    });

    return allTerritories.map(territory => {
      const liveReport = allReports.find(r => r.territoryId === territory.id);

      if (liveReport) {
        const lastCampaign = liveReport.campaigns[liveReport.campaigns.length - 1];
        return {
          id: liveReport.id!,
          territoryId: territory.id,
          territoryNumber: territory.number || territory.name,
          name: territory.name,
          status: liveReport.status,
          lastCompletedDate: liveReport.lastCompletedHistoric ? format(liveReport.lastCompletedHistoric, "dd/MM/yyyy") : "N/A",
          assignedTo: lastCampaign?.assignedTo,
          assignedDate: lastCampaign?.assignedDate ? format(lastCampaign.assignedDate, "dd/MM/yyyy") : undefined,
          blocksWorked: lastCampaign?.blocksWorked,
          blocksPending: lastCampaign?.blocksPending,
          completedCurrentCycleDisplay: liveReport.completedCurrentCycle instanceof Date ? format(liveReport.completedCurrentCycle, "dd/MM/yyyy") : liveReport.completedCurrentCycle,
          campaignsForHistoryModal: liveReport.campaigns,
        };
      }

      const historicalAssignments = historicalDataMap.get(territory.number || '');
      if (historicalAssignments && historicalAssignments.length > 0) {
        const sortedAssignments = [...historicalAssignments].sort((a, b) => {
          const dateA = parse(a.fechaAsignacion, 'dd/MM/yyyy', new Date());
          const dateB = parse(b.fechaAsignacion, 'dd/MM/yyyy', new Date());
          return compareDesc(dateA, dateB);
        });

        const latestAssignment = sortedAssignments[0];
        const completedAssignments = sortedAssignments.filter(a => a.completadoAsignacion);

        const lastCompletedDate = completedAssignments.length > 1
          ? format(parse(completedAssignments[1].fechaAsignacion, 'dd/MM/yyyy', new Date()), "dd/MM/yyyy")
          : "N/A";

        const completedCurrentCycleDisplay = completedAssignments.length > 0
          ? format(parse(completedAssignments[0].fechaAsignacion, 'dd/MM/yyyy', new Date()), "dd/MM/yyyy")
          : "En curso";

        const status = latestAssignment.completadoAsignacion ? "Disponible" : "En Curso";

        return {
          id: `historical-${territory.id}`,
          territoryId: territory.id,
          territoryNumber: territory.number || territory.name,
          name: territory.name,
          status: status,
          lastCompletedDate: lastCompletedDate,
          assignedTo: latestAssignment.publicador,
          assignedDate: latestAssignment.fechaAsignacion,
          blocksWorked: latestAssignment.manzanasTrabajadas,
          blocksPending: latestAssignment.manzanasPendientes,
          completedCurrentCycleDisplay: completedCurrentCycleDisplay,
          campaignsForHistoryModal: sortedAssignments.map(a => ({
            assignedTo: a.publicador,
            assignedDate: parse(a.fechaAsignacion, 'dd/MM/yyyy', new Date()),
            blocksWorked: a.manzanasTrabajadas,
            blocksPending: a.manzanasPendientes,
            completadoAsignacion: a.completadoAsignacion,
          })),
        };
      }

      return {
        id: `new-${territory.id}`,
        territoryId: territory.id,
        territoryNumber: territory.number || territory.name,
        name: territory.name,
        status: "Disponible",
        lastCompletedDate: "N/A",
        completedCurrentCycleDisplay: "N/A",
        campaignsForHistoryModal: [],
      };
    });
  }, [allTerritories, allReports]);
  
  const s13TerritorySummaries = useMemo((): S13TerritoryCycleSummary[] => {
    return allTerritories.map(territory => {
        const historicalCycles = historicalReportData
            .find(t => String(t.numeroTerritorio) === (territory.number || ''))
            ?.asignaciones.filter(a => a.completadoAsignacion)
            .map(a => ({
                completionDate: parse(a.fechaAsignacion, 'dd/MM/yyyy', new Date()),
                campaignName: a.esCampanaEspecial ? (a.nombreCampana || 'Campaña Especial') : null
            }))
            .filter(c => isDateValid(c.completionDate)) || [];

        const liveReport = allReports.find(r => r.territoryId === territory.id);
        const liveCycles = liveReport?.completedCurrentCycle instanceof Date ? [{
            completionDate: liveReport.completedCurrentCycle,
            campaignName: null // This info is not in the live report currently, which is fine
        }] : [];
        
        const allCycles = [...historicalCycles, ...liveCycles]
            .sort((a, b) => compareDesc(a.completionDate, b.completionDate));

        return {
            territoryId: territory.id,
            territoryNumber: territory.number || 'N/A',
            name: territory.name,
            latestCycle: allCycles[0] || null,
            secondLatestCycle: allCycles[1] || null,
            allCycles: allCycles,
            cycleCount: allCycles.length,
        };
    });
  }, [allTerritories, allReports]);


  const handleOpenReportEntryDialog = (territoryId: string) => {
    const territory = allTerritories.find(t => t.id === territoryId);
    if (!territory) return;

    const liveReport = allReports.find(r => r.territoryId === territoryId);

    if (liveReport) {
      setSelectedReportData({ territory, report: liveReport });
    } else {
      const reportViewData = processedDetailedData.find(p => p.territoryId === territoryId);
      if (reportViewData && reportViewData.id.startsWith('historical-')) {
        const historicalCampaigns = reportViewData.campaignsForHistoryModal;
        const completedCampaigns = historicalCampaigns.filter(c => c.completadoAsignacion);

        const tempReport: ReportEntry = {
          territoryId: territory.id,
          territoryNumber: territory.number || territory.name,
          lastCompletedHistoric: completedCampaigns.length > 1 && completedCampaigns[1].assignedDate ? completedCampaigns[1].assignedDate : null,
          status: reportViewData.status === "Disponible" ? "Completado" : "En Curso",
          completedCurrentCycle: completedCampaigns.length > 0 && completedCampaigns[0].assignedDate ? completedCampaigns[0].assignedDate : "En curso",
          campaigns: historicalCampaigns,
        };
        setSelectedReportData({ territory, report: tempReport });
      } else {
        setSelectedReportData({ territory, report: null });
      }
    }
    
    setIsReportEntryDialogOpen(true);
  };
  
  const handleSaveReportData = async (data: ReportEntry) => {
    const docId = data.id || doc(collection(db, REPORTS_COLLECTION_NAME)).id;
    const reportRef = doc(db, REPORTS_COLLECTION_NAME, docId);

    const dataToSave = {
      ...data,
      id: docId,
      lastCompletedHistoric: data.lastCompletedHistoric ? Timestamp.fromDate(data.lastCompletedHistoric) : null,
      completedCurrentCycle: data.completedCurrentCycle instanceof Date ? Timestamp.fromDate(data.completedCurrentCycle) : data.completedCurrentCycle,
      campaigns: (data.campaigns || []).map(c => ({
        ...c,
        assignedDate: c.assignedDate ? Timestamp.fromDate(c.assignedDate) : null,
      })),
      updatedAt: serverTimestamp(),
    };
    if (!data.id) {
        (dataToSave as any).createdAt = serverTimestamp();
    }
    
    try {
      await setDoc(reportRef, dataToSave, { merge: true });
      toast({ title: "Reporte Guardado", description: `Se guardó la información para el territorio ${data.territoryNumber}.` });
      setIsReportEntryDialogOpen(false);
      setSelectedReportData(null);
    } catch (error) {
      console.error("Error saving report data:", error);
      toast({ title: "Error al Guardar", variant: "destructive" });
    }
  };
  
  const handleOpenCycleHistoryDialog = (territorySummary: S13TerritoryCycleSummary) => {
    setSelectedTerritoryForHistory(territorySummary);
    setIsCycleHistoryDialogOpen(true);
  };

  if (isLoadingPermissions || isLoadingData) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Cargando reportes...</p></div>;
  }

  if (!hasPermission(PERMISSIONS.VIEW_REPORTS)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-destructive">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes los permisos necesarios para ver esta sección de reportes.</p>
        <Button onClick={() => window.history.back()}>Volver</Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Reporte de Actividad de Territorios</h1>
            <p className="text-sm text-muted-foreground">Consulta y gestiona el historial de actividad de los territorios.</p>
          </div>
        </header>

        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'detailedReports' | 's13Log')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detailedReports">Registro de Actividad Detallado</TabsTrigger>
            <TabsTrigger value="s13Log">Registro S-13 (Resumen por Territorio)</TabsTrigger>
          </TabsList>
          <TabsContent value="detailedReports" className="mt-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Vista Detallada de Actividad</CardTitle>
                <CardDescription>Aquí puedes ver el estado actual de cada territorio y editar su reporte inicial.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Núm. Terr.</TableHead>
                      <TableHead>Últ. Completó (Hist.)</TableHead>
                      <TableHead>Asignado a (Actual)</TableHead>
                      <TableHead>Fecha Asig. (Actual)</TableHead>
                      <TableHead>Trabajado (Actual)</TableHead>
                      <TableHead>Pendiente (Actual)</TableHead>
                      <TableHead>Estado Ciclo Actual</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedDetailedData.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.territoryNumber}</TableCell>
                        <TableCell>{report.lastCompletedDate}</TableCell>
                        <TableCell>{report.assignedTo || '-'}</TableCell>
                        <TableCell>{report.assignedDate || '-'}</TableCell>
                        <TableCell>{report.blocksWorked || '-'}</TableCell>
                        <TableCell>{report.blocksPending ?? '-'}</TableCell>
                        <TableCell>{report.status}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenReportEntryDialog(report.territoryId)} className="h-8 w-8">
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {processedDetailedData.length === 0 && <TableRow><TableCell colSpan={8} className="h-24 text-center">No hay territorios para mostrar. Ve a la sección de Territorios para añadir algunos.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="s13Log" className="mt-4">
             <Card className="shadow-md">
              <CardHeader>
                  <CardTitle>Registro S-13 (Resumen de Ciclos)</CardTitle>
                  <CardDescription>Esta vista muestra los últimos dos ciclos completados por cada territorio.</CardDescription>
              </CardHeader>
               <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Territorio</TableHead>
                              <TableHead>Último Ciclo Completado</TableHead>
                              <TableHead>Ciclo Anterior</TableHead>
                              <TableHead className="text-center">Total Ciclos</TableHead>
                              <TableHead className="text-center">Acciones</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {s13TerritorySummaries.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay datos de ciclos completados para mostrar.</TableCell></TableRow>
                          ) : (
                            s13TerritorySummaries.map((summary) => (
                              <TableRow key={summary.territoryId}>
                                <TableCell className="font-medium">{summary.territoryNumber} - {summary.name}</TableCell>
                                <TableCell>
                                  {summary.latestCycle ? (
                                      <div className="flex flex-col">
                                          <span>{format(summary.latestCycle.completionDate, "dd/MM/yyyy")}</span>
                                          {summary.latestCycle.campaignName && (
                                              <Badge variant="outline" className="text-xs mt-1 w-fit bg-primary/10 border-primary/30 text-primary">
                                                  <Star className="mr-1 h-3 w-3"/> {summary.latestCycle.campaignName}
                                              </Badge>
                                          )}
                                      </div>
                                  ) : <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell>
                                   {summary.secondLatestCycle ? (
                                      <div className="flex flex-col">
                                          <span>{format(summary.secondLatestCycle.completionDate, "dd/MM/yyyy")}</span>
                                          {summary.secondLatestCycle.campaignName && (
                                              <Badge variant="outline" className="text-xs mt-1 w-fit bg-primary/10 border-primary/30 text-primary">
                                                  <Star className="mr-1 h-3 w-3"/> {summary.secondLatestCycle.campaignName}
                                              </Badge>
                                          )}
                                      </div>
                                  ) : <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell className="text-center">{summary.cycleCount}</TableCell>
                                <TableCell className="text-center">
                                  {summary.cycleCount > 0 && (
                                      <Button variant="ghost" size="icon" onClick={() => handleOpenCycleHistoryDialog(summary)} className="h-8 w-8">
                                          <History className="h-4 w-4 text-primary"/>
                                      </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                      </TableBody>
                  </Table>
               </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {isReportEntryDialogOpen && selectedReportData && (
          <EditReportEntryDialog
            isOpen={isReportEntryDialogOpen}
            onOpenChange={setIsReportEntryDialogOpen}
            territory={selectedReportData.territory}
            activeReport={selectedReportData.report}
            onSave={handleSaveReportData}
          />
        )}

        {isCycleHistoryDialogOpen && selectedTerritoryForHistory && (
          <CycleHistoryDialog
            isOpen={isCycleHistoryDialogOpen}
            onOpenChange={setIsCycleHistoryDialogOpen}
            territorySummary={selectedTerritoryForHistory}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
