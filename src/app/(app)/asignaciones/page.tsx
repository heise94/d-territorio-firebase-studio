
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
  FileWarning,
  Info, // Added Info icon
} from "lucide-react";
import { format, parse, differenceInHours, isBefore, addHours, startOfDay, differenceInMinutes, subDays, subHours, addMinutes, getMonth, getYear } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Territory, ReportedAssignmentData, UserAssignment } from "@/types";
import { ReportarPredicacionDialog } from "@/components/asignaciones/reportar-predicacion-dialog";
import { Timestamp } from "firebase/firestore";
import { usePermissions } from "@/hooks/use-permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added Tabs
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"; // Added Alert


const MOCK_ASSIGNMENTS: UserAssignment[] = [
  // Futuras, pendientes de aceptar
  { id: "FUT-PEND", date: format(addDays(new Date(), 7), "yyyy-MM-dd"), time: "10:00", type: "publica", locationName: "Plaza Futura", locationId: "T-FUT1", status: "pending", assignedBy: "Admin IA" },
  // Futuras, aceptadas
  { id: "FUT-ACC", date: format(addDays(new Date(), 3), "yyyy-MM-dd"), time: "15:00", type: "zoom", locationName: "Zoom Futuro", status: "accepted", assignedBy: "Admin IA", notes: "Recuerda prepararte." },
  
  // Pasadas, aceptadas, SIN REPORTE (debe estar en activas y destacada)
  { id: "PAST-ACC-NO-REP", date: format(subDays(new Date(), 1), "yyyy-MM-dd"), time: "09:00", type: "publica", locationName: "Mercado Ayer (Sin Reporte)", locationId: "T-PAS1", status: "accepted", assignedBy: "Admin IA" },
  
  // Pasadas, aceptadas, CON REPORTE < 1 HORA (debe estar en activas, con botón Modificar)
  { 
    id: "PAST-ACC-REP-EDIT", 
    date: format(subDays(new Date(), 1), "yyyy-MM-dd"), 
    time: "11:00", 
    type: "rural", 
    locationName: "Finca Ayer (Reporte Reciente)", 
    locationId: "T-PAS2", 
    status: "accepted", 
    assignedBy: "Admin IA",
    lastReportData: { assignmentId: "PAST-ACC-REP-EDIT", territoryNotWorked: false, workedBlocksIds: ["block-0"], notes: "Todo bien.", reportedAt: Timestamp.fromDate(addMinutes(new Date(), -30)), reportedByUserId: "mockUser" }
  },
  
  // Pasadas, aceptadas, CON REPORTE > 1 HORA (debe estar en HISTORIAL)
  { 
    id: "PAST-ACC-REP-NOEDIT", 
    date: format(subDays(new Date(), 2), "yyyy-MM-dd"), 
    time: "14:00", 
    type: "publica", 
    locationName: "Centro Antiguo (Reporte Viejo)", 
    locationId: "T-PAS3", 
    status: "accepted", 
    assignedBy: "Admin IA",
    lastReportData: { assignmentId: "PAST-ACC-REP-NOEDIT", territoryNotWorked: false, workedBlocksIds: ["block-1", "block-2"], notes: "Predicación completa.", reportedAt: Timestamp.fromDate(subHours(new Date(), 5)), reportedByUserId: "mockUser" }
  },
  
  // Pasadas, aceptadas, CON REPORTE (No se pudo trabajar) > 1 HORA (debe estar en HISTORIAL)
   { 
    id: "PAST-ACC-REP-NOT-WORKED-NOEDIT", 
    date: format(subDays(new Date(), 2), "yyyy-MM-dd"), 
    time: "10:00", 
    type: "publica", 
    locationName: "Calle Lluviosa (Reporte Viejo)", 
    locationId: "T-PAS4", 
    status: "accepted", 
    assignedBy: "Admin IA",
    lastReportData: { assignmentId: "PAST-ACC-REP-NOT-WORKED-NOEDIT", territoryNotWorked: true, workedBlocksIds: [], notes: "Llovió mucho.", reportedAt: Timestamp.fromDate(subHours(new Date(), 6)), reportedByUserId: "mockUser" }
  },

  // Pasadas, PENDIENTES (debe estar en HISTORIAL)
  { id: "PAST-PEND", date: format(subDays(new Date(), 3), "yyyy-MM-dd"), time: "10:00", type: "zoom", locationName: "Zoom Olvidado", status: "pending", assignedBy: "Admin IA" },
  
  // Rechazadas (debe estar en HISTORIAL)
  { id: "REJ", date: format(subDays(new Date(), 4), "yyyy-MM-dd"), time: "16:00", type: "publica", locationName: "Calle Rechazada", locationId: "T-REJ1", status: "rejected", assignedBy: "Admin IA" },

  // Cubiertas por reemplazo (debe estar en HISTORIAL)
  { id: "REP-COV", date: format(subDays(new Date(), 5), "yyyy-MM-dd"), time: "17:00", type: "rural", locationName: "Camino Cubierto", locationId: "T-REPCOV1", status: "replacement_covered", assignedBy: "Admin IA" },

  // Solicitud de reemplazo pasada (debe estar en HISTORIAL)
  { id: "PAST-REP-REQ", date: format(subDays(new Date(), 2), "yyyy-MM-dd"), time: "18:00", type: "publica", locationName: "Plaza con Solicitud Pasada", locationId: "T-PSR1", status: "replacement_requested", assignedBy: "Admin IA" },
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
  
  const [activeTab, setActiveTab] = useState("activas");
  const currentFilterYear = new Date().getFullYear();
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<number>(new Date().getMonth());
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<number>(currentFilterYear);

  const monthsForFilter = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i), "MMMM", { locale: es }) })), []);
  const yearsForFilter = useMemo(() => Array.from({ length: 5 }, (_, i) => currentFilterYear - 2 + i), [currentFilterYear]);


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

  const canEditReport = (reportedAtTimestamp?: Timestamp): boolean => {
    if (!reportedAtTimestamp) return false;
    const reportedAtDate = reportedAtTimestamp.toDate();
    const now = new Date();
    const minutesDifference = differenceInMinutes(now, reportedAtDate);
    return minutesDifference < 60; 
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

  const activeAssignments = useMemo(() => {
    return assignments
      .filter(a => {
        const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
        const isPast = isBefore(assignmentDateTime, new Date());

        if (!isPast) { // Asignaciones futuras
          return a.status === 'pending' || a.status === 'accepted' || a.status === 'replacement_requested';
        } else { // Asignaciones pasadas
          if (a.status === 'accepted') {
            // Incluir si no tiene reporte, o si tiene reporte y es editable
            return !a.lastReportData || (a.lastReportData && canEditReport(a.lastReportData.reportedAt));
          }
          // No incluir 'pending' pasadas ni 'replacement_requested' pasadas aquí, irán al historial
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

        if (a.status === 'rejected' || a.status === 'replacement_covered' || a.status === 'cancelled_by_admin') {
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
          {pendingAcceptanceCount > 0 && (
            <Alert variant="default" className="mb-6 bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700/40 dark:text-blue-300">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="font-semibold">Atención</AlertTitle>
                <AlertDescription>
                    Tienes {pendingAcceptanceCount} asignación(es) pendiente(s) de aceptar o rechazar.
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
                  
                  const isReportableType = assign.type === 'publica' || assign.type === 'rural';
                  const isReportableAndPassedAndAccepted = isPastAssignment && isReportableType && assign.status === 'accepted';
                  
                  const cardBaseClass = "shadow-md hover:shadow-lg transition-shadow";
                  let cardBgClass = 'bg-card';
                  if (isReportableAndPassedAndAccepted && !assign.lastReportData) {
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
                         {isReportableAndPassedAndAccepted && !assign.lastReportData && (
                            <p className="text-amber-700 dark:text-amber-300 font-semibold flex items-center mt-2">
                                <AlertTriangle className="h-4 w-4 mr-1.5" /> ¡Esta asignación está pendiente de reporte!
                            </p>
                        )}
                        {assign.lastReportData && (
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
                        {isReportableAndPassedAndAccepted ? (
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
                       if (isUnreported) { // This case (unreported accepted past assignment) will likely be in "activas", but keeping styling consistent if it does appear here.
                           cardBgClass = 'bg-orange-50 border-orange-400 dark:bg-orange-900/20 dark:border-orange-700/40';
                       } else if (assign.status === 'rejected' || assign.status === 'cancelled_by_admin') {
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
                                </CardTitle>
                                <StatusBadge status={assign.status} />
                                </div>
                                <CardDescription className="text-xs pt-1">
                                {format(assignmentDateTime, "dd/MM/yy HH:mm 'hrs.'", { locale: es })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground pt-0 pb-3 space-y-1">
                                 <p><span className="font-medium">Tipo:</span> <span className="capitalize">{assign.type}</span></p>
                                {assign.assignedBy && <p><span className="font-medium">Asignado por:</span> {assign.assignedBy}</p>}
                                {assign.notes && <p className="truncate" title={assign.notes}><span className="font-medium">Notas:</span> <em className="text-foreground/80">{assign.notes}</em></p>}
                                {assign.lastReportData && (
                                    <p className="text-xs text-green-700 dark:text-green-500 mt-1">
                                        <CheckCircle2 className="inline-block mr-1 h-3 w-3" /> Reporte enviado el {format(assign.lastReportData.reportedAt.toDate(), "dd/MM HH:mm", { locale: es })}.
                                        {assign.lastReportData.territoryNotWorked && <span className="ml-1 font-medium text-amber-700 dark:text-amber-500">(No trabajado)</span>}
                                    </p>
                                )}
                                {isUnreported && (
                                    <p className="text-xs text-orange-700 dark:text-orange-400 font-medium flex items-center mt-1">
                                        <FileWarning className="mr-1.5 h-3.5 w-3.5" /> Esta asignación no fue reportada.
                                    </p>
                                )}
                            </CardContent>
                            {/* No actions (like report button) in history for now, unless specifically requested */}
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
    </TooltipProvider>
  );
}
    

    