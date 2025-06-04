
"use client";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddCasaDialog } from "@/components/casas/add-casa-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building, PlusCircle, Pencil, Trash2, Ban, CheckCircle2, Search, Phone, MapPin, CalendarClock, Users, ShieldCheck } from "lucide-react";
import type { Casa, CasaAvailability } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore"; 

function formatAvailability(availability?: CasaAvailability): string {
  if (!availability) return "No especificada";
  
  const dayLabels: Record<keyof Pick<Required<CasaAvailability>, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>, string> = {
    monday: 'Lu', tuesday: 'Ma', wednesday: 'Mi', thursday: 'Ju', friday: 'Vi'
  };
  const daysOrder: (keyof Pick<Required<CasaAvailability>, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

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
  return parts.length > 0 ? parts.join('; ') : "Disponibilidad no detallada";
}

export default function CasasPage() {
  const [isCasaDialogOpen, setIsCasaDialogOpen] = useState(false);
  const [casaToEdit, setCasaToEdit] = useState<Casa | null>(null);
  const [casas, setCasas] = useState<Casa[]>([]); // Populate this from Firestore later
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const handleOpenAddDialog = () => {
    setCasaToEdit(null);
    setIsCasaDialogOpen(true);
  };

  const handleOpenEditDialog = (casa: Casa) => {
    setCasaToEdit(casa);
    setIsCasaDialogOpen(true);
  };

  const handleCasaSubmit = (submittedCasa: Casa) => {
    setCasas(prevCasas => {
      const existingIndex = prevCasas.findIndex(c => c.id === submittedCasa.id);
      if (existingIndex > -1) {
        const updatedCasas = [...prevCasas];
        updatedCasas[existingIndex] = submittedCasa;
        return updatedCasas;
      } else {
        return [...prevCasas, submittedCasa];
      }
    });
    setIsCasaDialogOpen(false); 
  };

  const handleDeleteCasa = (casaId: string) => {
    setCasas(prevCasas => prevCasas.filter(c => c.id !== casaId));
    toast({ title: "Casa Eliminada", description: "La casa ha sido eliminada (simulación)." });
  };
  
  const handleToggleBlockCasa = (casaId: string) => {
     setCasas(prevCasas => 
        prevCasas.map(c => 
            c.id === casaId ? {...c, isBlocked: !c.isBlocked, updatedAt: Timestamp.now() } : c
        )
     );
     const casa = casas.find(c => c.id === casaId);
     toast({ 
        title: casa?.isBlocked ? "Casa Desbloqueada" : "Casa Bloqueada", 
        description: `La casa ha sido ${casa?.isBlocked ? 'desbloqueada' : 'bloqueada'} (simulación).`
    });
  }

  const filteredCasas = useMemo(() => {
    if (!searchTerm) return casas;
    return casas.filter(casa => 
      casa.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      casa.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [casas, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Gestión de Casas de Reunión</h1>
          <p className="text-muted-foreground mt-1">
            Administra las casas disponibles para las reuniones de grupos de predicación.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Nueva Casa
        </Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Casas</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2">
            <CardDescription>
              {filteredCasas.length > 0 
                ? `Mostrando ${filteredCasas.length} de ${casas.length} casa(s) registradas.`
                : casas.length > 0 ? "Ninguna casa coincide con la búsqueda."
                : "Actualmente no hay casas registradas."
              }
            </CardDescription>
            <div className="relative w-full sm:w-64 md:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por propietario o dirección..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
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
          ) : filteredCasas.length === 0 && searchTerm ? (
             <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                <Search className="h-20 w-20 text-muted-foreground/70 mb-6" />
                <p className="text-xl font-medium text-muted-foreground mb-2">Sin resultados</p>
                <p className="text-sm text-muted-foreground">
                    No se encontraron casas que coincidan con "{searchTerm}".
                </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCasas.map((casa) => (
                <Card key={casa.id} className={`flex flex-col hover:shadow-xl transition-shadow duration-200 rounded-lg ${casa.isBlocked ? 'opacity-60 bg-muted/50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-semibold">{casa.ownerName}</CardTitle>
                        <Badge variant={casa.isBlocked ? 'destructive' : 'default'}>
                            {casa.isBlocked ? 'Bloqueada' : 'Disponible'}
                        </Badge>
                    </div>
                    <CardDescription className="text-sm pt-1 flex items-center"><MapPin size={14} className="mr-1.5 text-muted-foreground shrink-0" /> {casa.address}</CardDescription>
                    {casa.phoneNumber && (
                        <p className="text-xs text-muted-foreground flex items-center"><Phone size={12} className="mr-1.5 shrink-0" /> {casa.phoneNumber}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3 pt-2 text-sm">
                    <div>
                        <span className="font-medium text-muted-foreground flex items-center"><CalendarClock size={14} className="mr-2" /> Disponibilidad (Lu-Vi):</span>
                        <p className="text-foreground pl-1 text-xs">{formatAvailability(casa.availableDays)}</p>
                    </div>
                    {/* Associated Territories display removed from here */}
                    {casa.isSuitableForRural !== undefined && (
                        <div className="flex items-center">
                            {casa.isSuitableForRural ? <CheckCircle2 size={14} className="mr-2 text-green-600" /> : <Ban size={14} className="mr-2 text-red-600" />}
                            <span className="text-xs">{casa.isSuitableForRural ? 'Apta para rural' : 'No apta para rural'}</span>
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
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(casa)} className="text-xs">
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button 
                        variant={casa.isBlocked ? "secondary" : "outline"} 
                        size="sm" 
                        onClick={() => handleToggleBlockCasa(casa.id)} 
                        className={`text-xs ${!casa.isBlocked ? 'hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-600' : 'hover:bg-green-500/10 hover:border-green-500 hover:text-green-600'}`}
                    >
                      {casa.isBlocked ? <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> : <Ban className="mr-1.5 h-3.5 w-3.5" />}
                      {casa.isBlocked ? 'Desbloq.' : 'Bloquear'}
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="text-xs">
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente la casa
                                de los registros.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCasa(casa.id)}>
                                Sí, eliminar
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCasaDialog 
        isOpen={isCasaDialogOpen} 
        onOpenChange={setIsCasaDialogOpen}
        onCasaSubmit={handleCasaSubmit}
        casaToEdit={casaToEdit}
      />
    </div>
  );
}
