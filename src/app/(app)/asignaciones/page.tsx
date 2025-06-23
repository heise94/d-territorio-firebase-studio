
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  HelpCircle,
  ListChecks,
  MountainSnow,
  Send,
  ThumbsUp,
  ThumbsDown,
  UserMinus,
  UserCheck as UserCheckIcon,
  Users,
  Video,
  XCircle,
  CalendarX2,
  Clock,
  FileText, 
  Edit,
  FileWarning,
  Info, 
  PlusCircle,
  Map as MapIconLucide,
  Loader2,
} from "lucide-react";
import { format, parse, differenceInHours, isBefore, addHours, startOfDay, differenceInMinutes, subDays, subHours, addMinutes, getMonth, getYear, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Territory, ReportedAssignmentData, UserAssignment, SingleTerritoryReportDetails, AdditionalTerritoryInfo, TerritoryType } from "@/types";
import { ReportarPredicacionDialog } from "@/components/asignaciones/reportar-predicacion-dialog";
import { SolicitarTerritorioDialog } from "@/components/asignaciones/solicitar-territorio-dialog";
import { Timestamp, collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, getDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePermissions } from "@/hooks/use-permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"; 
import { Skeleton } from "@/components/ui/skeleton";

export default function MisAsignacionesPage() {
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const { toast } = useToast();
  const { userProfile, isLoadingPermissions } = usePermissions();

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [assignmentToReport, setAssignmentToReport] = useState<UserAssignment | null>(null);
  const [territoryForReport, setTerritoryForReport] = useState<Territory | null>(null); // Main territory for report dialog
  const [initialReportDataForDialog, setInitialReportDataForDialog] = useState<Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'> | null>(null);
  
  const [isSolicitarTerritorioDialogOpen, setIsSolicitarTerritorioDialogOpen] = useState(false);
  const [assignmentForTerritorioAdicional, setAssignmentForTerritorioAdicional] = useState<UserAssignment | null>(null);
  
  const [activeTab, setActiveTab] = useState("activas");
  const currentFilterYear = new Date().getFullYear();
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<number>(new Date().getMonth());
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<number>(currentFilterYear);

  const monthsForFilter = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i), "MMMM", { locale: es }) })), []);
  const yearsForFilter = useMemo(() => Array.from({ length: 5 }, (_, i) => currentFilterYear - 2 + i), [currentFilterYear]);

  useEffect(() => {
    if (isLoadingPermissions || !userProfile?.firebaseAuthUid) {
      if (!isLoadingPermissions && !userProfile?.firebaseAuthUid) {
        setIsLoadingAssignments(false); // Not loading if no user
      }
      return;
    }
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingAssignments(false);
      return;
    }

    setIsLoadingAssignments(true);
    const assignmentsCollectionRef = collection(db, "assignments");
    // The query was changed to remove orderBy clauses to avoid needing a composite index.
    // Sorting is now handled on the client-side after fetching the data.
    const q = query(
      assignmentsCollectionRef,
      where("userId", "==", userProfile.firebaseAuthUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAssignments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure lastReportData.reportedAt is a Timestamp if it exists
          lastReportData: data.lastReportData 
            ? { 
                ...data.lastReportData, 
                reportedAt: data.lastReportData.reportedAt instanceof Timestamp 
                                ? data.lastReportData.reportedAt 
                                : Timestamp.fromDate(new Date(data.lastReportData.reportedAt)) // Fallback if stored as string
              } 
            : undefined,
        } as UserAssignment;
      });

      // Client-side sorting to replace Firestore's orderBy
      fetchedAssignments.sort((a, b) => {
        const aDateTime = `${a.date} ${a.time}`;
        const bDateTime = `${b.date} ${b.time}`;
        if (aDateTime > bDateTime) return -1; // For descending order
        if (aDateTime < bDateTime) return 1;
        return 0;
      });
      
      setAssignments(fetchedAssignments);
      setIsLoadingAssignments(false);
    }, (error) => {
      console.error("Error fetching assignments:", error);
      toast({ title: "Error al Cargar Asignaciones", description: "No se pudieron cargar tus asignaciones.", variant: "destructive" });
      setIsLoadingAssignments(false);
    });

    return () => unsubscribe();
  }, [userProfile?.firebaseAuthUid, toast, isLoadingPermissions]);


  const handleUpdateStatus = async (assignmentId: string, newStatus: UserAssignment["status"]) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
      return;
    }
    const assignmentRef = doc(db, "assignments", assignmentId);
    try {
      await updateDoc(assignmentRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Estado Actualizado",
        description: `La asignación ha sido marcada como "${newStatus.replace("_", " ")}".`,
        variant: newStatus === "accepted" ? "default" : newStatus === "rejected" ? "destructive" : "default"
      });
    } catch (error) {
      console.error("Error updating assignment status:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar el estado de la asignación.", variant: "destructive" });
    }
  };
  
  const handleRequestReplacement = (assignmentId: string) => {
    handleUpdateStatus(assignmentId, 'replacement_requested');
  };

  const canRequestReplacement = (assignmentDate: string, assignmentTime: string): {canRequest: boolean; deadline: Date | null; tooLate: boolean } => {
    try {
      const assignmentDateTime = parse(`${assignmentDate} ${assignmentTime}`, "yyyy-MM-dd HH:mm", new Date());
      if (isNaN(assignmentDateTime.getTime())) return { canRequest: false, deadline: null, tooLate: false };
      
      const now = new Date();
      const hoursUntilAssignment = differenceInHours(assignmentDateTime, now);
      const deadlineForRequest = addHours(assignmentDateTime, -16);

      return {
        canRequest: hoursUntilAssignment >= 16,
        deadline: deadlineForRequest,
        tooLate: isBefore(assignmentDateTime, now) || hoursUntilAssignment < 16
      };
    } catch (error) {
      console.error("Error parsing date/time for replacement check:", error);
      return { canRequest: false, deadline: null, tooLate: false };
    }
  };

  const canEditReport = (reportedAtTimestamp?: Timestamp): boolean => {
    if (!reportedAtTimestamp) return false;
    const reportedAtDate = reportedAtTimestamp.toDate();
    const now = new Date();
    const minutesDifference = differenceInMinutes(now, reportedAtDate);
    return minutesDifference < 60; 
  };

  const handleOpenReportDialog = async (assignment: UserAssignment, existingReportData?: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'> | null) => {
    if ((assignment.type === 'publica' || assignment.type === 'rural') && assignment.locationId) {
        try {
            const territoryDocRef = doc(db, "territories", assignment.locationId);
            const territorySnap = await getDoc(territoryDocRef);
            if (territorySnap.exists()) {
                setTerritoryForReport({ id: territorySnap.id, ...territorySnap.data() } as Territory);
            } else {
                 toast({ title: "Territorio no encontrado", description: "No se encontraron los detalles completos del territorio principal.", variant: "default" });
                 setTerritoryForReport(null);
            }
        } catch (error) {
            console.error("Error fetching territory details for report:", error);
            toast({ title: "Error al Cargar Territorio", description: "No se pudieron obtener los detalles del territorio.", variant: "destructive" });
            setTerritoryForReport(null);
        }
    } else {
        setTerritoryForReport(null); 
    }
    
    setAssignmentToReport(assignment);
    setInitialReportDataForDialog(existingReportData || null);
    setIsReportDialogOpen(true);
  };

  const handleReportSubmit = async (data: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'>) => {
    if (!assignmentToReport || !userProfile?.firebaseAuthUid || !db || Object.keys(db).length === 0) {
        toast({ title: "Error", description: "No se pudo enviar el reporte. Datos incompletos o error de conexión.", variant: "destructive"});
        return;
    }
    const isEditing = !!initialReportDataForDialog;
    
    const fullReportData: ReportedAssignmentData = {
        assignmentId: assignmentToReport.id,
        reports: data.reports,
        generalNotes: data.generalNotes,
        reportedAt: Timestamp.now(), 
        reportedByUserId: userProfile.firebaseAuthUid,
        additionalTerritorySelected: !!assignmentToReport.additionalTerritorySelected,
    };
    
    try {
        const batch = writeBatch(db);
        
        // 1. Update the assignment document with the report data
        const assignmentRef = doc(db, "assignments", assignmentToReport.id);
        batch.update(assignmentRef, {
            lastReportData: fullReportData,
            updatedAt: serverTimestamp()
        });

        // 2. Update the 'lastWorked' date for each reported territory
        data.reports.forEach(report => {
            if (report.territoryId && !report.territoryNotWorked) { // Only update if it was actually worked
                const territoryRef = doc(db, "territories", report.territoryId);
                batch.update(territoryRef, {
                    lastWorked: format(new Date(), "yyyy-MM-dd"),
                    updatedAt: serverTimestamp()
                });
            }
        });
        
        await batch.commit();
        
        let reportSummary = `${isEditing ? 'Reporte modificado' : 'Reporte enviado'} para "${assignmentToReport.locationName}".`;
        // Additional summary logic can be added here if needed...
        
        toast({
          title: isEditing ? "Reporte Modificado" : "Reporte Enviado",
          description: reportSummary,
          duration: 7000,
        });
    } catch (error) {
        console.error("Error submitting report and updating territories:", error);
        toast({ title: "Error al Enviar Reporte", description: "No se pudo guardar el reporte o actualizar los territorios.", variant: "destructive"});
    } finally {
        setIsReportDialogOpen(false);
        setInitialReportDataForDialog(null); 
    }
  };

  const handleOpenSolicitarTerritorioDialog = (assignment: UserAssignment) => {
    setAssignmentForTerritorioAdicional(assignment);
    setIsSolicitarTerritorioDialogOpen(true);
  };

  const handleTerritorioAdicionalSelected = async (selectedTerritory: AdditionalTerritoryInfo) => {
    if (!assignmentForTerritorioAdicional || !db || Object.keys(db).length === 0) return;
    const assignmentRef = doc(db, "assignments", assignmentForTerritorioAdicional.id);
    try {
      await updateDoc(assignmentRef, {
        additionalTerritorySelected: selectedTerritory,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Territorio Adicional Añadido",
        description: `Se ha añadido "${selectedTerritory.name}" a tu asignación actual. Recuerda reportar ambos.`
      });
    } catch (error) {
        console.error("Error adding additional territory:", error);
        toast({ title: "Error", description: "No se pudo añadir el territorio adicional.", variant: "destructive" });
    } finally {
        setIsSolicitarTerritorioDialogOpen(false);
        setAssignmentForTerritorioAdicional(null);
    }
  };


  const activeAssignments = useMemo(() => {
    return assignments
      .filter(a => {
        const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
        const isPast = isBefore(assignmentDateTime, new Date());

        if (!isPast) { 
          return a.status === 'pending' || a.status === 'accepted' || a.status === 'replacement_requested';
        } else { 
          if (a.status === 'accepted') {
            return !a.lastReportData || (a.lastReportData && canEditReport(a.lastReportData.reportedAt));
          }
          return false;
        }
      })
      .sort((a, b) => {
        const aDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
        const bDateTime = parse(`${b.date} ${b.time}`, "yyyy-MM-dd HH:mm", new Date());
        
        const aIsPast = isBefore(aDateTime, new Date());
        const bIsPast = isBefore(bDateTime, new Date());

        const aIsReportable = (a.type === 'publica' || a.type === 'rural') && a.status === 'accepted';
        const bIsReportable = (b.type === 'publica' || b.type === 'rural') && b.status === 'accepted';

        const aIsPendingReport = aIsPast && aIsReportable && !a.lastReportData;
        const bIsPendingReport = bIsPast && bIsReportable && !b.lastReportData;

        if (aIsPendingReport && !bIsPendingReport) return -1;
        if (!aIsPendingReport && bIsPendingReport) return 1;
        
        if (aDateTime < bDateTime) return -1;
        if (aDateTime > bDateTime) return 1;
        return 0;
      });
  }, [assignments]);

  const historyAssignments = useMemo(() => {
    return assignments
      .filter(a => {
        const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
        const isPast = isBefore(assignmentDateTime, new Date());

        if (a.status === 'rejected' || a.status === 'replacement_covered' || (a.status as string) === 'cancelled_by_admin') {
          return true;
        }
        if (isPast && a.status === 'accepted' && a.lastReportData && !canEditReport(a.lastReportData.reportedAt)) {
          return true;
        }
        if (isPast && (a.status === 'pending' || a.status === 'replacement_requested')) {
            return true;
        }
        return false;
      })
      .filter(a => { 
        const assignmentDate = parse(a.date, "yyyy-MM-dd", new Date());
        return getMonth(assignmentDate) === selectedHistoryMonth && getYear(assignmentDate) === selectedHistoryYear;
      })
      .sort((a,b) => { 
         const aDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
         const bDateTime = parse(`${b.date} ${b.time}`, "yyyy-MM-dd HH:mm", new Date());
         return bDateTime.getTime() - aDateTime.getTime();
      });
  }, [assignments, selectedHistoryMonth, selectedHistoryYear]);

  const pendingAcceptanceCount = useMemo(() => {
    return activeAssignments.filter(a => {
        const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
        return a.status === 'pending' && !isBefore(assignmentDateTime, new Date());
    }).length;
  }, [activeAssignments]);

  const pendingReportCount = useMemo(() => {
    return activeAssignments.filter(a => {
      const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
      const isPastAssignment = isBefore(assignmentDateTime, new Date());
      const isReportableType = a.type === 'publica' || a.type === 'rural';
      return isPastAssignment && isReportableType && a.status === 'accepted' && !a.lastReportData;
    }).length;
  }, [activeAssignments]);

  if (isLoadingPermissions || isLoadingAssignments) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <ListChecks className="mr-3 h-8 w-8 text-primary" />
          Mis Asignaciones
        </h1>
        <p className="text-muted-foreground mt-1">Cargando tus asignaciones...</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
                    <CardContent className="space-y-2 pt-2 pb-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></CardContent>
                    <CardFooter className="border-t pt-4 grid grid-cols-2 gap-2"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></CardFooter>
                </Card>
            ))}
        </div>
      </div>
    );
  }


  return (
    <TooltipProvider>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <ListChecks className="mr-3 h-8 w-8 text-primary" />
          Mis Asignaciones
        </h1>
        <p className="text-muted-foreground mt-1">
          Revisa y gestiona tus asignaciones de predicación. Puedes aceptarlas, rechazarlas, solicitar un reemplazo o reportar tu actividad.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="activas">Activas y Pendientes de Reporte</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="activas">
          {(pendingAcceptanceCount > 0 || pendingReportCount > 0) && (
            <Alert variant="default" className="mb-6 bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700/40 dark:text-blue-300">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="font-semibold">Atención</AlertTitle>
                <AlertDescription>
                    {pendingAcceptanceCount > 0 && (
                        <p>
                        Tienes {pendingAcceptanceCount} asignación{pendingAcceptanceCount === 1 ? '' : 'es'} pendiente{pendingAcceptanceCount === 1 ? '' : 's'} de aceptar o rechazar.
                        </p>
                    )}
                    {pendingReportCount > 0 && (
                        <p className={pendingAcceptanceCount > 0 ? "mt-1" : ""}> 
                        {pendingAcceptanceCount === 0 ? 'Tienes ' : 'Además, tienes '}
                        {pendingReportCount} asignación{pendingReportCount === 1 ? '' : 'es'} pendiente{pendingReportCount === 1 ? '' : 's'} de reportar.
                        </p>
                    )}
                </AlertDescription>
            </Alert>
          )}

          {activeAssignments.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
                    <CalendarCheck className="h-20 w-20 text-muted-foreground/70 mb-6" />
                    <p className="text-xl font-medium text-muted-foreground mb-2">¡Todo al día!</p>
                    <p className="text-sm text-muted-foreground">
                        No tienes asignaciones activas o pendientes de reporte en este momento.
                    </p>
                </div>
              </CardContent>
            </Card>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAssignments.map((assign) => {
                  const { canRequest, deadline, tooLate } = canRequestReplacement(assign.date, assign.time);
                  const assignmentDateTime = parse(`${assign.date} ${assign.time}`, "yyyy-MM-dd HH:mm", new Date());
                  const isPastAssignment = isBefore(assignmentDateTime, new Date());
                  const isTodayAssignment = isSameDay(assignmentDateTime, new Date());
                  
                  const isReportableType = assign.type === 'publica' || assign.type === 'rural';
                  const isPendingReport = isPastAssignment && isReportableType && assign.status === 'accepted' && !assign.lastReportData;
                  const canSolicitarTerritorio = assign.status === 'accepted' && isTodayAssignment && isReportableType && !assign.lastReportData && !assign.additionalTerritorySelected;

                  
                  const cardBaseClass = "shadow-md hover:shadow-lg transition-shadow";
                  let cardBgClass = 'bg-card';
                  if (isPendingReport) {
                    cardBgClass = 'bg-amber-50 border-amber-400 dark:bg-amber-900/20 dark:border-amber-700/40';
                  }

                  return (
                    <Card key={assign.id} className={`${cardBaseClass} ${cardBgClass}`}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-semibold flex items-center">
                            <PreachingTypeIcon type={assign.type} className="mr-2 text-primary" />
                            {assign.locationName}
                            {assign.additionalTerritorySelected && <span className="ml-1 text-sm font-normal text-muted-foreground">(+1 Adicional)</span>}
                          </CardTitle>
                          <StatusBadge status={assign.status} />
                        </div>
                        <CardDescription className="text-sm pt-1">
                          {format(assignmentDateTime, "EEEE, dd 'de' MMMM 'de' yyyy 'a las' HH:mm 'hrs.'", { locale: es })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs text-muted-foreground pt-1 pb-3">
                         <p><span className="font-medium">Tipo:</span> <span className="capitalize">{assign.type}</span></p>
                         {assign.additionalTerritorySelected && <p><span className="font-medium">Terr. Adicional:</span> {assign.additionalTerritorySelected.name}</p>}
                        {assign.assignedBy && <p><span className="font-medium">Asignado por:</span> {assign.assignedBy}</p>}
                        {assign.notes && <p><span className="font-medium">Notas:</span> <em className="text-foreground/80">{assign.notes}</em></p>}
                         {isPendingReport && (
                            <p className="text-amber-700 dark:text-amber-300 font-semibold flex items-center mt-2">
                                <AlertTriangle className="h-4 w-4 mr-1.5" /> ¡Esta asignación está pendiente de reporte!
                            </p>
                        )}
                        {assign.lastReportData && assign.lastReportData.reportedAt && (
                             <p className="text-green-600 dark:text-green-400 font-medium flex items-center mt-2">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Reporte enviado el {format(assign.lastReportData.reportedAt.toDate(), "dd/MM HH:mm", { locale: es })}.
                            </p>
                        )}
                      </CardContent>
                      <CardFooter className="border-t pt-4 grid grid-cols-2 gap-2">
                        {assign.status === 'pending' && !isPastAssignment && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateStatus(assign.id, 'accepted')}>
                              <ThumbsUp className="mr-2 h-4 w-4" /> Aceptar
                            </Button>
                            <Button size="sm" variant="destructive" className="hover:bg-red-700/90" onClick={() => handleUpdateStatus(assign.id, 'rejected')}>
                              <ThumbsDown className="mr-2 h-4 w-4" /> Rechazar
                            </Button>
                          </>
                        )}
                        {assign.status === 'accepted' && !isPastAssignment && (
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <div className="col-span-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-600 disabled:opacity-70"
                                  onClick={() => handleRequestReplacement(assign.id)}
                                  disabled={!canRequest || tooLate}
                                >
                                  <UserMinus className="mr-2 h-4 w-4" /> Solicitar Reemplazo
                                </Button>
                              </div>
                            </TooltipTrigger>
                            {(!canRequest && deadline && !tooLate) && (
                              <TooltipContent side="bottom">
                                <p className="text-xs">Puedes solicitar hasta el {format(deadline, "dd/MM HH:mm", { locale: es })} hrs.</p>
                              </TooltipContent>
                            )}
                            {tooLate && (
                              <TooltipContent side="bottom" className="bg-destructive text-destructive-foreground">
                                <p className="text-xs">El plazo para solicitar reemplazo ha expirado.</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )}
                        
                        {canSolicitarTerritorio && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="col-span-2 text-indigo-600 border-indigo-500 hover:bg-indigo-500/10"
                                onClick={() => handleOpenSolicitarTerritorioDialog(assign)}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Solicitar + Territorio
                            </Button>
                        )}

                        {isReportableType && (isPastAssignment || isTodayAssignment) && assign.status === 'accepted' ? (
                          assign.lastReportData && assign.lastReportData.reportedAt ? (
                            canEditReport(assign.lastReportData.reportedAt) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="col-span-2 text-amber-600 border-amber-500 hover:bg-amber-500/10"
                                onClick={() => handleOpenReportDialog(assign, assign.lastReportData)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Modificar Reporte
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled className="col-span-2">
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Reporte Enviado (No editable)
                              </Button>
                            )
                          ) : (
                            <Button
                                size="sm"
                                className="col-span-2 bg-sky-600 hover:bg-sky-700 text-white"
                                onClick={() => handleOpenReportDialog(assign)}
                            >
                                <FileText className="mr-2 h-4 w-4" /> Reportar Predicación
                            </Button>
                          )
                        ) : null }
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
        </TabsContent>

        <TabsContent value="historial">
          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Filtrar Historial</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3 items-center pt-2">
                    <Select value={String(selectedHistoryMonth)} onValueChange={(value) => setSelectedHistoryMonth(Number(value))}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Selecciona Mes" />
                        </SelectTrigger>
                        <SelectContent>
                        {monthsForFilter.map(month => (
                            <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <Select value={String(selectedHistoryYear)} onValueChange={(value) => setSelectedHistoryYear(Number(value))}>
                        <SelectTrigger className="w-full sm:w-[130px]">
                        <SelectValue placeholder="Selecciona Año" />
                        </SelectTrigger>
                        <SelectContent>
                        {yearsForFilter.map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
              {historyAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
                    <CalendarX2 className="h-20 w-20 text-muted-foreground/70 mb-6" />
                    <p className="text-xl font-medium text-muted-foreground mb-2">No hay historial para el período seleccionado.</p>
                    <p className="text-sm text-muted-foreground">
                        Prueba con otro mes o año, o completa más asignaciones.
                    </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {historyAssignments.map((assign) => {
                       const assignmentDateTime = parse(`${assign.date} ${assign.time}`, "yyyy-MM-dd HH:mm", new Date());
                       const isReportableType = assign.type === 'publica' || assign.type === 'rural';
                       const wasAccepted = assign.status === 'accepted';
                       const isPast = isBefore(assignmentDateTime, new Date());
                       
                       const showReportActions = isReportableType && wasAccepted && isPast;
                       const isUnreported = showReportActions && !assign.lastReportData;

                       let cardBgClass = 'bg-card';
                       if (isUnreported) { 
                           cardBgClass = 'bg-orange-50 border-orange-400 dark:bg-orange-900/20 dark:border-orange-700/40';
                       } else if (assign.status === 'rejected' || (assign.status as string) === 'cancelled_by_admin') {
                           cardBgClass = 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700/40';
                       } else if (assign.status === 'replacement_covered' || (assign.lastReportData && !canEditReport(assign.lastReportData.reportedAt))) {
                           cardBgClass = 'bg-slate-50 border-slate-300 dark:bg-slate-900/20 dark:border-slate-700/40';
                       }


                       return (
                         <Card key={assign.id} className={`shadow-sm ${cardBgClass}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-semibold flex items-center">
                                    <PreachingTypeIcon type={assign.type} className="mr-2 text-muted-foreground" />
                                    {assign.locationName}
                                    {assign.additionalTerritorySelected && <span className="ml-1 text-xs font-normal text-muted-foreground">(+1 Adicional)</span>}
                                </CardTitle>
                                <StatusBadge status={assign.status} />
                                </div>
                                <CardDescription className="text-xs pt-1">
                                {format(assignmentDateTime, "dd/MM/yy HH:mm 'hrs.'", { locale: es })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground pt-0 pb-3 space-y-1">
                                 <p><span className="font-medium">Tipo:</span> <span className="capitalize">{assign.type}</span></p>
                                 {assign.additionalTerritorySelected && <p><span className="font-medium">Terr. Adicional:</span> {assign.additionalTerritorySelected.name}</p>}
                                {assign.assignedBy && <p><span className="font-medium">Asignado por:</span> {assign.assignedBy}</p>}
                                {assign.notes && <p className="truncate" title={assign.notes}><span className="font-medium">Notas:</span> <em className="text-foreground/80">{assign.notes}</em></p>}
                                {assign.lastReportData && assign.lastReportData.reportedAt && (
                                    <p className="text-xs text-green-700 dark:text-green-500 mt-1">
                                        <CheckCircle2 className="inline-block mr-1 h-3 w-3" /> Reporte enviado el {format(assign.lastReportData.reportedAt.toDate(), "dd/MM HH:mm", { locale: es })}.
                                        {assign.lastReportData.reports.map(r => r.territoryNotWorked ? ` (${r.territoryName} No trabajado)` : '').join('')}
                                    </p>
                                )}
                                {isUnreported && (
                                    <p className="text-xs text-orange-700 dark:text-orange-400 font-medium flex items-center mt-1">
                                        <FileWarning className="mr-1.5 h-3.5 w-3.5" /> Esta asignación no fue reportada.
                                    </p>
                                )}
                            </CardContent>
                         </Card>
                       );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    {assignmentToReport && (
        <ReportarPredicacionDialog
            isOpen={isReportDialogOpen}
            onOpenChange={setIsReportDialogOpen}
            assignment={assignmentToReport}
            territory={territoryForReport} 
            onReportSubmit={handleReportSubmit}
            initialReportData={initialReportDataForDialog}
        />
    )}
    {assignmentForTerritorioAdicional && (
        <SolicitarTerritorioDialog
            isOpen={isSolicitarTerritorioDialogOpen}
            onOpenChange={setIsSolicitarTerritorioDialogOpen}
            assignment={assignmentForTerritorioAdicional}
            onTerritorySelected={handleTerritorioAdicionalSelected}
        />
    )}
    </TooltipProvider>
  );
}
