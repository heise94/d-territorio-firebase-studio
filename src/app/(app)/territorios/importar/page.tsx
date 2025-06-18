
"use client";

import { useState, ChangeEvent, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import type { Territory, TerritoryType } from "@/types";
import { Timestamp, writeBatch, collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, UploadCloud, ListChecks, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ParsedTerritory = Omit<Territory, 'id' | 'createdAt' | 'updatedAt' | 'isBlocked' | 'mapImageUrl' | 'dataAiHint' | 'lastWorked' | 'blockReason' | 'unblockDate'> & {
  blockHouseCountsArray?: number[];
  doNotCallArray?: string[];
  warningsArray?: string[];
  groupIdsArray?: string[];
  associatedCasaIdsArray?: string[];
  approxHouseCountCalculated?: number;
  csvRowNumber: number;
  errors?: string[];
};

const CSV_EXPECTED_HEADERS = [
  "type", "number", "name", "totalBlocks", "blockHouseCounts", 
  "googleMapsLink", "doNotCallAddressesString", "warningsString", 
  "groupIds", "associatedCasaIds"
];

export default function ImportarTerritoriosPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedTerritories, setParsedTerritories] = useState<ParsedTerritory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv") {
        toast({ title: "Archivo Inválido", description: "Por favor, selecciona un archivo CSV.", variant: "destructive" });
        setCsvFile(null);
        return;
      }
      setCsvFile(file);
      setParsedTerritories([]); // Reset preview on new file
    }
  };

  const processCsv = useCallback(() => {
    if (!csvFile) {
      toast({ title: "Sin Archivo", description: "Por favor, selecciona un archivo CSV para procesar.", variant: "default" });
      return;
    }
    setIsLoading(true);
    setParsedTerritories([]);

    Papa.parse<Record<string, string>>(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields;
        if (!headers || !CSV_EXPECTED_HEADERS.every(h => headers.includes(h))) {
            toast({
                title: "Cabeceras incorrectas",
                description: `El CSV debe contener las columnas: ${CSV_EXPECTED_HEADERS.join(', ')}. Cabeceras encontradas: ${headers?.join(', ')}`,
                variant: "destructive",
                duration: 10000,
            });
            setIsLoading(false);
            return;
        }

        const territories: ParsedTerritory[] = [];
        results.data.forEach((row, index) => {
          const errors: string[] = [];
          
          const type = row.type?.toLowerCase() as TerritoryType | undefined;
          if (!type || !["urban", "rural"].includes(type)) {
            errors.push("Columna 'type' inválida o faltante (debe ser 'urban' o 'rural').");
          }
          const name = row.name?.trim();
          if (!name) {
            errors.push("Columna 'name' es obligatoria.");
          }
          const number = row.number?.trim() || undefined;
          if (type === "urban" && !number) {
            errors.push("Columna 'number' es obligatoria para tipo 'urban'.");
          }

          const totalBlocks = row.totalBlocks ? parseInt(row.totalBlocks, 10) : 0;
          if (isNaN(totalBlocks) || totalBlocks < 0) errors.push("Columna 'totalBlocks' debe ser un número >= 0.");
          
          let blockHouseCountsArray: number[] = [];
          let approxHouseCountCalculated = 0;
          if (row.blockHouseCounts?.trim()) {
            blockHouseCountsArray = row.blockHouseCounts.split(',').map(s => parseInt(s.trim(), 10));
            if (blockHouseCountsArray.some(isNaN)) errors.push("Columna 'blockHouseCounts' contiene valores no numéricos.");
            if (blockHouseCountsArray.length !== totalBlocks && totalBlocks > 0) errors.push(`'blockHouseCounts' (${blockHouseCountsArray.length}) no coincide con 'totalBlocks' (${totalBlocks}).`);
            approxHouseCountCalculated = blockHouseCountsArray.reduce((sum, count) => sum + (isNaN(count) ? 0 : count), 0);
          } else if (totalBlocks > 0) {
             blockHouseCountsArray = Array(totalBlocks).fill(0); // Default to 0 if not provided but blocks exist
          }


          territories.push({
            type: type || "urban", // Default to urban if type is invalid, error will be caught
            number: number,
            name: name || `Territorio Fila ${index + 1}`, // Default name if missing
            totalBlocks: totalBlocks,
            blockHouseCountsArray: blockHouseCountsArray,
            approxHouseCountCalculated: approxHouseCountCalculated,
            googleMapsLink: row.googleMapsLink?.trim() || undefined,
            doNotCallArray: row.doNotCallAddressesString?.split(';').map(s => s.trim()).filter(s => s) || [],
            warningsArray: row.warningsString?.split(';').map(s => s.trim()).filter(s => s) || [],
            groupIdsArray: row.groupIds?.split(';').map(s => s.trim()).filter(s => s) || [],
            associatedCasaIdsArray: row.associatedCasaIds?.split(';').map(s => s.trim()).filter(s => s) || [],
            csvRowNumber: index + 2, // +1 for header, +1 for 0-index
            errors: errors.length > 0 ? errors : undefined,
          });
        });
        setParsedTerritories(territories);
        setIsLoading(false);
        toast({ title: "CSV Procesado", description: `Se encontraron ${territories.length} territorios. Revisa la vista previa.` });
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        toast({ title: "Error al Parsear CSV", description: error.message, variant: "destructive" });
        setIsLoading(false);
      }
    });
  }, [csvFile, toast]);

  const handleImportToFirestore = async () => {
    if (parsedTerritories.length === 0) {
      toast({ title: "Sin Datos", description: "No hay territorios para importar.", variant: "default" });
      return;
    }
    
    const validTerritories = parsedTerritories.filter(t => !t.errors || t.errors.length === 0);
    if (validTerritories.length === 0) {
      toast({ title: "Sin Territorios Válidos", description: "No hay territorios válidos para importar. Corrige los errores en el CSV.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    const batch = writeBatch(db);
    const territoriesCollection = collection(db, "territories");
    let importCount = 0;

    validTerritories.forEach(parsedTerr => {
      const newTerritoryRef = doc(territoriesCollection); // Auto-generate ID
      const territoryData: Territory = {
        id: newTerritoryRef.id,
        type: parsedTerr.type,
        number: parsedTerr.number,
        name: parsedTerr.name,
        totalBlocks: parsedTerr.totalBlocks,
        blockHouseCounts: parsedTerr.blockHouseCountsArray,
        approxHouseCount: parsedTerr.approxHouseCountCalculated,
        googleMapsLink: parsedTerr.googleMapsLink,
        doNotCallAddresses: parsedTerr.doNotCallArray,
        warnings: parsedTerr.warningsArray,
        groupIds: parsedTerr.groupIdsArray,
        associatedCasaIds: parsedTerr.associatedCasaIdsArray,
        isBlocked: false,
        mapImageUrl: "", // Manual upload later
        dataAiHint: "",  // Manual later
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      batch.set(newTerritoryRef, territoryData);
      importCount++;
    });

    try {
      await batch.commit();
      toast({
        title: "Importación Exitosa",
        description: `${importCount} de ${validTerritories.length} territorios válidos han sido importados a Firestore.`,
        variant: "default"
      });
      setParsedTerritories([]);
      setCsvFile(null);
      const fileInput = document.getElementById('csvUpload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error) {
      console.error("Error importing to Firestore:", error);
      toast({ title: "Error de Importación", description: "No se pudieron guardar los territorios en Firestore.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };
  
  const territoriesWithErrors = parsedTerritories.filter(t => t.errors && t.errors.length > 0);
  const territoriesWithoutErrors = parsedTerritories.filter(t => !t.errors || t.errors.length === 0);


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><UploadCloud className="mr-3 h-7 w-7 text-primary" /> Importar Territorios desde CSV</CardTitle>
          <CardDescription>
            Sube un archivo CSV para agregar múltiples territorios al sistema. Las imágenes de mapas deberán subirse manualmente después.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/40">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-700 dark:text-blue-300 font-semibold">Instrucciones para el archivo CSV</AlertTitle>
            <AlertDescription className="text-blue-600 dark:text-blue-400 text-xs space-y-1 mt-1">
              <p>El archivo CSV debe tener una fila de encabezado con las siguientes columnas (el orden importa):</p>
              <code className="block p-2 rounded-md bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 text-[0.7rem] whitespace-pre-wrap">
                {CSV_EXPECTED_HEADERS.join(',')}
              </code>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><strong className="font-medium">type:</strong> 'urban' o 'rural' (requerido).</li>
                <li><strong className="font-medium">number:</strong> Número/código del territorio (ej: "101A"). Obligatorio si type="urban".</li>
                <li><strong className="font-medium">name:</strong> Nombre descriptivo (ej: "Centro Alto Manzanas 1-5") (requerido).</li>
                <li><strong className="font-medium">totalBlocks:</strong> Número total de manzanas (ej: 5). Opcional, numérico, por defecto 0.</li>
                <li><strong className="font-medium">blockHouseCounts:</strong> Conteo de casas por manzana, separado por comas (ej: "10,12,8"). Opcional. Si se provee, debe haber tantos números como `totalBlocks`.</li>
                <li><strong className="font-medium">googleMapsLink:</strong> URL de Google Maps. Opcional.</li>
                <li><strong className="font-medium">doNotCallAddressesString:</strong> Direcciones "No Visitar", separadas por punto y coma ";". Opcional.</li>
                <li><strong className="font-medium">warningsString:</strong> Advertencias, separadas por punto y coma ";". Opcional.</li>
                <li><strong className="font-medium">groupIds:</strong> IDs de grupos (SG o Auxiliar) asociados, separados por punto y coma ";". Opcional.</li>
                <li><strong className="font-medium">associatedCasaIds:</strong> IDs de casas asociadas, separadas por punto y coma ";". Opcional.</li>
              </ul>
              <p>Asegúrate que el archivo esté codificado en UTF-8 para caracteres especiales.</p>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <label htmlFor="csvUpload" className="text-sm font-medium">Seleccionar archivo CSV</label>
              <Input
                id="csvUpload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>
            <Button onClick={processCsv} disabled={!csvFile || isLoading} className="w-full md:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
              {isLoading ? "Procesando..." : "Procesar CSV y Mostrar Vista Previa"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {parsedTerritories.length > 0 && (
        <Card className="shadow-md mt-6">
          <CardHeader>
            <CardTitle>Vista Previa de Territorios a Importar</CardTitle>
            <CardDescription>
              Se encontraron {parsedTerritories.length} territorios en el CSV. 
              {territoriesWithoutErrors.length > 0 && <span className="text-green-600"> {territoriesWithoutErrors.length} parecen válidos.</span>}
              {territoriesWithErrors.length > 0 && <span className="text-red-600"> {territoriesWithErrors.length} tienen errores (se omitirán en la importación).</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Fila</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Manzanas</TableHead>
                  <TableHead>Casas (por manzana)</TableHead>
                  <TableHead>Errores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedTerritories.map((terr, index) => (
                  <TableRow key={index} className={terr.errors ? "bg-red-500/10" : ""}>
                    <TableCell>{terr.csvRowNumber}</TableCell>
                    <TableCell className="capitalize">{terr.type}</TableCell>
                    <TableCell>{terr.number || "N/A"}</TableCell>
                    <TableCell>{terr.name}</TableCell>
                    <TableCell>{terr.totalBlocks}</TableCell>
                    <TableCell>{terr.blockHouseCountsArray?.join(', ') || "N/A"}</TableCell>
                    <TableCell>
                      {terr.errors && terr.errors.length > 0 ? (
                        <ul className="list-disc list-inside text-xs text-destructive">
                          {terr.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button onClick={handleImportToFirestore} disabled={isImporting || territoriesWithoutErrors.length === 0}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isImporting ? "Importando..." : `Importar ${territoriesWithoutErrors.length} Territorios Válidos`}
            </Button>
            {territoriesWithErrors.length > 0 && (
                <p className="ml-4 text-sm text-destructive flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1.5"/> {territoriesWithErrors.length} territorio(s) con errores serán omitidos.
                </p>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
