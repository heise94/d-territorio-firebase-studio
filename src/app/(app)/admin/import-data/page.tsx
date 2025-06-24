"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, AlertTriangle, Database, CheckCircle2, List, Users, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES } from "@/lib/constants";
import { historicalTerritoryData } from "@/lib/historical-data";
import { usersToImport } from "@/lib/users-data"; // Import user data
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, getDocs, query, where, Timestamp } from "firebase/firestore";
import type { Territory, UserProfile, ReportedAssignmentData, SingleTerritoryReportDetails } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface LogMessage {
  type: 'success' | 'warning' | 'error';
  message: string;
}

type PreviewUser = {
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
};

export default function ImportarDatosPage() {
  const [isImportingAssignments, setIsImportingAssignments] = useState(false);
  const [assignmentImportLogs, setAssignmentImportLogs] = useState<LogMessage[]>([]);
  
  const [isPreviewingUsers, setIsPreviewingUsers] = useState(false);
  const [isImportingUsers, setIsImportingUsers] = useState(false);
  const [userImportLogs, setUserImportLogs] = useState<LogMessage[]>([]);
  const [previewUsers, setPreviewUsers] = useState<PreviewUser[]>([]);

  const { toast } = useToast();
  const { userProfile } = usePermissions();
  
  const handleUserPreview = () => {
    setIsPreviewingUsers(true);
    setPreviewUsers([]);
    setUserImportLogs([{ type: 'success', message: 'Procesando lista de usuarios para vista previa...' }]);

    const processedUsers = usersToImport.map(user => ({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    }));

    setPreviewUsers(processedUsers);
    setUserImportLogs(prev => [...prev, { type: 'success', message: `Se generó una vista previa de ${processedUsers.length} usuarios. Por favor, revisa antes de importar.` }]);
    setIsPreviewingUsers(false);
  };


  const handleUserImport = async () => {
    if (previewUsers.length === 0) {
        toast({ title: "Sin Vista Previa", description: "Genera una vista previa antes de importar.", variant: "default" });
        return;
    }
    setIsImportingUsers(true);
    setUserImportLogs(prev => [...prev, { type: 'success', message: 'Iniciando importación de usuarios a Firestore...' }]);
    
    try {
        const batch = writeBatch(db);
        const usersRef = collection(db, "users");

        const existingUsersSnapshot = await getDocs(query(usersRef));
        const existingEmails = new Set(existingUsersSnapshot.docs.map(doc => doc.data().email.toLowerCase()));

        let usersAddedCount = 0;
        let usersSkippedCount = 0;

        previewUsers.forEach(user => {
            if (user.email && existingEmails.has(user.email.toLowerCase())) {
                setUserImportLogs(prev => [...prev, { type: 'warning', message: `Usuario ${user.name} (${user.email}) ya existe. Omitiendo.` }]);
                usersSkippedCount++;
                return;
            }

            const newUserDocRef = doc(usersRef);
            const newUserProfile: Omit<UserProfile, 'availability' | 'managedCasaId'> = {
                id: newUserDocRef.id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role as UserProfile['role'],
                status: 'Pendiente Invitación',
                adminApprovalStatus: 'approved',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            batch.set(newUserDocRef, newUserProfile);
            usersAddedCount++;
        });

        setUserImportLogs(prev => [...prev, { type: 'success', message: `Datos procesados. Se añadirán ${usersAddedCount} nuevos usuarios y se omitirán ${usersSkippedCount}. Escribiendo en la base de datos...` }]);
        await batch.commit();

        toast({
            title: "Importación de Usuarios Completada",
            description: `${usersAddedCount} usuarios han sido añadidos a Firestore. ${usersSkippedCount} fueron omitidos.`,
            variant: "default",
        });
        setUserImportLogs(prev => [...prev, { type: 'success', message: '¡Importación de usuarios finalizada con éxito!' }]);
        setPreviewUsers([]);

    } catch (error: any) {
        console.error("Error during user import:", error);
        toast({ title: "Error de Importación de Usuarios", description: error.message, variant: "destructive" });
        setUserImportLogs(prev => [...prev, { type: 'error', message: `Error: ${error.message}` }]);
    } finally {
        setIsImportingUsers(false);
    }
  };


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

  const handleAssignmentImport = async () => {
    setIsImportingAssignments(true);
    setAssignmentImportLogs([{ type: 'success', message: 'Iniciando importación de asignaciones...' }]);
    
    try {
        const batch = writeBatch(db);

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
        
        setAssignmentImportLogs(prev => [...prev, { type: 'success', message: `Encontrados ${territoriesMap.size} territorios y ${usersMap.size} usuarios en la base de datos.` }]);

        for (const territoryHistory of historicalTerritoryData) {
            const territoryNumberStr = territoryHistory.numeroTerritorio.toString();
            const territory = territoriesMap.get(territoryNumberStr);

            if (!territory) {
                setAssignmentImportLogs(prev => [...prev, { type: 'warning', message: `Territorio N°${territoryNumberStr} no encontrado. Omitiendo ${territoryHistory.asignaciones.length} asignaciones.` }]);
                continue;
            }

            for (const assignmentJson of territoryHistory.asignaciones) {
                const user = usersMap.get(assignmentJson.publicador.toLowerCase());
                if (!user) {
                    setAssignmentImportLogs(prev => [...prev, { type: 'warning', message: `Publicador "${assignmentJson.publicador}" no encontrado. Omitiendo asignación para Territorio ${territoryNumberStr}.` }]);
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
                    time: "10:00",
                    type: territory.type === "urban" ? "publica" : "rural",
                    locationName: territory.name,
                    locationId: territory.id,
                    status: "accepted",
                    assignedBy: "Historial Importado",
                    userId: user.firebaseAuthUid || user.id,
                    userName: user.name,
                    userEmail: user.email,
                    assignedGroupId: user.assignedGroupId || null,
                    lastReportData: reportData,
                    createdAt: Timestamp.fromDate(assignmentDate),
                    updatedAt: Timestamp.fromDate(assignmentDate),
                };

                batch.set(newAssignmentRef, newAssignment);
            }
        }
        
        setAssignmentImportLogs(prev => [...prev, { type: 'success', message: `Datos procesados. Escribiendo en la base de datos...` }]);
        await batch.commit();

        toast({
            title: "Importación Completada",
            description: "Los datos históricos se han guardado en Firestore.",
            variant: "default",
        });
        setAssignmentImportLogs(prev => [...prev, { type: 'success', message: '¡Importación de asignaciones finalizada con éxito!' }]);

    } catch (error: any) {
        console.error("Error during assignment import:", error);
        toast({ title: "Error de Importación", description: error.message, variant: "destructive" });
        setAssignmentImportLogs(prev => [...prev, { type: 'error', message: `Error: ${error.message}` }]);
    } finally {
        setIsImportingAssignments(false);
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
          <CardTitle className="flex items-center"><Database className="mr-3 h-7 w-7 text-primary" /> Carga de Datos Iniciales</CardTitle>
          <CardDescription>
            Esta página es una herramienta para migrar los datos históricos y de publicadores a Firestore.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-3 h-6 w-6 text-primary" />Paso 1: Importar Publicadores</CardTitle>
            <CardDescription>Importa la lista de publicadores al sistema. Esto es necesario antes de importar las asignaciones.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="text-center">
             <Button onClick={handleUserPreview} disabled={isPreviewingUsers || isImportingUsers} size="lg">
              {isPreviewingUsers ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Eye className="mr-2 h-5 w-5" />}
              {isPreviewingUsers ? 'Procesando...' : 'Vista Previa de Usuarios'}
            </Button>
          </div>
          
           {previewUsers.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium text-center">Vista Previa de Usuarios a Importar</h3>
              <div className="max-h-80 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewUsers.map((user, index) => (
                      <TableRow key={index}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-center">
                <Button onClick={handleUserImport} disabled={isImportingUsers} size="lg">
                    {isImportingUsers ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                    {isImportingUsers ? 'Importando...' : `Confirmar e Importar ${previewUsers.length} Usuarios`}
                </Button>
              </div>
            </div>
          )}

           {userImportLogs.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center"><List className="mr-2 h-4 w-4"/>Registro de Importación de Usuarios</CardTitle>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto p-2">
                  <div className="space-y-1 text-xs font-mono p-2">
                    {userImportLogs.map((log, index) => (
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
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Database className="mr-3 h-7 w-7 text-primary" /> Paso 2: Carga de Asignaciones Históricas</CardTitle>
          <CardDescription>
            Esta herramienta migra los datos históricos de asignaciones. Ejecútala solo después de haber importado los publicadores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>¡Atención!</AlertTitle>
            <AlertDescription>
              Asegúrate de que los publicadores ya existan en el sistema (Paso 1). Este proceso podría fallar si no encuentra a los publicadores o territorios. Ejecútalo solo una vez.
            </AlertDescription>
          </Alert>
          <div className="text-center">
             <Button onClick={handleAssignmentImport} disabled={isImportingAssignments} size="lg">
              {isImportingAssignments ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
              {isImportingAssignments ? 'Importando Asignaciones...' : 'Importar Asignaciones a Firestore'}
            </Button>
          </div>
          {assignmentImportLogs.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center"><List className="mr-2 h-4 w-4"/>Registro de Importación de Asignaciones</CardTitle>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto p-2">
                  <div className="space-y-1 text-xs font-mono p-2">
                    {assignmentImportLogs.map((log, index) => (
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
      </Card>
    </div>
  );
}
    