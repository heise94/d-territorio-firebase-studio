
"use client";

import { useState, useMemo, useEffect } from "react";
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
  MessageSquareText,
} from "lucide-react";
import type { Assignment, AssignmentStatus, PreachingAssignedType, PublisherDetail, ProgramScheduleSlot, SettingsDoc } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, doc, onSnapshot, query, updateDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parse, isBefore, getMonth, getYear } from "date-fns";
import { es } from "date-fns/locale";
import { findReplacementCaptain } from "@/ai/flows/find-replacement-captain";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const currentFilterYear = new Date().getFullYear();

export default function GestionAsignacionesPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allPublishers, setAllPublishers] = useState<PublisherDetail[]>([]);
  const [programSlots, setProgramSlots] = useState<ProgramScheduleSlot[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [isFindingReplacement, setIsFindingReplacement] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentFilterYear);

  const monthsForFilter = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i), "MMMM", { locale: es }) })), []);
  const yearsForFilter = useMemo(() => Array.from({ length: 5 }, (_, i) => currentFilterYear - 2 + i).sort((a,b) => b-a), []);

  const formatLocationName = (name: string, type: PreachingAssignedType) => {
    if (type === 'publica' && name.toLowerCase().startsWith('territorio urbano ')) {
        return `U-${name.split(' ').pop()}`;
    }
    return name;
  };

  useEffect(() => {
    setIsLoading(true);
    // The query is simplified to avoid needing a composite index. Sorting is handled client-side.
    const q = query(collection(db, "assignments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAssignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
      
      // Client-side sorting to order by date and time descending
      fetchedAssignments.sort((a, b) => {
        const aDateTime = `${a.date} ${a.time}`;
        const bDateTime = `${b.date} ${b.time}`;
        if (aDateTime > bDateTime) return -1;
        if (aDateTime < bDateTime) return 1;
        return 0;
      });

      setAssignments(fetchedAssignments);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching assignments: ", error);
      toast({ title: "Error", description: "No se pudieron cargar las asignaciones.", variant: "destructive" });
      setIsLoading(false);
    });
    
    // Fetch data needed for AI flow
    const usersQuery = query(collection(db, "users"), where("isAssignable", "==", true));
    onSnapshot(usersQuery, (snapshot) => {
        setAllPublishers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublisherDetail)));
    });

    const settingsDocRef = doc(db, "settings", "programConfig");
    onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const settingsData = docSnap.data() as SettingsDoc;
            setProgramSlots(settingsData.programScheduleSlots || []);
        }
    });

    return () => unsubscribe();
  }, [toast]);


  const handleEditAssignment = (assignmentId: string) => {
    toast({ title: "Próximamente", description: "La edición de asignaciones estará disponible pronto." });
  };

  const handleMarkCovered = async (assignmentId: string) => {
    const assignmentRef = doc(db, "assignments", assignmentId);
    try {
        await updateDoc(assignmentRef, { status: 'replacement_covered', updatedAt: serverTimestamp() });
        toast({ title: "Asignación Cubierta", description: "La asignación ha sido marcada como cubierta." });
    } catch(error) {
        toast({ title: "Error", description: "No se pudo actualizar la asignación.", variant: "destructive" });
    }
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

    let cleanedPhoneNumber = assign.userPhoneNumber.replace(/[^0-9+]/g, "");
    if (cleanedPhoneNumber.startsWith("+")) {
      cleanedPhoneNumber = cleanedPhoneNumber.substring(1);
    }
    
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

  const handleCancelAssignment = async (assignmentId: string) => {
    const assignmentRef = doc(db, "assignments", assignmentId);
    try {
        await updateDoc(assignmentRef, { status: 'cancelled_by_admin', updatedAt: serverTimestamp() });
        const assignment = assignments.find(a => a.id === assignmentId);
        toast({ title: "Asignación Cancelada", description: `La asignación para ${assignment?.userName || 'el usuario'} ha sido cancelada por el administrador.`, variant: "destructive" });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo cancelar la asignación.", variant: "destructive" });
    }
  };

  const handleFindReplacement = async (assignment: Assignment) => {
    if (!assignment.userId) {
        toast({title: "Error", description: "La asignación no tiene un capitán original asignado.", variant: "destructive"});
        return;
    }
    setIsFindingReplacement(assignment.id);
    try {
        const publishersForFlow = allPublishers.map(p => ({
            ...p,
            availability: p.availability || { availableSlotIds: [] } // Ensure availability object exists
        }));

        const replacementInput = {
            originalAssignment: {
                date: assignment.date,
                time: assignment.time,
                type: assignment.type,
                locationName: assignment.locationName,
            },
            originalCaptainId: assignment.userId,
            availablePublishers: publishersForFlow, 
            programScheduleSlots: programSlots, 
            additionalInstructions: "Prioritize captains with good attendance if possible."
        };

        const result = await findReplacementCaptain(replacementInput);

        if (result.newCaptainId && result.newCaptainName && result.newCaptainEmail) {
            const newCaptainDetails = allPublishers.find(p => p.id === result.newCaptainId);
            const assignmentRef = doc(db, "assignments", assignment.id);
            await updateDoc(assignmentRef, {
                userId: result.newCaptainId!,
                userName: result.newCaptainName!,
                userEmail: result.newCaptainEmail!,
                userPhoneNumber: newCaptainDetails?.phoneNumber || null,
                status: 'pending' as AssignmentStatus, 
                notes: `Reasignado por el sistema. Original: ${assignment.userName}. ${result.reasoning || ''}`.trim(),
                updatedAt: serverTimestamp(),
            });
            toast({ title: "Reemplazo Encontrado", description: `${result.newCaptainName} ha sido asignado. Esperando confirmación.`});
        } else {
            const assignmentRef = doc(db, "assignments", assignment.id);
            await updateDoc(assignmentRef, { 
                status: 'needs_manual_replacement' as AssignmentStatus, 
                notes: `Sistema no encontró reemplazo. ${result.reasoning || ''}`.trim() 
            });
            toast({ title: "Sistema no encontró reemplazo", description: result.reasoning || "No se encontró un capitán disponible.", variant: "default" });
        }

    } catch (error) {
        console.error("Error finding replacement:", error);
        const assignmentRef = doc(db, "assignments", assignment.id);
        await updateDoc(assignmentRef, { status: 'needs_manual_replacement' as AssignmentStatus, notes: "Error durante búsqueda automática." });
        toast({ title: "Error del Sistema", description: "Hubo un problema al buscar reemplazo.", variant: "destructive" });
    } finally {
        setIsFindingReplacement(null);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter(assign => {
        const assignmentDate = parse(assign.date, "yyyy-MM-dd", new Date());
        if (getMonth(assignmentDate) !== selectedMonth || getYear(assignmentDate) !== selectedYear) {
            return false;
        }

        if (!searchTerm) return true;

        return (assign.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (assign.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            assign.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assign.type.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [assignments, searchTerm, selectedMonth, selectedYear]);

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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-2">
              <div className="flex gap-2 items-center">
                 <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                    <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{monthsForFilter.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{yearsForFilter.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="relative w-full sm:w-64 md:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por usuario, lugar, tipo..."
                  className="pl-8 w-full h-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
             <CardDescription className="pt-2 text-xs">
                {isLoading ? "Cargando asignaciones..." : 
                  (filteredAssignments.length > 0
                    ? `Mostrando ${filteredAssignments.length} asignaciones para ${monthsForFilter.find(m => m.value === selectedMonth)?.label} ${selectedYear}.`
                    : `No se encontraron asignaciones para ${monthsForFilter.find(m => m.value === selectedMonth)?.label} ${selectedYear}.`
                  )
                }
              </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : assignments.length === 0 && !searchTerm ? (
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
                      <TableHead className="text-center">Acciones</TableHead>
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
                        <TableCell>{formatLocationName(assign.locationName, assign.type)}</TableCell>
                        <TableCell><StatusBadge status={assign.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-0.5">
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
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10" onClick={() => handleFindReplacement(assign)} disabled={isFindingReplacement === assign.id}>
                                    {isFindingReplacement === assign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Buscar Reemplazo Automático</p></TooltipContent>
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
