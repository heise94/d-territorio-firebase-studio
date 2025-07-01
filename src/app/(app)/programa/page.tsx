
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Edit, Trash2, Users, MountainSnow, Video, Save, XCircle, FileText, PlusCircle, Settings as SettingsIcon, Bot, Home, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth, endOfMonth, startOfDay, endOfDay, isBefore, getDay, isSameDay, parse, parseISO, addDays, isWithinInterval } from 'date-fns';
import { collection, doc, onSnapshot, query, where, getDocs, writeBatch, serverTimestamp, Timestamp, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, PreachingAssignedType, UserProfile, Casa, Territory, Campaign, CustomHoliday, ProgramScheduleSlot, SettingsDoc, DayOfWeek, PreachingType } from "@/types";
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";
import { AddManualAssignmentDialog, type ManualAssignmentSubmitData } from "@/components/programa/add-manual-assignment-dialog";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MonthlyScheduleImage } from '@/components/programa/monthly-schedule-image';
import { cn } from "@/lib/utils";


const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(currentYear, i), "MMMM", { locale: es }),
}));

const DAY_OF_WEEK_MAP: Record<number, DayOfWeek> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

const PreachingTypeIcon = ({ type }: { type: PreachingAssignedType | PreachingType }) => {
  const iconClass = "mr-1.5 h-4 w-4 shrink-0 text-muted-foreground";
  if (type === "publica" || type === "general") return <Users className={iconClass} />;
  if (type === "rural") return <MountainSnow className={iconClass} />;
  if (type === "zoom") return <Video className={iconClass} />;
  return null;
};

export default function ProgramaMensualPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const { toast } = useToast();
  const { userProfile, hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const imageRef = useRef<HTMLDivElement>(null);

  // Data States
  const [allPublishers, setAllPublishers] = useState<UserProfile[]>([]);
  const [allCasas, setAllCasas] = useState<Casa[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  const [summerStartDate, setSummerStartDate] = useState<string>('');
  const [winterStartDate, setWinterStartDate] = useState<string>('');
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<DayOfWeek[]>([]);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);

  // Dialog States
  const [isAddManualDialogOpen, setIsAddManualDialogOpen] = useState(false);
  const [dateForManualAdd, setDateForManualAdd] = useState<Date | null>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  useEffect(() => {
    setIsLoading(true);
    const publishersQuery = query(collection(db, "users"));
    const unsubPublishers = onSnapshot(publishersQuery, (snap) => setAllPublishers(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile))));
    
    const casasQuery = query(collection(db, "casas"), orderBy("ownerName", "asc"));
    const unsubCasas = onSnapshot(casasQuery, (snap) => setAllCasas(snap.docs.map(d => ({id: d.id, ...d.data()} as Casa))));

    const territoriesQuery = query(collection(db, "territories"), orderBy("name"));
    const unsubTerritories = onSnapshot(territoriesQuery, (snap) => setAllTerritories(snap.docs.map(d => ({id: d.id, ...d.data()} as Territory))));
    
    const assignmentsQuery = query(collection(db, "assignments"), orderBy("date", "desc"));
    const unsubAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      setAllAssignments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment)));
    }, (error) => {
        console.error("Error fetching assignments:", error);
        toast({title: "Error de Carga", description: "No se pudieron obtener las asignaciones.", variant: "destructive"});
    });
    
    const settingsDocRef = doc(db, "settings", "programConfig");
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const settingsData = docSnap.data() as SettingsDoc;
        setProgramScheduleSlots(settingsData.programScheduleSlots || []);
        setSummerStartDate(settingsData.summerScheduleStartDate || '');
        setWinterStartDate(settingsData.winterScheduleStartDate || '');
        setGroupOrganizedDays(settingsData.groupOrganizedDays || []);
      } else {
        setProgramScheduleSlots([]);
        setSummerStartDate('');
        setWinterStartDate('');
        setGroupOrganizedDays([]);
      }
    });

    const eventsConfigRef = doc(db, "settings", "specialEventsConfig");
    const unsubEvents = onSnapshot(eventsConfigRef, (docSnap) => {
      if (docSnap.exists()) {
          const settings = docSnap.data() as SettingsDoc;
          const campaignsList = (settings.campaignsList || []).map(c => ({ 
              ...c, 
              startDate: c.startDate instanceof Timestamp ? c.startDate.toDate() : new Date(c.startDate),
              endDate: c.endDate instanceof Timestamp ? c.endDate.toDate() : new Date(c.endDate)
          }));
          const holidaysList = (settings.holidaysList || []).map(h => ({
              ...h,
              date: h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date)
          }));
          setCampaigns(campaignsList as Campaign[]);
          setCustomHolidays(holidaysList as CustomHoliday[]);
      }
    });

    const unsubscribers = [unsubPublishers, unsubCasas, unsubTerritories, unsubAssignments, unsubSettings, unsubEvents];
    const timer = setTimeout(() => setIsLoading(false), 1500); 
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, [toast]);

  const canManageProgram = hasPermission(PERMISSIONS.MANAGE_MONTHLY_PROGRAM);

  const handleOpenAddDialog = (date: Date) => {
    setAssignmentToEdit(null);
    setDateForManualAdd(date);
    setIsAddManualDialogOpen(true);
  };
  
  const handleOpenEditDialog = (assignment: Assignment) => {
    setAssignmentToEdit(assignment);
    setDateForManualAdd(null);
    setIsAddManualDialogOpen(true);
  };

  const handleDeleteAssignment = (assignment: Assignment) => {
    setAssignmentToDelete(assignment);
    setIsDeleteConfirmOpen(true);
  };
  
  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
        await deleteDoc(doc(db, "assignments", assignmentToDelete.id));
        toast({ title: "Asignación Eliminada", description: `La asignación de ${assignmentToDelete.userName} ha sido eliminada.` });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo eliminar la asignación.", variant: "destructive" });
    } finally {
        setIsDeleteConfirmOpen(false);
        setAssignmentToDelete(null);
    }
  };

  const handleManualAssignmentSubmit = async (data: ManualAssignmentSubmitData) => {
    const batch = writeBatch(db);
    const docRef = data.id ? doc(db, "assignments", data.id) : doc(collection(db, "assignments"));
    
    const publisher = allPublishers.find(p => p.id === data.userId || p.firebaseAuthUid === data.userId);
    
    if (!publisher) {
        toast({ title: "Error", description: "Publicador no válido.", variant: "destructive"});
        return;
    }
    
    const newAssignmentData: Omit<Assignment, 'id'> & { id: string } = {
      id: docRef.id,
      date: format(data.date, "yyyy-MM-dd"),
      time: data.time,
      type: data.type,
      locationName: 'N/A', // Placeholder, will be updated below
      locationId: data.territoryId,
      casaId: data.casaId,
      status: data.status || 'pending',
      assignedBy: userProfile?.name || 'Manual',
      userId: publisher.firebaseAuthUid || publisher.id,
      userName: publisher.name,
      userEmail: publisher.email,
      userPhoneNumber: publisher.phoneNumber || undefined,
      assignedGroupId: publisher.assignedGroupId,
      notes: data.notes || '',
      updatedAt: Timestamp.now(),
      createdAt: data.id ? (assignmentToEdit?.createdAt || Timestamp.now()) : Timestamp.now(),
    };

    if (publisher.assignedGroupId) {
        newAssignmentData.assignedGroupId = publisher.assignedGroupId;
    } else {
        delete (newAssignmentData as any).assignedGroupId;
    }
    
    if (data.type !== 'zoom') {
        const territory = allTerritories.find(t => t.id === data.territoryId);
        const casa = allCasas.find(c => c.id === data.casaId);
        if (!territory || !casa) {
            toast({ title: "Error", description: "Territorio o Casa no válido.", variant: "destructive"});
            return;
        }
        const territoryDisplayName = territory.type === 'urban' && territory.number ? `U-${territory.number}` : territory.name;
        newAssignmentData.locationName = territoryDisplayName;
        newAssignmentData.territoryName = territoryDisplayName;
        newAssignmentData.casaName = casa?.ownerName;
        newAssignmentData.casaAddress = casa?.address;
    } else {
        newAssignmentData.locationName = "Predicación por Zoom";
    }

    if (newAssignmentData.assignedGroupId === undefined) {
      delete (newAssignmentData as any).assignedGroupId;
    }

    batch.set(docRef, newAssignmentData, { merge: true });
    
    try {
        await batch.commit();
        toast({ title: data.id ? "Asignación Actualizada" : "Asignación Creada", description: "La asignación se guardó correctamente."});
        setIsAddManualDialogOpen(false);
    } catch (error) {
        console.error("Error saving manual assignment:", error);
        toast({ title: "Error al Guardar", description: "No se pudo guardar la asignación.", variant: "destructive" });
    }
  };
  
  const handleCopyToText = async () => {
    setIsCopying(true);
    const monthName = format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: es });
    let programText = `PROGRAMA DE PREDICACIÓN - ${monthName.toUpperCase()}\n\n`;

    calendarDays.forEach(day => {
        const dayString = format(day, "yyyy-MM-dd");
        const dayOfWeekKey = DAY_OF_WEEK_MAP[getDay(day)];
        const assignmentsForDay = (assignmentsToDisplay[dayString] || []).sort((a,b) => a.time.localeCompare(b.time));
        const isGroupDay = groupOrganizedDays.includes(dayOfWeekKey);
        
        const holidayForDay = customHolidays.find(h => {
            const holidayDate = h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date);
            return isSameDay(holidayDate, day);
        });

        programText += `**${format(day, "EEEE dd", { locale: es }).toUpperCase()}`;
        if (holidayForDay) {
          programText += ` (FESTIVO: ${holidayForDay.name})`;
        }
        programText += `**\n`;

        if (assignmentsForDay.length > 0) {
            assignmentsForDay.forEach(assign => {
                const typeText = assign.type.charAt(0).toUpperCase() + assign.type.slice(1);
                let line = `- ${assign.time} - ${typeText}: ${assign.userName}`;
                
                const details = [];
                if (assign.locationName) details.push(`Territorio: ${assign.locationName}`);
                if (assign.casaName || assign.casaAddress) {
                    let casaInfo = 'Casa: ';
                    if (assign.casaName) {
                        casaInfo += assign.casaName;
                    }
                    if (assign.casaAddress) {
                        casaInfo += `${assign.casaName ? ' - ' : ''}${assign.casaAddress}`;
                    }
                    details.push(casaInfo);
                }
                
                if (details.length > 0) {
                    line += ` (${details.join(', ')})`;
                }
                programText += `${line}\n`;
            });
        } else if (isGroupDay && !holidayForDay) {
            programText += "Predicación por Grupo\n";
        } else if (holidayForDay) {
             programText += `(Día festivo: ${holidayForDay.name})\n`;
        } else {
            programText += "(Sin asignaciones)\n";
        }
        programText += "\n";
    });

    try {
        await navigator.clipboard.writeText(programText);
        toast({
            title: "Programa Copiado",
            description: "El programa del mes ha sido copiado a tu portapapeles como texto.",
        });
    } catch (err) {
        console.error('Failed to copy text: ', err);
        toast({
            title: "Error al Copiar",
            description: "No se pudo copiar el texto. Revisa los permisos de tu navegador.",
            variant: "destructive",
        });
    } finally {
        setIsCopying(false);
    }
};


  const assignmentsToDisplay = useMemo(() => {
    const combinedAssignments = [...allAssignments];
    return combinedAssignments.reduce((acc, curr) => {
        try {
            const assignmentDate = parseISO(curr.date);
            if (assignmentDate.getFullYear() === selectedYear && assignmentDate.getMonth() === selectedMonth) {
                (acc[curr.date] = acc[curr.date] || []).push(curr);
            }
        } catch(e) {
             // Ignore invalid dates
        }
        return acc;
    }, {} as Record<string, Assignment[]>);
  }, [allAssignments, selectedMonth, selectedYear]);
  
  const firstDayOfMonth = startOfMonth(new Date(selectedYear, selectedMonth));
  const daysInMonth = getDaysInMonth(firstDayOfMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth);
  const dayOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => addDays(firstDayOfMonth, i));

  const AssignmentItem = ({ assignment, onEdit, onDelete }: { assignment: Assignment, onEdit: () => void, onDelete: () => void }) => (
    <div className="text-sm md:text-xs group relative p-2 md:p-1.5 rounded-md bg-muted/30 shadow-sm hover:bg-muted/70 transition-colors min-h-[60px] flex flex-col justify-start">
        
        <div className="flex items-center font-semibold text-primary"><PreachingTypeIcon type={assignment.type} /><span>{assignment.time}</span></div>
        <p className="truncate font-medium text-foreground/90" title={assignment.userName}>{assignment.userName}</p>
        <p className="truncate text-muted-foreground" title={assignment.locationName}>{assignment.locationName}</p>
        {(assignment.type === 'publica' || assignment.type === 'rural') && assignment.casaName && (
            <p className="truncate text-muted-foreground text-[11px] flex items-center mt-0.5" title={assignment.casaName}>
                <Home className="h-3 w-3 mr-1 shrink-0" />
                {assignment.casaName}
            </p>
        )}
        {canManageProgram && (
            <div className="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-background/80 backdrop-blur-sm rounded-bl-md rounded-tr-md p-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onEdit}><Edit className="h-3 w-3 text-blue-600" /></Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
        )}
    </div>
  );

  return (
    <TooltipProvider>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa Mensual de Predicación
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualiza y gestiona manualmente el programa de predicación.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle>Calendario de Asignaciones</CardTitle>
              <div className="flex gap-3 items-center pt-2">
                <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Mes" /></SelectTrigger>
                  <SelectContent>{months.map(m => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}</SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="Año" /></SelectTrigger>
                  <SelectContent>{years.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
               <Button onClick={handleCopyToText} disabled={isLoading || isCopying} variant="outline" className="w-full sm:w-auto">
                {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Copiar a Texto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Cargando datos...</p>
            </div>
          ) : (
            <div className="mt-6">
              {!isMobile && (
                 <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground pb-2 border-b">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => <div key={day}>{day}</div>)}
                </div>
              )}
              <div className={isMobile ? "space-y-4" : "grid grid-cols-7 gap-1"}>
                {!isMobile && Array.from({ length: dayOffset }).map((_, i) => <div key={`empty-${i}`} className="rounded-md min-h-[120px] bg-muted/20"></div>)}
                {calendarDays.map(day => {
                  const dayString = format(day, "yyyy-MM-dd");
                  const assignmentsForDay = (assignmentsToDisplay[dayString] || []).sort((a: any, b: any) => a.time.localeCompare(b.time));
                  const isToday = isSameDay(day, new Date());
                  
                  const dayOfWeekKey = DAY_OF_WEEK_MAP[getDay(day)];

                  const isSummer = (date: Date, summerStart?: string, winterStart?: string): boolean => {
                      if (!summerStart || !winterStart) return true; // Default behavior if dates not set
                      const dateMMDD = format(date, 'MM-dd');
                      if (summerStart < winterStart) {
                          return dateMMDD >= summerStart && dateMMDD < winterStart;
                      } else { // winter wraps around the new year
                          return dateMMDD >= summerStart || dateMMDD < winterStart;
                      }
                  };
                  
                  const currentSeason = isSummer(day, summerStartDate, winterStartDate) ? 'summer' : 'winter';
                  
                  const expectedSlots = programScheduleSlots.filter(slot => 
                      slot.dayOfWeek === dayOfWeekKey && (slot.season === 'all_year' || slot.season === currentSeason)
                  );
                  
                  const pendingSlotsCount = Math.max(0, expectedSlots.length - assignmentsForDay.length);
                  const allSlotsFilled = expectedSlots.length > 0 && pendingSlotsCount === 0;
                  const someSlotsPending = expectedSlots.length > 0 && pendingSlotsCount > 0;
                  
                  const holidayForDay = customHolidays.find(h => {
                      const holidayDate = h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date);
                      return isSameDay(holidayDate, day);
                  });
                  
                  const dayCardClasses = cn(
                      'flex flex-col rounded-lg shadow-sm', 
                      isToday ? 'border-2 border-primary bg-primary/5' : 'border bg-card',
                      holidayForDay && 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700/40'
                  );

                  return (
                    <Card key={dayString} className={dayCardClasses}>
                      <CardHeader className="p-3 md:p-2 pb-1 flex flex-row justify-between items-center">
                        <CardTitle className="text-base md:text-xs font-semibold md:font-medium">
                          {isMobile ? format(day, "EEEE d", { locale: es }) : format(day, "d")}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {holidayForDay && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-teal-500 text-teal-700 bg-teal-100 dark:text-teal-300 dark:bg-teal-800/50 dark:border-teal-600 cursor-default">
                                    <Gift size={10}/>
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{holidayForDay.name}</p>
                                </TooltipContent>
                                </Tooltip>
                            )}
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    {allSlotsFilled && <div className="h-2 w-2 rounded-full bg-green-500" />}
                                    {someSlotsPending && <div className="h-2 w-2 rounded-full bg-amber-500" />}
                                </div>
                            </TooltipTrigger>
                                <TooltipContent>
                                    {allSlotsFilled && <p>Horarios completos para este día.</p>}
                                    {someSlotsPending && <p>{pendingSlotsCount} horario(s) pendiente(s) de asignar.</p>}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                      </CardHeader>
                      <CardContent className="p-2 space-y-2 md:p-1.5 md:space-y-1.5 overflow-y-auto flex-grow min-h-[100px]">
                        {assignmentsForDay.length > 0 ? (
                           assignmentsForDay.map(assignment => (
                              <AssignmentItem 
                                key={assignment.id}
                                assignment={assignment} 
                                onEdit={() => handleOpenEditDialog(assignment)} 
                                onDelete={() => handleDeleteAssignment(assignment)}
                              />
                           ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground text-center">
                                {holidayForDay ? holidayForDay.name : "No hay asignaciones programadas."}
                            </div>
                        )}
                      </CardContent>
                      {canManageProgram && !isBefore(day, startOfDay(new Date())) && (
                          <CardFooter className="p-2 md:p-1 mt-auto border-t border-dashed">
                            <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => handleOpenAddDialog(day)}>
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5"/> Añadir Asignación
                            </Button>
                          </CardFooter>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <MonthlyScheduleImage
          ref={imageRef}
          assignments={allAssignments}
          year={selectedYear}
          month={selectedMonth}
          groupOrganizedDays={groupOrganizedDays}
          customHolidays={customHolidays}
        />
      </div>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                <AlertDialogDescription>
                    Se eliminará permanentemente la asignación de {assignmentToDelete?.userName} para el {assignmentToDelete?.date} a las {assignmentToDelete?.time}. Esta acción no se puede deshacer.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAssignmentToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteAssignment} className={buttonVariants({ variant: "destructive" })}>Sí, eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canManageProgram && (
        <AddManualAssignmentDialog
            isOpen={isAddManualDialogOpen}
            onOpenChange={setIsAddManualDialogOpen}
            onAssignmentSubmit={handleManualAssignmentSubmit}
            date={dateForManualAdd}
            assignmentToEdit={assignmentToEdit}
            allPublishers={allPublishers}
            allTerritories={allTerritories}
            allCasas={allCasas}
            allAssignments={allAssignments}
            programScheduleSlots={programScheduleSlots}
            campaigns={campaigns}
            summerScheduleStartDate={summerStartDate}
            winterScheduleStartDate={winterStartDate}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
