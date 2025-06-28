
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Users, MountainSnow, Video, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { es } from "date-fns/locale";
import { format, getDaysInMonth, startOfMonth, endOfMonth, getDay, isSameDay } from 'date-fns';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, PreachingAssignedType } from "@/types";
import Link from 'next/link';
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";

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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const { hasPermission } = usePermissions();
  const canGenerateProgram = hasPermission(PERMISSIONS.GENERATE_MONTHLY_PROGRAM);

  useEffect(() => {
    setIsLoading(true);
    const startDate = format(startOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');

    const assignmentsQuery = query(collection(db, "assignments"), where("date", ">=", startDate), where("date", "<=", endDate));
    const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
      setAssignments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment)));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching assignments:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedMonth, selectedYear]);

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
           Visualiza el programa guardado para el mes.
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
            {canGenerateProgram && (
                <Link href="/programa/crear">
                    <Button size="lg" className="w-full sm:w-auto">
                        <Bot className="mr-2 h-5 w-5" /> Crear/Gestionar Programa
                    </Button>
                </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Cargando programa...</p>
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
                          const assignmentsForDay = assignments.filter(a => a.date === dayString);
                          const isToday = isSameDay(day, new Date());
                          
                          return (
                              <Card key={dayString} className={`min-h-[120px] flex flex-col rounded-md shadow-sm ${isToday ? 'border-2 border-primary bg-primary/5' : 'border bg-card'}`}>
                              <CardHeader className="p-2 pb-1 flex flex-row justify-between items-start">
                                  <CardTitle className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{format(day, "d")}</CardTitle>
                              </CardHeader>
                              <CardContent className="p-1.5 space-y-1.5 overflow-y-auto flex-grow">
                                  {assignmentsForDay.length > 0 ? (
                                  assignmentsForDay.map(assign => (
                                      <div key={assign.id} className="p-1.5 rounded-md bg-muted/50 text-xs shadow-sm group relative">
                                        <div className="flex items-center font-semibold text-primary"><PreachingTypeIcon type={assign.type as PreachingAssignedType} /><span>{assign.time}</span></div>
                                        <p className="truncate text-foreground/90" title={assign.userName || 'Usuario no disponible'}>{assign.userName}</p>
                                        <p className="truncate text-muted-foreground text-[0.7rem]" title={assign.locationName}>{assign.locationName}</p>
                                      </div>
                                  ))
                                  ) : (<div className="h-full flex items-center justify-center text-xs text-muted-foreground/50">Vacío</div>)}
                              </CardContent>
                              </Card>
                          );
                      })}
                  </div>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
