
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2 as CleaningIcon,
  CalendarDays,
  PlusCircle,
  Users,
  Edit,
  Trash2 as TrashIcon,
  Loader2,
  ListFilter,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  getISOWeek,
  startOfWeek,
  endOfWeek,
  getYear,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  isSameWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, writeBatch, deleteDoc } from "firebase/firestore";
import type {
  UserProfile,
  CleaningGroup,
  CleaningAssignment,
} from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionComponent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), "MMMM", { locale: es }),
}));

export default function CleaningProgramPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cleaningGroups, setCleaningGroups] = useState<CleaningGroup[]>([]);
  const [assignments, setAssignments] = useState<CleaningAssignment[]>([]);

  const [activeTab, setActiveTab] = useState("program");
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<CleaningGroup | null>(null);

  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  
  // Data Fetching
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile)));
    });
    const unsubGroups = onSnapshot(collection(db, "cleaningGroups"), (snap) => {
      setCleaningGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CleaningGroup)));
    });
    const unsubAssignments = onSnapshot(collection(db, "cleaningAssignments"), (snap) => {
      setAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CleaningAssignment)));
    });

    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      unsubUsers();
      unsubGroups();
      unsubAssignments();
      clearTimeout(timer);
    };
  }, []);

  const canManage = hasPermission(PERMISSIONS.MANAGE_CLEANING_PROGRAM);

  const weeksInMonth = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(start);
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  }, [selectedMonth, selectedYear]);

  const programData = useMemo(() => {
    return weeksInMonth.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekNumber = getISOWeek(weekStart);
      const assignmentId = `${selectedYear}-W${weekNumber}`;
      const assignment = assignments.find(a => a.id === assignmentId);
      const group = assignment ? cleaningGroups.find(g => g.id === assignment.groupId) : undefined;
      const captain = group && group.captainId ? users.find(u => u.id === group.captainId) : undefined;

      return {
        id: assignmentId,
        weekLabel: `Semana del ${format(weekStart, 'd')} al ${format(weekEnd, "d 'de' MMMM", { locale: es })}`,
        groupName: group?.name || 'No asignado',
        captainName: captain?.name || 'N/A',
        assignment: assignment,
      };
    });
  }, [weeksInMonth, assignments, cleaningGroups, users, selectedYear]);

  const handleOpenGroupDialog = (group: CleaningGroup | null = null) => {
    setGroupToEdit(group);
    setIsGroupDialogOpen(true);
  }

  const handleGroupSubmit = async (group: CleaningGroup) => {
    try {
        const docRef = doc(db, "cleaningGroups", group.id);
        await writeBatch(db).set(docRef, group).commit();
        toast({ title: groupToEdit ? "Grupo actualizado" : "Grupo creado", description: `El grupo "${group.name}" ha sido guardado.` });
        setIsGroupDialogOpen(false);
    } catch(e) {
        toast({ title: "Error", description: "No se pudo guardar el grupo.", variant: "destructive" });
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    // Also delete any assignments for this group
    const assignmentsToDelete = assignments.filter(a => a.groupId === groupId);
    const batch = writeBatch(db);
    batch.delete(doc(db, "cleaningGroups", groupId));
    assignmentsToDelete.forEach(a => batch.delete(doc(db, "cleaningAssignments", a.id)));
    await batch.commit();
    toast({ title: "Grupo Eliminado", description: "El grupo y sus asignaciones han sido eliminados." });
  }
  
  const handleAssignWeeks = async (assignmentsData: { weekId: string, groupId: string}[]) => {
    const batch = writeBatch(db);
    assignmentsData.forEach(({ weekId, groupId }) => {
        const group = cleaningGroups.find(g => g.id === groupId);
        if (!group) return;
        const [year, weekNumberStr] = weekId.split('-W');
        const weekNumber = parseInt(weekNumberStr, 10);
        const assignment: CleaningAssignment = {
            id: weekId,
            year: parseInt(year, 10),
            weekNumber,
            startDate: startOfWeek(new Date(parseInt(year, 10), 0, 1 + (weekNumber - 1) * 7), { weekStartsOn: 1 }).toISOString(),
            endDate: endOfWeek(new Date(parseInt(year, 10), 0, 1 + (weekNumber - 1) * 7), { weekStartsOn: 1 }).toISOString(),
            groupId: group.id,
            groupName: group.name,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        batch.set(doc(db, 'cleaningAssignments', weekId), assignment);
    });
    await batch.commit();
    toast({ title: "Semanas Asignadas", description: "El programa de aseo ha sido actualizado." });
    setIsAssignmentDialogOpen(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CleaningIcon className="mr-3 h-8 w-8 text-primary" />
          Programa de Aseo
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualiza y gestiona el programa de aseo del Salón del Reino.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="program">Programa</TabsTrigger>
            <TabsTrigger value="groups">Gestionar Grupos</TabsTrigger>
        </TabsList>
        <TabsContent value="program">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <CardTitle>Programa de {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
                    <CardDescription>Asignaciones semanales de aseo.</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                        <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                        <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Semana</TableHead>
                            <TableHead>Grupo Asignado</TableHead>
                            <TableHead>Capitán</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {programData.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.weekLabel}</TableCell>
                                <TableCell>{p.groupName}</TableCell>
                                <TableCell>{p.captainName}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              )}
            </CardContent>
            {canManage && <CardFooter><Button onClick={() => setIsAssignmentDialogOpen(true)}><ListFilter className="mr-2 h-4 w-4"/> Asignar Semanas</Button></CardFooter>}
          </Card>
        </TabsContent>
        <TabsContent value="groups">
            <Card>
                <CardHeader>
                    <CardTitle>Grupos de Aseo</CardTitle>
                    <CardDescription>Crea y administra los grupos responsables del aseo.</CardDescription>
                </CardHeader>
                <CardContent>
                {isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cleaningGroups.map(group => (
                            <Card key={group.id}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex justify-between items-start">
                                        {group.name}
                                        {canManage && <div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenGroupDialog(group)}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteGroup(group.id)}><TrashIcon className="h-4 w-4"/></Button></div>}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-1">
                                    <p><span className="font-semibold">Capitán:</span> {users.find(u => u.id === group.captainId)?.name || 'No asignado'}</p>
                                    <p><span className="font-semibold">Miembros:</span> {group.members?.length || 0}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
                </CardContent>
                {canManage && <CardFooter><Button onClick={() => handleOpenGroupDialog()}><PlusCircle className="mr-2 h-4 w-4"/> Crear Nuevo Grupo</Button></CardFooter>}
            </Card>
        </TabsContent>
      </Tabs>

      {canManage && <ManageGroupDialog isOpen={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen} group={groupToEdit} users={users} onSubmit={handleGroupSubmit} />}
      {canManage && <AssignWeeksDialog isOpen={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen} weeks={programData} groups={cleaningGroups} onSubmit={handleAssignWeeks} />}
    </div>
  );
}

// Dialog for Managing Groups
function ManageGroupDialog({ isOpen, onOpenChange, group, users, onSubmit }: { isOpen: boolean; onOpenChange: (open: boolean) => void; group: CleaningGroup | null; users: UserProfile[]; onSubmit: (group: CleaningGroup) => void; }) {
    const [name, setName] = useState('');
    const [captainId, setCaptainId] = useState('');
    const [members, setMembers] = useState<string[]>([]);
    
    useEffect(() => {
        if (group) {
            setName(group.name);
            setCaptainId(group.captainId || '');
            setMembers(group.members || []);
        } else {
            setName('');
            setCaptainId('');
            setMembers([]);
        }
    }, [group, isOpen]);

    const handleSubmit = () => {
        const newGroup: CleaningGroup = {
            id: group?.id || doc(collection(db, "cleaningGroups")).id,
            name,
            captainId,
            members,
            createdAt: group?.createdAt || new Date(),
            updatedAt: new Date(),
        };
        onSubmit(newGroup);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{group ? 'Editar' : 'Crear'} Grupo de Aseo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Input placeholder="Nombre del grupo" value={name} onChange={e => setName(e.target.value)} />
                    <Select value={captainId} onValueChange={setCaptainId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar capitán" /></SelectTrigger>
                        <SelectContent>
                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {/* A multi-select for members would go here */}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSubmit}>Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Dialog for Assigning Weeks
function AssignWeeksDialog({ isOpen, onOpenChange, weeks, groups, onSubmit }: { isOpen: boolean; onOpenChange: (open: boolean) => void; weeks: {id: string; weekLabel: string; assignment: any}[]; groups: CleaningGroup[]; onSubmit: (assignments: { weekId: string, groupId: string}[]) => void; }) {
    const [assignments, setAssignments] = useState<Record<string, string>>({});
    
    useEffect(() => {
        if (isOpen) {
            const initialAssignments = weeks.reduce((acc, week) => {
                if (week.assignment?.groupId) {
                    acc[week.id] = week.assignment.groupId;
                }
                return acc;
            }, {} as Record<string, string>);
            setAssignments(initialAssignments);
        }
    }, [isOpen, weeks]);

    const handleSelectChange = (weekId: string, groupId: string) => {
        setAssignments(prev => ({ ...prev, [weekId]: groupId }));
    }

    const handleSubmit = () => {
        const assignmentsToSubmit = Object.entries(assignments)
            .map(([weekId, groupId]) => ({ weekId, groupId }))
            .filter(a => a.groupId && a.groupId !== 'UNASSIGNED');
        onSubmit(assignmentsToSubmit);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Asignar Semanas de Aseo</DialogTitle>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Semana</TableHead>
                                <TableHead>Grupo a Asignar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weeks.map(week => (
                                <TableRow key={week.id}>
                                    <TableCell>{week.weekLabel}</TableCell>
                                    <TableCell>
                                        <Select value={assignments[week.id] || 'UNASSIGNED'} onValueChange={(val) => handleSelectChange(week.id, val)}>
                                            <SelectTrigger><SelectValue placeholder="Seleccionar grupo"/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UNASSIGNED">No asignado</SelectItem>
                                                {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSubmit}><CheckCircle2 className="mr-2 h-4 w-4"/> Guardar Asignaciones</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
