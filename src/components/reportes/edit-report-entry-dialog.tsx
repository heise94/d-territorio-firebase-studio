
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Territory, ReportEntry, CampaignAssignment } from "@/types";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ViewCycleActivityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  territory: Territory;
  activeReport: ReportEntry | null;
}

export function EditReportEntryDialog({
  isOpen,
  onOpenChange,
  territory,
  activeReport,
}: ViewCycleActivityDialogProps) {
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Eye className="mr-2 h-6 w-6 text-primary" />
            Actividad del Ciclo en Curso: Territorio {territory.number || territory.name}
          </DialogTitle>
          <DialogDescription>
            Visualización de las asignaciones para el ciclo actual de este territorio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            {activeReport && activeReport.campaigns && activeReport.campaigns.length > 0 ? (
                <div className="space-y-3">
                    {activeReport.campaigns.map((campaign, index) => (
                        <div key={index} className="p-3 border rounded-md bg-muted/50">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold">{campaign.assignedTo || "Sin asignar"}</p>
                                <p className="text-sm text-muted-foreground">{campaign.assignedDate ? format(campaign.assignedDate, "dd/MM/yyyy", {locale: es}) : "Sin fecha"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 text-xs mt-1">
                                <p><span className="font-medium text-muted-foreground">Trabajado:</span> {campaign.blocksWorked || "-"}</p>
                                <p><span className="font-medium text-muted-foreground">Pendiente:</span> {campaign.blocksPending || "-"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-6">No hay actividad registrada para este ciclo.</p>
            )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
