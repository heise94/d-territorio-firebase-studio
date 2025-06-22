
"use client";

import type { Territory } from "@/types";
import { ReportTerritoryCard } from "./report-territory-card";

interface ReportesDetalleViewProps {
    territories: Territory[];
    getStatus: (territory: Territory) => 'Disponible' | 'En Curso' | 'Bloqueado';
}

export function ReportesDetalleView({ territories, getStatus }: ReportesDetalleViewProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {territories.map(territory => (
        <ReportTerritoryCard key={territory.id} territory={territory} status={getStatus(territory)} />
      ))}
    </div>
  );
}
