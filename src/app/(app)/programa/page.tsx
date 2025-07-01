
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Edit, Trash2, Users, MountainSnow, Video, Save, XCircle, FileText, PlusCircle, Settings as SettingsIcon, Bot, Home, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth, endOfMonth, startOfDay, endOfDay, isBefore, getDay, isSameDay, parse, parseISO, addDays, isWithinInterval } from 'date-fns';
import { collection, doc, onSnapshot, query, where, getDocs, writeBatch, serverTimestamp, Timestamp, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, PreachingAssignedType, UserProfile, Casa, Territory, Campaign, Assembly, CustomHoliday, ProgramScheduleSlot, SettingsDoc, DayOfWeek, PreachingType } from "@/types";
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";
import { AddManualAssignmentDialog, type ManualAssignmentSubmitData } from "@/components/programa/add-manual-assignment-dialog";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toPng } from 'html-to-image';
import { MonthlyScheduleImage } from "@/components/programa/monthly-schedule-image";


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
  const [summerStartDate, setSummerStartDate] = useState<string>('');
  const [winterStartDate, setWinterStartDate] = useState<string>('');
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<DayOfWeek[]>([]);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSystem, setIsGeneratingSystem] = useState(false);
  const [isSavingDrafts, setIsSavingDrafts] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Dialog States
  const [isAddManualDialogOpen, setIsAddManualDialogOpen] = useState(false);
  const [dateForManualAdd, setDateForManualAdd] = useState<Date | null>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Draft state
  const [draftAssignments, setDraftAssignments] = useState<Assignment[]>([]);
  
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
              startDate: c.startDate instanceof Timestamp ? c.startDate.toDate() : c.startDate,
              endDate: c.endDate instanceof Timestamp ? c.endDate.toDate() : c.endDate
          }));
          setCampaigns(campaignsList as Campaign[]);
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
    
    const newAssignment: Omit<Assignment, 'id'> & { id: string } = {
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
      notes: data.notes || '',
      updatedAt: Timestamp.now(),
      createdAt: data.id ? (assignmentToEdit?.createdAt || Timestamp.now()) : Timestamp.now(),
    };

    if (publisher.assignedGroupId) {
        newAssignment.assignedGroupId = publisher.assignedGroupId;
    }
    
    if (data.type !== 'zoom') {
        const territory = allTerritories.find(t => t.id === data.territoryId);
        const casa = allCasas.find(c => c.id === data.casaId);
        if (!territory || !casa) {
            toast({ title: "Error", description: "Territorio o Casa no válido.", variant: "destructive"});
            return;
        }
        const territoryDisplayName = territory.type === 'urban' && territory.number ? `U-${territory.number}` : territory.name;
        newAssignment.locationName = territoryDisplayName;
        newAssignment.territoryName = territoryDisplayName;
        newAssignment.casaName = casa?.ownerName;
        newAssignment.casaAddress = casa?.address;
    } else {
        newAssignment.locationName = "Predicación por Zoom";
    }

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
    const newDrafts: Assignment[] = [];
    let failedSlotsCount = 0;

    const existingAssignmentsInMonth = allAssignments.filter(a => {
        try {
            const d = parseISO(a.date);
            return isWithinInterval(d, { start: monthStartDate, end: monthEndDate });
        } catch(e) { return false; }
    });

    const publisherAssignmentsCount: Record<string, number> = {};
    const territoryAssignmentsCount: Record<string, number> = {};
    const casaAssignmentsCount: Record<string, number> = {};

    [...existingAssignmentsInMonth, ...draftAssignments].forEach(a => {
        const userKey = a.userId || a.userName; // Use userName as fallback for older data
        if (userKey) publisherAssignmentsCount[userKey] = (publisherAssignmentsCount[userKey] || 0) + 1;
        if (a.locationId) territoryAssignmentsCount[a.locationId] = (territoryAssignmentsCount[a.locationId] || 0) + 1;
        if (a.casaId) casaAssignmentsCount[a.casaId] = (casaAssignmentsCount[a.casaId] || 0) + 1;
    });
    
    for (let i = 0; i < getDaysInMonth(monthStartDate); i++) {
        const currentDate = addDays(monthStartDate, i);
        const dayOfWeekKey = getDay(currentDate) === 0 ? 'sunday' : format(currentDate, 'eeee', { locale: es }).toLowerCase() as DayOfWeek;

        const slotsForThisDay = programScheduleSlots.filter(s => s.dayOfWeek === dayOfWeekKey);

        for (const slot of slotsForThisDay) {
            const assignmentExists = [...existingAssignmentsInMonth, ...newDrafts].some(a =>
                a.date === format(currentDate, "yyyy-MM-dd") && a.time === slot.startTime
            );
            if (assignmentExists) continue;

            const territoryType = slot.type === 'rural' ? 'rural' : 'urban';
            
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
            
            if (availableTerritories.length === 0) { failedSlotsCount++; continue; }
            const territory = availableTerritories[0];
            
            const generallyAvailableCasas = allCasas.filter(c => 
              !c.blockInfo?.forSystem &&
              !c.unavailabilityPeriods?.some(period => 
                  isWithinInterval(currentDate, { 
                      start: startOfDay((period.startDate as Timestamp).toDate()), 
                      end: endOfDay((period.endDate as Timestamp).toDate()) 
                  })
              )
            ).sort((a,b) => (casaAssignmentsCount[a.id] || 0) - (casaAssignmentsCount[b.id] || 0));

            let casaOptions = generallyAvailableCasas.filter(c =>
                territory.associatedCasaIds?.includes(c.id)
            );
            if (casaOptions.length === 0) casaOptions = generallyAvailableCasas.filter(c => c.availableDays?.availableProgramSlotIds?.includes(slot.id));
            if (casaOptions.length === 0) casaOptions = generallyAvailableCasas;
            
            let casa = casaOptions.find(c => c.ownerName.toLowerCase().includes("salón del reino")) || casaOptions[0];
            if (!casa) { failedSlotsCount++; continue; }
            
            const assignmentsToday = [...existingAssignmentsInMonth, ...newDrafts].filter(a => a.date === format(currentDate, "yyyy-MM-dd")).map(a => a.userId);

            const potentialPublishers = allPublishers
                .filter(p => {
                    const isAllowedStatus = p.status === 'Activo' || (p.status === 'Pendiente Invitación' && p.isAssignable === true);
                    if (!isAllowedStatus) return false;
                    const userKey = p.firebaseAuthUid || p.id;
                    if (assignmentsToday.includes(userKey)) return false;
                    if (p.blockInfo?.forSystem) return false;
                    const isUnavailable = p.availability?.unavailabilityPeriods?.some(period => {
                        const start = startOfDay(period.startDate instanceof Timestamp ? period.startDate.toDate() : new Date(period.startDate));
                        const end = endOfDay(period.endDate instanceof Timestamp ? period.endDate.toDate() : new Date(period.endDate));
                        return isWithinInterval(currentDate, { start, end });
                    });
                    if (isUnavailable) return false;
                    return true;
                })
                .sort((a, b) => {
                    const countA = publisherAssignmentsCount[a.firebaseAuthUid || a.id] || 0;
                    const countB = publisherAssignmentsCount[b.firebaseAuthUid || b.id] || 0;
                    if (countA !== countB) return countA - countB;
                    
                    const aHasSlot = a.availability?.availableSlotIds?.includes(slot.id) ?? false;
                    const bHasSlot = b.availability?.availableSlotIds?.includes(slot.id) ?? false;
                    if (aHasSlot && !bHasSlot) return -1;
                    if (!aHasSlot && bHasSlot) return 1;

                    return Math.random() - 0.5;
                });
            
            if (potentialPublishers.length === 0) {
                failedSlotsCount++;
                continue;
            }
            const publisher = potentialPublishers[0];
            
            const userIdToAssign = publisher.firebaseAuthUid || publisher.id;
            const wasFallbackUsed = !(publisher.availability?.availableSlotIds?.includes(slot.id) ?? false);
            const territoryDisplayName = territory.type === 'urban' && territory.number ? `U-${territory.number}` : territory.name;
            const assignmentNotes = wasFallbackUsed 
                ? 'Asignación automática. Por favor, confirme su disponibilidad para este horario.'
                : 'Asignación generada por el sistema.';

            const newAssignmentData: Omit<Assignment, 'id'> & { id: string, isDraft: boolean } = {
                id: crypto.randomUUID(), date: format(currentDate, "yyyy-MM-dd"), time: slot.startTime,
                type: slot.type === 'general' ? 'publica' : slot.type, locationName: territoryDisplayName,
                locationId: territory.id, territoryName: territoryDisplayName, casaId: casa.id, casaName: casa.ownerName,
                casaAddress: casa.address, status: 'pending', assignedBy: 'Sistema Automático', userId: userIdToAssign,
                userName: publisher.name, userEmail: publisher.email, userPhoneNumber: publisher.phoneNumber || undefined,
                assignedGroupId: publisher.assignedGroupId || undefined, notes: assignmentNotes,
                createdAt: Timestamp.now(), updatedAt: Timestamp.now(), isDraft: true
            };

            newDrafts.push(newAssignmentData as Assignment);
            publisherAssignmentsCount[userIdToAssign] = (publisherAssignmentsCount[userIdToAssign] || 0) + 1;
            territoryAssignmentsCount[territory.id] = (territoryAssignmentsCount[territory.id] || 0) + 1;
            casaAssignmentsCount[casa.id] = (casaAssignmentsCount[casa.id] || 0) + 1;
        }
    }
    
    setDraftAssignments(newDrafts);
    toast({
        title: "Borrador Generado",
        description: `${newDrafts.length} asignaciones creadas en borrador. ${failedSlotsCount > 0 ? `${failedSlotsCount} horarios no se pudieron asignar.` : ''} Revisa y guarda para confirmar.`
    });
    setIsGeneratingSystem(false);
  };
  
  const handleSaveDrafts = async () => {
    if (draftAssignments.length === 0) return;
    setIsSavingDrafts(true);
    const batch = writeBatch(db);
    draftAssignments.forEach(draft => {
      const { isDraft, ...dataToSave } = draft;
      const docRef = doc(collection(db, "assignments"));
      batch.set(docRef, { ...dataToSave, id: docRef.id });
    });
    try {
      await batch.commit();
      toast({ title: "Programa Guardado", description: `${draftAssignments.length} asignaciones se han guardado en la base de datos.` });
      setDraftAssignments([]);
    } catch (error) {
      console.error("Error saving drafts:", error);
      toast({ title: "Error al guardar", description: "No se pudieron guardar las asignaciones.", variant: "destructive" });
    } finally {
      setIsSavingDrafts(false);
    }
  };

  const handleDiscardDrafts = () => {
    setDraftAssignments([]);
    toast({ title: "Borrador Descartado", description: "El programa generado ha sido eliminado." });
  };

  const handleGenerateImage = useCallback(async () => {
    if (!imageRef.current) {
        toast({ title: "Error", description: "No se encontró el contenido para generar la imagen.", variant: "destructive" });
        return;
    }
    setIsGeneratingImage(true);
    toast({ title: "Generando imagen...", description: "Esto puede tardar unos segundos." });

    try {
        const fontURL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
        const response = await fetch(fontURL);
        const cssText = await response.text();
        
        const dataUrl = await toPng(imageRef.current, { 
            cacheBust: true, 
            pixelRatio: 2.5, // Increased for better quality
            style: {
              fontFamily: "'Inter', sans-serif",
            },
        });
        const link = document.createElement('a');
        const monthName = format(new Date(selectedYear, selectedMonth), "MMMM-yyyy", { locale: es });
        link.download = `programa-${monthName}.png`;
        link.href = dataUrl;
        link.click();
        toast({ title: "¡Imagen Generada!", description: "La descarga de la imagen ha comenzado." });
    } catch (err) {
        console.error('Oops, something went wrong!', err);
        toast({ title: "Error al generar imagen", description: "No se pudo crear la imagen del programa.", variant: "destructive" });
    } finally {
        setIsGeneratingImage(false);
    }
  }, [selectedMonth, selectedYear, toast]);


  const assignmentsToDisplay = useMemo(() => {
    const combinedAssignments = [...allAssignments, ...draftAssignments];
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
  }, [allAssignments, draftAssignments, selectedMonth, selectedYear]);
  
  const firstDayOfMonth = startOfMonth(new Date(selectedYear, selectedMonth));
  const daysInMonth = getDaysInMonth(firstDayOfMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth);
  const dayOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => new Date(selectedYear, selectedMonth, i + 1));

  const AssignmentItem = ({ assignment, onEdit, onDelete }: { assignment: Assignment, onEdit: () => void, onDelete: () => void }) => (
    <div className="text-sm md:text-xs group relative p-2 md:p-1.5 rounded-md bg-muted/30 shadow-sm hover:bg-muted/70 transition-colors min-h-[60px] flex flex-col justify-start">
        {assignment.isDraft && (
            <Badge variant="outline" className="absolute -top-1.5 -left-1.5 text-xs px-1 py-0 border-amber-500 text-amber-600 bg-amber-500/10 z-10">Borrador</Badge>
        )}
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
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onEdit} disabled={assignment.isDraft}><Edit className="h-3 w-3 text-blue-600" /></Button>
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
              {hasPermission(PERMISSIONS.GENERATE_MONTHLY_PROGRAM) && (
                draftAssignments.length > 0 ? (
                  <>
                    <Button onClick={handleSaveDrafts} disabled={isLoading || isSavingDrafts} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                      {isSavingDrafts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Guardar Programa
                    </Button>
                    <Button onClick={handleDiscardDrafts} disabled={isLoading || isSavingDrafts} variant="destructive" className="w-full sm:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Descartar Borrador
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleSystemGeneration} disabled={isLoading || isGeneratingSystem} className="w-full sm:w-auto">
                    {isGeneratingSystem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SettingsIcon className="mr-2 h-4 w-4" />}
                    Generar con Sistema
                  </Button>
                )
              )}
              <Button onClick={handleGenerateImage} disabled={isLoading || isGeneratingImage} variant="outline" className="w-full sm:w-auto">
                {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                Generar Imagen
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
                  
                  return (
                    <Card key={dayString} className={`flex flex-col rounded-lg shadow-sm ${isToday ? 'border-2 border-primary bg-primary/5' : 'border bg-card'}`}>
                      <CardHeader className="p-3 md:p-2 pb-1 flex flex-row justify-between items-center">
                        <CardTitle className="text-base md:text-xs font-semibold md:font-medium">
                          {isMobile ? format(day, "EEEE d", { locale: es }) : format(day, "d")}
                        </CardTitle>
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
                      </CardHeader>
                      <CardContent className="p-2 space-y-2 md:p-1.5 md:space-y-1.5 overflow-y-auto flex-grow min-h-[100px]">
                        {assignmentsForDay.length > 0 ? (
                           assignmentsForDay.map(assignment => (
                              <AssignmentItem 
                                key={assignment.id}
                                assignment={assignment} 
                                onEdit={() => {
                                    if (assignment.isDraft) {
                                        toast({ title: "Guardar primero", description: "Guarda el programa antes de editar asignaciones individuales." });
                                        return;
                                    }
                                    handleOpenEditDialog(assignment);
                                }} 
                                onDelete={() => {
                                    if (assignment.isDraft) {
                                        setDraftAssignments(drafts => drafts.filter(d => d.id !== assignment.id));
                                    } else {
                                        handleDeleteAssignment(assignment);
                                    }
                                }}
                              />
                           ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground text-center">
                                No hay asignaciones programadas.
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

      <MonthlyScheduleImage 
        ref={imageRef}
        assignments={allAssignments}
        year={selectedYear}
        month={selectedMonth}
        groupOrganizedDays={groupOrganizedDays}
      />
      
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
