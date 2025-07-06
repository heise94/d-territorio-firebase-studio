"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES, PERMISSIONS } from "@/lib/constants";
import { AlertTriangle, Edit, Loader2, FileText, History, PlusCircle, Search, ChevronsUpDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, Timestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Territory, Assignment, ReportedAssignmentData, UserProfile, PreachingAssignedType } from "@/types";
import { format, parse, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { ReportarPredicacionDialog } from "@/components/asignaciones/reportar-predicacion-dialog";
import { AddHistoricalReportDialog, type HistoricalReportSubmitData } from "@/components/reportes/add-historical-report-dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function EditorHistorialPage() {
  const { userProfile, isLoadingPermissions, hasPermission } = usePermissions();
  const { toast } = useToast();

  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [allPublishers, setAllPublishers] = useState<UserProfile[]>([]);
  const [isLoadingTerritories, setIsLoadingTerritories] = useState(true);
  const [isLoadingPublishers, setIsLoadingPublishers] = useState(true);

  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null);
  const [territoryForDialog, setTerritoryForDialog] = useState<Territory | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [isAddHistoricalDialogOpen, setIsAddHistoricalDialogOpen] = useState(false);
  const [territorySearch, setTerritorySearch] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  useEffect(() => {
    setIsLoadingTerritories(true);
    const territoriesQuery = query(collection(db, "territories"));
    const unsubscribeTerritories = onSnapshot(territoriesQuery, (snapshot) => {
        setAllTerritories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Territory)).sort((a,b) => (a.number || a.name).localeCompare(b.number || b.name, undefined, {numeric: true})));
        setIsLoadingTerritories(false);
    }, (error) => {
        console.error("Error fetching territories:", error);
        toast({ title: "Error", description: "No se pudieron cargar los territorios.", variant: "destructive" });
        setIsLoadingTerritories(false);
    });

    setIsLoadingPublishers(true);
    const publishersQuery = query(collection(db, "users"), where("isAssignable", "==", true));
    const unsubscribePublishers = onSnapshot(publishersQuery, (snapshot) => {
        setAllPublishers(snapshot.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)));
        setIsLoadingPublishers(false);
    }, (error) => {
        console.error("Error fetching publishers:", error);
        toast({ title: "Error", description: "No se pudieron cargar los publicadores.", variant: "destructive" });
        setIsLoadingPublishers(false);
    });
    
    return () => {
      unsubscribeTerritories();
      unsubscribePublishers();
    };
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
    );
    const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
      const fetchedAssignments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
      fetchedAssignments.sort((a, b) => parse(b.date, "yyyy-MM-dd", new Date()).getTime() - parse(a.date, "yyyy-MM-dd", new Date()).getTime());
      setAssignments(fetchedAssignments);
      setIsLoadingAssignments(false);
    }, (error) => {
      console.error("Error fetching assignments for territory:", error);
      toast({ title: "Error", description: "No se pudieron cargar las asignaciones del territorio.", variant: "destructive" });
      setIsLoadingAssignments(false);
    });

    return () => unsubscribe();
  }, [selectedTerritoryId, toast]);

  const filteredTerritories = useMemo(() => {
    if (!territorySearch) {
      return allTerritories;
    }
    const searchTerm = territorySearch.toLowerCase();
    return allTerritories.filter(t => 
      (t.number && t.number.toLowerCase().includes(searchTerm)) ||
      (t.name && t.name.toLowerCase().includes(searchTerm))
    );
  }, [allTerritories, territorySearch]);

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
  
  const handleReportSubmit = async (data: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'> & { reportedAt?: Date }) => {
    if (!assignmentToEdit || !userProfile?.firebaseAuthUid) {
      toast({ title: "Error", description: "No se pudo enviar el reporte. Datos incompletos.", variant: "destructive" });
      return;
    }
    
    const reportDate = data.reportedAt
      ? Timestamp.fromDate(data.reportedAt)
      : Timestamp.fromDate(parse(assignmentToEdit.date, "yyyy-MM-dd", new Date()));

    const fullReportData: ReportedAssignmentData = {
      assignmentId: assignmentToEdit.id,
      reports: data.reports,
      generalNotes: data.generalNotes,
      reportedAt: reportDate,
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
            lastWorked: assignmentToEdit.date,
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

  const handleAddHistoricalReport = async (data: HistoricalReportSubmitData) => {
    if (!selectedTerritoryId || !userProfile?.firebaseAuthUid) {
      toast({ title: "Error", description: "Datos de sesión o territorio incompletos.", variant: "destructive" });
      return;
    }
    const territory = allTerritories.find(t => t.id === selectedTerritoryId);
    const publisher = allPublishers.find(p => p.id === data.publisherId);
    if (!territory || !publisher) {
       toast({ title: "Error", description: "Territorio o publicador no encontrado.", variant: "destructive" });
       return;
    }

    const batch = writeBatch(db);
    
    const newAssignmentRef = doc(collection(db, "assignments"));
    const newAssignmentData: Omit<Assignment, 'id'> = {
        date: format(data.assignmentDate, "yyyy-MM-dd"),
        time: "10:00", 
        type: territory.type === "urban" ? "publica" : "rural",
        locationName: territory.type === 'urban' && territory.number ? `U-${territory.number}` : territory.name,
        locationId: territory.id,
        status: "accepted",
        assignedBy: "Registro Histórico",
        userId: publisher.firebaseAuthUid || publisher.id,
        userName: publisher.name,
        userEmail: publisher.email,
        userPhoneNumber: publisher.phoneNumber || undefined,
        assignedGroupId: publisher.assignedGroupId || undefined,
        createdAt: Timestamp.fromDate(data.assignmentDate),
        updatedAt: Timestamp.now(),
    };
    
    const reportDetails: ReportedAssignmentData = {
        assignmentId: newAssignmentRef.id,
        reports: [{
            territoryId: territory.id,
            territoryName: territory.name,
            territoryNotWorked: data.territoryNotWorked,
            workedBlocksIds: data.workedBlocksIds || [],
        }],
        generalNotes: data.generalNotes,
        reportedAt: Timestamp.fromDate(data.assignmentDate),
        reportedByUserId: userProfile.firebaseAuthUid,
    };
    (newAssignmentData as any).lastReportData = reportDetails;
    
    batch.set(newAssignmentRef, newAssignmentData);

    if (!data.territoryNotWorked) {
        const territoryRef = doc(db, "territories", territory.id);
        batch.update(territoryRef, { lastWorked: format(data.assignmentDate, "yyyy-MM-dd") });
    }

    try {
        await batch.commit();
        toast({
            title: "Registro Histórico Añadido",
            description: `Se ha creado una nueva asignación para ${publisher.name} en el territorio ${territory.name}.`,
        });
    } catch(error) {
        console.error("Error adding historical record:", error);
        toast({ title: "Error al Guardar", description: "No se pudo añadir el registro histórico.", variant: "destructive" });
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
  
  const handleDeleteAssignment = (assignment: Assignment) => {
    setAssignmentToDelete(assignment);
    setIsDeleteConfirmOpen(true);
  };
  
  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      await deleteDoc(doc(db, "assignments", assignmentToDelete.id));
      toast({
        title: "Reporte Eliminado",
        description: `El reporte de ${assignmentToDelete.userName} ha sido eliminado.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el reporte.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteConfirmOpen(false);
      setAssignmentToDelete(null);
    }
  };

  const processedAssignments = useMemo(() => {
    const seen = new Set<string>();
    return assignments.map(assign => {
      const key = `${assign.userId}-${assign.date}`;
      if (seen.has(key)) {
        return { ...assign, isDuplicate: true };
      }
      seen.add(key);
      return { ...assign, isDuplicate: false };
    });
  }, [assignments]);


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

  const selectedTerritoryName = selectedTerritoryId
    ? allTerritories.find(t => t.id === selectedTerritoryId)?.name
    : "Selecciona un territorio...";
    
  const selectedTerritoryNumber = selectedTerritoryId
    ? allTerritories.find(t => t.id === selectedTerritoryId)?.number
    : "";
    
  const selectedTerritoryType = selectedTerritoryId
    ? allTerritories.find(t => t.id === selectedTerritoryId)?.type
    : "";

  const selectedTerritoryDisplayText = selectedTerritoryType === 'urban' && selectedTerritoryNumber 
    ? `U-${selectedTerritoryNumber}` 
    : selectedTerritoryName;

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
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={isComboboxOpen} className="w-full justify-between h-10">
                  {selectedTerritoryId ? selectedTerritoryDisplayText : "Selecciona un territorio..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por número o nombre..."
                        value={territorySearch}
                        onChange={(e) => setTerritorySearch(e.target.value)}
                        className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {filteredTerritories.length > 0 ? filteredTerritories.map(t => (
                        <Button
                            key={t.id}
                            variant="ghost"
                            className="w-full justify-start font-normal h-9"
                            onClick={() => {
                                setSelectedTerritoryId(t.id);
                                setTerritorySearch(""); // Clear search on select
                                setIsComboboxOpen(false);
                            }}
                        >
                            {t.type === 'urban' && t.number ? `U-${t.number}` : t.name}
                        </Button>
                    )) : (
                        <p className="p-4 text-center text-sm text-muted-foreground">No se encontraron territorios.</p>
                    )}
                </div>
              </PopoverContent>
            </Popover>
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
                disabled={!selectedTerritoryId || isLoadingPublishers}
              >
                {isLoadingPublishers ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
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
                        {processedAssignments.map(assign => {
                          const isPast = isBefore(parse(assign.date, "yyyy-MM-dd", new Date()), new Date());
                          return (
                            <TableRow key={assign.id} className={assign.isDuplicate ? "bg-destructive/10" : ""}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {assign.userName || "N/A"}
                                  {assign.isDuplicate && <Badge variant="destructive">Duplicado</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>{format(parse(assign.date, "yyyy-MM-dd", new Date()), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{assign.lastReportData?.reportedAt ? format((assign.lastReportData.reportedAt as Timestamp).toDate(), "dd/MM/yyyy") : "Sin reporte"}</TableCell>
                              <TableCell className="text-xs">{getWorkedBlocksDisplay(assign.lastReportData)}</TableCell>
                              <TableCell className="text-xs italic text-muted-foreground truncate max-w-xs" title={assign.lastReportData?.generalNotes}>
                                  {assign.lastReportData?.generalNotes || "Sin notas"}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end items-center gap-2">
                                {assign.lastReportData ? (
                                  <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(assign)}>
                                    <FileText className="mr-2 h-4 w-4" /> Editar
                                  </Button>
                                ) : (
                                  isPast && (
                                    <Button variant="secondary" size="sm" onClick={() => handleOpenEditDialog(assign)}>
                                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                                    </Button>
                                  )
                                )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleDeleteAssignment(assign)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Borrar
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción eliminará permanentemente el reporte de {assignmentToDelete?.userName} del {assignmentToDelete?.date}. No se podrá deshacer.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive hover:bg-destructive/90"
                                          onClick={confirmDeleteAssignment}
                                        >
                                          Sí, Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
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
          allowReportDateEdit={true}
        />
      )}
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                <AlertDialogDescription>
                    Se eliminará permanentemente la asignación de {assignmentToDelete?.userName} para el {assignmentToDelete?.date}. Esta acción no se puede deshacer.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAssignmentToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteAssignment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isAddHistoricalDialogOpen && (
        <AddHistoricalReportDialog 
          isOpen={isAddHistoricalDialogOpen}
          onOpenChange={setIsAddHistoricalDialogOpen}
          onAddHistoricalReport={handleAddHistoricalReport}
          territory={allTerritories.find(t => t.id === selectedTerritoryId) || null}
          allPublishers={allPublishers}
          existingAssignments={assignments}
        />
      )}

    </div>
  );
}
