"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { TerritoryType } from "@/types";

export interface ReportRowData {
  territoryId: string;
  territoryNumber?: string;
  territoryName: string;
  type: TerritoryType;
  lastWorked: string;
  lastAssignmentDate: string;
  assignedTo: string;
  blocksWorked: string;
  blocksPending: string;
  status: 'Completado' | 'Parcial' | 'Pendiente de Reporte' | 'Disponible' | 'En Curso' | 'Bloqueado';
}

interface ReportesDetalleViewProps {
    data: ReportRowData[];
}

export function ReportesDetalleView({ data }: ReportesDetalleViewProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
        <p className="text-xl font-medium text-muted-foreground mb-2">No hay territorios que mostrar</p>
        <p className="text-sm text-muted-foreground">
          Prueba a ajustar los filtros o añade nuevos territorios.
        </p>
      </div>
    );
  }

  const getStatusVariant = (status: ReportRowData['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
        case 'Completado':
        case 'Disponible':
            return 'default';
        case 'Parcial':
        case 'En Curso':
            return 'secondary';
        case 'Pendiente de Reporte':
            return 'outline';
         case 'Bloqueado':
            return 'destructive';
        default:
            return 'outline';
    }
  };

  return (
    <TooltipProvider>
      <div className="border rounded-md">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-[150px]">N° / Territorio</TableHead>
                      <TableHead>Últ. Trabajo</TableHead>
                      <TableHead>Últ. Asignación</TableHead>
                      <TableHead>Publicador</TableHead>
                      <TableHead>Trabajadas</TableHead>
                      <TableHead>Pendientes</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {data.map((row) => (
                      <TableRow key={row.territoryId}>
                          <TableCell className="font-medium">
                            {row.type === 'urban' ? `U-${row.territoryNumber}` : row.territoryName}
                          </TableCell>
                          <TableCell>{row.lastWorked}</TableCell>
                          <TableCell>{row.lastAssignmentDate}</TableCell>
                          <TableCell>{row.assignedTo}</TableCell>
                          <TableCell>{row.blocksWorked}</TableCell>
                          <TableCell>{row.blocksPending}</TableCell>
                          <TableCell>
                              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Ver historial del ciclo</p></TooltipContent>
                              </Tooltip>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      </div>
    </TooltipProvider>
  );
}
