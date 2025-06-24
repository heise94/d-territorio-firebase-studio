
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES, PERMISSIONS } from "@/lib/constants";
import { AlertTriangle, Edit, Loader2, FileText, History, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Territory, Assignment, ReportedAssignmentData } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ReportarPredicacionDialog } from "@/components/asignaciones/reportar-predicacion-dialog";

export default function EditorHistorialPage() {
  const { userProfile, isLoadingPermissions, hasPermission } = usePermissions();
  const { toast } = useToast();

  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [isLoadingTerritories, setIsLoadingTerritories] = useState(true);

  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null);
  const [territoryForDialog, setTerritoryForDialog] = useState<Territory | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // State for the new dialog (Step 1)
  const [isAddHistoricalDialogOpen, setIsAddHistoricalDialogOpen] = useState(false);
  
  useEffect(() => {
    setIsLoadingTerritories(true);
    const territoriesQuery = query(collection(db, "territories"));
    const unsubscribe = onSnapshot(territoriesQuery, (snapshot) => {
        setAllTerritories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Territory)).sort((a,b) => (a.number || a.name).localeCompare(b.number || b.name, undefined, {numeric: true})));
        setIsLoadingTerritories(false);
    }, (error) => {
        console.error("Error fetching territories:", error);
        toast({ title: "Error", description: "No se pudieron cargar los territorios.", variant: "destructive" });
        setIsLoadingTerritories(false);
    });
    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    if (!selectedTerritoryId) {
      setAssignments([]);
      return;
    }
    setIsLoadingAssignments(true);
    const assignmentsQuery = query(
      collection(db, "assignments"),
      where("locationId", "==", selectedTerritoryId),
      // orderBy("date", "desc") // This requires composite index, sorting client-side
    );
    const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
      const fetchedAssignments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
      fetchedAssignments.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
      setAssignments(fetchedAssignments);
      setIsLoadingAssignments(false);
    }, (error) => {
      console.error("Error fetching assignments for territory:", error);
      toast({ title: "Error", description: "No se pudieron cargar las asignaciones del territorio.", variant: "destructive" });
      setIsLoadingAssignments(false);
    });

    return () => unsubscribe();
  }, [selectedTerritoryId, toast]);

  const handleOpenEditDialog = async (assignment: Assignment) => {
    const territory = allTerritories.find(t => t.id === assignment.locationId);
    if (!territory) {
      toast({ title: "Error", description: "No se encontró el territorio para este reporte.", variant: "destructive" });
      return;
    }
    setTerritoryForDialog(territory);
    setAssignmentToEdit(assignment);
    setIsReportDialogOpen(true);
  };
  
  const handleReportSubmit = async (data: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'>) => {
    if (!assignmentToEdit || !userProfile?.firebaseAuthUid) {
      toast({ title: "Error", description: "No se pudo enviar el reporte. Datos incompletos.", variant: "destructive" });
      return;
    }
    
    const fullReportData: ReportedAssignmentData = {
      assignmentId: assignmentToEdit.id,
      reports: data.reports,
      generalNotes: data.generalNotes,
      reportedAt: Timestamp.now(),
      reportedByUserId: userProfile.firebaseAuthUid,
      additionalTerritorySelected: assignmentToEdit.additionalTerritorySelected ? true : false,
    };

    try {
      const batch = writeBatch(db);
      const assignmentRef = doc(db, "assignments", assignmentToEdit.id);
      batch.update(assignmentRef, {
        lastReportData: fullReportData,
        updatedAt: serverTimestamp()
      });

      data.reports.forEach(report => {
        if (report.territoryId && !report.territoryNotWorked) {
          const territoryRef = doc(db, "territories", report.territoryId);
          batch.update(territoryRef, {
            lastWorked: format(new Date(), "yyyy-MM-dd"),
            updatedAt: serverTimestamp()
          });
        }
      });
      
      await batch.commit();
      
      toast({
        title: "Reporte Modificado",
        description: `El reporte para "${assignmentToEdit.locationName}" ha sido guardado.`,
      });
    } catch (error) {
      console.error("Error modifying report:", error);
      toast({ title: "Error al Modificar Reporte", variant: "destructive" });
    } finally {
      setIsReportDialogOpen(false);
      setAssignmentToEdit(null);
      setTerritoryForDialog(null);
    }
  };


  const getWorkedBlocksDisplay = (reportData?: ReportedAssignmentData): React.ReactNode => {
    if (!reportData || !reportData.reports || reportData.reports.length === 0) return "No reportado";
    const report = reportData.reports.find(r => r.territoryId === selectedTerritoryId);
    if (!report) return "No reportado";
    if (report.territoryNotWorked) return <span className="text-amber-600">No trabajado</span>;
    if (!report.workedBlocksIds || report.workedBlocksIds.length === 0) return "Ninguna";
    return report.workedBlocksIds.map(id => id.split('-').pop()).join(', ');
  };


  if (isLoadingPermissions) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!hasPermission(PERMISSIONS.EDIT_REPORTS)) {
    return (
     <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/>Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tienes los permisos necesarios para acceder a esta herramienta de edición.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <Edit className="mr-3 h-8 w-8 text-primary" />
          Editor de Historial de Reportes
        </h1>
        <p className="text-muted-foreground mt-1">
          Selecciona un territorio para ver y corregir su historial de asignaciones y reportes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paso 1: Seleccionar Territorio</CardTitle>
          <CardDescription>
            Busca y selecciona el territorio cuyo historial deseas auditar o editar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTerritories ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            <Select onValueChange={setSelectedTerritoryId} value={selectedTerritoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un territorio..." />
              </SelectTrigger>
              <SelectContent>
                {allTerritories.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.type === 'urban' && t.number ? `U-${t.number}: ${t.name}` : t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedTerritoryId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <CardTitle>Paso 2: Historial de Asignaciones</CardTitle>
                <CardDescription>
                  Mostrando reportes para el territorio seleccionado. Edita o añade registros históricos.
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsAddHistoricalDialogOpen(true)}
                disabled={!selectedTerritoryId}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Registro
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAssignments ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : assignments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No hay asignaciones registradas para este territorio.</div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Publicador</TableHead>
                            <TableHead>Fecha Asignación</TableHead>
                            <TableHead>Fecha Reporte</TableHead>
                            <TableHead>Manzanas Trabajadas</TableHead>
                            <TableHead>Notas</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {assignments.map(assign => (
                            <TableRow key={assign.id}>
                            <TableCell>{assign.userName || "N/A"}</TableCell>
                            <TableCell>{format(parseISO(assign.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{assign.lastReportData?.reportedAt ? format((assign.lastReportData.reportedAt as Timestamp).toDate(), "dd/MM/yyyy") : "Sin reporte"}</TableCell>
                            <TableCell className="text-xs">{getWorkedBlocksDisplay(assign.lastReportData)}</TableCell>
                            <TableCell className="text-xs italic text-muted-foreground truncate max-w-xs" title={assign.lastReportData?.generalNotes}>
                                {assign.lastReportData?.generalNotes || "Sin notas"}
                            </TableCell>
                            <TableCell className="text-right">
                                {assign.lastReportData && (
                                <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(assign)}>
                                    <FileText className="mr-2 h-4 w-4" /> Editar Reporte
                                </Button>
                                )}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            )}
          </CardContent>
        </Card>
      )}

      {isReportDialogOpen && assignmentToEdit && (
        <ReportarPredicacionDialog
          isOpen={isReportDialogOpen}
          onOpenChange={setIsReportDialogOpen}
          assignment={assignmentToEdit}
          territory={territoryForDialog}
          onReportSubmit={handleReportSubmit}
          initialReportData={assignmentToEdit.lastReportData}
        />
      )}
    </div>
  );
}
