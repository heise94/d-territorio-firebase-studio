
"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddCasaDialog } from "@/components/casas/add-casa-dialog";
import { Building, PlusCircle, Pencil, Trash2, Ban, Clock, MapPin } from "lucide-react";
import type { Casa, CasaAvailability, DayAvailability } from "@/types"; 
import { Badge } from "@/components/ui/badge";

const CASA_STATUS_DISPLAY: Record<Casa['status'], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  available: { label: 'Disponible', variant: 'default' },
  do_not_call: { label: 'No Visitar', variant: 'destructive' },
  contacted: { label: 'Contactada', variant: 'secondary' },
  needs_revisit: { label: 'Necesita Revisita', variant: 'outline' },
};

function formatAvailability(availability?: CasaAvailability): string {
  if (!availability) return "No especificada";
  const daysOrder: (keyof CasaAvailability)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayLabels: Record<keyof CasaAvailability, string> = {
    monday: 'Lu', tuesday: 'Ma', wednesday: 'Mi', thursday: 'Ju', friday: 'Vi'
  };
  
  const parts: string[] = [];
  daysOrder.forEach(dayKey => {
    const daySlots = availability[dayKey];
    if (daySlots && (daySlots.am || daySlots.pm)) {
      const slots: string[] = [];
      if (daySlots.am) slots.push("AM");
      if (daySlots.pm) slots.push("PM");
      parts.push(`${dayLabels[dayKey]}: ${slots.join('/')}`);
    }
  });
  return parts.length > 0 ? parts.join('; ') : "No especificada";
}


export default function CasasPage() {
  const [isAddCasaDialogOpen, setIsAddCasaDialogOpen] = useState(false);
  const [casas, setCasas] = useState<Casa[]>([]); 

  const handleCasaAdded = (newCasa: Casa) => {
    setCasas(prevCasas => [...prevCasas, newCasa]);
  };

  // Placeholder functions for actions
  const handleEditCasa = (casaId: string) => {
    console.log("Editar casa:", casaId);
    // Aquí se abriría el diálogo de edición con los datos de la casa
  };

  const handleDeleteCasa = (casaId: string) => {
    console.log("Eliminar casa:", casaId);
    // Aquí se implementaría la lógica de eliminación, con confirmación
    setCasas(prevCasas => prevCasas.filter(c => c.id !== casaId)); // Simulación
  };
  
  const handleSetDoNotCall = (casaId: string) => {
     console.log("Marcar como No Visitar casa:", casaId);
     // Aquí se actualizaría el estado de la casa
     setCasas(prevCasas => prevCasas.map(c => c.id === casaId ? {...c, status: 'do_not_call'} : c)); // Simulación
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Gestión de Casas de Reunión</h1>
          <p className="text-muted-foreground mt-1">
            Administra las casas disponibles para las reuniones de grupos de predicación.
          </p>
        </div>
        <Button onClick={() => setIsAddCasaDialogOpen(true)} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Nueva Casa
        </Button>
      </div>

      <Card className="shadow-lg">
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
            <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
              <Building className="h-20 w-20 text-muted-foreground/70 mb-6" />
              <p className="text-xl font-medium text-muted-foreground mb-2">No hay casas para mostrar.</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en "Añadir Nueva Casa" para registrar la primera.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {casas.map((casa) => (
                <Card key={casa.id} className="flex flex-col hover:shadow-xl transition-shadow duration-200 rounded-lg">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-semibold">{casa.ownerName}</CardTitle>
                        <Badge variant={CASA_STATUS_DISPLAY[casa.status]?.variant || 'secondary'}>
                            {CASA_STATUS_DISPLAY[casa.status]?.label || casa.status}
                        </Badge>
                    </div>
                    <CardDescription className="text-sm pt-1">{casa.address}{casa.city ? `, ${casa.city}` : ''}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3 pt-2 text-sm">
                    <div>
                        <span className="font-medium text-muted-foreground flex items-center"><Clock size={14} className="mr-2" /> Disponibilidad:</span>
                        <p className="text-foreground pl-1">{formatAvailability(casa.availability)}</p>
                    </div>
                    {casa.nearbyTerritoryIds && (
                         <div>
                            <span className="font-medium text-muted-foreground flex items-center"><MapPin size={14} className="mr-2" /> Territorios Cercanos:</span>
                            <p className="text-foreground pl-1">{casa.nearbyTerritoryIds}</p>
                        </div>
                    )}
                    {casa.notes && (
                        <div>
                            <span className="font-medium text-muted-foreground">Notas:</span>
                            <p className="text-foreground pl-1 text-xs italic">{casa.notes}</p>
                        </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t pt-4 pb-4 grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditCasa(casa.id)} className="text-xs">
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSetDoNotCall(casa.id)} className="text-xs hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-600">
                      <Ban className="mr-1.5 h-3.5 w-3.5" /> No Visitar
                    </Button>
                     <Button variant="destructive" size="sm" onClick={() => handleDeleteCasa(casa.id)} className="text-xs">
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
                    </Button>
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
