
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon, Eraser } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export interface ReportFilters {
  serviceYear?: string;
  fromDate?: Date;
  toDate?: Date;
  territoryNumber?: string;
  assignedTo?: string;
}

interface FiltrosReportesSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onApplyFilters: (filters: ReportFilters) => void;
  currentFilters: ReportFilters;
}

export function FiltrosReportesSheet({
  isOpen,
  onOpenChange,
  onApplyFilters,
  currentFilters,
}: FiltrosReportesSheetProps) {
  const [localFilters, setLocalFilters] = useState<ReportFilters>(currentFilters);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    onApplyFilters({});
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filtrar Reportes</SheetTitle>
          <SheetDescription>
            Aplica filtros para refinar los resultados en ambas vistas.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="territoryNumber" className="text-right">
              Territorio
            </Label>
            <Input
              id="territoryNumber"
              value={localFilters.territoryNumber || ""}
              onChange={(e) => setLocalFilters(prev => ({...prev, territoryNumber: e.target.value}))}
              placeholder="N° o nombre"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignedTo" className="text-right">
              Publicador
            </Label>
            <Input
              id="assignedTo"
              value={localFilters.assignedTo || ""}
              onChange={(e) => setLocalFilters(prev => ({...prev, assignedTo: e.target.value}))}
              placeholder="Nombre"
              className="col-span-3"
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Desde</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !localFilters.fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.fromDate ? format(localFilters.fromDate, "PPP", {locale: es}) : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localFilters.fromDate}
                  onSelect={(date) => setLocalFilters(prev => ({ ...prev, fromDate: date }))}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Hasta</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !localFilters.toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.toDate ? format(localFilters.toDate, "PPP", {locale: es}) : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localFilters.toDate}
                  onSelect={(date) => setLocalFilters(prev => ({ ...prev, toDate: date }))}
                  disabled={(date) => localFilters.fromDate ? date < localFilters.fromDate : false}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <SheetFooter>
            <Button variant="outline" onClick={handleClear} className="w-full sm:w-auto">
                <Eraser className="mr-2 h-4 w-4" />
                Limpiar Filtros
            </Button>
          <SheetClose asChild>
            <Button onClick={handleApply} className="w-full sm:w-auto">Aplicar Filtros</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

    