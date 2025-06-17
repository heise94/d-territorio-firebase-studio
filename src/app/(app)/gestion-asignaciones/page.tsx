
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Bot, 
  Loader2,
  AlertTriangle,
  MessageSquareText, // Icon for WhatsApp reminder
} from "lucide-react";
import type { Assignment, AssignmentStatus, PreachingAssignedType, PublisherDetail, ProgramScheduleSlot } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import { format, parse, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { findReplacementCaptain } from "@/ai/flows/find-replacement-captain";


const MOCK_ADMIN_ASSIGNMENTS: Assignment[] = [
  { id: "A1", userId: "uidUser1", userName: "Ana Pérez", userEmail:"ana.perez@example.com", userPhoneNumber: "+56912345671", date: "2024-08-15", time: "09:00", type: "publica", locationName: "Plaza Central", status: "pending", assignedBy: "Admin IA" },
  { id: "A2", userId: "uidUser2", userName: "Luis Gómez", userEmail:"luis.gomez@example.com", userPhoneNumber: "+56912345672", date: "2024-08-15", time: "15:00", type: "zoom", locationName: "Sala Zoom #1", status: "accepted", assignedBy: "Admin IA", notes: "Recuerda tener buena iluminación." },
  { id: "A3", userId: "uidUser3", userName: "Sofía Castro", userEmail:"sofia.castro@example.com", userPhoneNumber: "+56912345673", date: "2024-08-16", time: "10:30", type: "rural", locationName: "Sector El Peral", status: "replacement_requested", assignedBy: "Admin IA" },
  { id: "A4", userId: "uidUser4", userName: "Carlos Díaz", userEmail:"carlos.diaz@example.com", date: "2024-08-17", time: "11:00", type: "publica", locationName: "Parque Las Acacias", status: "rejected", assignedBy: "Admin IA" }, // No phone
  { id: "A5", userId: "uidUser1", userName: "Ana Pérez", userEmail:"ana.perez@example.com", userPhoneNumber: "+56912345671", date: "2024-08-18", time: "16:00", type: "zoom", locationName: "Sala Zoom #2", status: "replacement_covered", assignedBy: "Admin IA" },
  { id: "A6", userId: "uidUser2", userName: "Luis Gómez", userEmail:"luis.gomez@example.com", userPhoneNumber: "+56912345672", date: "2024-08-19", time: "14:00", type: "rural", locationName: "Camino Viejo", status: "cancelled_by_admin", assignedBy: "Admin IA" },
];

// Mock data for AI flow - replace with actual data fetching later
const MOCK_AVAILABLE_PUBLISHERS: PublisherDetail[] = [
    { id: "uidUser1", name: "Ana Pérez", email:"ana.perez@example.com", availability: { availableSlotIds: ["mon-0900-gen", "wed-0930-gen"] } },
    { id: "uidUser2", name: "Luis Gómez", email:"luis.gomez@example.com", availability: { availableSlotIds: ["mon-1500-zoom", "thu-1400-zoom"] } },
    { id: "uidUser3", name: "Sofía Castro", email:"sofia.castro@example.com", availability: { availableSlotIds: ["tue-1000-rur", "fri-1000-gen"] } },
    { id: "uidUser4", name: "Carlos Díaz", email:"carlos.diaz@example.com", availability: { availableSlotIds: ["sat-1000-gen", "sun-1500-zoom"] } },
    { id: "uidUser5", name: "Elena Jara", email:"elena.jara@example.com", availability: { availableSlotIds: ["mon-0900-gen", "fri-1700-rur"] } },
];
const MOCK_PROGRAM_SCHEDULE_SLOTS: ProgramScheduleSlot[] = [
  { id: 'mon-0900-gen', dayOfWeek: 'monday', startTime: '09:00', type: 'general', status: 'fixed' },
  { id: 'mon-1500-zoom', dayOfWeek: 'monday', startTime: '15:00', type: 'zoom', status: 'tentative' },
  { id: 'tue-1000-rur', dayOfWeek: 'tuesday', startTime: '10:00', type: 'rural', status: 'fixed' },
  { id: 'wed-0930-gen', dayOfWeek: 'wednesday', startTime: '09:30', type: 'general', status: 'fixed' },
  { id: 'fri-1000-gen', dayOfWeek: 'friday', startTime: '10:00', type: 'general', status: 'fixed' },
  { id: 'fri-1700-rur', dayOfWeek: 'friday', startTime: '17:00', type: 'rural', status: 'tentative' },
  { id: 'sat-1000-gen', dayOfWeek: 'saturday', startTime: '10:00', type: 'general', status: 'fixed' },
  { id: 'sun-1500-zoom', dayOfWeek: 'sunday', startTime: '15:00', type: 'zoom', status: 'fixed' },
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
    case "needs_manual_replacement":
      return <Badge variant="outline" className="border-red-500 text-red-600"><AlertTriangle className="mr-1.5 h-3 w-3" />Reemplazo Manual</Badge>;
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
  const [isFindingReplacement, setIsFindingReplacement] = useState<string | null>(null);

  const handleEditAssignment = (assignmentId: string) => {
    toast({ title: "Próximamente", description: "La edición de asignaciones estará disponible pronto." });
  };

  const handleMarkCovered = (assignmentId: string) => {
    setAssignments(prev =>
      prev.map(assign =>
        assign.id === assignmentId ? { ...assign, status: 'replacement_covered', updatedAt: Timestamp.now() } : assign
      )
    );
    toast({ title: "Asignación Cubierta", description: "La asignación ha sido marcada como cubierta (simulación)." });
  };

  const handleResendReminderEmail = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    toast({ title: "Recordatorio Enviado", description: `Se ha reenviado un recordatorio por email a ${assignment?.userName || 'el usuario'} (simulación).` });
  };

  const handleSendWhatsAppReminderToAssignee = (assign: Assignment) => {
    if (!assign.userPhoneNumber || assign.userPhoneNumber.trim() === "") {
      toast({
        title: "Sin Número de Teléfono",
        description: `No se puede enviar un recordatorio por WhatsApp a ${assign.userName || 'este usuario'} porque no tiene un número de teléfono registrado en esta asignación.`,
        variant: "default",
        duration: 5000,
      });
      return;
    }

    let cleanedPhoneNumber = assign.userPhoneNumber.replace(/[\s-()]/g, "");
    
    const assignmentDate = parse(assign.date, "yyyy-MM-dd", new Date());
    const assignmentDateTime = parse(`${assign.date} ${assign.time}`, "yyyy-MM-dd HH:mm", new Date());
    const assignmentDateFormatted = format(assignmentDate, "EEEE dd 'de' MMMM", { locale: es });

    const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const misAsignacionesUrl = `${appBaseUrl}/asignaciones`;

    let message = `Hola ${assign.userName || ''}, `;
    if (assign.status === 'pending' && isBefore(assignmentDateTime, new Date())) {
      message += `te recordamos tu asignación de predicación ${assign.type} en "${assign.locationName}" para el ${assignmentDateFormatted} a las ${assign.time}. Por favor, accede para aceptarla o rechazarla: ${misAsignacionesUrl} ¡Gracias!`;
    } else {
      message += `este es un recordatorio de tu asignación de predicación ${assign.type} en "${assign.locationName}" para el ${assignmentDateFormatted} a las ${assign.time}. Detalles en: ${misAsignacionesUrl} ¡Saludos!`;
    }
    
    const whatsappUrl = `https://wa.me/${cleanedPhoneNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    toast({
      title: "Abriendo WhatsApp",
      description: `Intentando enviar recordatorio a ${assign.userName || 'este usuario'} vía WhatsApp.`,
    });
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

  const handleFindReplacementWithAI = async (assignment: Assignment) => {
    if (!assignment.userId) {
        toast({title: "Error", description: "La asignación no tiene un capitán original asignado.", variant: "destructive"});
        return;
    }
    setIsFindingReplacement(assignment.id);
    try {
        const replacementInput = {
            originalAssignment: {
                date: assignment.date,
                time: assignment.time,
                type: assignment.type,
                locationName: assignment.locationName,
            },
            originalCaptainId: assignment.userId,
            availablePublishers: MOCK_AVAILABLE_PUBLISHERS, 
            programScheduleSlots: MOCK_PROGRAM_SCHEDULE_SLOTS, 
            additionalInstructions: "Prioritize captains with good attendance if possible."
        };

        const result = await findReplacementCaptain(replacementInput);

        if (result.newCaptainId && result.newCaptainName && result.newCaptainEmail) {
            const newCaptainDetails = MOCK_AVAILABLE_PUBLISHERS.find(p => p.id === result.newCaptainId);
            
            setAssignments(prev =>
                prev.map(a =>
                    a.id === assignment.id
                    ? {
                        ...a,
                        userId: result.newCaptainId!,
                        userName: result.newCaptainName!,
                        userEmail: result.newCaptainEmail!,
                        userPhoneNumber: newCaptainDetails?.email, 
                        status: 'pending' as AssignmentStatus, 
                        notes: `Reasignado por IA. Original: ${assignment.userName}. ${result.reasoning || ''}`.trim(),
                        updatedAt: Timestamp.now(),
                      }
                    : a
                )
            );
            toast({ title: "Reemplazo Encontrado por IA", description: `${result.newCaptainName} ha sido asignado. Esperando confirmación.`});
        } else {
            setAssignments(prev =>
                prev.map(a =>
                    a.id === assignment.id ? { ...a, status: 'needs_manual_replacement' as AssignmentStatus, notes: `IA no encontró reemplazo. ${result.reasoning || ''}`.trim() } : a
                )
            );
            toast({ title: "IA no encontró reemplazo", description: result.reasoning || "No se encontró un capitán disponible.", variant: "default" });
        }

    } catch (error) {
        console.error("Error finding replacement with AI:", error);
        toast({ title: "Error con IA", description: "Hubo un problema al buscar reemplazo con la IA.", variant: "destructive" });
        setAssignments(prev =>
            prev.map(a =>
                a.id === assignment.id ? { ...a, status: 'needs_manual_replacement' as AssignmentStatus, notes: "Error durante búsqueda de IA." } : a
            )
        );
    } finally {
        setIsFindingReplacement(null);
    }
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditAssignment(assign.id)} disabled={isFindingReplacement === assign.id}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Editar Asignación</p></TooltipContent>
                            </Tooltip>

                            {(assign.status === 'rejected' || assign.status === 'replacement_requested' || assign.status === 'needs_manual_replacement') && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10" onClick={() => handleFindReplacementWithAI(assign)} disabled={isFindingReplacement === assign.id}>
                                    {isFindingReplacement === assign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Buscar Reemplazo (IA)</p></TooltipContent>
                                </Tooltip>
                            )}

                            {assign.status === 'replacement_requested' && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10" onClick={() => handleMarkCovered(assign.id)} disabled={isFindingReplacement === assign.id}>
                                    <MarkCoveredIcon className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Marcar como Cubierta Manualmente</p></TooltipContent>
                                </Tooltip>
                            )}

                            {assign.status === 'pending' && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10" onClick={() => handleResendReminderEmail(assign.id)} disabled={isFindingReplacement === assign.id}>
                                    <Send className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Reenviar Recordatorio Email</p></TooltipContent>
                                </Tooltip>
                            )}
                            
                            {(assign.status === 'pending' || assign.status === 'accepted') && assign.userPhoneNumber && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10" 
                                      onClick={() => handleSendWhatsAppReminderToAssignee(assign)}
                                      disabled={isFindingReplacement === assign.id || !assign.userPhoneNumber}
                                    >
                                      <MessageSquareText className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Recordatorio WhatsApp</p></TooltipContent>
                                </Tooltip>
                            )}

                            {(assign.status === 'pending' || assign.status === 'accepted' || assign.status === 'replacement_requested' || assign.status === 'needs_manual_replacement') && (
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isFindingReplacement === assign.id}>
                                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Cancelar Asignación</p></TooltipContent>
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
