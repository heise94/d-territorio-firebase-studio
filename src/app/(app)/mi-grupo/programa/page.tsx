
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, PlusCircle, Users as UsersIcon, Home as HomeIcon, AlertTriangle, MountainSnow, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, getDaysInMonth, startOfMonth, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import type { GroupAssignment, ProgramScheduleSlot, PublisherDetail, Casa, PreachingType } from "@/types";
import { AddGroupAssignmentDialog } from "@/components/mi-grupo/programa/add-group-assignment-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { Timestamp } from "firebase/firestore";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i); // 2 years past, current, 2 years future
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(currentYear, i), "MMMM", { locale: es }),
}));

// MOCK Data - Replace with Firestore fetching later
const MOCK_PROGRAM_SCHEDULE_SLOTS: ProgramScheduleSlot[] = [
  { id: 'mon-0900-gen', dayOfWeek: 'monday', startTime: '09:00', type: 'general', status: 'fixed' },
  { id: 'mon-1500-zoom', dayOfWeek: 'monday', startTime: '15:00', type: 'zoom', status: 'tentative' },
  { id: 'tue-1000-rur', dayOfWeek: 'tuesday', startTime: '10:00', type: 'rural', status: 'fixed' },
  { id: 'wed-0930-gen', dayOfWeek: 'wednesday', startTime: '09:30', type: 'general', status: 'fixed' },
  { id: 'thu-1400-zoom', dayOfWeek: 'thursday', startTime: '14:00', type: 'zoom', status: 'fixed' },
  { id: 'fri-1000-gen', dayOfWeek: 'friday', startTime: '10:00', type: 'general', status: 'fixed' },
  { id: 'sat-1000-gen', dayOfWeek: 'saturday', startTime: '10:00', type: 'general', status: 'fixed' },
  { id: 'sat-1100-rur', dayOfWeek: 'saturday', startTime: '11:00', type: 'rural', status: 'fixed' },
  { id: 'sun-1500-zoom', dayOfWeek: 'sunday', startTime: '15:00', type: 'zoom', status: 'fixed' },
];

const MOCK_GROUP_PUBLISHERS: PublisherDetail[] = [
    { id: "uidUser1", name: "Ana Pérez (G1)", email: "ana@example.com", availability: { availableSlotIds: [] }, assignedGroupId: "G1" },
    { id: "uidUser2", name: "Luis Gómez (G1)", email: "luis@example.com", availability: { availableSlotIds: [] }, assignedGroupId: "G1" },
    { id: "uidUser3", name: "Carlos Díaz (G2)", email: "carlos@example.com", availability: { availableSlotIds: [] }, assignedGroupId: "G2" },
];

const MOCK_GROUP_CASAS: Casa[] = [
    { id: "casaG1-A", ownerName: "Familia Pérez (G1)", address: "Calle Sol 123, G1", isBlocked: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), addedByGroupId: "G1" },
    { id: "casaG1-B", ownerName: "Hna. Ana (G1)", address: "Av. Luna 456, G1", isBlocked: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), addedByGroupId: "G1" },
    { id: "casaG2-A", ownerName: "Familia Díaz (G2)", address: "Pasaje Estrella 789, G2", isBlocked: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), addedByGroupId: "G2" },
];

const PreachingTypeIcon = ({ type, className }: { type: PreachingType, className?: string }) => {
  const defaultClass = "mr-1.5 h-4 w-4 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  if (type === 'zoom') return <Video className={combinedClass} />;
  return <UsersIcon className={combinedClass} />; // Default icon
};


export default function MiGrupoProgramaPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [groupAssignments, setGroupAssignments] = useState<GroupAssignment[]>([]);
  const [isAddAssignmentDialogOpen, setIsAddAssignmentDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userProfile, isLoadingPermissions } = usePermissions();

  // Filter publishers and casas based on the SG's group
  const currentGroupPublishers = useMemo(() => {
    if (!userProfile?.assignedGroupId) return [];
    return MOCK_GROUP_PUBLISHERS.filter(p => p.assignedGroupId === userProfile.assignedGroupId);
  }, [userProfile?.assignedGroupId]);

  const currentGroupCasas = useMemo(() => {
    if (!userProfile?.assignedGroupId) return [];
    return MOCK_GROUP_CASAS.filter(c => c.addedByGroupId === userProfile.assignedGroupId);
  }, [userProfile?.assignedGroupId]);

  useEffect(() => {
    // Here you would typically fetch assignments for the selectedMonth and selectedYear for the user's group
    // For now, we'll just log or filter existing mock data if any were global
    console.log(`Fetching assignments for group ${userProfile?.assignedGroupId}, month ${selectedMonth}, year ${selectedYear}`);
  }, [selectedMonth, selectedYear, userProfile?.assignedGroupId]);

  const handleAddAssignment = (newAssignment: Omit<GroupAssignment, 'id' | 'groupId' | 'createdAt' | 'createdBy'>) => {
    if (!userProfile?.assignedGroupId || !userProfile.firebaseAuthUid) {
      toast({ title: "Error", description: "No se pudo identificar el grupo o usuario.", variant: "destructive" });
      return;
    }
    const assignmentToAdd: GroupAssignment = {
      ...newAssignment,
      id: crypto.randomUUID(),
      groupId: userProfile.assignedGroupId,
      createdAt: Timestamp.now(),
      createdBy: userProfile.firebaseAuthUid,
    };
    setGroupAssignments(prev => [...prev, assignmentToAdd].sort((a,b) => parse(a.date, 'yyyy-MM-dd', new Date()).getTime() - parse(b.date, 'yyyy-MM-dd', new Date()).getTime() || a.time.localeCompare(b.time) ));
    toast({ title: "Asignación Creada", description: "La asignación para el grupo ha sido creada manualmente." });
  };

  const filteredAssignments = useMemo(() => {
    return groupAssignments.filter(assign => {
      const assignDate = parse(assign.date, 'yyyy-MM-dd', new Date());
      return assignDate.getFullYear() === selectedYear && assignDate.getMonth() === selectedMonth;
    });
  }, [groupAssignments, selectedMonth, selectedYear]);

  if (isLoadingPermissions) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!userProfile?.assignedGroupId) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa de Mi Grupo
        </h1>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/>Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No estás asignado a ningún grupo. Esta sección es para Superintendentes de Grupo (SG) y sus auxiliares.</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const monthDays = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth);
    const numDays = getDaysInMonth(date);
    return Array.from({ length: numDays }, (_, i) => format(startOfMonth(date), `yyyy-MM-${String(i + 1).padStart(2, '0')}`));
  }, [selectedMonth, selectedYear]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa de Mi Grupo ({userProfile.assignedGroupId})
        </h1>
        <p className="text-muted-foreground mt-1">
          Planifica y visualiza las asignaciones de predicación para tu grupo.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Planificación Manual del Grupo</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
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
            <Button onClick={() => setIsAddAssignmentDialogOpen(true)} size="lg" className="w-full sm:w-auto mt-2 sm:mt-0">
              <PlusCircle className="mr-2 h-5 w-5" /> Añadir Asignación Grupal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Cargando asignaciones...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-lg border border-dashed">
              <CalendarDays className="h-20 w-20 text-muted-foreground/70 mb-6" />
              <p className="text-xl font-medium text-muted-foreground mb-2">Sin asignaciones para este mes.</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en "Añadir Asignación Grupal" para crear la primera.
              </p>
            </div>
          ) : (
             <div className="space-y-6">
              <h2 className="text-2xl font-semibold font-headline text-center">
                Asignaciones para {months.find(m => m.value === selectedMonth)?.label} de {selectedYear}
              </h2>
              {monthDays.map(dayString => {
                const assignmentsForDay = filteredAssignments.filter(a => a.date === dayString);
                if (assignmentsForDay.length === 0) return null;

                return (
                  <Card key={dayString} className="shadow-md">
                    <CardHeader className="pb-2 bg-muted/30 rounded-t-md">
                      <CardTitle className="text-lg font-semibold">
                        {format(parse(dayString, 'yyyy-MM-dd', new Date()), "EEEE, dd 'de' MMMM", { locale: es })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ul className="space-y-3">
                        {assignmentsForDay.map(assign => (
                          <li key={assign.id} className="p-3 border rounded-md shadow-sm bg-card hover:bg-muted/10 transition-colors">
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center">
                                    <PreachingTypeIcon type={assign.preachingType} className="text-primary h-5 w-5" />
                                    <span className="font-medium text-primary ml-1">{assign.time} - {assign.captainName || "No asignado"}</span>
                                </div>
                                <span className="text-xs text-muted-foreground capitalize">{assign.preachingType}</span>
                            </div>
                            {assign.casaName && <p className="text-sm flex items-center"><HomeIcon size={14} className="mr-1.5 text-muted-foreground shrink-0"/> Casa: {assign.casaName}</p>}
                            {assign.notes && <p className="text-xs italic text-muted-foreground mt-1">Notas: {assign.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddGroupAssignmentDialog
        isOpen={isAddAssignmentDialogOpen}
        onOpenChange={setIsAddAssignmentDialogOpen}
        onAssignmentSubmit={handleAddAssignment}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        availableSlots={MOCK_PROGRAM_SCHEDULE_SLOTS}
        groupPublishers={currentGroupPublishers}
        groupCasas={currentGroupCasas}
      />
    </div>
  );
}
