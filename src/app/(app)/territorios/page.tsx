
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTerritoryDialog } from "@/components/territorios/add-territory-dialog";
import { TerritoryCard } from "@/components/territorios/territory-card";
import { PlusCircle, Search, MapPin, Loader2 } from "lucide-react";
import type { Territory, TerritoryType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function TerritoriosPage() {
  const [isTerritoryDialogOpen, setIsTerritoryDialogOpen] = useState(false);
  const [territoryToEdit, setTerritoryToEdit] = useState<Territory | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isLoadingTerritories, setIsLoadingTerritories] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TerritoryType>("urban");
  const { toast } = useToast();

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingTerritories(false);
      return;
    }
    setIsLoadingTerritories(true);
    const territoriesCollectionRef = collection(db, "territories");
    const q = query(territoriesCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTerritories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt : Timestamp.now(), // Ensure Timestamp
        updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt : Timestamp.now(), // Ensure Timestamp
      } as Territory));
      setTerritories(fetchedTerritories);
      setIsLoadingTerritories(false);
    }, (error) => {
      console.error("Error fetching territories:", error);
      toast({ title: "Error al Cargar Territorios", description: "No se pudieron cargar los territorios desde Firestore.", variant: "destructive" });
      setIsLoadingTerritories(false);
    });

    return () => unsubscribe();
  }, [toast]);

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

  const handleTerritorySubmit = async (submittedTerritoryData: Partial<Territory> & Pick<Territory, 'id' | 'type' | 'name' | 'isBlocked' | 'createdAt' | 'updatedAt'>) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar a la base de datos.", variant: "destructive" });
      return;
    }
    
    // Firestore does not allow 'undefined' values. Convert them to null or remove the field.
    const sanitizedData = Object.entries(submittedTerritoryData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as Partial<Territory>);


    const isEditing = !!territories.find(t => t.id === submittedTerritoryData.id);
    const docRef = doc(db, "territories", submittedTerritoryData.id);

    try {
      await setDoc(docRef, sanitizedData, { merge: true }); // Use merge:true to update if exists or create if not
      toast({
        title: isEditing ? "Territorio Actualizado" : "Territorio Añadido",
        description: `El territorio "${submittedTerritoryData.name}" ha sido ${isEditing ? 'actualizado' : 'guardado'} en Firestore.`,
      });
      setIsTerritoryDialogOpen(false);
    } catch (error) {
      console.error("Error saving territory:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar el territorio.", variant: "destructive" });
    }
  };
  
  const handleDeleteTerritory = async (territoryId: string) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
      return;
    }
    const territoryToDelete = territories.find(t => t.id === territoryId);
    try {
      await deleteDoc(doc(db, "territories", territoryId));
      toast({ title: "Territorio Eliminado", description: `El territorio "${territoryToDelete?.name || territoryId}" ha sido eliminado de Firestore.`, variant: "default" });
    } catch (error) {
      console.error("Error deleting territory:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar el territorio.", variant: "destructive" });
    }
  };

  const handleToggleBlockTerritory = async (territoryId: string) => {
     if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
      return;
    }
    const territory = territories.find(t => t.id === territoryId);
    if (!territory) return;

    const newBlockStatus = !territory.isBlocked;
    try {
      await updateDoc(doc(db, "territories", territoryId), {
        isBlocked: newBlockStatus,
        updatedAt: Timestamp.now()
      });
      toast({
        title: newBlockStatus ? "Territorio Bloqueado" : "Territorio Desbloqueado",
        description: `El territorio "${territory.name}" ha sido ${newBlockStatus ? 'bloqueado' : 'desbloqueado'}.`
      });
    } catch (error) {
      console.error("Error toggling block status:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo cambiar el estado de bloqueo.", variant: "destructive" });
    }
  };

  const filteredTerritories = useMemo(() => {
    return territories
      .filter(territory => territory.type === activeTab)
      .filter(territory =>
        territory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (territory.number && territory.number.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [territories, searchTerm, activeTab]);
  
  const renderTerritoryGrid = (tabType: TerritoryType) => {
    if (isLoadingTerritories) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/2 mt-1" /></CardHeader>
              <CardContent className="flex-grow space-y-2 pt-2">
                <Skeleton className="aspect-video w-full rounded-md" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
              <CardFooter className="border-t pt-3 pb-3 flex justify-end gap-1">
                <Skeleton className="h-8 w-8" /> <Skeleton className="h-8 w-8" /> <Skeleton className="h-8 w-8" />
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    const territoriesForTab = filteredTerritories.filter(t => t.type === tabType);

    if (territoriesForTab.length === 0) {
      const noDataMessage = searchTerm
        ? `No se encontraron territorios ${tabType === 'urban' ? 'urbanos' : 'rurales'} que coincidan con "${searchTerm}".`
        : `Actualmente no hay territorios ${tabType === 'urban' ? 'urbanos' : 'rurales'} registrados.`;
      const IconComponent = searchTerm ? Search : MapPin;
      
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
          <IconComponent className="h-20 w-20 text-muted-foreground/70 mb-6" />
          <p className="text-xl font-medium text-muted-foreground mb-2">
            {searchTerm ? "Sin resultados" : `No hay territorios ${tabType === 'urban' ? 'urbanos' : 'rurales'}`}
          </p>
          <p className="text-sm text-muted-foreground">{noDataMessage}</p>
          {!searchTerm && (
            <p className="text-sm text-muted-foreground mt-1">
              Haz clic en "Añadir Nuevo Territorio" para registrar el primero de este tipo.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {territoriesForTab.map((territory) => (
          <TerritoryCard
            key={territory.id}
            territory={territory}
            onEdit={() => handleOpenEditDialog(territory)}
            onDelete={() => handleDeleteTerritory(territory.id)}
            onBlockToggle={() => handleToggleBlockTerritory(territory.id)}
          />
        ))}
      </div>
    );
  };


  return (
    <TooltipProvider>
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
                {isLoadingTerritories ? "Cargando territorios..." :
                  (filteredTerritories.length > 0
                    ? `Mostrando ${filteredTerritories.length} de ${territories.filter(t => t.type === activeTab).length} territorio(s) ${activeTab === 'urban' ? 'urbanos' : 'rurales'}.`
                    : territories.filter(t => t.type === activeTab).length > 0 ? `Ningún territorio ${activeTab === 'urban' ? 'urbano' : 'rural'} coincide con la búsqueda.`
                    : `Actualmente no hay territorios ${activeTab === 'urban' ? 'urbanos' : 'rurales'} registrados.`
                  )
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
                  {renderTerritoryGrid(tabType)}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <AddTerritoryDialog
          isOpen={isTerritoryDialogOpen}
          onOpenChange={setIsTerritoryDialogOpen}
          onTerritorySubmit={handleTerritorySubmit as any} // Cast to any to bypass strict Partial<Territory> check if needed
          territoryToEdit={territoryToEdit}
        />
      </div>
    </TooltipProvider>
  );
}
