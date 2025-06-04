
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTerritoryDialog } from "@/components/territorios/add-territory-dialog";
import { TerritoryCard } from "@/components/territorios/territory-card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Search, MapPin, AlertTriangle, Eye, Trash2, Share2, Ban, ShieldCheck } from "lucide-react";
import type { Territory, TerritoryType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";

export default function TerritoriosPage() {
  const [isTerritoryDialogOpen, setIsTerritoryDialogOpen] = useState(false);
  const [territoryToEdit, setTerritoryToEdit] = useState<Territory | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([]); // Populate this from Firestore later
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TerritoryType>("urban");
  const { toast } = useToast();

  // Effect to reset edit state when dialog closes
  useEffect(() => {
    if (!isTerritoryDialogOpen) {
      setTerritoryToEdit(null);
    }
  }, [isTerritoryDialogOpen]);

  const handleOpenAddDialog = () => {
    setTerritoryToEdit(null);
    setIsTerritoryDialogOpen(true);
  };

  const handleOpenEditDialog = (territory: Territory) => {
    setTerritoryToEdit(territory);
    setIsTerritoryDialogOpen(true);
  };

  const handleTerritorySubmit = (submittedTerritory: Territory) => {
    setTerritories(prevTerritories => {
      const existingIndex = prevTerritories.findIndex(t => t.id === submittedTerritory.id);
      if (existingIndex > -1) {
        const updatedTerritories = [...prevTerritories];
        updatedTerritories[existingIndex] = submittedTerritory;
        return updatedTerritories;
      } else {
        return [...prevTerritories, submittedTerritory];
      }
    });
    setIsTerritoryDialogOpen(false);
  };
  
  const handleDeleteTerritory = (territoryId: string) => {
    setTerritories(prevTerritories => prevTerritories.filter(t => t.id !== territoryId));
    toast({ title: "Territorio Eliminado", description: "El territorio ha sido eliminado (simulación)." });
  };

  const handleToggleBlockTerritory = (territoryId: string) => {
    setTerritories(prevTerritories =>
      prevTerritories.map(t =>
        t.id === territoryId ? { ...t, isBlocked: !t.isBlocked, updatedAt: Timestamp.now() } : t
      )
    );
    const territory = territories.find(t => t.id === territoryId);
    toast({
      title: territory?.isBlocked ? "Territorio Desbloqueado" : "Territorio Bloqueado",
      description: `El territorio ha sido ${territory?.isBlocked ? 'desbloqueado' : 'bloqueado'} (simulación).`
    });
  };

  const filteredTerritories = useMemo(() => {
    return territories
      .filter(territory => territory.type === activeTab)
      .filter(territory =>
        territory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (territory.number && territory.number.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [territories, searchTerm, activeTab]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Gestión de Territorios</h1>
          <p className="text-muted-foreground mt-1">
            Administra los territorios de predicación urbanos y rurales.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Nuevo Territorio
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Territorios</CardTitle>
           <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2">
            <CardDescription>
              {filteredTerritories.length > 0 
                ? `Mostrando ${filteredTerritories.length} de ${territories.filter(t => t.type === activeTab).length} territorio(s) ${activeTab === 'urban' ? 'urbanos' : 'rurales'}.`
                : territories.filter(t => t.type === activeTab).length > 0 ? `Ningún territorio ${activeTab === 'urban' ? 'urbano' : 'rural'} coincide con la búsqueda.`
                : `Actualmente no hay territorios ${activeTab === 'urban' ? 'urbanos' : 'rurales'} registrados.`
              }
            </CardDescription>
             <div className="relative w-full sm:w-64 md:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por nombre o número..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TerritoryType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="urban">Urbanos</TabsTrigger>
              <TabsTrigger value="rural">Rurales</TabsTrigger>
            </TabsList>
            {(["urban", "rural"] as TerritoryType[]).map(tabType => (
              <TabsContent value={tabType} key={tabType}>
                {territories.filter(t => t.type === tabType).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                    <MapPin className="h-20 w-20 text-muted-foreground/70 mb-6" />
                    <p className="text-xl font-medium text-muted-foreground mb-2">No hay territorios {tabType === 'urban' ? 'urbanos' : 'rurales'} para mostrar.</p>
                    <p className="text-sm text-muted-foreground">
                      Haz clic en "Añadir Nuevo Territorio" para registrar el primero de este tipo.
                    </p>
                  </div>
                ) : filteredTerritories.filter(t => t.type === tabType).length === 0 && searchTerm ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                    <Search className="h-20 w-20 text-muted-foreground/70 mb-6" />
                    <p className="text-xl font-medium text-muted-foreground mb-2">Sin resultados</p>
                    <p className="text-sm text-muted-foreground">
                      No se encontraron territorios {tabType === 'urban' ? 'urbanos' : 'rurales'} que coincidan con "{searchTerm}".
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTerritories.filter(t => t.type === tabType).map((territory) => (
                      <TerritoryCard
                        key={territory.id}
                        territory={territory}
                        onEdit={() => handleOpenEditDialog(territory)}
                        onDelete={() => handleDeleteTerritory(territory.id)} // Placeholder for AlertDialogTrigger
                        onBlockToggle={() => handleToggleBlockTerritory(territory.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <AddTerritoryDialog
        isOpen={isTerritoryDialogOpen}
        onOpenChange={setIsTerritoryDialogOpen}
        onTerritorySubmit={handleTerritorySubmit}
        territoryToEdit={territoryToEdit}
      />
    </div>
  );
}
