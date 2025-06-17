
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Users2 as GroupIcon, Pencil, Trash2, Loader2 } from "lucide-react";
import { AddGroupDialog } from "@/components/grupos/add-group-dialog";
import type { PreachingGroup } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, doc, setDoc, onSnapshot, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GroupCard } from "@/components/grupos/group-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";


export default function GruposPage() {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<PreachingGroup | null>(null);
  const [groups, setGroups] = useState<PreachingGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingGroups(false);
      return;
    }
    setIsLoadingGroups(true);
    const groupsCollectionRef = collection(db, "preachingGroups");
    const q = query(groupsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGroups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt : Timestamp.now(),
        updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt : Timestamp.now(),
      } as PreachingGroup));
      setGroups(fetchedGroups);
      setIsLoadingGroups(false);
    }, (error) => {
      console.error("Error fetching groups:", error);
      toast({ title: "Error al Cargar Grupos", description: "No se pudieron cargar los grupos desde Firestore.", variant: "destructive" });
      setIsLoadingGroups(false);
    });

    return () => unsubscribe();
  }, [toast]);


  useEffect(() => {
    if (!isGroupDialogOpen) {
      setGroupToEdit(null);
    }
  }, [isGroupDialogOpen]);

  const handleOpenAddDialog = () => {
    setGroupToEdit(null);
    setIsGroupDialogOpen(true);
  };

  const handleOpenEditDialog = (group: PreachingGroup) => {
    setGroupToEdit(group);
    setIsGroupDialogOpen(true);
  };

  const handleGroupSubmit = async (submittedGroupData: PreachingGroup) => {
    if (!db || Object.keys(db).length === 0) {
     toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
     return;
    }
   
    const isEditing = !!groups.find(g => g.id === submittedGroupData.id);
    const docRef = doc(db, "preachingGroups", submittedGroupData.id);

    // Prepare data for Firestore, ensuring no 'undefined' values are passed.
    // Optional fields from the form might come as `undefined` if cleared.
    const dataForFirestore: { [key: string]: any } = {};

    // Copy all properties from submittedGroupData except 'id' and undefined values.
    for (const key in submittedGroupData) {
      if (key !== 'id' && submittedGroupData[key as keyof PreachingGroup] !== undefined) {
        dataForFirestore[key] = submittedGroupData[key as keyof PreachingGroup];
      }
    }
    
    dataForFirestore.updatedAt = Timestamp.now();
    if (!isEditing) {
      dataForFirestore.createdAt = Timestamp.now();
    } else if (submittedGroupData.createdAt) { // Preserve existing createdAt if editing
        dataForFirestore.createdAt = submittedGroupData.createdAt;
    }


    // Ensure empty strings for optional text fields are not stored if user cleared them,
    // or store null if that's preferred (Firestore allows null, but not undefined).
    // For setDoc({merge:true}), omitting the field is often best if it means "no change" or "not set".
    // If an empty string means "remove the field", then updateDoc with deleteField() is needed.
    // Here, if dialog sends `description: undefined`, it will be filtered out above.
    // If it sends `description: ""`, it will be saved as `""`.
    // The dialog currently ensures empty optional strings result in `undefined` being passed here.
    
    // Example: if `description` came as `undefined` from the dialog (because it was empty),
    // it will not be in `dataForFirestore` due to the loop condition.
    // If `merge:true` is used, an existing `description` in Firestore would remain.
    // If the intention is to remove the field if it's emptied, `updateDoc` with `deleteField()` would be necessary for edits.
    // For now, this approach fixes the "undefined" error.

    try {
      await setDoc(docRef, dataForFirestore, { merge: true });
      toast({
        title: isEditing ? "Grupo Actualizado" : "Grupo Añadido",
        description: `El grupo "${dataForFirestore.name}" ha sido ${isEditing ? 'actualizado' : 'registrado'} en Firestore.`,
      });
      setIsGroupDialogOpen(false);
    } catch (error) {
      console.error("Error saving group:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar el grupo.", variant: "destructive" });
    }
   };

  const handleDeleteGroup = async (groupId: string) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
      return;
    }
    const groupToDelete = groups.find(g => g.id === groupId);
    try {
      await deleteDoc(doc(db, "preachingGroups", groupId));
      toast({ title: "Grupo Eliminado", description: `El grupo "${groupToDelete?.name || groupId}" ha sido eliminado de Firestore.`, variant: "destructive" });
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar el grupo.", variant: "destructive" });
    }
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    return groups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [groups, searchTerm]);

  return (
    <TooltipProvider>
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Gestión de Grupos de Predicación</h1>
          <p className="text-muted-foreground mt-1">
            Administra los grupos, sus miembros, y territorios asignados.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Nuevo Grupo
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Grupos</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2">
            <CardDescription>
              {isLoadingGroups ? "Cargando grupos..." :
                (filteredGroups.length > 0
                  ? `Mostrando ${filteredGroups.length} de ${groups.length} grupo(s) registrados.`
                  : groups.length > 0 ? "Ningún grupo coincide con la búsqueda."
                  : "Actualmente no hay grupos registrados."
                )
              }
            </CardDescription>
            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre o descripción..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingGroups ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="flex flex-col">
                  <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
                  <CardContent className="flex-grow space-y-2 pt-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></CardContent>
                  <CardFooter className="border-t pt-3 pb-3 flex justify-center gap-1"><Skeleton className="h-8 w-8" /> <Skeleton className="h-8 w-8" /></CardFooter>
                </Card>
              ))}
            </div>
          ) : groups.length === 0 && !searchTerm ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
              <GroupIcon className="h-20 w-20 text-muted-foreground/70 mb-6" />
              <p className="text-xl font-medium text-muted-foreground mb-2">No hay grupos para mostrar.</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en "Añadir Nuevo Grupo" para registrar el primero.
              </p>
            </div>
          ) : filteredGroups.length === 0 && searchTerm ? (
             <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                <Search className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">Sin resultados</p>
                <p className="text-sm text-muted-foreground">
                    No se encontraron grupos que coincidan con "{searchTerm}".
                </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onEdit={() => handleOpenEditDialog(group)}
                  onDelete={() => handleDeleteGroup(group.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddGroupDialog
        isOpen={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
        onGroupSubmit={handleGroupSubmit}
        groupToEdit={groupToEdit}
      />
    </div>
    </TooltipProvider>
  );
}

