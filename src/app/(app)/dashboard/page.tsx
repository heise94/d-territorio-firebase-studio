
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileCheck, Map as MapIcon, Users, Loader2, ShieldOff, Hourglass, AlertCircle, Building, FileWarning } from "lucide-react";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { startOfMonth, endOfMonth, isFuture, format, isBefore, parse } from "date-fns";
import { es } from "date-fns/locale";
import type { Territory, UserProfile, Assignment, Casa } from "@/types";
import Link from 'next/link';

const currentFilterYear = new Date().getFullYear();

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [allCasas, setAllCasas] = useState<Casa[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentFilterYear);

  const monthsForFilter = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i), "MMMM", { locale: es }) })), []);
  const yearsForFilter = useMemo(() => Array.from({ length: 5 }, (_, i) => currentFilterYear - 2 + i).sort((a,b) => b - a), [currentFilterYear]);

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      console.warn("Firestore not available");
      setLoading(false);
      return;
    }

    const unsubscribers = [
      onSnapshot(collection(db, "territories"), (snapshot) => {
        setAllTerritories(snapshot.docs.map(doc => doc.data() as Territory));
      }, (error) => console.error("Error fetching territories:", error)),
      
      onSnapshot(collection(db, "users"), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      }, (error) => console.error("Error fetching users:", error)),
      
      onSnapshot(collection(db, "assignments"), (snapshot) => {
        setAllAssignments(snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Assignment)));
      }, (error) => console.error("Error fetching assignments:", error)),

      onSnapshot(collection(db, "casas"), (snapshot) => {
        setAllCasas(snapshot.docs.map(doc => doc.data() as Casa));
      }, (error) => console.error("Error fetching casas:", error)),
    ];

    const timer = setTimeout(() => setLoading(false), 1500); 
    
    return () => {
      clearTimeout(timer);
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const stats = useMemo(() => {
    const activeTerritories = allTerritories.filter(t => !t.isBlocked).length;
    const blockedTerritories = allTerritories.length - activeTerritories;

    const activePublishers = allUsers.filter(u => u.status === 'Activo').length;
    const blockedForSystem = allUsers.filter(u => u.blockInfo?.forSystem).length;
    const blockedForGroup = allUsers.filter(u => u.blockInfo?.forGroup).length;
    
    const totalCasas = allCasas.length;
    const blockedCasasSystem = allCasas.filter(c => c.blockInfo?.forSystem).length;
    const blockedCasasGroup = allCasas.filter(c => c.blockInfo?.forGroup).length;
    
    const filterStartDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const filterEndDate = endOfMonth(new Date(selectedYear, selectedMonth));
    const workedTerritoryIds = new Set<string>();
    allAssignments.forEach(a => {
      if (a.lastReportData?.reportedAt) {
        const reportedDate = a.lastReportData.reportedAt instanceof Timestamp ? a.lastReportData.reportedAt.toDate() : new Date(a.lastReportData.reportedAt);
        if (reportedDate >= filterStartDate && reportedDate <= filterEndDate) {
          if (a.locationId) workedTerritoryIds.add(a.locationId);
          if (a.additionalTerritorySelected?.id) workedTerritoryIds.add(a.additionalTerritorySelected.id);
        }
      }
    });

    const pendingAssignments = allAssignments.filter(a => {
        try {
            const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
            return (a.status === 'pending' || a.status === 'replacement_requested') && isFuture(assignmentDateTime);
        } catch (e) {
            return false;
        }
    }).length;

    const pendingReports = allAssignments.filter(a => {
        try {
            const assignmentDateTime = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date());
            const isPastAssignment = isBefore(assignmentDateTime, new Date());
            const isReportableType = a.type === 'publica' || a.type === 'rural';
            return isPastAssignment && isReportableType && a.status === 'accepted' && !a.lastReportData;
        } catch (e) {
            return false;
        }
    }).length;

    return {
        activeTerritories,
        blockedTerritories,
        activePublishers,
        blockedForSystem,
        blockedForGroup,
        workedTerritoriesThisMonth: workedTerritoryIds.size,
        pendingAssignments,
        totalCasas,
        blockedCasasSystem,
        blockedCasasGroup,
        pendingReports
    };
  }, [allTerritories, allUsers, allAssignments, allCasas, selectedMonth, selectedYear]);

  const renderStat = (value: number, subValues?: {label: string, value: number}[]) => {
    if (loading) {
      return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
    }
    return (
        <div>
            <div className="text-4xl font-bold">{value}</div>
            {subValues && subValues.length > 0 && (
                <div className="pt-1">
                    {subValues.map((sub, index) => (
                         sub.value > 0 && (
                            <p key={index} className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                               <AlertCircle className="h-3 w-3"/> {sub.value} {sub.label}
                            </p>
                         )
                    ))}
                </div>
            )}
        </div>
    );
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido a D-TERRITORIO. Aquí encontrarás un resumen general y accesos rápidos.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Territorios Activos</CardTitle>
            <MapIcon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.activeTerritories, [{label: 'bloqueado(s)', value: stats.blockedTerritories}])}
            <p className="text-xs text-muted-foreground pt-1">Total de territorios no bloqueados.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casas Disponibles</CardTitle>
            <Building className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
             {renderStat(stats.totalCasas, [
                {label: 'bloq. p/ sistema', value: stats.blockedCasasSystem},
                {label: 'bloq. p/ grupo', value: stats.blockedCasasGroup}
             ])}
            <p className="text-xs text-muted-foreground pt-1">Total de casas de reunión registradas.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicadores Activos</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
             {renderStat(stats.activePublishers, [
                {label: 'bloq. p/ sistema', value: stats.blockedForSystem},
                {label: 'bloq. p/ grupo', value: stats.blockedForGroup}
             ])}
            <p className="text-xs text-muted-foreground pt-1">Total de usuarios con estado "Activo".</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Territorios Trabajados</CardTitle>
            <FileCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.workedTerritoriesThisMonth)}
            <div className="flex gap-2 items-center mt-2">
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                    <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{monthsForFilter.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                     <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{yearsForFilter.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300 bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700/40">
           <Link href="/gestion-asignaciones" className="h-full w-full block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">Asignaciones Pendientes</CardTitle>
                <Hourglass className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </CardHeader>
              <CardContent>
                 <div className="text-4xl font-bold text-amber-900 dark:text-amber-200">{loading ? <Loader2 className="h-8 w-8 animate-spin"/> : stats.pendingAssignments}</div>
                <p className="text-xs text-amber-700 dark:text-amber-400/80 pt-1">Asignaciones por aceptar o que necesitan reemplazo.</p>
              </CardContent>
            </Link>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300 bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700/40">
           <Link href="/asignaciones" className="h-full w-full block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-300">Reportes Pendientes</CardTitle>
                <FileWarning className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </CardHeader>
              <CardContent>
                 <div className="text-4xl font-bold text-orange-900 dark:text-orange-200">{loading ? <Loader2 className="h-8 w-8 animate-spin"/> : stats.pendingReports}</div>
                <p className="text-xs text-orange-700 dark:text-orange-400/80 pt-1">Asignaciones pasadas que no han sido reportadas.</p>
              </CardContent>
            </Link>
        </Card>

      </div>
    </div>
  );
}
