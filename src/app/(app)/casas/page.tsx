
"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddCasaDialog } from "@/components/casas/add-casa-dialog";
import { Building, PlusCircle } from "lucide-react";
import type { Casa } from "@/types"; // Suponiendo que defines el tipo Casa aquí

export default function CasasPage() {
  const [isAddCasaDialogOpen, setIsAddCasaDialogOpen] = useState(false);
  const [casas, setCasas] = useState<Casa[]>([]); //  Aquí almacenaremos las casas

  const handleCasaAdded = (newCasa: Casa) => {
    // En el futuro, esto se integrará con Firestore
    // Por ahora, solo actualizamos el estado local para demostración
    setCasas(prevCasas => [...prevCasas, newCasa]); 
    console.log("Nueva casa (simulada):", newCasa);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Gestión de Casas</h1>
          <p className="text-muted-foreground mt-1">
            Administra las casas para la predicación. Añade, edita y organiza la información.
          </p>
        </div>
        <Button onClick={() => setIsAddCasaDialogOpen(true)}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Nueva Casa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Casas</CardTitle>
          <CardDescription>
            {casas.length > 0 
              ? `Mostrando ${casas.length} casa(s) registradas.`
              : "Actualmente no hay casas registradas. Añade una para empezar."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {casas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/50 rounded-md">
              <Building className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No hay casas para mostrar.</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en "Añadir Nueva Casa" para registrar la primera.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Aquí se listarán las casas en el futuro */}
              {casas.map((casa) => (
                <Card key={casa.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{casa.ownerName}</CardTitle>
                    <CardDescription>{casa.address}{casa.city ? `, ${casa.city}` : ''}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground mb-1"><strong>Estado:</strong> {casa.status}</p>
                    {casa.availabilityNotes && <p className="text-sm text-muted-foreground mb-1"><strong>Disponibilidad:</strong> {casa.availabilityNotes}</p>}
                    {casa.notes && <p className="text-sm text-muted-foreground"><strong>Notas:</strong> {casa.notes}</p>}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">Ver Detalles</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCasaDialog 
        isOpen={isAddCasaDialogOpen} 
        onOpenChange={setIsAddCasaDialogOpen}
        onCasaAdded={handleCasaAdded} 
      />
    </div>
  );
}
