
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Sparkles, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { CampaignAssignmentInReport, Assignment, Territory } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import type { Timestamp } from "firebase/firestore";


export interface ReporteS13Data {
  id: string;
  territoryNumber: string;
  lastCompletedHistoric: string;
  firstAssignedTo: string;
  firstAssignedDate: string;
  completedCurrentCycle: string;
  fullCampaignHistory: CampaignAssignmentInReport[];
}

export interface ConsolidatedS13Data {
  territoryId: string;
  territoryNumber: string;
  lastCycle?: ReporteS13Data;
  penultimateCycle?: ReporteS13Data;
}

interface ReporteS13ViewProps {
    data: ConsolidatedS13Data[];
    allAssignments: Assignment[];
    allTerritories: Territory[];
}

export function ReporteS13View({ data, allAssignments, allTerritories }: ReporteS13ViewProps) {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<Assignment[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<string>("");

  const handleViewFullHistory = (territoryId: string, territoryNumber: string) => {
    const territoryHistory = allAssignments
      .filter(a => a.locationId === territoryId && a.lastReportData)
      .sort((a,b) => {
        const dateA = a.lastReportData!.reportedAt as Timestamp;
        const dateB = b.lastReportData!.reportedAt as Timestamp;
        return dateB.toMillis() - dateA.toMillis();
      });

    setSelectedHistory(territoryHistory);
    setSelectedTerritory(territoryNumber);
    setHistoryModalOpen(true);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No hay ciclos completados para mostrar con los filtros actuales.
      </div>
    );
  }

  const renderCycleCell = (cycle: ReporteS13Data | undefined) => {
    if (!cycle) return <span className="text-muted-foreground">N/A</span>;
    return (
      <div className="text-xs space-y-0.5">
        <p className="font-medium flex items-center"><User className="h-3 w-3 mr-1.5 shrink-0" />{cycle.firstAssignedTo}</p>
        <p><span className="font-semibold text-primary">{cycle.completedCurrentCycle}</span> (Fin)</p>
        <p className="text-muted-foreground">{cycle.firstAssignedDate} (Inicio)</p>
        {cycle.fullCampaignHistory[0]?.isSpecialCampaign && (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant="outline" className="mt-1 text-purple-600 border-purple-400 cursor-default">
                        <Sparkles className="h-3 w-3 mr-1" /> Campaña Especial
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{cycle.fullCampaignHistory[0]?.campaignName || "Campaña especial"}</p>
                </TooltipContent>
            </Tooltip>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Territorio</TableHead>
              <TableHead>Último Ciclo Completado</TableHead>
              <TableHead>Penúltimo Ciclo Completado</TableHead>
              <TableHead className="text-center">Historial</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.territoryId}>
                <TableCell className="font-bold">{row.territoryNumber}</TableCell>
                <TableCell>{renderCycleCell(row.lastCycle)}</TableCell>
                <TableCell>{renderCycleCell(row.penultimateCycle)}</TableCell>
                <TableCell className="text-center">
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => handleViewFullHistory(row.territoryId, row.territoryNumber)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Ver todos los ciclos de este territorio</p>
                    </TooltipContent>
                   </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial Completo de Reportes</DialogTitle>
            <DialogDescription>
              Mostrando todos los reportes enviados para el Territorio {selectedTerritory}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Publicador</TableHead>
                  <TableHead>Fecha Asignación</TableHead>
                  <TableHead>Fecha Reporte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedHistory.length > 0 ? selectedHistory.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.userName}</TableCell>
                    <TableCell>{format(parseISO(assignment.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-semibold text-primary">{format((assignment.lastReportData!.reportedAt as Timestamp).toDate(), "dd/MM/yyyy")}</TableCell>
                  </TableRow>
                )) : (
                   <TableRow>
                    <TableCell colSpan={3} className="text-center">No hay historial para este territorio.</TableCell>
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
    </TooltipProvider>
  );
}

