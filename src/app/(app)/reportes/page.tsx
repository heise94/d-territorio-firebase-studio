
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Filter, FileText, Eye, History, Loader2, Pencil, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";
import { collection, query, onSnapshot, doc, setDoc, Timestamp, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Territory, ReportEntry, CampaignAssignment, S13CycleDetail, ProcessedDetailedReportView } from "@/types";
import { format, parse, isValid as isDateValid, compareDesc, getYear as getYearFromDateFn } from "date-fns";
import { EditReportEntryDialog } from "@/components/reportes/edit-report-entry-dialog";


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
  
  const [isCampaignHistoryModalOpen, setIsCampaignHistoryModalOpen] = useState(false);
  const [selectedReportForCampaignHistory, setSelectedReportForCampaignHistory] = useState<ReportEntry | null>(null);


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
    return allTerritories.map(territory => {
      const reportsForTerritory = allReports.filter(r => r.territoryId === territory.id);
      const activeReport = reportsForTerritory.find(r => r.status === 'En Curso');
      
      if (activeReport) {
        const lastCampaign = activeReport.campaigns[activeReport.campaigns.length - 1];
        return {
          id: activeReport.id,
          territoryId: territory.id,
          territoryNumber: territory.number || territory.name,
          status: "En Curso",
          lastCompletedDate: activeReport.lastCompletedHistoric ? format(activeReport.lastCompletedHistoric, "dd/MM/yyyy") : "N/A",
          assignedTo: lastCampaign?.assignedTo,
          assignedDate: lastCampaign?.assignedDate ? format(lastCampaign.assignedDate, "dd/MM/yyyy") : undefined,
          blocksWorked: lastCampaign?.blocksWorked,
          blocksPending: lastCampaign?.blocksPending,
          completedCurrentCycleDisplay: "En curso",
          campaignsForHistoryModal: activeReport.campaigns,
        };
      }
      
      const mostRecentlyCompleted = reportsForTerritory
        .filter(r => r.status === "Completado" && r.completedCurrentCycle)
        .sort((a, b) => compareDesc(a.completedCurrentCycle as Date, b.completedCurrentCycle as Date))[0];

      return {
        id: mostRecentlyCompleted?.id || territory.id,
        territoryId: territory.id,
        territoryNumber: territory.number || territory.name,
        status: "Disponible",
        lastCompletedDate: mostRecentlyCompleted?.completedCurrentCycle ? format(mostRecentlyCompleted.completedCurrentCycle, "dd/MM/yyyy") : "N/A",
        completedCurrentCycleDisplay: mostRecentlyCompleted?.completedCurrentCycle ? format(mostRecentlyCompleted.completedCurrentCycle, "dd/MM/yyyy") : "N/A",
        campaignsForHistoryModal: mostRecentlyCompleted?.campaigns || [],
      };
    });
  }, [allTerritories, allReports]);
  
  const handleOpenReportEntryDialog = (territoryId: string) => {
    const territory = allTerritories.find(t => t.id === territoryId);
    if (!territory) return;

    const activeReport = allReports.find(r => r.territoryId === territoryId && r.status === 'En Curso') || null;
    setSelectedReportData({ territory, report: activeReport });
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
          <TabsTrigger value="s13Log">Registro S-13 (Completados)</TabsTrigger>
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
                        <Button variant="ghost" size="icon" onClick={() => { 
                            const originalReport = allReports.find(r => r.id === report.id);
                            if (originalReport) {
                                setSelectedReportForCampaignHistory(originalReport); 
                                setIsCampaignHistoryModalOpen(true);
                            }
                        }} className="h-8 w-8">
                          <Eye className="h-4 w-4 text-primary" />
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
                <CardTitle>Vista S-13 (Ciclos Completados)</CardTitle>
                <CardDescription>Esta vista se llenará a medida que se completen los ciclos de trabajo.</CardDescription>
            </CardHeader>
             <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Territorio</TableHead><TableHead>Fecha Completado</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow><TableCell colSpan={2} className="h-24 text-center">No hay datos S-13 para mostrar.</TableCell></TableRow>
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

      {selectedReportForCampaignHistory && (
        <Dialog open={isCampaignHistoryModalOpen} onOpenChange={setIsCampaignHistoryModalOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Historial de Campañas del Ciclo: {selectedReportForCampaignHistory.territoryNumber}</DialogTitle>
              <DialogDescriptionComponent>Detalle de las asignaciones dentro de este ciclo de trabajo.</DialogDescriptionComponent>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto py-4">
              <Table>
                <TableHeader><TableRow><TableHead>Asignado a</TableHead><TableHead>Fecha Asignó</TableHead><TableHead>Trabajado</TableHead><TableHead>Pendiente</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedReportForCampaignHistory.campaigns.map((campaign, index) => (
                    <TableRow key={index}><TableCell>{campaign.assignedTo || '-'}</TableCell><TableCell>{campaign.assignedDate ? format(campaign.assignedDate, "dd/MM/yyyy") : '-'}</TableCell><TableCell>{campaign.blocksWorked || '-'}</TableCell><TableCell>{campaign.blocksPending ?? '-'}</TableCell></TableRow>
                  ))}
                   {selectedReportForCampaignHistory.campaigns.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No hay campañas en este ciclo.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
