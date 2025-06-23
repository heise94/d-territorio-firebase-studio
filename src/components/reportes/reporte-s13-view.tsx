"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { CampaignAssignmentInReport, Report } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export interface ReporteS13Data {
  id: string;
  territoryNumber: string;
  lastCompletedHistoric: string;
  firstAssignedTo: string;
  firstAssignedDate: string;
  completedCurrentCycle: string;
  fullCampaignHistory: CampaignAssignmentInReport[];
}

interface ReporteS13ViewProps {
    data: ReporteS13Data[];
    allReports: Report[]; // To find all cycles for a territory
}

export function ReporteS13View({ data, allReports }: ReporteS13ViewProps) {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<ReporteS13Data[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<string>("");

  const handleViewFullHistory = (territoryNumber: string) => {
    const territoryHistory = allReports
      .filter(r => r.territoryNumber === territoryNumber && r.completedCurrentCycle !== 'En curso')
      .map(report => ({
        id: report.id,
        territoryNumber: report.territoryNumber,
        lastCompletedHistoric: report.lastCompletedHistoric || "N/A",
        firstAssignedTo: report.campaigns[0]?.assignedTo || "N/A",
        firstAssignedDate: report.campaigns[0]?.assignedDate || "N/A",
        completedCurrentCycle: report.completedCurrentCycle,
        fullCampaignHistory: report.campaigns,
      }))
      .sort((a,b) => new Date(b.completedCurrentCycle.split('/').reverse().join('-')).getTime() - new Date(a.completedCurrentCycle.split('/').reverse().join('-')).getTime());

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

  return (
    <TooltipProvider>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Territorio</TableHead>
              <TableHead>Completó Hist.</TableHead>
              <TableHead>Primer Asignado</TableHead>
              <TableHead>Inicio Ciclo</TableHead>
              <TableHead>Campaña Especial</TableHead>
              <TableHead>Fin Ciclo</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-bold">{row.territoryNumber}</TableCell>
                <TableCell>{row.lastCompletedHistoric}</TableCell>
                <TableCell>{row.firstAssignedTo}</TableCell>
                <TableCell>{row.firstAssignedDate}</TableCell>
                 <TableCell>
                    {row.fullCampaignHistory[0]?.isSpecialCampaign ? (
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <Badge variant="outline" className="text-purple-600 border-purple-400">
                             <Sparkles className="h-3 w-3 mr-1" /> Sí
                           </Badge>
                         </TooltipTrigger>
                         <TooltipContent>
                           <p>{row.fullCampaignHistory[0]?.campaignName || "Campaña especial"}</p>
                         </TooltipContent>
                       </Tooltip>
                    ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                    )}
                </TableCell>
                <TableCell className="font-semibold text-primary">{row.completedCurrentCycle}</TableCell>
                <TableCell className="text-center">
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => handleViewFullHistory(row.territoryNumber)}>
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
            <DialogTitle>Historial Completo de Ciclos</DialogTitle>
            <DialogDescription>
              Mostrando todos los ciclos de trabajo completados para el Territorio {selectedTerritory}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Completó Hist.</TableHead>
                  <TableHead>Inicio Ciclo</TableHead>
                  <TableHead>Fin Ciclo</TableHead>
                   <TableHead>Campaña Esp.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedHistory.length > 0 ? selectedHistory.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell>{cycle.lastCompletedHistoric}</TableCell>
                    <TableCell>{cycle.firstAssignedDate}</TableCell>
                    <TableCell className="font-semibold text-primary">{cycle.completedCurrentCycle}</TableCell>
                    <TableCell>
                        {cycle.fullCampaignHistory[0]?.isSpecialCampaign ? (
                             <Badge variant="outline" className="text-purple-600 border-purple-400">Sí</Badge>
                        ) : (
                            <span>No</span>
                        )}
                    </TableCell>
                  </TableRow>
                )) : (
                   <TableRow>
                    <TableCell colSpan={4} className="text-center">No hay historial para este territorio.</TableCell>
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