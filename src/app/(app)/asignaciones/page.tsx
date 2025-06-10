
"use client";

import { useState, useEffect } from "react";
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
  FileText, // Icono para reportar
} from "lucide-react";
import { format, parse, differenceInHours, isBefore, addHours, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Territory, ReportedAssignmentData } from "@/types"; // Importar Territory y ReportedAssignmentData
import { ReportarPredicacionDialog } from "@/components/asignaciones/reportar-predicacion-dialog"; // Importar el nuevo diálogo
import { Timestamp } from "firebase/firestore";
import { usePermissions } from "@/hooks/use-permissions";


type AssignmentStatus = "pending" | "accepted" | "rejected" | "replacement_requested" | "replacement_covered";
type PreachingAssignedType = "publica" | "rural" | "zoom";

interface UserAssignment {
  id: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  type: PreachingAssignedType;
  locationName: string; // Nombre del territorio o casa
  locationId?: string; // ID del territorio o casa (para cargar detalles)
  status: AssignmentStatus;
  assignedBy?: string; // Admin or AI
  notes?: string;
}

const MOCK_ASSIGNMENTS: UserAssignment[] = [
  { id: "1", date: format(addHours(new Date(), 20), "yyyy-MM-dd"), time: "09:00", type: "publica", locationName: "Plaza Central", locationId: "T001", status: "pending", assignedBy: "Admin IA" },
  { id: "2", date: format(addHours(new Date(), 48), "yyyy-MM-dd"), time: "15:00", type: "zoom", locationName: "Sala Zoom #1", status: "accepted", assignedBy: "Admin IA", notes: "Recuerda tener buena iluminación." },
  { id: "3", date: format(addHours(new Date(), -5), "yyyy-MM-dd"), time: "10:30", type: "rural", locationName: "Sector El Peral", locationId: "T002", status: "accepted", assignedBy: "Admin IA" }, // Asignación pasada
  { id: "4", date: format(addHours(new Date(), 72), "yyyy-MM-dd"), time: "11:00", type: "publica", locationName: "Parque Las Acacias", locationId: "T003", status: "rejected", assignedBy: "Admin IA" },
  { id: "5", date: format(addHours(new Date(), 2), "yyyy-MM-dd"), time: "16:00", type: "zoom", locationName: "Sala Zoom #2", status: "replacement_requested", assignedBy: "Admin IA" },
  { id: "6", date: format(addHours(new Date(), -24), "yyyy-MM-dd"), time: "14:00", type: "rural", locationName: "Camino Viejo", locationId: "T004", status: "replacement_covered", assignedBy: "Admin IA" }, // Asignación pasada, ya cubierta
  { id: "7", date: format(addHours(new Date(), -2), "yyyy-MM-dd"), time: "17:00", type: "publica", locationName: "Metro Universidad", locationId: "T005", status: "accepted", assignedBy: "Admin IA" }, // Asignación recién pasada
];

// Territorio mock para el diálogo de reporte
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


const PreachingTypeIcon = ({ type, className }: { type: PreachingAssignedType; className?: string }) => {
  const defaultClass = "h-5 w-5 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === "publica") return <Users className={combinedClass} />;
  if (type === "rural") return <MountainSnow className={combinedClass} />;
  if (type === "zoom") return <Video className={combinedClass} />;
  return null;
};

const StatusBadge = ({ status }: { status: AssignmentStatus }) => {
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


  const handleUpdateStatus = (assignmentId: string, newStatus: AssignmentStatus) => {
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

  const handleOpenReportDialog = (assignment: UserAssignment) => {
    // TODO: En una implementación real, aquí se buscaría el territorio por assignment.locationId
    // Por ahora, usamos un mock si locationName coincide o si es un tipo reportable
    if (assignment.type === 'publica' || assignment.type === 'rural') {
        const mockTerritory = {
            ...MOCK_TERRITORY_FOR_REPORT,
            id: assignment.locationId || `mock-${assignment.id}`,
            name: assignment.locationName,
            type: assignment.type === 'publica' ? 'urban' : 'rural',
        };
        setTerritoryForReport(mockTerritory);
    } else {
        setTerritoryForReport(null); // No se reportan otros tipos
    }
    setAssignmentToReport(assignment);
    setIsReportDialogOpen(true);
  };

  const handleReportSubmit = (data: Omit<ReportedAssignmentData, 'reportedAt' | 'reportedByUserId' | 'assignmentId'>) => {
    if (!assignmentToReport || !userProfile) {
        toast({ title: "Error", description: "No se pudo enviar el reporte.", variant: "destructive"});
        return;
    }
    const reportData: ReportedAssignmentData = {
        assignmentId: assignmentToReport.id,
        workedBlocksIds: data.workedBlocksIds,
        notes: data.notes,
        reportedAt: Timestamp.now(),
        reportedByUserId: userProfile.firebaseAuthUid || "unknown-user",
    };
    console.log("Reporte a enviar (simulación):", reportData);
    // TODO: Aquí iría la lógica para guardar `reportData` en Firestore
    toast({
      title: "Reporte Enviado (Simulación)",
      description: `Reporte para "${assignmentToReport.locationName}" enviado.`,
    });
    setIsReportDialogOpen(false);
  };


  const activeAssignments = assignments.filter(a => a.status === 'pending' || a.status === 'accepted' || a.status === 'replacement_requested');
  const pastAssignments = assignments.filter(a => a.status === 'rejected' || a.status === 'replacement_covered' || isBefore(parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date()), new Date()));


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
                  // Condición para mostrar el botón de reporte:
                  // - Asignación es 'publica' o 'rural'
                  // - Asignación ha sido aceptada
                  // - La fecha y hora de la asignación ya pasó
                  const isPastAssignmentForReportActions = isBefore(assignmentDateTime, new Date());


                  return (
                    <Card key={assign.id} className={`shadow-md hover:shadow-lg transition-shadow ${isPastAssignment && (assign.status === 'pending' || assign.status === 'accepted') ? 'opacity-60 bg-muted/40' : ''}`}>
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
                         {isPastAssignment && (assign.status === 'pending' || assign.status === 'accepted') && (
                            <p className="text-amber-600 font-medium flex items-center mt-2">
                                <Clock className="h-3.5 w-3.5 mr-1" /> Esta asignación ya pasó.
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
                        {isPastAssignmentForReportActions && (assign.type === 'publica' || assign.type === 'rural') && assign.status === 'accepted' && (
                            <Button 
                                size="sm" 
                                variant="default" 
                                className="col-span-2 bg-sky-600 hover:bg-sky-700 text-white"
                                onClick={() => handleOpenReportDialog(assign)}
                            >
                                <FileText className="mr-2 h-4 w-4" /> Reportar Predicación
                            </Button>
                        )}
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
                       const isReportableAndPassed = isBefore(assignmentDateTime, new Date()) && (assign.type === 'publica' || assign.type === 'rural') && assign.status === 'accepted';
                       return (
                         <Card key={assign.id} className="shadow-sm bg-muted/50 opacity-80">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-semibold flex items-center">
                                    <PreachingTypeIcon type={assign.type} className="mr-2 text-muted-foreground" />
                                    {assign.locationName}
                                </CardTitle>
                                <StatusBadge status={assign.status} />
                                </div>
                                <CardDescription className="text-xs pt-1">
                                {format(parse(`${assign.date} ${assign.time}`, "yyyy-MM-dd HH:mm", new Date()), "dd/MM/yy HH:mm 'hrs.'", { locale: es })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground pt-0 pb-3 space-y-1">
                                 <p><span className="font-medium">Tipo:</span> <span className="capitalize">{assign.type}</span></p>
                                {assign.assignedBy && <p><span className="font-medium">Asignado por:</span> {assign.assignedBy}</p>}
                                {assign.notes && <p><span className="font-medium">Notas:</span> <em className="text-foreground/80">{assign.notes}</em></p>}
                            </CardContent>
                            {isReportableAndPassed && (
                                <CardFooter className="border-t pt-3 pb-3">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="w-full text-sky-700 border-sky-500 hover:bg-sky-500/10"
                                        onClick={() => handleOpenReportDialog(assign)}
                                    >
                                        <FileText className="mr-2 h-4 w-4" /> Reportar Nuevamente
                                    </Button>
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
        />
    )}
    </TooltipProvider>
  );
}
