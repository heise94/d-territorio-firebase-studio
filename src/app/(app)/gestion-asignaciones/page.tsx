
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ListChecks,
  Edit3,
  UserCheck as MarkCoveredIcon,
  Send,
  Trash2,
  CalendarX2,
  Search,
  Users,
  Video,
  MountainSnow,
  HelpCircle,
  CheckCircle2,
  XCircle,
  UserMinus,
  UserCheck2,
  ShieldAlert,
} from "lucide-react";
import type { Assignment, AssignmentStatus, PreachingAssignedType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";

const MOCK_ADMIN_ASSIGNMENTS: Assignment[] = [
  { id: "A1", userId: "uidUser1", userName: "Ana Pérez", userEmail:"ana.perez@example.com", date: "2024-08-15", time: "09:00", type: "publica", locationName: "Plaza Central", status: "pending", assignedBy: "Admin IA" },
  { id: "A2", userId: "uidUser2", userName: "Luis Gómez", userEmail:"luis.gomez@example.com", date: "2024-08-15", time: "15:00", type: "zoom", locationName: "Sala Zoom #1", status: "accepted", assignedBy: "Admin IA", notes: "Recuerda tener buena iluminación." },
  { id: "A3", userId: "uidUser3", userName: "Sofía Castro", userEmail:"sofia.castro@example.com",date: "2024-08-16", time: "10:30", type: "rural", locationName: "Sector El Peral", status: "replacement_requested", assignedBy: "Admin IA" },
  { id: "A4", userId: "uidUser4", userName: "Carlos Díaz", userEmail:"carlos.diaz@example.com",date: "2024-08-17", time: "11:00", type: "publica", locationName: "Parque Las Acacias", status: "rejected", assignedBy: "Admin IA" },
  { id: "A5", userId: "uidUser1", userName: "Ana Pérez", userEmail:"ana.perez@example.com", date: "2024-08-18", time: "16:00", type: "zoom", locationName: "Sala Zoom #2", status: "replacement_covered", assignedBy: "Admin IA" },
  { id: "A6", userId: "uidUser2", userName: "Luis Gómez", userEmail:"luis.gomez@example.com", date: "2024-08-19", time: "14:00", type: "rural", locationName: "Camino Viejo", status: "cancelled_by_admin", assignedBy: "Admin IA" },
];


const PreachingTypeIcon = ({ type, className }: { type: PreachingAssignedType; className?: string }) => {
  const defaultClass = "h-4 w-4 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === "publica") return <Users className={combinedClass} />;
  if (type === "rural") return <MountainSnow className={combinedClass} />;
  if (type === "zoom") return <Video className={combinedClass} />;
  return null;
};

const StatusBadge = ({ status }: { status: AssignmentStatus }) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="border-amber-500 text-amber-600"><HelpCircle className="mr-1.5 h-3 w-3" />Pendiente</Badge>;
    case "accepted":
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle2 className="mr-1.5 h-3 w-3" />Aceptada</Badge>;
    case "rejected":
      return <Badge variant="destructive"><XCircle className="mr-1.5 h-3 w-3" />Rechazada</Badge>;
    case "replacement_requested":
      return <Badge variant="outline" className="border-blue-500 text-blue-600"><UserMinus className="mr-1.5 h-3 w-3" />Reemplazo Solicitado</Badge>;
    case "replacement_covered":
      return <Badge variant="secondary"><UserCheck2 className="mr-1.5 h-3 w-3" />Cubierta</Badge>;
    case "cancelled_by_admin":
      return <Badge variant="outline" className="border-slate-500 text-slate-600"><ShieldAlert className="mr-1.5 h-3 w-3" />Cancelada (Admin)</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getInitials = (name?: string) => {
  if (!name) return "??";
  const nameParts = name.split(" ");
  if (nameParts.length > 1) {
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};


export default function GestionAsignacionesPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(MOCK_ADMIN_ASSIGNMENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const handleEditAssignment = (assignmentId: string) => {
    toast({ title: "Próximamente", description: "La edición de asignaciones estará disponible pronto." });
    console.log(`Editando asignación ${assignmentId}`);
  };

  const handleMarkCovered = (assignmentId: string) => {
    setAssignments(prev =>
      prev.map(assign =>
        assign.id === assignmentId ? { ...assign, status: 'replacement_covered', updatedAt: Timestamp.now() } : assign
      )
    );
    toast({ title: "Asignación Cubierta", description: "La asignación ha sido marcada como cubierta (simulación)." });
  };

  const handleResendReminder = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    toast({ title: "Recordatorio Enviado", description: `Se ha reenviado un recordatorio a ${assignment?.userName || 'el usuario'} (simulación).` });
    console.log(`Reenviando recordatorio para asignación ${assignmentId}`);
  };

  const handleCancelAssignment = (assignmentId: string) => {
    setAssignments(prev =>
      prev.map(assign =>
        assign.id === assignmentId ? { ...assign, status: 'cancelled_by_admin', updatedAt: Timestamp.now() } : assign
      )
    );
    const assignment = assignments.find(a => a.id === assignmentId);
    toast({ title: "Asignación Cancelada", description: `La asignación para ${assignment?.userName || 'el usuario'} ha sido cancelada por el administrador (simulación).`, variant: "destructive" });
  };

  const filteredAssignments = useMemo(() => {
    if (!searchTerm) return assignments;
    return assignments.filter(assign =>
      (assign.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (assign.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      assign.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assign.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assignments, searchTerm]);

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
              <ListChecks className="mr-3 h-8 w-8 text-primary" />
              Gestión de Asignaciones
            </h1>
            <p className="text-muted-foreground mt-1">
              Supervisa y administra todas las asignaciones de predicación.
            </p>
          </div>
          {/* Placeholder for potential "Generate Month" or "New Manual Assignment" buttons */}
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Todas las Asignaciones</CardTitle>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2">
              <CardDescription>
                {filteredAssignments.length > 0
                  ? `Mostrando ${filteredAssignments.length} de ${assignments.length} asignaciones.`
                  : assignments.length > 0 ? "Ninguna asignación coincide con la búsqueda."
                  : "Actualmente no hay asignaciones."
                }
              </CardDescription>
              <div className="relative w-full sm:w-64 md:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por usuario, lugar, tipo..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
             {/* Placeholder for filters */}
            <p className="text-xs text-muted-foreground pt-2">Filtros avanzados (por fecha, estado, etc.) estarán disponibles pronto.</p>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 && !searchTerm ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                <CalendarX2 className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">No hay asignaciones para mostrar.</p>
                <p className="text-sm text-muted-foreground">
                  Cuando se generen o creen asignaciones, aparecerán aquí.
                </p>
              </div>
            ) : filteredAssignments.length === 0 && searchTerm ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                <Search className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">Sin resultados</p>
                <p className="text-sm text-muted-foreground">
                    No se encontraron asignaciones que coincidan con "{searchTerm}".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Usuario Asignado</TableHead>
                      <TableHead>Fecha y Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Lugar</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((assign) => (
                      <TableRow key={assign.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              {/* <AvatarImage src={(assign as any).avatarUrl || undefined} alt={assign.userName} /> */}
                              <AvatarFallback>{getInitials(assign.userName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{assign.userName || "N/A"}</div>
                              <div className="text-xs text-muted-foreground">{assign.userEmail || "N/A"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(parse(assign.date, "yyyy-MM-dd", new Date()), "dd/MM/yy", { locale: es })} {assign.time}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <PreachingTypeIcon type={assign.type} className="mr-1.5" />
                            <span className="capitalize">{assign.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{assign.locationName}</TableCell>
                        <TableCell><StatusBadge status={assign.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditAssignment(assign.id)}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar Asignación</TooltipContent>
                            </Tooltip>

                            {assign.status === 'replacement_requested' && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleMarkCovered(assign.id)}>
                                    <MarkCoveredIcon className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Marcar como Cubierta</TooltipContent>
                                </Tooltip>
                            )}

                            {assign.status === 'pending' && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => handleResendReminder(assign.id)}>
                                    <Send className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reenviar Recordatorio</TooltipContent>
                                </Tooltip>
                            )}
                            
                            {(assign.status === 'pending' || assign.status === 'accepted' || assign.status === 'replacement_requested') && (
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancelar Asignación</TooltipContent>
                                    </Tooltip>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar cancelación?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción cancelará la asignación para "{assign.userName}" el {format(parse(assign.date, "yyyy-MM-dd", new Date()), "dd/MM/yy")} a las {assign.time}. El usuario podría ser notificado.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>No, mantener</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleCancelAssignment(assign.id)} className={buttonVariants({variant: "destructive"})}>
                                        Sí, cancelar asignación
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
