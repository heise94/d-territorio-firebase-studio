
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users2 as GroupIcon, UserCog, UserCheck, Pencil, Trash2 } from "lucide-react";
import type { PreachingGroup } from "@/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GroupCardProps {
  group: PreachingGroup;
  onEdit: () => void;
  onDelete: () => void; // This will be called after confirmation
}

export function GroupCard({ group, onEdit, onDelete }: GroupCardProps) {
  return (
    <Card className="flex flex-col hover:shadow-xl transition-shadow duration-200 rounded-lg">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold flex items-center">
            <GroupIcon size={22} className="mr-2 text-primary shrink-0" />
            {group.name}
          </CardTitle>
          {/* Optional: Badge for status or type if groups have them */}
        </div>
        {group.description && (
            <CardDescription className="text-sm pt-1 italic text-muted-foreground line-clamp-2">
                {group.description}
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow space-y-2 pt-2 text-sm">
        {group.superintendentId && (
            <div className="flex items-center text-xs">
                <UserCog size={14} className="mr-1.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-muted-foreground">Superintendente:</span>
                <span className="ml-1 text-foreground">{group.superintendentId}</span> {/* Placeholder for name lookup */}
            </div>
        )}
        {group.auxiliaryId && (
             <div className="flex items-center text-xs">
                <UserCheck size={14} className="mr-1.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-muted-foreground">Auxiliar:</span>
                <span className="ml-1 text-foreground">{group.auxiliaryId}</span> {/* Placeholder for name lookup */}
            </div>
        )}
        {!group.superintendentId && !group.auxiliaryId && !group.description && (
            <p className="text-xs text-muted-foreground italic text-center py-2">Sin detalles adicionales.</p>
        )}
      </CardContent>
      <CardFooter className="border-t pt-3 pb-3 flex justify-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar grupo" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Editar Grupo</p></TooltipContent>
        </Tooltip>

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Eliminar grupo" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                  </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent><p>Eliminar Grupo</p></TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente el grupo "{group.name}"
                de los registros (simulación).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Sí, eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
