// This file is the new location for the Mi Grupo Publicadores page, moved from /app/(app)/mi-grupo/publicadores/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function MiGrupoPublicadoresPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" />
          Publicadores de Mi Grupo
        </h1>
        <p className="text-muted-foreground mt-1">
          Consulta y gestiona la información de los publicadores asignados a tu grupo.
        </p>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Funcionalidad en Desarrollo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Esta sección se está construyendo. ¡Vuelve pronto!</p>
        </CardContent>
      </Card>
    </div>
  );
}
