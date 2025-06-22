
"use client";

import type { Territory } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { es } from "date-fns/locale";

interface S13ViewProps {
    territories: Territory[];
}

export function S13View({ territories }: S13ViewProps) {
    if (territories.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
            <p className="text-xl font-medium text-muted-foreground mb-2">No hay territorios que mostrar</p>
            <p className="text-sm text-muted-foreground">
              Prueba a ajustar los filtros o añade nuevos territorios.
            </p>
          </div>
        );
    }
  return (
    <div className="border rounded-md">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Territorio</TableHead>
                    <TableHead>Fecha Salida</TableHead>
                    <TableHead>Fecha Devolución</TableHead>
                    <TableHead>Observaciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {territories.map(territory => (
                    <TableRow key={territory.id}>
                        <TableCell className="font-medium">T-{territory.number || territory.name}</TableCell>
                        <TableCell>--/--/----</TableCell> 
                        <TableCell>
                            {territory.lastWorked ? format(parseISO(territory.lastWorked), "dd/MM/yyyy", { locale: es }) : '--/--/----'}
                        </TableCell>
                        <TableCell className="text-xs italic text-muted-foreground">
                            {territory.isBlocked ? `BLOQUEADO: ${territory.blockReason || 'Sin razón'}` : 'Vista detallada S-13 próximamente'}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}
