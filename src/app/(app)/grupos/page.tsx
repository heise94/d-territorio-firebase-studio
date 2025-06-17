
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Users2 as GroupIcon, Pencil, Trash2 } from "lucide-react";
import { AddGroupDialog } from "@/components/grupos/add-group-dialog";
import type { PreachingGroup } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { GroupCard } from "@/components/grupos/group-card";
import { TooltipProvider } from "@/components/ui/tooltip";


const initialGroups: PreachingGroup[] = [
    { id: 'G1', name: 'Grupo Los Pioneros', description: 'Grupo de predicación enfocado en el centro.', superintendentId: 'uidElena', auxiliaryId: 'uidCarlos', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    { id: 'G2', name: 'Grupo Betel', description: 'Conquistadores de nuevos territorios rurales.', superintendentId: 'uidPedro', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    { id: 'G3', name: 'Grupo Emanuel', superintendentId: 'uidLaura', auxiliaryId: 'someOtherUID', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
];


export default function GruposPage() {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<PreachingGroup | null>(null);
  const [groups, setGroups] = useState<PreachingGroup[]>(initialGroups);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Effect to reset edit state when dialog closes
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

  const handleGroupSubmit = (submittedGroup: PreachingGroup) => {
    setGroups(prevGroups => {
      const existingIndex = prevGroups.findIndex(g => g.id === submittedGroup.id);
      if (existingIndex > -1) {
        const updatedGroups = [...prevGroups];
        updatedGroups[existingIndex] = submittedGroup;
        return updatedGroups;
      } else {
        // For new groups, ensure id is unique if not already handled by dialog
        return [...prevGroups, { ...submittedGroup, id: submittedGroup.id || crypto.randomUUID() }];
      }
    });
    setIsGroupDialogOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prevGroups => prevGroups.filter(g => g.id !== groupId));
    const group = groups.find(g => g.id === groupId);
    toast({ title: "Grupo Eliminado", description: `El grupo "${group?.name || groupId}" ha sido eliminado (simulación).`, variant: "destructive" });
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
              {filteredGroups.length > 0
                ? `Mostrando ${filteredGroups.length} de ${groups.length} grupo(s) registrados.`
                : groups.length > 0 ? "Ningún grupo coincide con la búsqueda."
                : "Actualmente no hay grupos registrados."
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
          {groups.length === 0 && !searchTerm ? (
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
                  onDelete={() => handleDeleteGroup(group.id)} // Actual confirmation handled within GroupCard via AlertDialog
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
