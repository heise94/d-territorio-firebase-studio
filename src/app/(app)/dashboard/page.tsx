
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileText, Map, Users, Loader2 } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { startOfMonth, endOfMonth } from "date-fns";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeTerritories: 0,
    activePublishers: 0,
    reportsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      console.warn("Firestore not available");
      setLoading(false);
      return;
    }

    const territoriesQuery = query(collection(db, "territories"), where("isBlocked", "==", false));
    const usersQuery = query(collection(db, "users"), where("status", "==", "Activo"));
    
    // For reports, we fetch all assignments and filter client-side to avoid needing a composite index on lastReportData
    const assignmentsQuery = collection(db, "assignments");

    const unsubscribers = [
      onSnapshot(territoriesQuery, (snapshot) => {
        setStats(prev => ({ ...prev, activeTerritories: snapshot.size }));
      }, (error) => console.error("Error fetching territories count:", error)),
      
      onSnapshot(usersQuery, (snapshot) => {
        setStats(prev => ({ ...prev, activePublishers: snapshot.size }));
      }, (error) => console.error("Error fetching users count:", error)),
      
      onSnapshot(assignmentsQuery, (snapshot) => {
        const now = new Date();
        const startOfThisMonth = startOfMonth(now);
        const endOfThisMonth = endOfMonth(now);

        const reportsCount = snapshot.docs.filter(doc => {
          const data = doc.data();
          if (data.lastReportData && data.lastReportData.reportedAt) {
            const reportedAtDate = data.lastReportData.reportedAt.toDate();
            return reportedAtDate >= startOfThisMonth && reportedAtDate <= endOfThisMonth;
          }
          return false;
        }).length;

        setStats(prev => ({ ...prev, reportsThisMonth: reportsCount }));
      }, (error) => console.error("Error fetching assignments for reports count:", error))
    ];

    // Stop loading after a short delay to allow all snapshots to fire at least once.
    const timer = setTimeout(() => setLoading(false), 1500);
    unsubscribers.push(() => clearTimeout(timer));
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };

  }, []);

  const renderStat = (value: number) => {
    if (loading) {
      return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
    }
    return <div className="text-4xl font-bold">{value}</div>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido a D-TERRITORIO. Aquí encontrarás un resumen general y accesos rápidos.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Territorios Activos</CardTitle>
            <Map className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.activeTerritories)}
            <p className="text-xs text-muted-foreground pt-1">Número total de territorios no bloqueados.</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicadores Activos</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.activePublishers)}
            <p className="text-xs text-muted-foreground pt-1">Total de usuarios con estado "Activo".</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes de este Mes</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {renderStat(stats.reportsThisMonth)}
            <p className="text-xs text-muted-foreground pt-1">Reportes de predicación enviados este mes.</p>
          </CardContent>
        </Card>
         <Card className="hover:shadow-lg transition-shadow duration-300 bg-primary/10 border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Próximas Funciones</CardTitle>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-primary/80">
              Más módulos y funcionalidades serán añadidos pronto. ¡Mantente atento!
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6">
        <h2 className="text-2xl font-headline font-semibold mb-4">Actividad Reciente (Placeholder)</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-64 bg-muted/50 rounded-md">
              <p className="text-muted-foreground">Gráfico de actividad aparecerá aquí.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
