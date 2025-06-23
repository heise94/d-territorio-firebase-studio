
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

  const getStatusColorClass = (status: ReportRowData['status']): string => {
    switch (status) {
        case 'Completado': return 'text-green-700 bg-green-100 border-green-200 dark:text-green-300 dark:bg-green-900/30 dark:border-green-700/50';
        case 'Disponible': return 'text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-700/50';
        case 'Parcial': return 'text-yellow-700 bg-yellow-100 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700/50';
        case 'En Curso': return 'text-sky-700 bg-sky-100 border-sky-200 dark:text-sky-300 dark:bg-sky-900/30 dark:border-sky-700/50';
        case 'Pendiente de Reporte': return 'text-orange-700 bg-orange-100 border-orange-200 dark:text-orange-300 dark:bg-orange-900/30 dark:border-orange-700/50';
        case 'Bloqueado': return 'text-red-700 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-700/50';
        default: return 'text-gray-700 bg-gray-100 border-gray-200';
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
                            <span className="font-bold">{row.type === 'urban' && row.territoryNumber ? `U-${row.territoryNumber}` : row.territoryName}</span>
                          </TableCell>
                          <TableCell>{row.lastWorked}</TableCell>
                          <TableCell>{row.lastAssignmentDate}</TableCell>
                          <TableCell>{row.assignedTo}</TableCell>
                          <TableCell>{row.blocksWorked}</TableCell>
                          <TableCell>{row.blocksPending}</TableCell>
                          <TableCell>
                              <Badge className={getStatusColorClass(row.status)}>{row.status}</Badge>
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

    