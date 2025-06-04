
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function TerritoriosPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Gestión de Territorios</h1>
          <p className="text-muted-foreground mt-1">
            Administra los territorios de predicación de la congregación.
          </p>
        </div>
        {/* Placeholder for Add Territory Button */}
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Territorios</CardTitle>
          <CardDescription>
            Actualmente no hay territorios registrados o esta sección está en desarrollo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
            <MapPin className="h-20 w-20 text-muted-foreground/70 mb-6" />
            <p className="text-xl font-medium text-muted-foreground mb-2">No hay territorios para mostrar.</p>
            <p className="text-sm text-muted-foreground">
              La funcionalidad para añadir y gestionar territorios se implementará pronto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
