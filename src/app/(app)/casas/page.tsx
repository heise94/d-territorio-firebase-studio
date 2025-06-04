
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Building } from "lucide-react";

export default function CasasPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Gestión de Casas</h1>
        <p className="text-muted-foreground mt-1">
          Aquí podrás administrar las casas para la predicación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Casas</CardTitle>
          <CardDescription>
            Actualmente no hay casas registradas. Próximamente podrás añadir y gestionar casas desde aquí.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/50 rounded-md">
            <Building className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No hay casas para mostrar.</p>
            <p className="text-sm text-muted-foreground">
              La funcionalidad para agregar casas estará disponible pronto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
