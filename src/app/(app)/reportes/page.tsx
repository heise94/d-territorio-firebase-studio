
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
import type { Territory } from "@/types";
import { S13View } from "@/components/reportes/s13-view";
import { ReportesDetalleView } from "@/components/reportes/reportes-detalle-view";

export default function ReportesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    if (!db || Object.keys(db).length === 0) {
      setIsLoading(false);
      return;
    }
    const territoriesQuery = query(collection(db, "territories"), orderBy("number", "asc"));
    const unsubscribe = onSnapshot(territoriesQuery, (snapshot) => {
      const fetchedTerritories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Territory));
      setTerritories(fetchedTerritories);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching territories: ", error);
      toast({ title: "Error", description: "No se pudieron cargar los territorios.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const getTerritoryStatus = (territory: Territory): 'Disponible' | 'En Curso' | 'Bloqueado' => {
      if (territory.isBlocked) {
        return 'Bloqueado';
      }
      // This is a placeholder logic. A real implementation would check assignment cycles.
      // For now, any territory that is not blocked is considered available.
      return 'Disponible';
  };

  const filteredTerritories = useMemo(() => {
    return territories.filter(territory => {
      const searchMatch = searchTerm === "" ||
        (territory.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (territory.number && territory.number.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!searchMatch) return false;

      const status = getTerritoryStatus(territory);
      const statusMatch = filterStatus === "all" ||
        (filterStatus === "disponible" && status === "Disponible") ||
        (filterStatus === "en_curso" && status === "En Curso") ||
        (filterStatus === "bloqueado" && status === "Bloqueado");
        
      if (!statusMatch) return false;

      return true;
    }).sort((a, b) => {
        const numA = parseInt(a.number || '9999', 10);
        const numB = parseInt(b.number || '9999', 10);
        return numA - numB;
    });
  }, [territories, searchTerm, filterStatus]);
  
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
                            <SelectItem value="en_curso">En Curso</SelectItem>
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
                        <ReportesDetalleView territories={filteredTerritories} getStatus={getTerritoryStatus} />
                    )}
                </TabsContent>
                <TabsContent value="s13" className="mt-6">
                     {isLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : (
                        <S13View territories={filteredTerritories} />
                    )}
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
