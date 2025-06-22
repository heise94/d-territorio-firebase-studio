"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, History, Filter } from "lucide-react";
import { format, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import type { S13TerritoryCycleSummary } from "@/types";

interface CycleHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  territorySummary: S13TerritoryCycleSummary | null;
}

export function CycleHistoryDialog({ isOpen, onOpenChange, territorySummary }: CycleHistoryDialogProps) {
  const [selectedYear, setSelectedYear] = useState<string>("ALL_YEARS");

  const availableYears = useMemo(() => {
    if (!territorySummary) return [];
    const years = new Set(territorySummary.allCycles.map(cycle => getYear(cycle.completionDate).toString()));
    return ["ALL_YEARS", ...Array.from(years).sort((a, b) => b.localeCompare(a))];
  }, [territorySummary]);

  const filteredCycles = useMemo(() => {
    if (!territorySummary) return [];
    if (selectedYear === "ALL_YEARS") {
      return territorySummary.allCycles;
    }
    return territorySummary.allCycles.filter(cycle => getYear(cycle.completionDate).toString() === selectedYear);
  }, [territorySummary, selectedYear]);

  // Reset filter when dialog opens or territory changes
  useEffect(() => {
    if (isOpen) {
      setSelectedYear("ALL_YEARS");
    }
  }, [isOpen, territorySummary]);


  if (!isOpen || !territorySummary) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <History className="mr-2 h-6 w-6 text-primary" />
            Historial de Ciclos: Territorio {territorySummary.territoryNumber}
          </DialogTitle>
          <DialogDescription>
            Mostrando todos los ciclos completados para el territorio "{territorySummary.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-2">
             <Filter className="h-4 w-4 text-muted-foreground" />
             <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por año" />
                </SelectTrigger>
                <SelectContent>
                    {availableYears.map(year => (
                        <SelectItem key={year} value={year}>
                            {year === "ALL_YEARS" ? "Todos los Años" : year}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="max-h-[50vh] overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Completado</TableHead>
                  <TableHead>Campaña Asociada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCycles.length > 0 ? (
                  filteredCycles.map((cycle, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(cycle.completionDate, "dd/MM/yyyy", { locale: es })}</TableCell>
                      <TableCell>
                        {cycle.campaignName ? (
                          <Badge variant="outline" className="font-semibold bg-primary/10 text-primary border-primary/70">
                            <Star className="mr-1.5 h-3.5 w-3.5" />
                            {cycle.campaignName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center h-24">
                      No hay ciclos completados para el año seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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