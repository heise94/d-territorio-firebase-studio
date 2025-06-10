
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Assignment, PreachingAssignedType } from "@/types";
import { format, startOfWeek, addDays, parseISO, isSameDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Users, MountainSnow, Video, CalendarDays, ChevronRight, AlertTriangle } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions"; // Para obtener el usuario actual

// Mock data for assignments - replace with actual data fetching
const MOCK_ASSIGNMENTS_FOR_WEEKLY_VIEW: Assignment[] = [
  { id: "W1", date: format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 0), "yyyy-MM-dd"), time: "09:00", type: "publica", locationName: "Plaza Mayor", status: "accepted", userName: "Ana Pérez", captainId: "userAna" },
  { id: "W2", date: format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 0), "yyyy-MM-dd"), time: "15:00", type: "zoom", locationName: "Sala Zoom A", status: "accepted", userName: "Luis Gómez", captainId: "userLuis" },
  { id: "W3", date: format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), "yyyy-MM-dd"), time: "10:30", type: "rural", locationName: "Vereda El Rosal", status: "accepted", userName: "Sofía Castro", captainId: "userSofia" }, // Example for tomorrow
  { id: "W4", date: format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 2), "yyyy-MM-dd"), time: "16:00", type: "publica", locationName: "Parque Central", status: "accepted", userName: "Carlos Díaz", captainId: "userCarlos" },
  { id: "W5", date: format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 4), "yyyy-MM-dd"), time: "17:00", type: "zoom", locationName: "Sala Zoom B", status: "accepted", userName: "Elena Jara", captainId: "userElena" },
  { id: "W6", date: format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 5), "yyyy-MM-dd"), time: "10:00", type: "publica", locationName: "Mercado Principal", status: "accepted", userName: "Pedro Velez", captainId: "userPedro" },
  { id: "W7", date: format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 5), "yyyy-MM-dd"), time: "11:00", type: "rural", locationName: "Finca La Esperanza", status: "accepted", userName: "Laura Méndez", captainId: "userLaura" },
  { id: "W8", date: format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6), "yyyy-MM-dd"), time: "15:00", type: "zoom", locationName: "Sala Zoom C (Domingo)", status: "accepted", userName: "Jorge Solis", captainId: "userJorge" },
];


const PreachingTypeIcon = ({ type, className }: { type: PreachingAssignedType; className?: string }) => {
  const defaultClass = "h-5 w-5 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === "publica") return <Users className={combinedClass} />;
  if (type === "rural") return <MountainSnow className={combinedClass} />;
  if (type === "zoom") return <Video className={combinedClass} />;
  return null;
};

export default function ProgramaSemanalPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS_FOR_WEEKLY_VIEW);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAssignmentToLead, setSelectedAssignmentToLead] = useState<Assignment | null>(null);
  const { toast } = useToast();
  const { userProfile } = usePermissions(); // Get current user's profile

  const today = startOfDay(new Date()); // Get today's date without time component

  // TODO: Implement week navigation and fetching assignments for the selected week
  const currentWeekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i)
  );

  const handleRequestToLead = (assignment: Assignment) => {
    if (assignment.captainId === userProfile?.firebaseAuthUid) {
        toast({
            title: "Ya eres el encargado",
            description: "Ya estás asignado para dirigir esta predicación.",
            variant: "default",
        });
        return;
    }
    setSelectedAssignmentToLead(assignment);
    setShowConfirmDialog(true);
  };

  const handleConfirmLead = () => {
    if (!selectedAssignmentToLead || !userProfile) {
      toast({ title: "Error", description: "No se pudo procesar la solicitud.", variant: "destructive" });
      return;
    }

    setAssignments(prev =>
      prev.map(assign =>
        assign.id === selectedAssignmentToLead.id
          ? { ...assign, captainId: userProfile.firebaseAuthUid, userName: userProfile.name }
          : assign
      )
    );

    toast({
      title: "¡Encargo Aceptado!",
      description: `Ahora eres el encargado de dirigir la predicación en "${selectedAssignmentToLead.locationName}" y de enviar el reporte. (Simulación)`,
      variant: "default",
    });

    setShowConfirmDialog(false);
    setSelectedAssignmentToLead(null);
  };

  const handleCloseDialog = () => {
    setShowConfirmDialog(false);
    setSelectedAssignmentToLead(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa Semanal de Predicación
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualiza las asignaciones de la semana actual. Si el encargado no puede, puedes solicitar dirigir las del día de hoy.
        </p>
      </div>

      {/* Week Navigation Placeholder */}
      {/* <div className="flex justify-between items-center">
        <Button variant="outline">Semana Anterior</Button>
        <h2 className="text-xl font-semibold">Semana del {format(currentWeekDays[0], "dd 'de' MMMM", { locale: es })}</h2>
        <Button variant="outline">Semana Siguiente</Button>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentWeekDays.map(day => {
          const assignmentsForDay = assignments.filter(assign =>
            isSameDay(parseISO(assign.date), day) && assign.status === 'accepted' // Only show accepted assignments
          ).sort((a,b) => a.time.localeCompare(b.time));

          const isCurrentDay = isSameDay(day, today);

          return (
            <Card key={day.toISOString()} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3 bg-muted/30 rounded-t-md">
                <CardTitle className="text-lg font-semibold">
                  {format(day, "EEEE, dd 'de' MMMM", { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {assignmentsForDay.length > 0 ? (
                  assignmentsForDay.map(assign => (
                    <div key={assign.id} className="p-3 border rounded-md shadow-sm bg-card hover:bg-muted/10 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-base">{assign.time}</span>
                        <div className="flex items-center text-sm text-muted-foreground capitalize">
                          <PreachingTypeIcon type={assign.type} className="mr-1.5 text-primary" />
                          {assign.type}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-primary">{assign.locationName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Encargado: <span className="font-medium text-foreground">{assign.userName || "No asignado"}</span>
                      </p>
                      {isCurrentDay && assign.captainId !== userProfile?.firebaseAuthUid && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3 text-xs hover:bg-primary/10 hover:border-primary hover:text-primary"
                            onClick={() => handleRequestToLead(assign)}
                        >
                            <ChevronRight className="mr-1.5 h-4 w-4" /> Solicitar Dirigir
                        </Button>
                      )}
                       {assign.captainId === userProfile?.firebaseAuthUid && (
                        <p className="mt-2 text-xs text-green-600 font-medium bg-green-500/10 p-1.5 rounded-md text-center">
                            Tú eres el encargado actual.
                        </p>
                       )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay asignaciones para este día.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedAssignmentToLead && (
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="h-6 w-6 mr-2 text-amber-500" />
                Confirmar Encargo de Predicación
              </AlertDialogTitle>
              <AlertDialogDescription className="pt-2">
                Estás a punto de asumir la dirección de la predicación para:
                <br />
                <span className="font-semibold text-foreground">{selectedAssignmentToLead.locationName}</span> el <span className="font-semibold text-foreground">{format(parseISO(selectedAssignmentToLead.date), "EEEE dd/MM", { locale: es })} a las {selectedAssignmentToLead.time}</span>.
                <br /><br />
                Al aceptar, serás el encargado y responsable de enviar el reporte al finalizar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDialog}>Salir</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmLead} className="bg-primary hover:bg-primary/90">
                Aceptar y Dirigir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
