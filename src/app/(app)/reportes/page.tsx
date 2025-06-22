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
import { Input } from "@/components/ui/input";
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
import { Filter, FileText, Eye, History, Loader2, Pencil, AlertTriangle, BadgeCent, Star, User, Search, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";
import { collection, query, onSnapshot, doc, setDoc, Timestamp, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Territory, ReportEntry, CampaignAssignment, ProcessedDetailedReportView, S13TerritoryCycleSummary, S13TerritoryCycle } from "@/types";
import { format, parse, isValid as isDateValid, compareDesc, getYear as getYearFromDateFn } from "date-fns";
import { es } from "date-fns/locale";
import { EditReportEntryDialog } from "@/components/reportes/edit-report-entry-dialog";
import { AddReportManuallyDialog, type ManualReportSubmitData } from "@/components/reportes/add-report-manually-dialog";
import { historicalReportData } from '@/lib/reports-data';
import { Badge } from "@/components/ui/badge";
import { CycleHistoryDialog } from "@/components/reportes/cycle-history-dialog";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


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
  const [isViewActivityDialogOpen, setIsViewActivityDialogOpen] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<{ territory: Territory; report: ReportEntry } | null>(null);
  const [isAddManuallyDialogOpen, setIsAddManuallyDialogOpen] = useState(false);
  
  const [isCycleHistoryDialogOpen, setIsCycleHistoryDialogOpen] = useState(false);
  const [selectedTerritoryForHistory, setSelectedTerritoryForHistory] = useState<S13TerritoryCycleSummary | null>(null);

  // Filter states
  const [detailedSearchTerm, setDetailedSearchTerm] = useState("");
  const [s13SearchTerm, setS13SearchTerm] = useState("");


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
        const campaigns = (data.campaigns || []).map((c: any) => ({
          ...c,
          assignedDate: c.assignedDate instanceof Timestamp ? c.assignedDate.toDate() : (c.assignedDate ? new Date(c.assignedDate) : null),
        })).filter((c: any) => c.assignedDate && isDateValid(c.assignedDate));
        
        return {
          id: d.id,
          ...data,
          campaigns: campaigns,
          completedCurrentCycle: data.completedCurrentCycle instanceof Timestamp ? data.completedCurrentCycle.toDate() : null,
          lastCompletedHistoric: data.lastCompletedHistoric instanceof Timestamp ? data.lastCompletedHistoric.toDate() : (data.lastCompletedHistoric ? parse(data.lastCompletedHistoric, 'dd/MM/yyyy', new Date()) : null),
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

  const processedDetailedData = useMemo((): ProcessedDetailedReportView[] => {
    // 1. Create a map of historical assignments from the static file
    const historicalDataMap = new Map<string, any[]>();
    historicalReportData.forEach(item => {
        historicalDataMap.set(String(item.numeroTerritorio), item.asignaciones);
    });

    // 2. Process each territory
    const data: ProcessedDetailedReportView[] = allTerritories.map(territory => {
        const displayIdentifier = territory.number || 'S/N';
        const liveReport = allReports.find(r => r.territoryId === territory.id);
        
        // 3. Combine historical and live assignments
        const liveAssignments = liveReport?.campaigns || [];
        const historicalAssignments = (historicalDataMap.get(territory.number || '') || [])
            .map((a: any) => ({
                assignedTo: a.publicador,
                assignedDate: parse(a.fechaAsignacion, 'dd/MM/yyyy', new Date()),
                blocksWorked: a.manzanasTrabajadas,
                blocksPending: a.manzanasPendientes,
                completadoAsignacion: a.completadoAsignacion,
            }))
            .filter((a: any) => isDateValid(a.assignedDate));

        const allAssignments = [...liveAssignments, ...historicalAssignments]
            .sort((a, b) => compareDesc(a.assignedDate, b.assignedDate)); // Newest first

        // 4. Determine status and dates from the combined list
        if (allAssignments.length === 0) {
            return {
                id: `new-${territory.id}`,
                territoryId: territory.id, territoryNumber: displayIdentifier, name: territory.name,
                status: "Disponible", lastCycleCompletionDate: "N/A", campaignsForHistoryModal: [],
            };
        }

        const lastAssignment = allAssignments[0];
        const status = lastAssignment.completadoAsignacion ? "Disponible" : "En Curso";

        const lastCompletedAssignment = allAssignments.find(a => a.completadoAsignacion);
        const lastCycleCompletionDate = lastCompletedAssignment ? format(lastCompletedAssignment.assignedDate, "dd/MM/yyyy") : 'N/A';
        
        // Find the index of the last completed assignment
        const lastCompletionIndex = allAssignments.findIndex(a => a.completadoAsignacion);
        // The current cycle is everything BEFORE the last completion (since array is sorted newest to oldest)
        const campaignsForHistoryModal = lastCompletionIndex > -1 ? allAssignments.slice(0, lastCompletionIndex) : allAssignments;


        return {
            id: liveReport?.id || `historical-${territory.id}`,
            territoryId: territory.id,
            territoryNumber: displayIdentifier,
            name: territory.name,
            status,
            lastCycleCompletionDate,
            assignedTo: status === "En Curso" ? lastAssignment.assignedTo : null,
            assignedDate: status === "En Curso" ? format(lastAssignment.assignedDate, "dd/MM/yyyy") : null,
            blocksWorked: status === "En Curso" ? lastAssignment.blocksWorked : null,
            blocksPending: status === "En Curso" ? lastAssignment.blocksPending : null,
            campaignsForHistoryModal: campaignsForHistoryModal.reverse(), // reverse for chronological view in dialog
        };
    });

    const sortedData = data.sort((a,b) => a.territoryNumber.localeCompare(b.territoryNumber, undefined, { numeric: true }));

    if (!detailedSearchTerm) return sortedData;

    return sortedData.filter(report => 
        report.territoryNumber.toLowerCase().includes(detailedSearchTerm.toLowerCase()) ||
        report.name.toLowerCase().includes(detailedSearchTerm.toLowerCase()) ||
        report.status.toLowerCase().includes(detailedSearchTerm.toLowerCase())
    );
  }, [allTerritories, allReports, detailedSearchTerm]);
  
  const s13TerritorySummaries = useMemo((): S13TerritoryCycleSummary[] => {
    const data = allTerritories.map(territory => {
        const historicalCycles = historicalReportData
            .find(t => String(t.numeroTerritorio) === (territory.number || ''))
            ?.asignaciones.filter(a => a.completadoAsignacion)
            .map(a => ({
                completionDate: parse(a.fechaAsignacion, 'dd/MM/yyyy', new Date()),
                campaignName: a.esCampanaEspecial ? (a.nombreCampana || 'Campaña Especial') : null,
                completedBy: a.publicador || null,
            }))
            .filter(c => isDateValid(c.completionDate)) || [];

        const liveCycles: S13TerritoryCycle[] = [];
        const liveReport = allReports.find(r => r.territoryId === territory.id);
        if (liveReport) {
            liveReport.campaigns.forEach(campaign => {
                if (campaign.completadoAsignacion && campaign.assignedDate) {
                    liveCycles.push({
                        completionDate: campaign.assignedDate,
                        campaignName: null, // This info isn't in live report campaigns, could be added
                        completedBy: campaign.assignedTo,
                    });
                }
            });
        }
        
        const allCycles = [...historicalCycles, ...liveCycles]
            .sort((a, b) => compareDesc(a.completionDate, b.completionDate));

        const uniqueCycles = Array.from(new Map(allCycles.map(c => [c.completionDate.toISOString().split('T')[0], c])).values());

        const displayIdentifier = territory.number || 'S/N';

        return {
            territoryId: territory.id,
            territoryNumber: displayIdentifier,
            name: territory.name,
            latestCycle: uniqueCycles[0] || null,
            secondLatestCycle: uniqueCycles[1] || null,
            allCycles: uniqueCycles,
            cycleCount: uniqueCycles.length,
        };
    });
    
    const sortedData = data.sort((a,b) => a.territoryNumber.localeCompare(b.territoryNumber, undefined, { numeric: true }));

    if (!s13SearchTerm) return sortedData;

    return sortedData.filter(summary => 
      summary.territoryNumber.toLowerCase().includes(s13SearchTerm.toLowerCase()) ||
      summary.name.toLowerCase().includes(s13SearchTerm.toLowerCase()) ||
      (summary.latestCycle?.completedBy || '').toLowerCase().includes(s13SearchTerm.toLowerCase()) ||
      (summary.secondLatestCycle?.completedBy || '').toLowerCase().includes(s13SearchTerm.toLowerCase())
    );

  }, [allTerritories, allReports, s13SearchTerm]);


  const handleOpenViewActivityDialog = (territoryId: string) => {
    const territory = allTerritories.find(t => t.id === territoryId);
    if (!territory) return;

    const reportViewData = processedDetailedData.find(p => p.territoryId === territoryId);
    if (reportViewData && reportViewData.status === 'En Curso') {
        const tempReport: ReportEntry = {
            territoryId: territory.id,
            territoryNumber: territory.number || territory.name,
            status: 'En Curso',
            campaigns: reportViewData.campaignsForHistoryModal,
            lastCompletedHistoric: null,
            completedCurrentCycle: "En curso"
        };
        setSelectedReportData({ territory, report: tempReport });
        setIsViewActivityDialogOpen(true);
    } else {
        toast({ title: "Info", description: "Este territorio no tiene un ciclo activo para visualizar.", variant: "default"});
    }
  };
  
  const handleSaveManualReport = async (data: ManualReportSubmitData) => {
    const { territoryId, ...newAssignmentData } = data;
    const existingReport = allReports.find(r => r.territoryId === territoryId);
    const targetTerritory = allTerritories.find(t => t.id === territoryId);
    if (!targetTerritory) return;

    let finalReport: ReportEntry;

    if (!existingReport || existingReport.status === "Completado") {
        // Start a new cycle
        finalReport = {
            id: existingReport?.id, // Reuse ID if it exists to overwrite
            territoryId: territoryId,
            territoryNumber: targetTerritory.number || targetTerritory.name,
            lastCompletedHistoric: existingReport?.completedCurrentCycle instanceof Date ? existingReport.completedCurrentCycle : null,
            campaigns: [newAssignmentData],
            status: newAssignmentData.isCompleted ? "Completado" : "En Curso",
            completedCurrentCycle: newAssignmentData.isCompleted ? newAssignmentData.completionDate! : "En curso",
        };
    } else {
        // Append to existing cycle
        finalReport = {
            ...existingReport,
            campaigns: [...existingReport.campaigns, newAssignmentData],
            status: newAssignmentData.isCompleted ? "Completado" : "En Curso",
            completedCurrentCycle: newAssignmentData.isCompleted ? newAssignmentData.completionDate! : "En curso",
        };
    }
    
    const docId = finalReport.id || doc(collection(db, REPORTS_COLLECTION_NAME)).id;
    const reportRef = doc(db, REPORTS_COLLECTION_NAME, docId);

    const dataToSave = {
      ...finalReport,
      id: docId,
      lastCompletedHistoric: finalReport.lastCompletedHistoric ? Timestamp.fromDate(finalReport.lastCompletedHistoric) : null,
      completedCurrentCycle: finalReport.completedCurrentCycle instanceof Date ? Timestamp.fromDate(finalReport.completedCurrentCycle) : finalReport.completedCurrentCycle,
      campaigns: (finalReport.campaigns || []).map(c => ({
        ...c,
        assignedDate: c.assignedDate ? Timestamp.fromDate(c.assignedDate) : null,
        completadoAsignacion: c.isCompleted, // Ensure this field is mapped
      })),
      updatedAt: serverTimestamp(),
    };
    if (!finalReport.id) {
        (dataToSave as any).createdAt = serverTimestamp();
    }

    try {
      await setDoc(reportRef, dataToSave, { merge: true });
      toast({ title: "Reporte Guardado", description: `Se registró la actividad para el territorio ${targetTerritory.number || targetTerritory.name}.` });
      setIsAddManuallyDialogOpen(false);
    } catch (error) {
      console.error("Error saving manual report:", error);
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <CardTitle>Vista Detallada de Actividad</CardTitle>
                    <CardDescription>Consulta el estado actual de cada territorio. Registra nueva actividad manualmente.</CardDescription>
                  </div>
                  <Button onClick={() => setIsAddManuallyDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Registrar Actividad Manualmente
                  </Button>
                </div>
                 <div className="relative pt-4 w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-[-5px] h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filtrar por N°, nombre, estado..."
                        value={detailedSearchTerm}
                        onChange={(e) => setDetailedSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                  </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Terr.</TableHead>
                      <TableHead>Últ. Ciclo Completado</TableHead>
                      <TableHead>Estado Ciclo Actual</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedDetailedData.length > 0 ? processedDetailedData.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-semibold">{report.territoryNumber}</TableCell>
                        <TableCell>{report.lastCycleCompletionDate}</TableCell>
                        <TableCell>
                          <Badge variant={report.status === "Disponible" ? "default" : "outline"} className={report.status === "En Curso" ? "border-amber-500 text-amber-600" : ""}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {report.status === 'En Curso' && (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleOpenViewActivityDialog(report.territoryId)} className="h-8 w-8">
                                          <Pencil className="h-4 w-4 text-primary" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>Ver Actividad del Ciclo</p>
                                  </TooltipContent>
                              </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay territorios que coincidan con la búsqueda.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="s13Log" className="mt-4">
             <Card className="shadow-md">
              <CardHeader>
                  <CardTitle>Registro S-13 (Resumen de Ciclos)</CardTitle>
                  <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-3">
                    <CardDescription>Esta vista muestra los últimos dos ciclos completados por cada territorio.</CardDescription>
                     <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Filtrar por N°, publicador..."
                          value={s13SearchTerm}
                          onChange={(e) => setS13SearchTerm(e.target.value)}
                          className="pl-8 w-full sm:w-[250px]"
                        />
                    </div>
                  </div>
              </CardHeader>
               <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>N° Terr.</TableHead>
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
                                <TableCell className="font-semibold">{summary.territoryNumber}</TableCell>
                                <TableCell>
                                  {summary.latestCycle ? (
                                      <div className="flex flex-col gap-1">
                                          <span className="font-medium">{format(summary.latestCycle.completionDate, "dd/MM/yyyy")}</span>
                                          {summary.latestCycle.completedBy && <span className="text-xs text-muted-foreground flex items-center"><User className="mr-1 h-3 w-3"/>{summary.latestCycle.completedBy}</span>}
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
                                      <div className="flex flex-col gap-1">
                                          <span className="font-medium">{format(summary.secondLatestCycle.completionDate, "dd/MM/yyyy")}</span>
                                          {summary.secondLatestCycle.completedBy && <span className="text-xs text-muted-foreground flex items-center"><User className="mr-1 h-3 w-3"/>{summary.secondLatestCycle.completedBy}</span>}
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
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" onClick={() => handleOpenCycleHistoryDialog(summary)} className="h-8 w-8">
                                              <History className="h-4 w-4 text-primary"/>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Ver Historial Completo</p></TooltipContent>
                                      </Tooltip>
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
        
        {isViewActivityDialogOpen && selectedReportData && (
          <EditReportEntryDialog
            isOpen={isViewActivityDialogOpen}
            onOpenChange={setIsViewActivityDialogOpen}
            territory={selectedReportData.territory}
            activeReport={selectedReportData.report}
          />
        )}
        
        {isAddManuallyDialogOpen && (
           <AddReportManuallyDialog
            isOpen={isAddManuallyDialogOpen}
            onOpenChange={setIsAddManuallyDialogOpen}
            territories={allTerritories}
            onSave={handleSaveManualReport}
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
