
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, AlertTriangle, Database, CheckCircle, List } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES } from "@/lib/constants";
import { historicalTerritoryData } from "@/lib/historical-data";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, getDocs, query, where, Timestamp } from "firebase/firestore";
import type { Territory, UserProfile, ReportedAssignmentData, SingleTerritoryReportDetails } from "@/types";

interface LogMessage {
  type: 'success' | 'warning' | 'error';
  message: string;
}

export default function ImportarDatosHistoricosPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [importLogs, setImportLogs] = useState<LogMessage[]>([]);
  const { toast } = useToast();
  const { userProfile } = usePermissions();

  const parseManzanas = (manzanasStr?: string): number[] => {
      if (!manzanasStr || manzanasStr.trim() === "") return [];
      
      const cleanedStr = manzanasStr.replace(/ y /g, ',').replace(/\s*a\s*/g, '-');
      const parts = cleanedStr.split(',').map(p => p.trim()).filter(p => p);
      const numbers = new Set<number>();

      parts.forEach(part => {
          if (part.includes('-')) {
              const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
              if (!isNaN(start) && !isNaN(end)) {
                  for (let i = start; i <= end; i++) {
                      numbers.add(i);
                  }
              }
          } else {
              const num = parseInt(part, 10);
              if (!isNaN(num)) {
                  numbers.add(num);
              }
          }
      });
      return Array.from(numbers).sort((a, b) => a - b);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportLogs([{ type: 'success', message: 'Iniciando importación...' }]);
    
    try {
        const batch = writeBatch(db);

        // 1. Fetch existing data for mapping
        const territoriesSnapshot = await getDocs(collection(db, "territories"));
        const usersSnapshot = await getDocs(collection(db, "users"));
        
        const territoriesMap = new Map<string, Territory>();
        territoriesSnapshot.forEach(doc => {
            const terr = { id: doc.id, ...doc.data() } as Territory;
            if (terr.number) {
              territoriesMap.set(terr.number.toString(), terr);
            }
        });

        const usersMap = new Map<string, UserProfile>();
        usersSnapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() } as UserProfile;
            usersMap.set(user.name.toLowerCase(), user);
        });
        
        setImportLogs(prev => [...prev, { type: 'success', message: `Encontrados ${territoriesMap.size} territorios y ${usersMap.size} usuarios en la base de datos.` }]);

        // 2. Process historical data
        for (const territoryHistory of historicalTerritoryData) {
            const territoryNumberStr = territoryHistory.numeroTerritorio.toString();
            const territory = territoriesMap.get(territoryNumberStr);

            if (!territory) {
                setImportLogs(prev => [...prev, { type: 'warning', message: `Territorio N°${territoryNumberStr} no encontrado en Firestore. Omitiendo ${territoryHistory.asignaciones.length} asignaciones.` }]);
                continue;
            }

            for (const assignmentJson of territoryHistory.asignaciones) {
                const user = usersMap.get(assignmentJson.publicador.toLowerCase());
                if (!user) {
                    setImportLogs(prev => [...prev, { type: 'warning', message: `Publicador "${assignmentJson.publicador}" no encontrado. Omitiendo asignación del ${assignmentJson.fechaAsignacion} para Territorio ${territoryNumberStr}.` }]);
                    continue;
                }
                
                const [day, month, year] = assignmentJson.fechaAsignacion.split('/').map(Number);
                const assignmentDate = new Date(year, month - 1, day);
                const dateString = format(assignmentDate, "yyyy-MM-dd");

                const newAssignmentRef = doc(collection(db, "assignments"));
                
                const workedBlockNumbers = parseManzanas(assignmentJson.manzanasTrabajadas);
                const reportDetails: SingleTerritoryReportDetails = {
                    territoryId: territory.id,
                    territoryName: territory.name,
                    territoryNotWorked: !assignmentJson.completadoAsignacion && workedBlockNumbers.length === 0,
                    workedBlocksIds: workedBlockNumbers.map(n => `block-${territory.id}-${n}`),
                };

                const reportData: ReportedAssignmentData = {
                    assignmentId: newAssignmentRef.id,
                    reports: [reportDetails],
                    generalNotes: assignmentJson.esCampanaEspecial ? `Historial: ${assignmentJson.nombreCampana}` : "Registro importado desde historial.",
                    reportedAt: Timestamp.fromDate(assignmentDate),
                    reportedByUserId: user.firebaseAuthUid || user.id,
                };
                
                const newAssignment = {
                    date: dateString,
                    time: "10:00", // Default time for historical records
                    type: territory.type === "urban" ? "publica" : "rural",
                    locationName: territory.name,
                    locationId: territory.id,
                    status: "accepted",
                    assignedBy: "Historial Importado",
                    userId: user.firebaseAuthUid || user.id,
                    userName: user.name,
                    userEmail: user.email,
                    assignedGroupId: user.assignedGroupId,
                    lastReportData: reportData,
                    createdAt: Timestamp.fromDate(assignmentDate),
                    updatedAt: Timestamp.fromDate(assignmentDate),
                };

                batch.set(newAssignmentRef, newAssignment);
            }
        }
        
        // 3. Commit batch
        setImportLogs(prev => [...prev, { type: 'success', message: `Datos procesados. Escribiendo en la base de datos...` }]);
        await batch.commit();

        toast({
            title: "Importación Completada",
            description: "Los datos históricos se han guardado en Firestore.",
            variant: "default",
        });
        setImportLogs(prev => [...prev, { type: 'success', message: '¡Importación finalizada con éxito!' }]);

    } catch (error: any) {
        console.error("Error during import:", error);
        toast({ title: "Error de Importación", description: error.message, variant: "destructive" });
        setImportLogs(prev => [...prev, { type: 'error', message: `Error: ${error.message}` }]);
    } finally {
        setIsImporting(false);
    }
  };

  const format = (date: Date, formatStr: string) => {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return formatStr.replace('yyyy', year.toString()).replace('MM', month.toString()).replace('dd', day.toString());
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
              Este proceso es delicado y puede sobreescribir o duplicar datos existentes. Asegúrate de que los territorios y publicadores del historial ya existan en el sistema. Ejecútalo solo una vez. No se puede deshacer.
            </AlertDescription>
          </Alert>
          <div className="text-center">
             <Button onClick={handleImport} disabled={isImporting} size="lg">
              {isImporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
              {isImporting ? 'Importando Datos...' : 'Importar Datos Históricos a Firestore'}
            </Button>
          </div>
          {importLogs.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center"><List className="mr-2 h-4 w-4"/>Registro de Importación</CardTitle>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto p-2">
                  <div className="space-y-1 text-xs font-mono p-2">
                    {importLogs.map((log, index) => (
                      <p key={index} className={
                        log.type === 'success' ? 'text-green-600' :
                        log.type === 'warning' ? 'text-amber-600' :
                        'text-red-600'
                      }>
                        {log.message}
                      </p>
                    ))}
                  </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">
                Haz clic en el botón para iniciar el proceso de carga de datos desde el archivo de historial.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}

    