
"use client";

import { useState, useEffect, useMemo } from "react";
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
  FileWarning, // Added FileWarning
} from "lucide-react";
import { format, parse, differenceInHours, isBefore, addHours, startOfDay, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Territory, ReportedAssignmentData, UserAssignment } from "@/types";
import { ReportarPredicacionDialog } from "@/components/asignaciones/reportar-predicacion-dialog";
import { Timestamp } from "firebase/firestore";
import { usePermissions } from "@/hooks/use-permissions";


const MOCK_ASSIGNMENTS: UserAssignment[] = [
  { id: "1", date: format(addHours(new Date(), 20), "yyyy-MM-dd"), time: "09:00", type: "publica", locationName: "Plaza Central", locationId: "T001", status: "pending", assignedBy: "Admin IA" },
  { id: "2", date: format(addHours(new Date(), 48), "yyyy-MM-dd"), time: "15:00", type: "zoom", locationName: "Sala Zoom #1", status: "accepted", assignedBy: "Admin IA", notes: "Recuerda tener buena iluminación." },
  { id: "3", date: format(addHours(new Date(), -5), "yyyy-MM-dd"), time: "10:30", type: "rural", locationName: "Sector El Peral", locationId: "T002", status: "accepted", assignedBy: "Admin IA", lastReportData: { assignmentId: "3", territoryNotWorked: false, workedBlocksIds: ["block-0"], notes: "Reporte de prueba para Sector El Peral.", reportedAt: Timestamp.fromDate(addHours(new Date(), -4)), reportedByUserId: "testUser"} }, // Asignación pasada con reporte
  { id: "4", date: format(addHours(new Date(), 72), "yyyy-MM-dd"), time: "11:00", type: "publica", locationName: "Parque Las Acacias", locationId: "T003", status: "rejected", assignedBy: "Admin IA" },
  { id: "5", date: format(addHours(new Date(), 2), "yyyy-MM-dd"), time: "16:00", type: "zoom", locationName: "Sala Zoom #2", status: "replacement_requested", assignedBy: "Admin IA" },
  { id: "6", date: format(addHours(new Date(), -24), "yyyy-MM-dd"), time: "14:00", type: "rural", locationName: "Camino Viejo", locationId: "T004", status: "replacement_covered", assignedBy: "Admin IA" }, 
  { id: "7", date: format(addHours(new Date(), -2), "yyyy-MM-dd"), time: "17:00", type: "publica", locationName: "Metro Universidad", locationId: "T005", status: "accepted", assignedBy: "Admin IA", lastReportData: { assignmentId: "7", territoryNotWorked: true, workedBlocksIds: [], notes: "No se pudo trabajar por lluvia.", reportedAt: Timestamp.fromDate(addHours(new Date(), -1)), reportedByUserId: "testUser"} }, 
  { id: "8", date: format(addHours(new Date(), -26), "yyyy-MM-dd"), time: "11:00", type: "publica", locationName: "Mercado Modelo", locationId: "T006", status: "accepted", assignedBy: "Admin IA" }, // Past, accepted, NO REPORT
];

const MOCK_TERRITORY_FOR_REPORT: Territory = {
  id: "T-Mock",
  name: "Territorio de Ejemplo",
  type: "urban",
  number: "101X",
  mapImageUrl: "https://placehold.co/600x400.png?text=Mapa+Territorio",
  dataAiHint: "map sketch",
  totalBlocks: 4,
  blockHouseCounts: [10, 12, 8, 15],
  approxHouseCount: 45,
  isBlocked: false,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};


const PreachingTypeIcon = ({ type, className }: { type: UserAssignment["type"]; className?: string }) => {
  const defaultClass = "h-5 w-5 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === "publica") return <Users className={combinedClass} />;
  if (type === "rural") return <MountainSnow className={combinedClass} />;
  if (type === "zoom") return <Video className={combinedClass} />;
  return null;
};

const StatusBadge = ({ status }: { status: UserAssignment["status"] }) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="border-amber-500 text-amber-600"><HelpCircle className="mr-1.5 h-3.5 w-3.5" />Pendiente</Badge>;
    case "accepted":
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Aceptada</Badge>;
    case "rejected":
      return <Badge variant="destructive"><XCircle className="mr-1.5 h-3.5 w-3.5" />Rechazada</Badge>;
    case "replacement_requested":
      return <Badge variant="outline" className="border-blue-500 text-blue-600"><UserMinus className="mr-1.5 h-3.5 w-3.5" />Reemplazo Solicitado</Badge>;
    case "replacement_covered":
      return <Badge variant="secondary"><UserCheckIcon className="mr-1.5 h-3.5 w-3.5" />Cubierta por Reemplazo</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};


export default function MisAsignacionesPage() {
  const [assignments, setAssignments] = useState<UserAssignment[]>(MOCK_ASSIGNMENTS);
  const { toast } = useToast();
  const { userProfile } = usePermissions();

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [assignmentToReport, setAssignmentToReport] = useState<UserAssignment | null>(null);
  const [territoryForReport, setTerritoryForReport] = useState<Territory | null>(null);
  const [initialReportDataForDialog, setInitialReportDataForDialog] = useState<Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'> | null>(null);


  const handleUpdateStatus = (assignmentId: string, newStatus: UserAssignment["status"]) => {
    setAssignments(prev =>
      prev.map(assign =>
        assign.id === assignmentId ? { ...assign, status: newStatus } : assign
      )
    );
    toast({
      title: "Estado Actualizado",
      description: `La asignación ha sido marcada como "${newStatus.replace("_", " ")}" (simulación).`,
      variant: newStatus === "accepted" ? "default" : newStatus === "rejected" ? "destructive" : "default"
    });
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

  const handleOpenReportDialog = (assignment: UserAssignment, existingReport?: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'> | null) => {
    if (assignment.type === 'publica' || assignment.type === 'rural') {
        const mockTerritory = { 
            ...MOCK_TERRITORY_FOR_REPORT,
            id: assignment.locationId || `mock-${assignment.id}`,
            name: assignment.locationName,
            type: assignment.type === 'publica' ? 'urban' : 'rural',
        };
        setTerritoryForReport(mockTerritory);
    } else {
        setTerritoryForReport(null); 
    }
    setAssignmentToReport(assignment);
    setInitialReportDataForDialog(existingReport || null);
    setIsReportDialogOpen(true);
  };

  const handleReportSubmit = (data: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'>) => {
    if (!assignmentToReport || !userProfile) {
        toast({ title: "Error", description: "No se pudo enviar el reporte.", variant: "destructive"});
        return;
    }
    const isEditing = !!initialReportDataForDialog;

    const fullReportData: ReportedAssignmentData = {
        assignmentId: assignmentToReport.id,
        territoryNotWorked: data.territoryNotWorked,
        workedBlocksIds: data.territoryNotWorked ? [] : (data.workedBlocksIds || []),
        notes: data.notes,
        reportedAt: Timestamp.now(), 
        reportedByUserId: userProfile.firebaseAuthUid || "unknown-user",
    };
    
    setAssignments(prev => prev.map(assign => 
        assign.id === assignmentToReport.id 
        ? { ...assign, lastReportData: fullReportData } 
        : assign
    ));
    
    console.log("Reporte a enviar (simulación):", fullReportData);
    
    let reportSummary = `${isEditing ? 'Reporte modificado' : 'Reporte enviado'} para "${assignmentToReport.locationName}".`;
    if (fullReportData.territoryNotWorked) {
        reportSummary += " Se indicó que el territorio no fue trabajado.";
        if(fullReportData.notes) reportSummary += ` Motivo: ${fullReportData.notes}`;
    } else {
        reportSummary += ` Manzanas trabajadas: ${fullReportData.workedBlocksIds.length > 0 ? fullReportData.workedBlocksIds.join(', ') : 'Ninguna'}.`;
    }

    toast({
      title: isEditing ? "Reporte Modificado" : "Reporte Enviado",
      description: reportSummary,
      duration: 7000,
    });
    setIsReportDialogOpen(false);
    setInitialReportDataForDialog(null); 
  };

  const canEditReport = (reportedAtTimestamp?: Timestamp): boolean => {
    if (!reportedAtTimestamp) return false;
    const reportedAtDate = reportedAtTimestamp.toDate();
    const now = new Date();
    const minutesDifference = differenceInMinutes(now, reportedAtDate);
    return minutesDifference < 60; 
  };

  const activeAssignments = useMemo(() => {
    return assignments
      .filter(a => a.status === 'pending' || a.status === 'accepted' || a.status === 'replacement_requested')
      .sort((a, b) => {
        const aAssignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
        const bAssignmentDateTime = parse(`${b.date} ${b.time}`, "yyyy-MM-dd HH:mm", new Date());
        
        const aIsPastAndAccepted = isBefore(aAssignmentDateTime, new Date()) && a.status === 'accepted';
        const bIsPastAndAccepted = isBefore(bAssignmentDateTime, new Date()) && b.status === 'accepted';

        const aIsReportableType = a.type === 'publica' || a.type === 'rural';
        const bIsReportableType = b.type === 'publica' || b.type === 'rural';

        const aIsPendingReport = aIsPastAndAccepted && aIsReportableType && !a.lastReportData;
        const bIsPendingReport = bIsPastAndAccepted && bIsReportableType && !b.lastReportData;

        if (aIsPendingReport && !bIsPendingReport) return -1;
        if (!aIsPendingReport && bIsPendingReport) return 1;
        
        // Default sort by date and time
        if (aAssignmentDateTime < bAssignmentDateTime) return -1;
        if (aAssignmentDateTime > bAssignmentDateTime) return 1;
        return 0;
      });
  }, [assignments]);

  const pastAssignments = assignments.filter(a => {
      const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
      return a.status === 'rejected' || a.status === 'replacement_covered' || a.status === 'cancelled_by_admin' || (isBefore(assignmentDateTime, new Date()) && (a.status === 'accepted' || a.status === 'pending'));
  });


  return (
    <TooltipProvider>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <ListChecks className="mr-3 h-8 w-8 text-primary" />
          Mis Asignaciones
        </h1>
        <p className="text-muted-foreground mt-1">
          Revisa y gestiona tus asignaciones de predicación. Puedes aceptarlas, rechazarlas o solicitar un reemplazo si es necesario.
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
                <CalendarX2 className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">No tienes asignaciones pendientes.</p>
                <p className="text-sm text-muted-foreground">
                    Cuando se te asigne alguna tarea de predicación, aparecerá aquí.
                </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeAssignments.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold font-headline mb-4">Pendientes y Aceptadas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAssignments.map((assign) => {
                  const { canRequest, deadline, tooLate } = canRequestReplacement(assign.date, assign.time);
                  const assignmentDateTime = parse(`${assign.date} ${assign.time}`, "yyyy-MM-dd HH:mm", new Date());
                  const isPastAssignment = isBefore(assignmentDateTime, new Date());
                  
                  const isReportableType = assign.type === 'publica' || assign.type === 'rural';
                  const isReportableAndPassed = isPastAssignment && isReportableType && assign.status === 'accepted';
                  
                  const cardBaseClass = "shadow-md hover:shadow-lg transition-shadow";
                  let cardBgClass = 'bg-card';
                  if (isReportableAndPassed && !assign.lastReportData) {
                    cardBgClass = 'bg-amber-50 border-amber-400 dark:bg-amber-900/20 dark:border-amber-700/40';
                  }


                  return (
                    <Card key={assign.id} className={`${cardBaseClass} ${cardBgClass}`}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-semibold flex items-center">
                            <PreachingTypeIcon type={assign.type} className="mr-2 text-primary" />
                            {assign.locationName}
                          </CardTitle>
                          <StatusBadge status={assign.status} />
                        </div>
                        <CardDescription className="text-sm pt-1">
                          {format(assignmentDateTime, "EEEE, dd 'de' MMMM 'de' yyyy 'a las' HH:mm 'hrs.'", { locale: es })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs text-muted-foreground pt-1 pb-3">
                         <p><span className="font-medium">Tipo:</span> <span className="capitalize">{assign.type}</span></p>
                        {assign.assignedBy && <p><span className="font-medium">Asignado por:</span> {assign.assignedBy}</p>}
                        {assign.notes && <p><span className="font-medium">Notas:</span> <em className="text-foreground/80">{assign.notes}</em></p>}
                         {isReportableAndPassed && !assign.lastReportData && (
                            <p className="text-amber-700 dark:text-amber-300 font-semibold flex items-center mt-2">
                                <AlertTriangle className="h-4 w-4 mr-1.5" /> ¡Esta asignación está pendiente de reporte!
                            </p>
                        )}
                        {assign.lastReportData && (
                             <p className="text-green-600 font-medium flex items-center mt-2">
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
                        {isReportableAndPassed ? (
                          assign.lastReportData ? (
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
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Reporte Enviado
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
            </section>
          )}

          {pastAssignments.length > 0 && (
             <section className="mt-12">
              <h2 className="text-2xl font-semibold font-headline mb-4">Historial de Asignaciones</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastAssignments.map((assign) => {
                       const assignmentDateTime = parse(`${assign.date} ${assign.time}`, "yyyy-MM-dd HH:mm", new Date());
                       const isReportableType = assign.type === 'publica' || assign.type === 'rural';
                       const wasAccepted = assign.status === 'accepted';
                       const isPast = isBefore(assignmentDateTime, new Date());
                       
                       const showReportActions = isReportableType && wasAccepted && isPast;
                       const isUnreported = showReportActions && !assign.lastReportData;

                       let cardBgClass = 'bg-card';
                       let contentOpacityClass = '';
                       if (isUnreported) {
                           cardBgClass = 'bg-orange-50 border-orange-400 dark:bg-orange-900/20 dark:border-orange-700/40';
                       } else if (!showReportActions && (assign.status !== 'rejected' && assign.status !== 'cancelled_by_admin')) {
                           cardBgClass = 'bg-muted/50';
                           contentOpacityClass = 'opacity-80';
                       }

                       return (
                         <Card key={assign.id} className={`shadow-sm ${cardBgClass}`}>
                            <CardHeader className={`pb-2 ${contentOpacityClass}`}>
                                <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-semibold flex items-center">
                                    <PreachingTypeIcon type={assign.type} className="mr-2 text-muted-foreground" />
                                    {assign.locationName}
                                </CardTitle>
                                <StatusBadge status={assign.status} />
                                </div>
                                <CardDescription className="text-xs pt-1">
                                {format(assignmentDateTime, "dd/MM/yy HH:mm 'hrs.'", { locale: es })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className={`text-xs text-muted-foreground pt-0 pb-3 space-y-1 ${contentOpacityClass}`}>
                                 <p><span className="font-medium">Tipo:</span> <span className="capitalize">{assign.type}</span></p>
                                {assign.assignedBy && <p><span className="font-medium">Asignado por:</span> {assign.assignedBy}</p>}
                                {assign.notes && <p><span className="font-medium">Notas:</span> <em className="text-foreground/80">{assign.notes}</em></p>}
                                {assign.lastReportData && (
                                    <p className="text-xs text-green-700 dark:text-green-500 mt-1">
                                        <CheckCircle2 className="inline-block mr-1 h-3 w-3" /> Reporte enviado el {format(assign.lastReportData.reportedAt.toDate(), "dd/MM HH:mm", { locale: es })}.
                                    </p>
                                )}
                                {isUnreported && (
                                    <p className="text-xs text-orange-700 dark:text-orange-400 font-medium flex items-center mt-1">
                                        <FileWarning className="mr-1.5 h-3.5 w-3.5" /> Esta asignación no fue reportada.
                                    </p>
                                )}
                            </CardContent>
                            {showReportActions && (
                                <CardFooter className="border-t pt-3 pb-3">
                                    {assign.lastReportData ? (
                                        canEditReport(assign.lastReportData.reportedAt) ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-amber-600 border-amber-500 hover:bg-amber-500/10"
                                            onClick={() => handleOpenReportDialog(assign, assign.lastReportData)}
                                        >
                                            <Edit className="mr-2 h-4 w-4" /> Modificar Reporte
                                        </Button>
                                        ) : (
                                        <Button size="sm" variant="outline" disabled className="w-full">
                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Reporte Enviado (No editable)
                                        </Button>
                                        )
                                    ) : (
                                        <Button
                                            size="sm"
                                            className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                                            onClick={() => handleOpenReportDialog(assign)}
                                        >
                                            <FileText className="mr-2 h-4 w-4" /> Reportar Predicación
                                        </Button>
                                    )}
                                </CardFooter>
                            )}
                         </Card>
                       );
                    })}
                </div>
             </section>
          )}
        </>
      )}
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
    </TooltipProvider>
  );
}

    
