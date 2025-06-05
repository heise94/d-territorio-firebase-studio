
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Users2 as GroupIcon } from "lucide-react";
// import { AddGroupDialog } from "@/components/grupos/add-group-dialog"; // Placeholder
import type { PreachingGroup } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function GruposPage() {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<PreachingGroup | null>(null);
  const [groups, setGroups] = useState<PreachingGroup[]>([]); // Populate this from Firestore later
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const handleOpenAddDialog = () => {
    setGroupToEdit(null);
    // setIsGroupDialogOpen(true); // Uncomment when dialog is created
    toast({ title: "Próximamente", description: "El diálogo para añadir grupos estará disponible pronto."});
  };

  const handleOpenEditDialog = (group: PreachingGroup) => {
    setGroupToEdit(group);
    // setIsGroupDialogOpen(true); // Uncomment when dialog is created
    toast({ title: "Próximamente", description: "El diálogo para editar grupos estará disponible pronto."});
  };

  const handleGroupSubmit = (submittedGroup: PreachingGroup) => {
    // Logic to add/update group in state (and later Firestore)
    setIsGroupDialogOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    // Logic to delete group
    toast({ title: "Grupo Eliminado", description: "El grupo ha sido eliminado (simulación)." });
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    return groups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [groups, searchTerm]);

  return (
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
          {groups.length === 0 ? (
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
            <div className="text-center py-10 text-muted-foreground">
              <p>(Listado de grupos aparecerá aquí)</p>
              {/* Placeholder for group cards or table */}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 
      <AddGroupDialog
        isOpen={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
        onGroupSubmit={handleGroupSubmit}
        groupToEdit={groupToEdit}
      /> 
      */}
    </div>
  );
}
