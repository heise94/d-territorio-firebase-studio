
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Construction } from "lucide-react";

export default function MiGrupoCasasPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <Building className="mr-3 h-8 w-8 text-primary" />
          Casas de Reunión de Mi Grupo
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra las casas de reunión utilizadas por tu grupo de predicación.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Casas Asignadas o Utilizadas por el Grupo</CardTitle>
          <CardDescription>
            Consulta y gestiona las casas de reunión disponibles para las actividades de tu grupo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
            <Construction className="h-20 w-20 text-muted-foreground/70 mb-6" />
            <p className="text-xl font-medium text-muted-foreground mb-2">Página en Construcción</p>
            <p className="text-sm text-muted-foreground text-center">
              La funcionalidad para gestionar las casas de reunión de tu grupo estará disponible aquí pronto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
