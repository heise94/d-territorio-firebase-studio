
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, PlusCircle, Users as UsersIcon, Home as HomeIcon, AlertTriangle, MountainSnow, Video, Users2 as GroupIconLucide, Eye, Edit, Trash2, Pencil, Gift, MapPin as MapPinIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, getDaysInMonth, startOfMonth, endOfMonth, getDay, isSameDay, parseISO, parse, isAfter, isBefore as isBeforeDateFns } from 'date-fns';
import { es } from 'date-fns/locale';
import type { GroupAssignment, ProgramScheduleSlot, PublisherDetail, Casa, PreachingType, PreachingGroup, DayOfWeek, CustomHoliday, TerritoryType, AdditionalTerritoryInfo } from "@/types";
import { AddGroupAssignmentDialog } from "@/components/mi-grupo/programa/add-group-assignment-dialog";
import { SuggestTerritoryForGroupAssignmentDialog } from "@/components/mi-grupo/programa/suggest-territory-for-group-assignment-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { Timestamp } from "firebase/firestore";
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

const MOCK_GROUP_PUBLISHERS: PublisherDetail[] = [
    { id: "uidUser1", name: "Ana Pérez (G1)", email: "ana@example.com", availability: { availableSlotIds: [] }, assignedGroupId: "G1" },
    { id: "uidUser2", name: "Luis Gómez (G1)", email: "luis@example.com", availability: { availableSlotIds: [] }, assignedGroupId: "G1" },
    { id: "uidUser3", name: "Carlos Díaz (G2)", email: "carlos@example.com", availability: { availableSlotIds: [] }, assignedGroupId: "G2" },
    { id: "uidUser4", name: "Elena Jara (G2)", email: "elena@example.com", availability: { availableSlotIds: [] }, assignedGroupId: "G2" },
];

const MOCK_GROUP_CASAS: Casa[] = [
    { id: "casaG1-A", ownerName: "Familia Pérez (G1)", address: "Calle Sol 123, G1", isBlocked: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), addedByGroupId: "G1" },
    { id: "casaG1-B", ownerName: "Hna. Ana (G1)", address: "Av. Luna 456, G1", isBlocked: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), addedByGroupId: "G1" },
    { id: "casaG2-A", ownerName: "Familia Díaz (G2)", address: "Pasaje Estrella 789, G2", isBlocked: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), addedByGroupId: "G2" },
];

const MOCK_ALL_GROUPS_FOR_ADMIN_SELECT: Pick<PreachingGroup, 'id' | 'name'>[] = [
    { id: 'G1', name: 'Grupo Los Pioneros' },
    { id: 'G2', name: 'Grupo Betel' },
    { id: 'G3', name: 'Grupo Emanuel' },
];

const MOCK_GROUP_ORGANIZED_DAYS: DayOfWeek[] = ['saturday', 'sunday']; 

const MOCK_CUSTOM_HOLIDAYS: CustomHoliday[] = [
    { id: "h1", name: "Año Nuevo", date: Timestamp.fromDate(new Date(new Date().getFullYear(), 0, 1)), createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    { id: "h4", name: "Festivo de Prueba", date: Timestamp.fromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 15)), createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
];


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
  const [isLoading, setIsLoading] = useState(false); 
  const { toast } = useToast();
  const { userProfile, isLoadingPermissions } = usePermissions();
  const [adminSelectedGroupId, setAdminSelectedGroupId] = useState<string | null>(null);

  const [assignmentToEdit, setAssignmentToEdit] = useState<GroupAssignment | null>(null);
  const [assignmentToDeleteId, setAssignmentToDeleteId] = useState<string | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [initialDateForDialog, setInitialDateForDialog] = useState<Date | null>(null);
  
  const [isSuggestTerritoryDialogOpen, setIsSuggestTerritoryDialogOpen] = useState(false);
  const [assignmentForTerritorySuggestion, setAssignmentForTerritorySuggestion] = useState<GroupAssignment | null>(null);


  const currentGroupId = useMemo(() => {
    if (userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO) {
      return adminSelectedGroupId;
    }
    return userProfile?.assignedGroupId;
  }, [userProfile, adminSelectedGroupId]);

  const currentGroupPublishers = useMemo(() => {
    if (!currentGroupId) return [];
    return MOCK_GROUP_PUBLISHERS.filter(p => p.assignedGroupId === currentGroupId);
  }, [currentGroupId]);

  const currentGroupCasas = useMemo(() => {
    if (!currentGroupId) return [];
    return MOCK_GROUP_CASAS.filter(c => c.addedByGroupId === currentGroupId);
  }, [currentGroupId]);

  useEffect(() => {
    if (userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO && !adminSelectedGroupId && MOCK_ALL_GROUPS_FOR_ADMIN_SELECT.length > 0) {
      // Optional: auto-select first group for admin or leave as is to force selection
      // setAdminSelectedGroupId(MOCK_ALL_GROUPS_FOR_ADMIN_SELECT[0].id);
    }
  }, [userProfile?.role, adminSelectedGroupId]);


  useEffect(() => {
    if (currentGroupId) {
        console.log(`Displaying assignments for group ${currentGroupId}, month ${selectedMonth}, year ${selectedYear}`);
    }
  }, [selectedMonth, selectedYear, currentGroupId]);

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

  const handleAssignmentSubmit = (submittedData: Omit<GroupAssignment, 'groupId' | 'createdAt' | 'createdBy'> & { id?: string }) => {
    if (!currentGroupId || !userProfile?.firebaseAuthUid) {
      toast({ title: "Error", description: "No se pudo identificar el grupo o usuario.", variant: "destructive" });
      return;
    }

    if (submittedData.id) { 
      setGroupAssignments(prev =>
        prev.map(assign =>
          assign.id === submittedData.id
            ? { ...assign, ...submittedData, groupId: currentGroupId, updatedAt: Timestamp.now() } as GroupAssignment 
            : assign
        ).sort((a,b) => parse(a.date, 'yyyy-MM-dd', new Date()).getTime() - parse(b.date, 'yyyy-MM-dd', new Date()).getTime() || a.time.localeCompare(b.time))
      );
      toast({ title: "Asignación Actualizada", description: "La asignación ha sido actualizada." });
    } else { 
      const assignmentToAdd: GroupAssignment = {
        ...submittedData,
        id: crypto.randomUUID(),
        groupId: currentGroupId,
        createdAt: Timestamp.now(),
        createdBy: userProfile.firebaseAuthUid,
      };
      setGroupAssignments(prev => [...prev, assignmentToAdd].sort((a,b) => parse(a.date, 'yyyy-MM-dd', new Date()).getTime() - parse(b.date, 'yyyy-MM-dd', new Date()).getTime() || a.time.localeCompare(b.time)));
      toast({ title: "Asignación Creada", description: "La nueva asignación ha sido creada." });
    }
    setIsAddAssignmentDialogOpen(false);
  };

  const handleOpenDeleteDialog = (assignmentId: string) => {
    setAssignmentToDeleteId(assignmentId);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!assignmentToDeleteId) return;
    setGroupAssignments(prev => prev.filter(assign => assign.id !== assignmentToDeleteId));
    toast({ title: "Asignación Eliminada", description: "La asignación ha sido eliminada.", variant: "destructive" });
    setIsConfirmDeleteDialogOpen(false);
    setAssignmentToDeleteId(null);
  };

  const handleOpenSuggestTerritoryDialog = (groupAssignment: GroupAssignment) => {
    setAssignmentForTerritorySuggestion(groupAssignment);
    setIsSuggestTerritoryDialogOpen(true);
  };

  const handleTerritorySelectedForAssignment = (
    selectedTerritory: AdditionalTerritoryInfo,
    groupAssignmentContext: GroupAssignment
  ) => {
    setGroupAssignments(prev =>
      prev.map(ga =>
        ga.id === groupAssignmentContext.id
          ? { ...ga, assignedTerritoryId: selectedTerritory.id, assignedTerritoryName: selectedTerritory.name }
          : ga
      )
    );

    const newUserAssignment = {
      id: crypto.randomUUID(),
      date: groupAssignmentContext.date,
      time: groupAssignmentContext.time,
      type: selectedTerritory.type === 'urban' ? 'publica' : 'rural' as PreachingType,
      locationName: selectedTerritory.name,
      locationId: selectedTerritory.id,
      status: 'accepted' as const,
      assignedBy: `SG: ${userProfile?.name || 'Desconocido'}`,
      userId: groupAssignmentContext.captainUserId,
      userName: groupAssignmentContext.captainName,
      notes: `Territorio asignado por SG para la salida de grupo. ${groupAssignmentContext.notes || ''}`.trim(),
    };

    // En un escenario real, aquí se guardaría newUserAssignment en Firestore.
    // Por ahora, solo mostraremos un toast.
    console.log("Simulando creación de UserAssignment:", newUserAssignment);
    toast({
      title: "Territorio Asignado al Grupo",
      description: `El territorio "${selectedTerritory.name}" ha sido asignado a ${groupAssignmentContext.captainName} para la salida del ${groupAssignmentContext.date} a las ${groupAssignmentContext.time}. Se creó una asignación individual para el reporte.`,
      duration: 7000,
    });

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

  const selectedGroupName = MOCK_ALL_GROUPS_FOR_ADMIN_SELECT.find(g => g.id === currentGroupId)?.name;
  const pageTitle = isAdminView
    ? `Programa del Grupo ${selectedGroupName ? `- ${selectedGroupName}` : '(Seleccione un grupo)'}`
    : `Programa de Mi Grupo ${userProfile?.assignedGroupId && !selectedGroupName ? `(${MOCK_ALL_GROUPS_FOR_ADMIN_SELECT.find(g => g.id === userProfile.assignedGroupId)?.name || userProfile.assignedGroupId})` : selectedGroupName ? `(${selectedGroupName})` : ''}`;


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
                        {MOCK_ALL_GROUPS_FOR_ADMIN_SELECT.map(group => (
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
              <p className="text-lg font-medium text-muted-foreground">Cargando asignaciones...</p>
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
                  const isAuthorizedDayForGroup = MOCK_GROUP_ORGANIZED_DAYS.includes(dayOfWeekKey);
                  const isPastDay = isBeforeDateFns(day, new Date()) && !isSameDay(day, new Date());
                  
                  const holidayForDay = MOCK_CUSTOM_HOLIDAYS.find(h => isSameDay(h.date.toDate(), day));
                  
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
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenEditDialog(assign)}>
                                      <Pencil className="h-3 w-3 text-blue-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenDeleteDialog(assign.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
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
            groupOrganizedDays={MOCK_GROUP_ORGANIZED_DAYS}
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

