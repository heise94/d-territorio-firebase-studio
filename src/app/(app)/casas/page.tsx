
"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddCasaDialog } from "@/components/casas/add-casa-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building, PlusCircle, Pencil, Trash2, Ban, CheckCircle2, Search, Phone, MapPin, CalendarClock, Users, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import type { Casa, CasaAvailability } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [casas, setCasas] = useState<Casa[]>([]);
  const [isLoadingCasas, setIsLoadingCasas] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingCasas(false);
      return;
    }
    setIsLoadingCasas(true);
    const casasCollectionRef = collection(db, "casas");
    const q = query(casasCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCasas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt : Timestamp.now(),
        updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt : Timestamp.now(),
      } as Casa));
      setCasas(fetchedCasas);
      setIsLoadingCasas(false);
    }, (error) => {
      console.error("Error fetching casas:", error);
      toast({ title: "Error al Cargar Casas", description: "No se pudieron cargar las casas desde Firestore.", variant: "destructive" });
      setIsLoadingCasas(false);
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!isCasaDialogOpen) {
      setCasaToEdit(null);
    }
  }, [isCasaDialogOpen]);

  const handleOpenAddDialog = () => {
    setCasaToEdit(null);
    setIsCasaDialogOpen(true);
  };

  const handleOpenEditDialog = (casa: Casa) => {
    setCasaToEdit(casa);
    setIsCasaDialogOpen(true);
  };

  const handleCasaSubmit = async (submittedCasaData: Partial<Casa> & Pick<Casa, 'id' | 'ownerName' | 'address' | 'isBlocked' | 'createdAt' | 'updatedAt'>) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
      return;
    }

    const sanitizedData: Partial<Casa> = {};
    for (const key in submittedCasaData) {
        if (submittedCasaData[key as keyof typeof submittedCasaData] !== undefined) {
            (sanitizedData as any)[key] = submittedCasaData[key as keyof typeof submittedCasaData];
        }
    }
    
    const isEditing = !!casas.find(c => c.id === submittedCasaData.id);
    const docRef = doc(db, "casas", submittedCasaData.id);

    try {
      await setDoc(docRef, sanitizedData, { merge: true });
      toast({
        title: isEditing ? "Casa Actualizada" : "Casa Añadida",
        description: `La casa de ${submittedCasaData.ownerName} ha sido ${isEditing ? 'actualizada' : 'guardada'} en Firestore.`,
      });
      setIsCasaDialogOpen(false);
    } catch (error) {
      console.error("Error saving casa:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar la casa.", variant: "destructive" });
    }
  };

  const handleDeleteCasa = async (casaId: string) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
      return;
    }
    const casaToDelete = casas.find(c => c.id === casaId);
    try {
      await deleteDoc(doc(db, "casas", casaId));
      toast({ title: "Casa Eliminada", description: `La casa de ${casaToDelete?.ownerName || casaId} ha sido eliminada de Firestore.`, variant: "default" });
    } catch (error) {
      console.error("Error deleting casa:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar la casa.", variant: "destructive" });
    }
  };
  
  const handleToggleBlockCasa = async (casaId: string) => {
     if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
      return;
    }
    const casa = casas.find(c => c.id === casaId);
    if (!casa) return;

    const newBlockStatus = !casa.isBlocked;
    try {
      await updateDoc(doc(db, "casas", casaId), {
        isBlocked: newBlockStatus,
        updatedAt: Timestamp.now()
      });
      toast({
        title: newBlockStatus ? "Casa Bloqueada" : "Casa Desbloqueada",
        description: `La casa de ${casa.ownerName} ha sido ${newBlockStatus ? 'bloqueada' : 'desbloqueada'}.`
      });
    } catch (error) {
      console.error("Error toggling block status:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo cambiar el estado de bloqueo.", variant: "destructive" });
    }
  };

  const filteredCasas = useMemo(() => {
    if (!searchTerm) return casas;
    return casas.filter(casa => 
      casa.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      casa.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [casas, searchTerm]);

  return (
    <TooltipProvider>
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
              {isLoadingCasas ? "Cargando casas..." : 
                (filteredCasas.length > 0 
                  ? `Mostrando ${filteredCasas.length} de ${casas.length} casa(s) registradas.`
                  : casas.length > 0 ? "Ninguna casa coincide con la búsqueda."
                  : "Actualmente no hay casas registradas."
                )
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
          {isLoadingCasas ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="flex flex-col">
                  <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
                  <CardContent className="flex-grow space-y-2 pt-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                  <CardFooter className="border-t pt-3 pb-3 flex justify-end gap-1">
                    <Skeleton className="h-8 w-8" /> <Skeleton className="h-8 w-8" /> <Skeleton className="h-8 w-8" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : casas.length === 0 && !searchTerm ? (
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
                    {casa.isSuitableForRural !== undefined && (
                        <div className="flex items-center">
                            {casa.isSuitableForRural ? <CheckCircle2 size={14} className="mr-2 text-green-600" /> : <ShieldAlert size={14} className="mr-2 text-red-600" />}
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
                  <CardFooter className="border-t pt-4 pb-4 flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(casa)} aria-label="Editar casa" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Editar</p></TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleToggleBlockCasa(casa.id)} 
                            aria-label={casa.isBlocked ? "Desbloquear casa" : "Bloquear casa"}
                            className="h-8 w-8"
                        >
                          {casa.isBlocked ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-amber-600" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{casa.isBlocked ? 'Desbloquear' : 'Bloquear'}</p></TooltipContent>
                    </Tooltip>

                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Eliminar casa" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Eliminar</p></TooltipContent>
                      </Tooltip>
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
    </TooltipProvider>
  );
}

