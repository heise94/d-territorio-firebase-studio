
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, AlertTriangle, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES } from "@/lib/constants";

export default function ImportarDatosHistoricosPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userProfile } = usePermissions();

  const handleImport = () => {
    toast({
      title: "Próximamente",
      description: "La lógica de importación se añadirá en el siguiente paso.",
      variant: "default",
    });
  };

  if (userProfile?.role !== USER_ROLES.ENCARGADO_TERRITORIO) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5"/>
            Acceso Denegado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Solo los usuarios con el rol de "Encargado Territorio" pueden acceder a esta página.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Database className="mr-3 h-7 w-7 text-primary" /> Carga de Datos Históricos</CardTitle>
          <CardDescription>
            Esta página es una herramienta de un solo uso para migrar los datos históricos de asignaciones desde el archivo JSON a Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>¡Atención!</AlertTitle>
            <AlertDescription>
              Este proceso es delicado y puede sobreescribir o duplicar datos existentes. Asegúrate de ejecutarlo solo una vez y de que la base de datos esté en el estado correcto antes de proceder. No se puede deshacer.
            </AlertDescription>
          </Alert>
          <div className="text-center">
             <Button onClick={handleImport} disabled={true} size="lg">
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
              Importar Datos Históricos a Firestore (Deshabilitado)
            </Button>
          </div>
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">
                En el siguiente paso, se activará este botón y se cargará la lógica para procesar el JSON y guardarlo en la base de datos.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
