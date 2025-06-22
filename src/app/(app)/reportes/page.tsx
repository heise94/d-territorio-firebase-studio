
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Search, XIcon, BarChartHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Territory, Assignment } from "@/types";
import { S13View } from "@/components/reportes/s13-view";
import { ReportesDetalleView, type ReportRowData } from "@/components/reportes/reportes-detalle-view";
import { format, parseISO, isBefore } from "date-fns";

export default function ReportesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    let territoriesLoaded = false;
    let assignmentsLoaded = false;

    const checkLoading = () => {
      if (territoriesLoaded && assignmentsLoaded) {
        setIsLoading(false);
      }
    };

    const territoriesQuery = query(collection(db, "territories"), orderBy("number", "asc"));
    const unsubTerritories = onSnapshot(territoriesQuery, (snapshot) => {
      setTerritories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Territory)));
      territoriesLoaded = true;
      checkLoading();
    }, (error) => {
      console.error("Error fetching territories: ", error);
      toast({ title: "Error", description: "No se pudieron cargar los territorios.", variant: "destructive" });
      territoriesLoaded = true;
      checkLoading();
    });

    const assignmentsQuery = query(collection(db, "assignments"), orderBy("date", "desc"));
    const unsubAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
        setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
        assignmentsLoaded = true;
        checkLoading();
    }, (error) => {
        console.error("Error fetching assignments: ", error);
        toast({ title: "Error", description: "No se pudieron cargar las asignaciones.", variant: "destructive" });
        assignmentsLoaded = true;
        checkLoading();
    });

    return () => {
      unsubTerritories();
      unsubAssignments();
    };
  }, [toast]);
  

  const filteredTerritoriesForS13 = useMemo(() => {
    return territories.filter(territory => {
      const searchMatch = searchTerm === "" ||
        (territory.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (territory.number && territory.number.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!searchMatch) return false;
      return true;
    }).sort((a, b) => {
        const numA = parseInt(a.number || '9999', 10);
        const numB = parseInt(b.number || '9999', 10);
        return numA - numB;
    });
  }, [territories, searchTerm]);


  const processedReportData: ReportRowData[] = useMemo(() => {
    // First, filter territories by search term
    const searchedTerritories = territories.filter(territory => {
      const searchMatch = searchTerm === "" ||
        (territory.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (territory.number && territory.number.toLowerCase().includes(searchTerm.toLowerCase()));
      return searchMatch;
    });
    
    // Then, process each filtered territory to determine its report data and status
    const dataWithStatus = searchedTerritories.map(territory => {
      const territoryAssignments = assignments
        .filter(a => a.locationId === territory.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const latestAssignment = territoryAssignments[0];
      
      let status: ReportRowData['status'] = 'Disponible';
      let blocksWorked = "-";
      let blocksPending = "-";

      if (territory.isBlocked) {
        status = 'Bloqueado';
      } else if (latestAssignment) {
        if (latestAssignment.lastReportData) {
          const report = latestAssignment.lastReportData.reports.find(r => r.territoryId === territory.id);
          if (report) {
            const totalBlocks = territory.totalBlocks || 0;
            const workedCount = report.workedBlocksIds.length;
            
            if (report.territoryNotWorked) {
              status = 'Parcial'; // Not worked is a form of partial completion of the assignment
              blocksWorked = "No trabajado";
              blocksPending = totalBlocks > 0 ? `Todas (${totalBlocks})` : "-";
            } else {
              blocksWorked = `${workedCount} de ${totalBlocks}`;
              if (totalBlocks > 0 && workedCount >= totalBlocks) {
                status = 'Completado';
                blocksPending = "Ninguna";
              } else if (totalBlocks > 0) {
                status = 'Parcial';
                blocksPending = `${totalBlocks - workedCount} de ${totalBlocks}`;
              } else {
                status = 'Completado'; // No blocks to work
                blocksPending = "N/A";
              }
            }
          }
        } else if (isBefore(parseISO(latestAssignment.date), new Date())) {
          status = 'Pendiente de Reporte';
        } else {
          status = 'En Curso';
        }
      }

      return {
        territoryId: territory.id,
        territoryNumber: territory.number,
        territoryName: territory.name,
        type: territory.type,
        lastWorked: territory.lastWorked ? format(parseISO(territory.lastWorked), "dd/MM/yy") : 'Nunca',
        lastAssignmentDate: latestAssignment?.date ? format(parseISO(latestAssignment.date), "dd/MM/yy") : 'N/A',
        assignedTo: latestAssignment?.userName || 'N/A',
        blocksWorked,
        blocksPending,
        status,
      };
    });
    
    // Finally, filter by status and sort
    return dataWithStatus.filter(row => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'disponible') return row.status === 'Disponible';
      if (filterStatus === 'en_curso') return ['En Curso', 'Parcial', 'Pendiente de Reporte'].includes(row.status);
      if (filterStatus === 'bloqueado') return row.status === 'Bloqueado';
      return false;
    }).sort((a, b) => {
        const numA = parseInt(a.territoryNumber || '9999', 10);
        const numB = parseInt(b.territoryNumber || '9999', 10);
        return numA - numB;
    });
  }, [territories, assignments, filterStatus, searchTerm]);
  
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
            <BarChartHorizontal className="mr-3 h-8 w-8 text-primary" />
            Reportes de Territorios
        </h1>
        <p className="text-muted-foreground mt-1">
            Visualiza el estado y la actividad de los territorios.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Filtros de Reportes</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 items-end pt-2">
                <div className="relative flex-grow">
                    <label htmlFor="search" className="text-xs text-muted-foreground">Buscar por nombre o número</label>
                    <Search className="absolute left-2.5 top-[calc(0.75rem+14px)] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="search" placeholder="Buscar..." className="pl-8 w-full h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div>
                     <label htmlFor="status" className="text-xs text-muted-foreground">Filtrar por estado</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9" id="status">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="disponible">Disponible</SelectItem>
                            <SelectItem value="en_curso">En Curso / Parcial</SelectItem>
                            <SelectItem value="bloqueado">Bloqueado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="h-9">
                    <XIcon className="mr-2 h-4 w-4" />
                    Limpiar
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="detalle" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="detalle">Vista Detallada</TabsTrigger>
                    <TabsTrigger value="s13">Vista S-13</TabsTrigger>
                </TabsList>
                <TabsContent value="detalle" className="mt-6">
                    {isLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : (
                        <ReportesDetalleView data={processedReportData} />
                    )}
                </TabsContent>
                <TabsContent value="s13" className="mt-6">
                     {isLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : (
                        <S13View territories={filteredTerritoriesForS13} />
                    )}
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
