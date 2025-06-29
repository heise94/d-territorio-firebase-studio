
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Edit, Trash2, Users, MountainSnow, Video, Save, XCircle, FileText, PlusCircle, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth, endOfMonth, startOfDay, endOfDay, isBefore, getDay, isSameDay, parse, parseISO, addDays, isWithinInterval } from 'date-fns';
import { collection, doc, onSnapshot, query, where, getDocs, writeBatch, serverTimestamp, Timestamp, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, PreachingAssignedType, PublisherDetail, Casa, Territory, Campaign, Assembly, CustomHoliday, ProgramScheduleSlot, SettingsDoc, DayOfWeek, PreachingType, UserAssignment } from "@/types";
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";
import { AddManualAssignmentDialog, type ManualAssignmentSubmitData } from "@/components/programa/add-manual-assignment-dialog";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { GenerateAIDialog } from "@/components/programa/edit-assignment-dialog";


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

  // Data States
  const [allPublishers, setAllPublishers] = useState<PublisherDetail[]>([]);
  const [allCasas, setAllCasas] = useState<Casa[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [summerStartDate, setSummerStartDate] = useState("");
  const [winterStartDate, setWinterStartDate] = useState("");
  
  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSystem, setIsGeneratingSystem] = useState(false);

  // Dialog States
  const [isAddManualDialogOpen, setIsAddManualDialogOpen] = useState(false);
  const [dateForManualAdd, setDateForManualAdd] = useState<Date | null>(null);
  const [slotForManualAdd, setSlotForManualAdd] = useState<ProgramScheduleSlot | null>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  useEffect(() => {
    setIsLoading(true);
    const publishersQuery = query(collection(db, "users"));
    const unsubPublishers = onSnapshot(publishersQuery, (snap) => setAllPublishers(snap.docs.map(d => ({id: d.id, ...d.data()} as PublisherDetail))));
    
    const casasQuery = query(collection(db, "casas"), orderBy("ownerName", "asc"));
    const unsubCasas = onSnapshot(casasQuery, (snap) => setAllCasas(snap.docs.map(d => ({id: d.id, ...d.data()} as Casa))));

    const territoriesQuery = query(collection(db, "territories"), orderBy("name"));
    const unsubTerritories = onSnapshot(territoriesQuery, (snap) => setAllTerritories(snap.docs.map(d => ({id: d.id, ...d.data()} as Territory))));
    
    const settingsDocRef = doc(db, "settings", "programConfig");
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const settingsData = docSnap.data() as SettingsDoc;
        setProgramScheduleSlots(settingsData.programScheduleSlots || []);
        setSummerStartDate(settingsData.summerScheduleStartDate || "");
        setWinterStartDate(settingsData.winterScheduleStartDate || "");
      } else {
        setProgramScheduleSlots([]);
        setSummerStartDate("");
        setWinterStartDate("");
      }
    });

    const assignmentsQuery = query(collection(db, "assignments"), orderBy("date", "desc"));
    const unsubAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      setAllAssignments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment)));
    }, (error) => {
        console.error("Error fetching assignments:", error);
        toast({title: "Error de Carga", description: "No se pudieron obtener las asignaciones.", variant: "destructive"});
    });
    
    const unsubscribers = [unsubPublishers, unsubCasas, unsubTerritories, unsubSettings, unsubAssignments];
    const timer = setTimeout(() => setIsLoading(false), 1500); 
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, [toast]);

  const canManageProgram = hasPermission(PERMISSIONS.MANAGE_MONTHLY_PROGRAM);
  
  const seasonalScheduleSlots = useMemo(() => {
    if (!summerStartDate || !winterStartDate) {
      return programScheduleSlots.filter(s => !s.season || s.season === 'all_year');
    }

    const currentDate = new Date(selectedYear, selectedMonth, 15); 
    const [sMonth, sDay] = summerStartDate.split('-').map(Number);
    const [wMonth, wDay] = winterStartDate.split('-').map(Number);
    
    const summerStartCurrentYear = new Date(selectedYear, sMonth - 1, sDay);
    const winterStartCurrentYear = new Date(selectedYear, wMonth - 1, wDay);

    let currentSeason: 'summer' | 'winter';

    if (winterStartCurrentYear < summerStartCurrentYear) { // Southern Hemisphere case
      if (currentDate >= winterStartCurrentYear && currentDate < summerStartCurrentYear) {
        currentSeason = 'winter';
      } else {
        currentSeason = 'summer';
      }
    } else { // Northern Hemisphere case
      if (currentDate >= summerStartCurrentYear && currentDate < winterStartCurrentYear) {
        currentSeason = 'summer';
      } else {
        currentSeason = 'winter';
      }
    }

    return programScheduleSlots.filter(slot => {
        return !slot.season || slot.season === 'all_year' || slot.season === currentSeason;
    });
  }, [programScheduleSlots, selectedMonth, selectedYear, summerStartDate, winterStartDate]);

  const handleOpenAddDialog = (date: Date, slot?: ProgramScheduleSlot) => {
    setAssignmentToEdit(null);
    setDateForManualAdd(date);
    setSlotForManualAdd(slot || null);
    setIsAddManualDialogOpen(true);
  };
  
  const handleOpenEditDialog = (assignment: Assignment) => {
    setAssignmentToEdit(assignment);
    setDateForManualAdd(null);
    setSlotForManualAdd(null);
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
    const territory = allTerritories.find(t => t.id === data.territoryId);
    const casa = allCasas.find(c => c.id === data.casaId);
    
    if (!publisher || !territory || !casa) {
        toast({ title: "Error", description: "Publicador, Territorio o Casa no válido.", variant: "destructive"});
        return;
    }
    
    const territoryDisplayName = territory.type === 'urban' && territory.number ? `U-${territory.number}` : territory.name;

    const newAssignment: Omit<Assignment, 'id'> & { id: string } = {
      id: docRef.id,
      date: format(data.date, "yyyy-MM-dd"),
      time: data.time,
      type: data.type,
      locationName: territoryDisplayName,
      locationId: territory.id,
      territoryName: territoryDisplayName,
      casaId: casa?.id,
      casaName: casa?.ownerName,
      casaAddress: casa?.address,
      status: data.status || 'pending',
      assignedBy: userProfile?.name || 'Manual',
      userId: publisher.firebaseAuthUid || publisher.id,
      userName: publisher.name,
      userEmail: publisher.email,
      userPhoneNumber: publisher.phoneNumber || null,
      assignedGroupId: publisher.assignedGroupId,
      notes: data.notes || '',
      updatedAt: serverTimestamp(),
      createdAt: data.id ? (assignmentToEdit?.createdAt || serverTimestamp()) : serverTimestamp(),
    };

    batch.set(docRef, newAssignment, { merge: true });
    
    try {
        await batch.commit();
        toast({ title: data.id ? "Asignación Actualizada" : "Asignación Creada", description: "La asignación se guardó correctamente."});
        setIsAddManualDialogOpen(false);
    } catch (error) {
        console.error("Error saving manual assignment:", error);
        toast({ title: "Error al Guardar", description: "No se pudo guardar la asignación.", variant: "destructive" });
    }
  };
  
  const handleSystemGeneration = async () => {
    setIsGeneratingSystem(true);
    toast({ title: "Iniciando generación automática...", description: "El sistema está buscando las mejores asignaciones." });

    const monthStartDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEndDate = endOfMonth(new Date(selectedYear, selectedMonth));
    const batch = writeBatch(db);
    let createdAssignmentsCount = 0;
    let failedSlotsCount = 0;

    const assignmentsInMonth = allAssignments.filter(a => {
        try {
            const d = parseISO(a.date);
            return isWithinInterval(d, { start: monthStartDate, end: monthEndDate });
        } catch(e) { return false; }
    });

    for (let i = 0; i < getDaysInMonth(monthStartDate); i++) {
        const currentDate = addDays(monthStartDate, i);
        const dayOfWeekKey = DAY_OF_WEEK_MAP[getDay(currentDate)];
        const slotsForThisDay = seasonalScheduleSlots.filter(s => s.dayOfWeek === dayOfWeekKey);

        for (const slot of slotsForThisDay) {
            const assignmentExists = assignmentsInMonth.some(a => 
                a.date === format(currentDate, "yyyy-MM-dd") && a.time === slot.startTime
            );
            if (assignmentExists) continue;

            const territoryType = slot.type === 'rural' ? 'rural' : 'urban';
            
            const territoryAssignmentsCount = assignmentsInMonth.reduce((acc, a) => {
                if (a.locationId) acc[a.locationId] = (acc[a.locationId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const availableTerritories = allTerritories
                .filter(t => !t.isBlocked && t.type === territoryType)
                .sort((a, b) => {
                    const countA = territoryAssignmentsCount[a.id] || 0;
                    const countB = territoryAssignmentsCount[b.id] || 0;
                    if (countA !== countB) return countA - countB;
                    
                    const dateA = a.lastWorked ? parse(a.lastWorked, 'yyyy-MM-dd', new Date()).getTime() : 0;
                    const dateB = b.lastWorked ? parse(b.lastWorked, 'yyyy-MM-dd', new Date()).getTime() : 0;
                    return dateA - dateB;
                });
            
            const territory = availableTerritories[0];
            if (!territory) { failedSlotsCount++; continue; }
            
            const allAvailableCasasForSlot = allCasas.filter(c => 
              !c.blockInfo?.forSystem &&
              (c.availableDays?.availableProgramSlotIds?.includes(slot.id) ?? false) &&
              !c.unavailabilityPeriods?.some(period => 
                  isWithinInterval(currentDate, { 
                      start: startOfDay((period.startDate as Timestamp).toDate()), 
                      end: endOfDay((period.endDate as Timestamp).toDate()) 
                  })
              )
            );
            const associatedAvailableCasas = allAvailableCasasForSlot.filter(c => territory.associatedCasaIds?.includes(c.id));
            let casa = associatedAvailableCasas.find(c => c.ownerName.toLowerCase().includes("salón del reino")) || associatedAvailableCasas[0];
            if (!casa) {
                casa = allAvailableCasasForSlot.find(c => c.ownerName.toLowerCase().includes("salón del reino")) || allAvailableCasasForSlot[0];
            }
            if (!casa) { failedSlotsCount++; continue; }

            const publisherAssignmentsCount = assignmentsInMonth.reduce((acc, a) => {
                if (a.userId) acc[a.userId] = (acc[a.userId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const potentialPublishers = allPublishers.filter(p => {
                const isStatusOk = (p.status === 'Activo' || (p.status === 'Pendiente Invitación' && p.isAssignable)) && p.firebaseAuthUid;
                if (!isStatusOk || p.blockInfo?.forSystem) return false;

                const isUnavailable = p.availability?.unavailabilityPeriods?.some(period =>
                    isWithinInterval(currentDate, { start: startOfDay((period.startDate as Timestamp).toDate()), end: endOfDay((period.endDate as Timestamp).toDate()) })
                );
                if (isUnavailable) return false;

                const hasAssignmentToday = assignmentsInMonth.some(a => a.userId === p.firebaseAuthUid && a.date === format(currentDate, "yyyy-MM-dd"));
                return !hasAssignmentToday;
            });

            let wasFallbackUsed = false;
            let availablePublishers = potentialPublishers.filter(p => p.availability?.availableSlotIds?.includes(slot.id));
            if (availablePublishers.length === 0) {
                availablePublishers = potentialPublishers;
                wasFallbackUsed = true;
            }

            availablePublishers.sort((a, b) => (publisherAssignmentsCount[a.firebaseAuthUid!] || 0) - (publisherAssignmentsCount[b.firebaseAuthUid!] || 0));

            const publisher = availablePublishers[0];
            if (!publisher) {
                failedSlotsCount++; continue; 
            }

            const newAssignmentRef = doc(collection(db, "assignments"));
            const territoryDisplayName = territory.type === 'urban' && territory.number ? `U-${territory.number}` : territory.name;
            const assignmentNotes = wasFallbackUsed 
                ? 'Asignación automática. Por favor, confirme su disponibilidad para este horario.'
                : 'Asignación generada por el sistema.';

            const newAssignmentData = {
                id: newAssignmentRef.id, date: format(currentDate, "yyyy-MM-dd"), time: slot.startTime,
                type: slot.type === 'general' ? 'publica' : slot.type, locationName: territoryDisplayName,
                locationId: territory.id, territoryName: territoryDisplayName, casaId: casa.id, casaName: casa.ownerName,
                casaAddress: casa.address, status: 'pending', assignedBy: 'Sistema Automático', userId: publisher.firebaseAuthUid!,
                userName: publisher.name, userEmail: publisher.email, userPhoneNumber: publisher.phoneNumber || null,
                assignedGroupId: publisher.assignedGroupId, notes: assignmentNotes,
                createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            };
            batch.set(newAssignmentRef, newAssignmentData);
            assignmentsInMonth.push(newAssignmentData as Assignment);
            createdAssignmentsCount++;
        }
    }

    try {
        await batch.commit();
        toast({
            title: "Generación Completada",
            description: `${createdAssignmentsCount} asignaciones creadas. ${failedSlotsCount > 0 ? `${failedSlotsCount} horarios no se pudieron asignar.` : ''}`
        });
    } catch (error) {
        console.error("Error committing batch:", error);
        toast({ title: "Error al Guardar", description: "No se pudieron guardar las asignaciones.", variant: "destructive"});
    } finally {
        setIsGeneratingSystem(false);
    }
  };

  const assignmentsToDisplay = useMemo(() => {
    return allAssignments.reduce((acc, curr) => {
        try {
            const assignmentDate = parseISO(curr.date);
            if (assignmentDate.getFullYear() === selectedYear && assignmentDate.getMonth() === selectedMonth) {
                (acc[curr.date] = acc[curr.date] || []).push(curr);
            }
        } catch(e) {
             // Ignore invalid dates
        }
        return acc;
    }, {} as Record<string, any[]>);
  }, [allAssignments, selectedMonth, selectedYear]);
  
  const firstDayOfMonth = startOfMonth(new Date(selectedYear, selectedMonth));
  const daysInMonth = getDaysInMonth(firstDayOfMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth);
  const dayOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => new Date(selectedYear, selectedMonth, i + 1));

  const AssignmentItem = ({ assignment, onEdit, onDelete }: { assignment: Assignment, onEdit: () => void, onDelete: () => void }) => (
    <div className="text-sm md:text-xs">
        <div className="flex items-center font-semibold text-primary"><PreachingTypeIcon type={assignment.type} /><span>{assignment.time}</span></div>
        <p className="truncate font-medium text-foreground/90" title={assignment.userName}>{assignment.userName}</p>
        <p className="truncate text-muted-foreground" title={assignment.locationName}>{assignment.locationName}</p>
        {canManageProgram && (
            <div className="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-background/80 backdrop-blur-sm rounded-bl-md rounded-tr-md p-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onEdit}><Edit className="h-3 w-3 text-blue-600" /></Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
        )}
    </div>
  );

  return (
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
            {hasPermission(PERMISSIONS.GENERATE_MONTHLY_PROGRAM) && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 <Button onClick={handleSystemGeneration} disabled={isLoading || isGeneratingSystem} className="w-full sm:w-auto">
                  {isGeneratingSystem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SettingsIcon className="mr-2 h-4 w-4" />}
                  Generar con Sistema
                </Button>
              </div>
            )}
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
                  const slotsForDay = seasonalScheduleSlots.filter(slot => slot.dayOfWeek === dayOfWeekKey).sort((a,b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <Card key={dayString} className={`flex flex-col rounded-lg shadow-sm ${isToday ? 'border-2 border-primary bg-primary/5' : 'border bg-card'}`}>
                      <CardHeader className="p-3 md:p-2 pb-1 flex flex-row justify-between items-center">
                        <CardTitle className="text-base md:text-xs font-semibold md:font-medium">
                          {isMobile ? format(day, "EEEE d", { locale: es }) : format(day, "d")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2 space-y-2 md:p-1.5 md:space-y-1.5 overflow-y-auto flex-grow min-h-[100px]">
                        {slotsForDay.map(slot => {
                            const assignmentForSlot = assignmentsForDay.find(a => a.time === slot.startTime && (a.type === (slot.type === 'general' ? 'publica' : slot.type) || a.type === slot.type));
                            return (
                                <div key={slot.id} className="p-2 md:p-1.5 rounded-md bg-muted/30 text-sm md:text-xs shadow-sm group relative min-h-[60px] flex flex-col justify-center">
                                    {assignmentForSlot ? (
                                        <AssignmentItem assignment={assignmentForSlot} onEdit={() => handleOpenEditDialog(assignmentForSlot)} onDelete={() => handleDeleteAssignment(assignmentForSlot)} />
                                    ) : (
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center text-muted-foreground">
                                                <PreachingTypeIcon type={slot.type} />
                                                <span>{slot.startTime}</span>
                                                <span className="ml-2 capitalize">{slot.type === 'general' ? 'Pública' : slot.type}</span>
                                                {slot.status === 'tentative' && <Badge variant="outline" className="ml-2 text-amber-600 border-amber-500 px-1 py-0 text-[0.6rem]">Tentativo</Badge>}
                                            </div>
                                            {canManageProgram && !isBefore(day, startOfDay(new Date())) && (
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenAddDialog(day, slot)}>
                                                    <PlusCircle className="h-4 w-4 text-primary" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {assignmentsForDay.filter(a => !slotsForDay.some(s => s.startTime === a.time && (s.type === a.type || (s.type === 'general' && a.type === 'publica')))).map(unmatchedAssignment => (
                            <div key={unmatchedAssignment.id} className="p-2 md:p-1.5 rounded-md bg-rose-500/10 border border-dashed border-rose-500/30 text-sm md:text-xs shadow-sm group relative min-h-[60px] flex flex-col justify-center">
                                <AssignmentItem assignment={unmatchedAssignment} onEdit={() => handleOpenEditDialog(unmatchedAssignment)} onDelete={() => handleDeleteAssignment(unmatchedAssignment)} />
                            </div>
                        ))}
                      </CardContent>
                      {canManageProgram && !isBefore(day, startOfDay(new Date())) && (
                          <CardFooter className="p-2 md:p-1 mt-auto border-t border-dashed">
                            <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => handleOpenAddDialog(day)}>
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5"/> Añadir Manual
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
            slot={slotForManualAdd}
            allPublishers={allPublishers}
            allTerritories={allTerritories}
            allCasas={allCasas}
            allAssignments={allAssignments}
        />
      )}
    </div>
  );
}



    