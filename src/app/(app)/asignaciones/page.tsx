
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
} from "lucide-react";
import { format, parse, differenceInHours, isBefore, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type AssignmentStatus = "pending" | "accepted" | "rejected" | "replacement_requested" | "replacement_covered";
type PreachingAssignedType = "publica" | "rural" | "zoom";

interface UserAssignment {
  id: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  type: PreachingAssignedType;
  locationName: string; // Nombre del territorio o casa
  status: AssignmentStatus;
  assignedBy?: string; // Admin or AI
  notes?: string;
}

const MOCK_ASSIGNMENTS: UserAssignment[] = [
  { id: "1", date: format(addHours(new Date(), 20), "yyyy-MM-dd"), time: "09:00", type: "publica", locationName: "Plaza Central", status: "pending", assignedBy: "Admin IA" },
  { id: "2", date: format(addHours(new Date(), 48), "yyyy-MM-dd"), time: "15:00", type: "zoom", locationName: "Sala Zoom #1", status: "accepted", assignedBy: "Admin IA", notes: "Recuerda tener buena iluminación." },
  { id: "3", date: format(addHours(new Date(), 5), "yyyy-MM-dd"), time: "10:30", type: "rural", locationName: "Sector El Peral", status: "accepted", assignedBy: "Admin IA" },
  { id: "4", date: format(addHours(new Date(), 72), "yyyy-MM-dd"), time: "11:00", type: "publica", locationName: "Parque Las Acacias", status: "rejected", assignedBy: "Admin IA" },
  { id: "5", date: format(addHours(new Date(), 2), "yyyy-MM-dd"), time: "16:00", type: "zoom", locationName: "Sala Zoom #2", status: "replacement_requested", assignedBy: "Admin IA" },
  { id: "6", date: format(addHours(new Date(), -24), "yyyy-MM-dd"), time: "14:00", type: "rural", locationName: "Camino Viejo", status: "replacement_covered", assignedBy: "Admin IA" },
  { id: "7", date: format(addHours(new Date(), 10), "yyyy-MM-dd"), time: "17:00", type: "publica", locationName: "Metro Universidad", status: "pending", assignedBy: "Admin IA" },
];


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
    // This function would just change status in this simulation
    handleUpdateStatus(assignmentId, 'replacement_requested');
    // In a real scenario, this might trigger notifications, etc.
  };

  const canRequestReplacement = (assignmentDate: string, assignmentTime: string): {canRequest: boolean; deadline: Date | null; tooLate: boolean } => {
    try {
      const assignmentDateTime = parse(`${assignmentDate} ${assignmentTime}`, "yyyy-MM-dd HH:mm", new Date());
      if (isNaN(assignmentDateTime.getTime())) return { canRequest: false, deadline: null, tooLate: false };
      
      const now = new Date();
      const hoursUntilAssignment = differenceInHours(assignmentDateTime, now);
      const deadlineForRequest = addHours(assignmentDateTime, -16); // 16 hours before

      return {
        canRequest: hoursUntilAssignment >= 16, // Can request if 16 or more hours away
        deadline: deadlineForRequest,
        tooLate: isBefore(assignmentDateTime, now) || hoursUntilAssignment < 16 // Also too late if event passed or less than 16h away
      };
    } catch (error) {
      console.error("Error parsing date/time for replacement check:", error);
      return { canRequest: false, deadline: null, tooLate: false };
    }
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

                  if (isPastAssignment && (assign.status === 'pending' || assign.status === 'accepted')) {
                    // Don't show actions for past pending/accepted assignments
                    // but still list them if they weren't explicitly rejected or covered
                  }

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
                      {!isPastAssignment && (assign.status === 'pending' || assign.status === 'accepted') && (
                        <CardFooter className="border-t pt-4 grid grid-cols-2 gap-2">
                          {assign.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" className="hover:bg-green-500/10 hover:border-green-500 hover:text-green-600" onClick={() => handleUpdateStatus(assign.id, 'accepted')}>
                                <ThumbsUp className="mr-2 h-4 w-4" /> Aceptar
                              </Button>
                              <Button size="sm" variant="destructive" className="hover:bg-red-700/90" onClick={() => handleUpdateStatus(assign.id, 'rejected')}>
                                <ThumbsDown className="mr-2 h-4 w-4" /> Rechazar
                              </Button>
                            </>
                          )}
                          {assign.status === 'accepted' && (
                            <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <div className="col-span-2"> {/* Wrapper for tooltip when button is disabled */}
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
                        </CardFooter>
                      )}
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
                    {pastAssignments.map((assign) => (
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
                            <CardContent className="text-xs text-muted-foreground pt-0 pb-3">
                                 <p><span className="font-medium">Tipo:</span> <span className="capitalize">{assign.type}</span></p>
                                {assign.assignedBy && <p><span className="font-medium">Asignado por:</span> {assign.assignedBy}</p>}
                            </CardContent>
                         </Card>
                    ))}
                </div>
             </section>
          )}
        </>
      )}
    </div>
    </TooltipProvider>
  );
}

    