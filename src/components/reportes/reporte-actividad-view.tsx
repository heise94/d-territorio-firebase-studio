
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { CampaignAssignmentInReport } from "@/types";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export interface ReporteActividadData {
  id: string;
  territoryNumber: string;
  lastCompletedHistoric: string;
  assignedTo: string;
  assignedDate: string;
  blocksWorked: string;
  blocksPending: string;
  status: 'Disponible' | 'En Curso' | 'Bloqueado';
  campaignHistory: CampaignAssignmentInReport[];
  blockReason?: string;
}

interface ReporteActividadViewProps {
    data: ReporteActividadData[];
}

export function ReporteActividadView({ data }: ReporteActividadViewProps) {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<CampaignAssignmentInReport[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<string>("");

  const handleViewHistory = (history: CampaignAssignmentInReport[], territoryNumber: string) => {
    setSelectedHistory(history);
    setSelectedTerritory(territoryNumber);
    setHistoryModalOpen(true);
  };

  const getStatusColorClass = (status: ReporteActividadData['status']): string => {
    switch (status) {
        case 'Disponible': return 'text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-700/50';
        case 'En Curso': return 'text-sky-700 bg-sky-100 border-sky-200 dark:text-sky-300 dark:bg-sky-900/30 dark:border-sky-700/50';
        case 'Bloqueado': return 'text-red-700 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-700/50';
        default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No hay datos de actividad para mostrar con los filtros actuales.
      </div>
    );
  }

  return (
    <>
    <TooltipProvider>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Territorio</TableHead>
              <TableHead>Últ. Completó</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Fecha Asig.</TableHead>
              <TableHead>Trabajadas</TableHead>
              <TableHead>Pendientes</TableHead>
              <TableHead>Estado Ciclo</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-bold">{row.territoryNumber}</TableCell>
                <TableCell>{row.lastCompletedHistoric}</TableCell>
                <TableCell>{row.assignedTo}</TableCell>
                <TableCell>{row.assignedDate}</TableCell>
                <TableCell>{row.blocksWorked}</TableCell>
                <TableCell>{row.blocksPending}</TableCell>
                <TableCell>
                   <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge className={getStatusColorClass(row.status)}>{row.status}</Badge>
                    </TooltipTrigger>
                    {row.status === 'Bloqueado' && row.blockReason && (
                    <TooltipContent>
                        <p>Razón: {row.blockReason}</p>
                    </TooltipContent>
                    )}
                </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => handleViewHistory(row.campaignHistory, row.territoryNumber)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>

      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Historial de Campañas del Ciclo</DialogTitle>
            <DialogDescription>
              Mostrando todas las asignaciones para el ciclo actual del Territorio {selectedTerritory}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asignado a</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Trabajadas</TableHead>
                  <TableHead>Pendientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedHistory.length > 0 ? selectedHistory.map((campaign, index) => (
                  <TableRow key={index}>
                    <TableCell>{campaign.assignedTo || "N/A"}</TableCell>
                    <TableCell>{campaign.assignedDate || "N/A"}</TableCell>
                    <TableCell>{campaign.blocksWorked || "-"}</TableCell>
                    <TableCell>{campaign.blocksPending || "-"}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No hay historial para este ciclo.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
