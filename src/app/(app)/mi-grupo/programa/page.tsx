
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Construction } from "lucide-react";

export default function MiGrupoProgramaPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" />
          Programa de Mi Grupo
        </h1>
        <p className="text-muted-foreground mt-1">
          Planifica y visualiza el programa de predicación específico para tu grupo.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Planificación Grupal</CardTitle>
          <CardDescription>
            Organiza las actividades, asignaciones de territorios y casas para tu grupo de predicación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
            <Construction className="h-20 w-20 text-muted-foreground/70 mb-6" />
            <p className="text-xl font-medium text-muted-foreground mb-2">Página en Construcción</p>
            <p className="text-sm text-muted-foreground text-center">
              La funcionalidad para gestionar el programa de tu grupo estará disponible aquí pronto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
