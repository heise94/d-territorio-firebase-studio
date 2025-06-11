
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Construction } from "lucide-react";

export default function MiGrupoPublicadoresPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" />
          Publicadores de Mi Grupo
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestiona los publicadores asignados a tu grupo de predicación.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Publicadores del Grupo</CardTitle>
          <CardDescription>
            Consulta la información de los publicadores, su disponibilidad y asignaciones recientes dentro del grupo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-md border border-dashed">
            <Construction className="h-20 w-20 text-muted-foreground/70 mb-6" />
            <p className="text-xl font-medium text-muted-foreground mb-2">Página en Construcción</p>
            <p className="text-sm text-muted-foreground text-center">
              La funcionalidad para gestionar los publicadores de tu grupo estará disponible aquí pronto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
