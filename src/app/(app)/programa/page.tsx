
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Edit, Trash2, Users, MountainSnow, Video, Save, XCircle, FileText, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth, getDay, isSameDay, parse, parseISO, endOfMonth } from 'date-fns';
import { collection, doc, onSnapshot, query, where, getDocs, writeBatch, serverTimestamp, Timestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, PreachingAssignedType, PublisherDetail, Casa, Territory, Campaign, Assembly, CustomHoliday, ProgramScheduleSlot, SettingsDoc, PreachingType, PreachingGroup, UserAssignment } from "@/types";
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";
import { AddManualAssignmentDialog, type ManualAssignmentSubmitData } from "@/components/programa/add-manual-assignment-dialog";


const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(currentYear, i), "MMMM", { locale: es }),
}));

const PreachingTypeIcon = ({ type }: { type: PreachingAssignedType }) => {
  const iconClass = "mr-1.5 h-4 w-4 shrink-0 text-muted-foreground";
  if (type === "publica") return <Users className={iconClass} />;
  if (type === "rural") return <MountainSnow className={iconClass} />;
  if (type === "zoom") return <Video className={iconClass} />;
  return null;
};

export default function ProgramaMensualPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { userProfile, hasPermission } = usePermissions();

  const [allPublishers, setAllPublishers] = useState<PublisherDetail[]>([]);
  const [allCasas, setAllCasas] = useState<Casa[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [savedAssignments, setSavedAssignments] = useState<Assignment[]>([]);

  const [isAddManualDialogOpen, setIsAddManualDialogOpen] = useState(false);
  const [dateForManualAdd, setDateForManualAdd] = useState<Date | null>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const publishersQuery = query(collection(db, "users"), where("isAssignable", "==", true));
    const unsubPublishers = onSnapshot(publishersQuery, (snap) => setAllPublishers(snap.docs.map(d => ({id: d.id, ...d.data()} as PublisherDetail))));
    
    const casasQuery = query(collection(db, "casas"));
    const unsubCasas = onSnapshot(casasQuery, (snap) => setAllCasas(snap.docs.map(d => ({id: d.id, ...d.data()} as Casa))));

    const territoriesQuery = query(collection(db, "territories"));
    const unsubTerritories = onSnapshot(territoriesQuery, (snap) => setAllTerritories(snap.docs.map(d => ({id: d.id, ...d.data()} as Territory))));
    
    const unsubscribers = [unsubPublishers, unsubCasas, unsubTerritories];
    const timer = setTimeout(() => setIsLoading(false), 1500);
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const startDate = format(startOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');

    const assignmentsQuery = query(collection(db, "assignments"), where("date", ">=", startDate), where("date", "<=", endDate));
    const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
      setSavedAssignments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment)));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching assignments:", error);
        toast({title: "Error de Carga", description: "No se pudieron obtener las asignaciones para este mes.", variant: "destructive"});
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [selectedMonth, selectedYear, toast]);

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
    let location: Territory | Casa | undefined;

    if (data.locationType === 'territory') {
        location = allTerritories.find(t => t.id === data.locationId);
    } else {
        location = allCasas.find(c => c.id === data.locationId);
    }

    if (!publisher) {
        toast({ title: "Error", description: "Publicador no válido.", variant: "destructive"});
        return;
    }
    if (data.type !== 'zoom' && !location) {
        toast({ title: "Error", description: "Debe seleccionar un lugar (territorio o casa).", variant: "destructive"});
        return;
    }

    const newAssignment: Assignment = {
      id: docRef.id,
      date: format(data.date, "yyyy-MM-dd"),
      time: data.time,
      type: data.type,
      locationName: data.type === 'zoom' ? 'Predicación por Zoom' : (location!.name || `U-${(location as Territory).number}`),
      locationId: data.type === 'zoom' ? 'zoom' : location!.id,
      status: data.status || 'pending',
      assignedBy: userProfile?.name || 'Manual',
      userId: publisher.firebaseAuthUid || publisher.id,
      userName: publisher.name,
      userEmail: publisher.email,
      userPhoneNumber: publisher.phoneNumber,
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

  const assignmentsToDisplay = useMemo(() => {
    return savedAssignments.reduce((acc, curr) => {
        (acc[curr.date] = acc[curr.date] || []).push(curr);
        return acc;
    }, {} as Record<string, any[]>);
  }, [savedAssignments]);
  
  const firstDayOfMonth = startOfMonth(new Date(selectedYear, selectedMonth));
  const daysInMonth = getDaysInMonth(firstDayOfMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth);
  const dayOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => new Date(selectedYear, selectedMonth, i + 1));

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
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Mes" /></SelectTrigger>
                  <SelectContent>{months.map(m => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}</SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger className="w-[120px]"><SelectValue placeholder="Año" /></SelectTrigger>
                  <SelectContent>{years.map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent>
                </Select>
              </div>
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
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground pb-2 border-b">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => <div key={day}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: dayOffset }).map((_, i) => <div key={`empty-${i}`} className="border rounded-md min-h-[120px] bg-muted/30"></div>)}
                {calendarDays.map(day => {
                  const dayString = format(day, "yyyy-MM-dd");
                  const assignmentsForDay = (assignmentsToDisplay[dayString] || []).sort((a: any, b: any) => a.time.localeCompare(b.time));
                  const isToday = isSameDay(day, new Date());

                  return (
                    <Card key={dayString} className={`min-h-[120px] flex flex-col rounded-md shadow-sm ${isToday ? 'border-2 border-primary' : 'border bg-card'}`}>
                      <CardHeader className="p-2 pb-1 flex flex-row justify-between items-start">
                        <CardTitle className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{format(day, "d")}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-1.5 space-y-1.5 overflow-y-auto flex-grow">
                        {assignmentsForDay.map((assign: any) => (
                          <div key={assign.id} className="p-1.5 rounded-md bg-muted/50 text-xs shadow-sm group relative">
                            <div className="flex items-center font-semibold text-primary"><PreachingTypeIcon type={assign.type} /><span>{assign.time}</span></div>
                            <p className="truncate text-foreground/90" title={assign.userName}>{assign.userName}</p>
                            <p className="truncate text-muted-foreground text-[0.7rem]" title={assign.locationName}>{assign.locationName}</p>
                            {canManageProgram && (
                                <div className="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-background/80 backdrop-blur-sm rounded-bl-md rounded-tr-md p-0.5">
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenEditDialog(assign)}><Edit className="h-3 w-3 text-blue-600" /></Button>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteAssignment(assign)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                      {canManageProgram && (
                          <CardFooter className="p-1 mt-auto border-t border-dashed">
                            <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => handleOpenAddDialog(day)}>
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5"/> Añadir
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
            allPublishers={allPublishers}
            allTerritories={allTerritories}
            allCasas={allCasas}
        />
      )}
    </div>
  );
}
