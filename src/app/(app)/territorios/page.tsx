
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTerritoryDialog } from "@/components/territorios/add-territory-dialog";
import { TerritoryCard } from "@/components/territorios/territory-card";
import { PlusCircle, Search, MapPin, Loader2, Upload, AlertTriangle, ShieldAlert } from "lucide-react";
import type { Territory, TerritoryType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, query, orderBy, deleteField, FieldValue } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES } from "@/lib/constants";

export default function TerritoriosPage() {
  const [isTerritoryDialogOpen, setIsTerritoryDialogOpen] = useState(false);
  const [territoryToEdit, setTerritoryToEdit] = useState<Territory | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isLoadingTerritories, setIsLoadingTerritories] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TerritoryType>("urban");
  const { toast } = useToast();
  const { userProfile, isLoadingPermissions } = usePermissions();

  const [isBlockReasonDialogOpen, setIsBlockReasonDialogOpen] = useState(false);
  const [territoryToBlock, setTerritoryToBlock] = useState<Territory | null>(null);
  const [blockReason, setBlockReason] = useState("");

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
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt : Timestamp.now(),
        updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt : Timestamp.now(),
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
    
    const isEditing = !!territories.find(t => t.id === submittedTerritoryData.id);
    const docRef = doc(db, "territories", submittedTerritoryData.id);

    const dataForFirestore: { [key: string]: any } = {
      type: submittedTerritoryData.type,
      name: submittedTerritoryData.name,
      isBlocked: submittedTerritoryData.isBlocked, // Use the original isBlocked state passed from the dialog
      updatedAt: Timestamp.now(),
      createdAt: (isEditing && territoryToEdit?.createdAt) ? territoryToEdit.createdAt : Timestamp.now(),
    };
    
    const optionalFields: (keyof Territory)[] = [
        'number', 'mapImageUrl', 'dataAiHint', 'googleMapsLink', 
        'lastWorked', 'totalBlocks', 'blockHouseCounts', 'approxHouseCount', 
        'doNotCallAddresses', 'warnings', 'groupIds', 'associatedCasaIds', 'unblockDate'
    ];

    optionalFields.forEach(key => {
        const K = key as keyof typeof submittedTerritoryData;
        if (submittedTerritoryData[K] === undefined || 
            (typeof submittedTerritoryData[K] === 'string' && (submittedTerritoryData[K] as string).trim() === "") ||
            (Array.isArray(submittedTerritoryData[K]) && (submittedTerritoryData[K] as any[]).length === 0)
           ) {
            dataForFirestore[key] = deleteField();
        } else if (submittedTerritoryData[K] !== null) {
            dataForFirestore[key] = submittedTerritoryData[K];
        }
    });

    // Explicitly handle blockReason to preserve it if the territory remains blocked
    if (submittedTerritoryData.isBlocked) {
      if (submittedTerritoryData.blockReason && submittedTerritoryData.blockReason.trim() !== "") {
        dataForFirestore.blockReason = submittedTerritoryData.blockReason.trim();
      } else {
        // If it's blocked but no reason is provided (e.g., cleared or was never set), remove the field
        dataForFirestore.blockReason = deleteField();
      }
    } else {
      // If it's not blocked, ensure blockReason is removed
      dataForFirestore.blockReason = deleteField();
    }

    Object.keys(dataForFirestore).forEach(k => {
        if (dataForFirestore[k] === undefined && !(dataForFirestore[k] instanceof FieldValue) ) {
            delete dataForFirestore[k]; 
        }
    });

    try {
      await setDoc(docRef, dataForFirestore, { merge: true }); 
      toast({
        title: isEditing ? "Territorio Actualizado" : "Territorio Añadido",
        description: `El territorio "${dataForFirestore.name}" ha sido ${isEditing ? 'actualizado' : 'guardado'} en Firestore.`,
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

  const handleOpenBlockReasonDialog = (territory: Territory) => {
    setTerritoryToBlock(territory);
    setBlockReason(territory.blockReason || ""); 
    setIsBlockReasonDialogOpen(true);
  };

  const confirmToggleBlockTerritory = async () => {
    if (!territoryToBlock || !db || Object.keys(db).length === 0) return;

    const newBlockStatus = !territoryToBlock.isBlocked;
    const updateData: { isBlocked: boolean; updatedAt: Timestamp; blockReason?: any } = {
      isBlocked: newBlockStatus,
      updatedAt: Timestamp.now(),
    };

    if (newBlockStatus) {
      updateData.blockReason = blockReason.trim() ? blockReason.trim() : deleteField();
    } else {
      updateData.blockReason = deleteField(); 
    }

    try {
      await updateDoc(doc(db, "territories", territoryToBlock.id), updateData);
      toast({
        title: newBlockStatus ? "Territorio Bloqueado" : "Territorio Desbloqueado",
        description: `El territorio "${territoryToBlock.name}" ha sido ${newBlockStatus ? 'bloqueado' : 'desbloqueado'}.`
      });
    } catch (error) {
      console.error("Error toggling block status:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo cambiar el estado de bloqueo.", variant: "destructive" });
    } finally {
      setIsBlockReasonDialogOpen(false);
      setTerritoryToBlock(null);
      setBlockReason("");
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

  const canManageBlocking = userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO;
  const canViewBlockStatusDetails = userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO || userProfile?.role === USER_ROLES.SS;
  
  const renderTerritoryGrid = (tabType: TerritoryType) => {
    if (isLoadingTerritories || isLoadingPermissions) {
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
              <CardFooter className="border-t pt-3 pb-3 flex justify-center gap-1">
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
            onBlockToggle={() => {
              if (territory.isBlocked) { 
                setTerritoryToBlock(territory); 
                setBlockReason(territory.blockReason || ""); 
                confirmToggleBlockTerritory(); 
              } else { 
                handleOpenBlockReasonDialog(territory);
              }
            }}
            canManage={canManageBlocking}
            canViewBlockDetails={canViewBlockStatusDetails}
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
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Link href="/territorios/importar" passHref legacyBehavior>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <a><Upload className="mr-2 h-5 w-5" /> Importar CSV</a>
                </Button>
            </Link>
            <Button onClick={handleOpenAddDialog} size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" />
              Añadir Nuevo Territorio
            </Button>
          </div>
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
          onTerritorySubmit={handleTerritorySubmit}
          territoryToEdit={territoryToEdit}
        />

        {territoryToBlock && (
          <AlertDialog open={isBlockReasonDialogOpen} onOpenChange={setIsBlockReasonDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-amber-500"/>Bloquear Territorio: {territoryToBlock.name}</AlertDialogTitle>
                <AlertDialogDescription>
                  Estás a punto de bloquear este territorio. Si lo deseas, puedes añadir una razón (opcional).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Label htmlFor="blockReasonInput" className="text-sm font-medium">Razón del Bloqueo (Opcional)</Label>
                <Textarea
                  id="blockReasonInput"
                  placeholder="Ej: Construcción en la zona, inaccesible temporalmente, etc."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setIsBlockReasonDialogOpen(false); setTerritoryToBlock(null); setBlockReason(""); }}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmToggleBlockTerritory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Confirmar Bloqueo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </TooltipProvider>
  );
}
