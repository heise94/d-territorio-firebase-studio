
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, PlusCircle, Users as UsersIcon, Home as HomeIcon, AlertTriangle, MountainSnow, Video, Users2 as GroupIconLucide, Eye, Edit, Trash2, Pencil, Gift, MapPin as MapPinIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, getDaysInMonth, startOfMonth, endOfMonth, getDay, isSameDay, parseISO, parse, isAfter, isBefore as isBeforeDateFns, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import type { GroupAssignment, ProgramScheduleSlot, PublisherDetail, Casa, PreachingType, PreachingAssignedType, PreachingGroup, DayOfWeek, CustomHoliday, TerritoryType, AdditionalTerritoryInfo, UserProfile, SettingsDoc } from "@/types";
import { AddGroupAssignmentDialog, type GroupAssignmentSubmitDataType } from "@/components/mi-grupo/programa/add-group-assignment-dialog";
import { SuggestTerritoryForGroupAssignmentDialog } from "@/components/mi-grupo/programa/suggest-territory-for-group-assignment-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { Timestamp, collection, doc, onSnapshot, query, where, setDoc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { USER_ROLES } from "@/lib/constants";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(currentYear, i), "MMMM", { locale: es }),
}));


const DAY_OF_WEEK_MAP_NUM_TO_KEY: Record<number, DayOfWeek> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};


const PreachingTypeIcon = ({ type, className }: { type: PreachingType, className?: string }) => {
  const defaultClass = "mr-1 h-4 w-4 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  if (type === 'zoom') return <Video className={combinedClass} />;
  return <UsersIcon className={combinedClass} />;
};


export default function MiGrupoProgramaPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [groupAssignments, setGroupAssignments] = useState<GroupAssignment[]>([]);
  const [isAddAssignmentDialogOpen, setIsAddAssignmentDialogOpen] = useState(false);
  const { toast } = useToast();
  const { userProfile, isLoadingPermissions } = usePermissions();
  const [adminSelectedGroupId, setAdminSelectedGroupId] = useState<string | null>(null);

  const [assignmentToEdit, setAssignmentToEdit] = useState<GroupAssignment | null>(null);
  const [assignmentToDeleteId, setAssignmentToDeleteId] = useState<string | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [initialDateForDialog, setInitialDateForDialog] = useState<Date | null>(null);
  
  const [isSuggestTerritoryDialogOpen, setIsSuggestTerritoryDialogOpen] = useState(false);
  const [assignmentForTerritorySuggestion, setAssignmentForTerritorySuggestion] = useState<GroupAssignment | null>(null);
  
  // Data states
  const [allPublishers, setAllPublishers] = useState<UserProfile[]>([]);
  const [allCasas, setAllCasas] = useState<Casa[]>([]);
  const [allGroups, setAllGroups] = useState<PreachingGroup[]>([]);
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<DayOfWeek[]>([]);
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Fetch static data from Firestore
  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    const unsubscribers: (() => void)[] = [];

    // Fetch Users
    const usersQuery = query(collection(db, "users"), where("status", "==", "Activo"));
    unsubscribers.push(onSnapshot(usersQuery, (snapshot) => {
        setAllPublishers(snapshot.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)));
    }));

    // Fetch Casas
    const casasQuery = query(collection(db, "casas"));
    unsubscribers.push(onSnapshot(casasQuery, (snapshot) => {
        setAllCasas(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Casa)));
    }));

    // Fetch Groups
    const groupsQuery = query(collection(db, "preachingGroups"));
    unsubscribers.push(onSnapshot(groupsQuery, (snapshot) => {
        setAllGroups(snapshot.docs.map(d => ({id: d.id, ...d.data()} as PreachingGroup)));
    }));

    // Fetch Settings
    const programConfigRef = doc(db, "settings", "programConfig");
    unsubscribers.push(onSnapshot(programConfigRef, (docSnap) => {
        if (docSnap.exists()) {
            const settings = docSnap.data() as SettingsDoc;
            setGroupOrganizedDays(settings.groupOrganizedDays || []);
        }
    }));

    const eventsConfigRef = doc(db, "settings", "specialEventsConfig");
    unsubscribers.push(onSnapshot(eventsConfigRef, (docSnap) => {
        if (docSnap.exists()) {
            const settings = docSnap.data() as SettingsDoc;
            const holidays = (settings.holidaysList || []).map(h => ({ ...h, date: h.date instanceof Timestamp ? h.date.toDate() : h.date }));
            setCustomHolidays(holidays);
        }
    }));
    
    // Once all initial listeners are set up, we can consider it loaded.
    const loadingTimer = setTimeout(() => setIsLoading(false), 1500); 
    unsubscribers.push(() => clearTimeout(loadingTimer));

    return () => unsubscribers.forEach(unsub => unsub());

  }, [toast]);


  const currentGroupId = useMemo(() => {
    if (userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO) {
      return adminSelectedGroupId;
    }
    return userProfile?.assignedGroupId;
  }, [userProfile, adminSelectedGroupId]);

  const currentGroupPublishers = useMemo(() => {
    if (!currentGroupId) return [];
    return allPublishers.filter(p => 
      p.assignedGroupId === currentGroupId && 
      (p.status !== 'Bloqueado' || !p.blockInfo?.forGroup)
    );
  }, [currentGroupId, allPublishers]);

  const currentGroupCasas = useMemo(() => {
    if (!currentGroupId) return [];
    return allCasas.filter(c => 
      c.addedByGroupId === currentGroupId && 
      (!c.blockInfo || !c.blockInfo.forGroup)
    );
  }, [currentGroupId, allCasas]);

  useEffect(() => {
    if (userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO && !adminSelectedGroupId && allGroups.length > 0) {
      // Optional: auto-select first group for admin or leave as is to force selection
    }
  }, [userProfile?.role, adminSelectedGroupId, allGroups]);


  useEffect(() => {
    if (!currentGroupId) {
        setGroupAssignments([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    const q = query(
        collection(db, "groupAssignments"),
        where("groupId", "==", currentGroupId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
        const endDate = endOfMonth(new Date(selectedYear, selectedMonth));

        const fetchedAssignments = snapshot.docs.map(doc => doc.data() as GroupAssignment)
            .filter(assign => {
                const assignDate = parse(assign.date, 'yyyy-MM-dd', new Date());
                return isWithinInterval(assignDate, { start: startDate, end: endDate });
            })
            .sort((a,b) => parse(a.date, 'yyyy-MM-dd', new Date()).getTime() - parse(b.date, 'yyyy-MM-dd', new Date()).getTime() || a.time.localeCompare(b.time));
        
        setGroupAssignments(fetchedAssignments);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching group assignments:", error);
        toast({ title: "Error", description: "No se pudieron cargar las asignaciones del grupo.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedMonth, selectedYear, currentGroupId, toast]);

  const handleOpenAddDialog = (dateForAssignment?: Date) => {
    setAssignmentToEdit(null);
    setInitialDateForDialog(dateForAssignment || null);
    setIsAddAssignmentDialogOpen(true);
  };

  const handleOpenEditDialog = (assignment: GroupAssignment) => {
    setAssignmentToEdit(assignment);
    setInitialDateForDialog(null); 
    setIsAddAssignmentDialogOpen(true);
  };

  const handleAssignmentSubmit = async (submittedData: GroupAssignmentSubmitDataType) => {
    if (!currentGroupId || !userProfile?.firebaseAuthUid) {
      toast({ title: "Error", description: "No se pudo identificar el grupo o usuario.", variant: "destructive" });
      return;
    }

    const isEdit = !!submittedData.id;
    const docId = isEdit ? submittedData.id! : crypto.randomUUID();

    const dataToSave: Partial<GroupAssignment> = {
        ...submittedData,
        id: docId,
        groupId: currentGroupId,
        updatedAt: Timestamp.now(),
        updatedBy: userProfile.firebaseAuthUid
    };

    if (!isEdit) {
        dataToSave.createdAt = Timestamp.now();
        dataToSave.createdBy = userProfile.firebaseAuthUid;
    }

    const docRef = doc(db, "groupAssignments", docId);
    
    try {
        await setDoc(docRef, dataToSave, { merge: true });
        toast({ title: isEdit ? "Asignación Actualizada" : "Asignación Creada", description: "Los cambios se guardaron en Firestore." });
        setIsAddAssignmentDialogOpen(false);
    } catch (error) {
        console.error("Error saving group assignment:", error);
        toast({ title: "Error al Guardar", description: "No se pudo guardar la asignación.", variant: "destructive" });
    }
  };

  const handleOpenDeleteDialog = (assignmentId: string) => {
    setAssignmentToDeleteId(assignmentId);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDeleteId) return;
    const docRef = doc(db, "groupAssignments", assignmentToDeleteId);
    try {
        await deleteDoc(docRef);
        toast({ title: "Asignación Eliminada", description: "La asignación ha sido eliminada de Firestore.", variant: "destructive" });
    } catch (error) {
        console.error("Error deleting group assignment:", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar la asignación.", variant: "destructive" });
    } finally {
        setIsConfirmDeleteDialogOpen(false);
        setAssignmentToDeleteId(null);
    }
  };

  const handleOpenSuggestTerritoryDialog = (groupAssignment: GroupAssignment) => {
    setAssignmentForTerritorySuggestion(groupAssignment);
    setIsSuggestTerritoryDialogOpen(true);
  };

  const handleTerritorySelectedForAssignment = async (
    selectedTerritory: AdditionalTerritoryInfo,
    groupAssignmentContext: GroupAssignment
  ) => {
    if (!userProfile?.firebaseAuthUid || !currentGroupId) return;
  
    const batch = writeBatch(db);
  
    // 1. Update the group assignment document
    const groupAssignmentRef = doc(db, "groupAssignments", groupAssignmentContext.id);
    batch.update(groupAssignmentRef, {
      assignedTerritoryId: selectedTerritory.id,
      assignedTerritoryName: selectedTerritory.name,
      updatedAt: Timestamp.now(),
      updatedBy: userProfile.firebaseAuthUid,
    });
  
    // 2. Create a new personal assignment for the captain
    const captainProfile = allPublishers.find(
      (p) => p.id === groupAssignmentContext.captainUserId || p.firebaseAuthUid === groupAssignmentContext.captainUserId
    );
  
    if (!captainProfile || !captainProfile.firebaseAuthUid) {
      toast({
        title: "Error: Capitán sin ID de Auth",
        description: "No se pudo encontrar el perfil del capitán o le falta un UID de autenticación.",
        variant: "destructive",
      });
      return;
    }
  
    const newPersonalAssignmentRef = doc(collection(db, "assignments"));
    const newAssignmentData = {
      id: newPersonalAssignmentRef.id,
      date: groupAssignmentContext.date,
      time: groupAssignmentContext.time,
      type: selectedTerritory.type === "urban" ? "publica" : "rural" as PreachingAssignedType,
      locationName: selectedTerritory.name,
      locationId: selectedTerritory.id,
      status: "accepted" as const,
      assignedBy: `SG: ${userProfile?.name || "Desconocido"}`,
      userId: captainProfile.firebaseAuthUid,
      userName: captainProfile.name,
      userEmail: captainProfile.email,
      userPhoneNumber: captainProfile.phoneNumber || null,
      assignedGroupId: currentGroupId,
      notes: `Territorio asignado por SG para la salida de grupo. ${groupAssignmentContext.notes || ""}`.trim(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    batch.set(newPersonalAssignmentRef, newAssignmentData);
  
    try {
      await batch.commit();
      toast({
        title: "Territorio Asignado y Notificado",
        description: `El territorio "${selectedTerritory.name}" ha sido asignado a ${groupAssignmentContext.captainName} para la salida del grupo.`,
        duration: 7000,
      });
    } catch (error) {
      console.error("Error committing batch assignment:", error);
      toast({
        title: "Error al Asignar",
        description: "No se pudo guardar la asignación y notificar al publicador.",
        variant: "destructive",
      });
    }
  
    setIsSuggestTerritoryDialogOpen(false);
    setAssignmentForTerritorySuggestion(null);
  };


  const filteredAssignmentsForMonth = useMemo(() => {
    if (!currentGroupId) return [];
    return groupAssignments.filter(assign => {
      const assignDate = parse(assign.date, 'yyyy-MM-dd', new Date());
      return assign.groupId === currentGroupId && assignDate.getFullYear() === selectedYear && assignDate.getMonth() === selectedMonth;
    });
  }, [groupAssignments, selectedMonth, selectedYear, currentGroupId]);

  if (isLoadingPermissions) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const isAdminView = userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO;
  const isSGView = userProfile?.role === USER_ROLES.SG;

  if (!isSGView && !isAdminView) {
     return (
      <div className="space-y-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa de Grupo
        </h1>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/>Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No tienes los permisos necesarios para ver esta sección. Esta área es para Superintendentes de Grupo (SG) o Encargados de Territorio.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSGView && !userProfile?.assignedGroupId) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa de Mi Grupo
        </h1>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/>No Asignado a un Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No estás asignado a ningún grupo de predicación. Contacta al administrador.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const firstDayOfMonth = startOfMonth(new Date(selectedYear, selectedMonth));
  const daysInMonth = getDaysInMonth(firstDayOfMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth); 
  const dayOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek -1; 

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => new Date(selectedYear, selectedMonth, i + 1));

  const selectedGroupName = allGroups.find(g => g.id === currentGroupId)?.name;
  const pageTitle = isAdminView
    ? `Programa del Grupo ${selectedGroupName ? `- ${selectedGroupName}` : '(Seleccione un grupo)'}`
    : `Programa de Mi Grupo ${userProfile?.assignedGroupId && !selectedGroupName ? `(${allGroups.find(g => g.id === userProfile.assignedGroupId)?.name || userProfile.assignedGroupId})` : selectedGroupName ? `(${selectedGroupName})` : ''}`;


  return (
    <TooltipProvider>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          {pageTitle}
        </h1>
        <p className="text-muted-foreground mt-1">
          Planifica las asignaciones de predicación para el grupo (días, horarios, encargados y lugar de reunión). Los territorios se asignan dinámicamente el día de la predicación.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Planificación del Grupo</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
              {isAdminView && (
                <Select value={adminSelectedGroupId || ""} onValueChange={(value) => setAdminSelectedGroupId(value === "NONE" ? null : value)}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="Seleccionar Grupo a Gestionar" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="NONE">Ninguno (Seleccione un grupo)</SelectItem>
                        {allGroups.map(group => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              )}
              <div className="flex gap-3 items-center w-full sm:w-auto">
                <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Selecciona Mes" />
                    </SelectTrigger>
                    <SelectContent>
                    {months.map(month => (
                        <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                    <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Selecciona Año" />
                    </SelectTrigger>
                    <SelectContent>
                    {years.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
          </div>
           {isAdminView && !adminSelectedGroupId && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 flex items-center"><AlertTriangle className="mr-2 h-4 w-4" />Por favor, selecciona un grupo para ver o añadir asignaciones.</p>
            )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Cargando datos...</p>
            </div>
          ) : !currentGroupId && isAdminView ? (
             <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-lg border border-dashed">
              <Eye className="h-20 w-20 text-muted-foreground/70 mb-6" />
              <p className="text-xl font-medium text-muted-foreground mb-2">Selecciona un Grupo</p>
              <p className="text-sm text-muted-foreground">
                Como administrador, elige un grupo de la lista de arriba para gestionar su programa.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground pb-2 border-b">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => <div key={day}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: dayOffset }).map((_, i) => <div key={`empty-${i}`} className="border rounded-md min-h-[160px] bg-muted/30"></div>)}

                {calendarDays.map(day => {
                  const dayString = format(day, "yyyy-MM-dd");
                  const assignmentsForDay = filteredAssignmentsForMonth.filter(a => a.date === dayString)
                                          .sort((a,b) => a.time.localeCompare(b.time));
                  const isToday = isSameDay(day, new Date());
                  const dayOfWeekKey = DAY_OF_WEEK_MAP_NUM_TO_KEY[getDay(day)];
                  const isAuthorizedDayForGroup = groupOrganizedDays.includes(dayOfWeekKey);
                  const isPastDay = isBeforeDateFns(day, new Date()) && !isSameDay(day, new Date());
                  
                  const holidayForDay = customHolidays.find(h => {
                    const holidayDate = h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date);
                    return isSameDay(holidayDate, day);
                  });
                  
                  const canAddAssignment = isAuthorizedDayForGroup && !isPastDay && currentGroupId; 

                  let dayCardClasses = `min-h-[160px] flex flex-col rounded-md shadow-sm ${isToday ? 'border-2 border-primary bg-primary/5' : 'border bg-card'} ${isPastDay ? 'opacity-70 bg-muted/40' : ''}`;
                  if (holidayForDay) {
                    dayCardClasses += ' bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700/40';
                  }


                  return (
                    <Card key={dayString} className={dayCardClasses}>
                      <CardHeader className="p-2 pb-1 flex flex-row justify-between items-start">
                        <CardTitle className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {format(day, "d")}
                        </CardTitle>
                        {holidayForDay && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-teal-500 text-teal-700 bg-teal-100 dark:text-teal-300 dark:bg-teal-800/50 dark:border-teal-600 cursor-default">
                                            <Gift size={10} className="mr-1"/> Festivo
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{holidayForDay.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                        )}
                      </CardHeader>
                      <CardContent className={`p-1.5 space-y-1.5 overflow-y-auto flex-grow ${assignmentsForDay.length === 0 && canAddAssignment ? 'flex flex-col items-center justify-center' : ''}`}>
                        {assignmentsForDay.length > 0 ? (
                          <>
                            {assignmentsForDay.map(assign => (
                              <div key={assign.id} className="p-1.5 rounded-md bg-muted/50 hover:bg-muted/70 text-xs shadow-sm relative group">
                                <div className="flex items-center font-semibold">
                                  <PreachingTypeIcon type={assign.preachingType} className="text-primary shrink-0 h-3 w-3" />
                                  <span className="ml-1">{assign.time}</span>
                                </div>
                                <p className="truncate text-foreground/90" title={assign.captainName}>{assign.captainName}</p>
                                {assign.casaName && <p className="truncate text-muted-foreground text-[0.7rem]" title={assign.casaName}><HomeIcon size={10} className="inline mr-0.5"/>{assign.casaName}</p>}
                                {assign.assignedTerritoryName ? (
                                    <p className="truncate text-green-700 dark:text-green-400 text-[0.7rem] font-medium" title={assign.assignedTerritoryName}><MapPinIcon size={10} className="inline mr-0.5"/>{assign.assignedTerritoryName}</p>
                                ) : !isPastDay && (
                                    <Button variant="outline" size="sm" className="w-full mt-1.5 text-xs h-7" onClick={() => handleOpenSuggestTerritoryDialog(assign)}>
                                      <MapPinIcon className="mr-1.5 h-3 w-3" /> Asignar Terr.
                                    </Button>
                                )}

                                {!isPastDay && (
                                  <div className="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-background/80 backdrop-blur-sm rounded-bl-md rounded-tr-md p-0.5">
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenEditDialog(assign)} aria-label="Editar asignación"><Pencil className="h-3 w-3 text-blue-600" /></Button></TooltipTrigger><TooltipContent><p>Editar</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenDeleteDialog(assign.id)} aria-label="Eliminar asignación"><Trash2 className="h-3 w-3 text-destructive" /></Button></TooltipTrigger><TooltipContent><p>Eliminar</p></TooltipContent></Tooltip>
                                  </div>
                                )}
                              </div>
                            ))}
                            {canAddAssignment && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2 text-xs"
                                onClick={() => handleOpenAddDialog(day)}
                                title={`Añadir otra asignación para ${format(day, "dd/MM")}`}
                              >
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Añadir Otra
                              </Button>
                            )}
                          </>
                        ) : canAddAssignment ? (
                          <Button
                            variant="ghost"
                            className="h-auto w-auto p-3 rounded-full aspect-square flex flex-col items-center justify-center text-primary hover:bg-primary/10"
                            onClick={() => handleOpenAddDialog(day)}
                            title={`Añadir asignación para ${format(day, "dd/MM")}`}
                          >
                            <PlusCircle className="h-8 w-8" />
                            <span className="mt-1 text-xs">Añadir</span>
                          </Button>
                        ) : (
                           <div className="h-full flex items-center justify-center">
                            {holidayForDay && <p className="text-xs text-teal-700 dark:text-teal-400 text-center p-1">Día festivo: {holidayForDay.name}</p>}
                          </div>
                        )}
                      </CardContent>
                      {(!isAuthorizedDayForGroup || (holidayForDay && !canAddAssignment) ) && ( 
                        <CardFooter className="p-1 mt-auto border-t border-dashed">
                            <p className="text-[0.65rem] text-muted-foreground/70 text-center w-full">
                                {!isAuthorizedDayForGroup ? "No hab." : holidayForDay ? "Festivo" : ""}
                            </p>
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

      {currentGroupId && (
        <AddGroupAssignmentDialog
            isOpen={isAddAssignmentDialogOpen}
            onOpenChange={setIsAddAssignmentDialogOpen}
            onAssignmentSubmit={handleAssignmentSubmit}
            currentMonth={selectedMonth}
            currentYear={selectedYear}
            groupPublishers={currentGroupPublishers}
            groupCasas={currentGroupCasas}
            groupOrganizedDays={groupOrganizedDays}
            assignmentToEdit={assignmentToEdit}
            initialDate={initialDateForDialog}
        />
      )}

      {assignmentForTerritorySuggestion && currentGroupId && (
        <SuggestTerritoryForGroupAssignmentDialog
          isOpen={isSuggestTerritoryDialogOpen}
          onOpenChange={setIsSuggestTerritoryDialogOpen}
          groupAssignment={assignmentForTerritorySuggestion}
          currentGroupId={currentGroupId}
          onTerritorySelected={handleTerritorySelectedForAssignment}
        />
      )}

       <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar esta asignación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La asignación será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssignmentToDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
