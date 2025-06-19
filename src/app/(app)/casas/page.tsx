
"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AddCasaDialog } from "@/components/casas/add-casa-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building, PlusCircle, Pencil, Trash2, Ban, CheckCircle2, Search, Phone, MapPin, CalendarClock, Users, ShieldCheck, ShieldAlert, Loader2, Users2 as GroupIcon, CalendarX2, Info, Users as UsersTypeIcon, MountainSnow, Video, MessageSquareWarning } from "lucide-react";
import type { Casa, UnavailabilityPeriod, PreachingGroup, ProgramScheduleSlot, DayOfWeek, SettingsDoc, PreachingType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, query, orderBy, deleteField, getDoc, FieldValue, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES } from "@/lib/constants";

const DAY_ORDER_AVAILABILITY: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS_AVAILABILITY: Record<DayOfWeek, string> = {
  monday: 'Lu', tuesday: 'Ma', wednesday: 'Mi', thursday: 'Ju', friday: 'Vi', saturday: 'Sá', sunday: 'Do'
};

const PreachingTypeIconSmall = ({ type, className }: { type: PreachingType, className?: string }) => {
  const defaultClass = "mr-1 h-3 w-3 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersTypeIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  return null;
};


function formatAvailability(availableSlotIds?: string[], allSlots?: ProgramScheduleSlot[]): string {
  if (!availableSlotIds || availableSlotIds.length === 0 || !allSlots || allSlots.length === 0) {
    return "No especificada";
  }

  const groupedByDay: Record<DayOfWeek, ProgramScheduleSlot[]> = {
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  };

  availableSlotIds.forEach(slotId => {
    const slotDetail = allSlots.find(s => s.id === slotId && s.type !== 'zoom');
    if (slotDetail) {
      groupedByDay[slotDetail.dayOfWeek].push(slotDetail);
    }
  });

  const parts: string[] = [];
  DAY_ORDER_AVAILABILITY.forEach(dayKey => {
    const daySlots = groupedByDay[dayKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (daySlots.length > 0) {
      const slotStrings = daySlots.map(s => {
        let typeAbbreviation = 'G'; 
        if (s.type === 'rural') typeAbbreviation = 'R';
        return `${s.startTime} (${typeAbbreviation})`;
      });
      parts.push(`${DAY_LABELS_AVAILABILITY[dayKey]}: ${slotStrings.join(', ')}`);
    }
  });

  return parts.length > 0 ? parts.join('; ') : "No especificada (o solo horarios Zoom)";
}


function formatUnavailabilityPeriods(periods?: UnavailabilityPeriod[]): string | null {
    if (!periods || periods.length === 0) return null;
    return periods.map(p => {
        const start = p.startDate instanceof Timestamp ? p.startDate.toDate() : new Date(p.startDate);
        const end = p.endDate instanceof Timestamp ? p.endDate.toDate() : new Date(p.endDate);
        let periodString = `${format(start, "dd/MM/yy", { locale: es })} - ${format(end, "dd/MM/yy", { locale: es })}`;
        if (p.reason) periodString += ` (${p.reason})`;
        return periodString;
    }).join('; ');
}


export default function CasasPage() {
  const [isCasaDialogOpen, setIsCasaDialogOpen] = useState(false);
  const [casaToEdit, setCasaToEdit] = useState<Casa | null>(null);
  const [casas, setCasas] = useState<Casa[]>([]);
  const [isLoadingCasas, setIsLoadingCasas] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { userProfile, isLoadingPermissions: isLoadingUserProfile, hasPermission } = usePermissions();

  const [availableGroups, setAvailableGroups] = useState<PreachingGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const [programScheduleSlots, setProgramScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isLoadingProgramSlots, setIsLoadingProgramSlots] = useState(true);

  const [isBlockReasonCasaDialogOpen, setIsBlockReasonCasaDialogOpen] = useState(false);
  const [casaToBlock, setCasaToBlock] = useState<Casa | null>(null);
  const [blockReasonCasa, setBlockReasonCasa] = useState("");


  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingCasas(false);
      setIsLoadingGroups(false);
      setIsLoadingProgramSlots(false);
      return;
    }
    setIsLoadingCasas(true);
    const casasCollectionRef = collection(db, "casas");
    const qCasas = query(casasCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribeCasas = onSnapshot(qCasas, (snapshot) => {
      const fetchedCasas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt : Timestamp.now(),
        updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt : Timestamp.now(),
        unavailabilityPeriods: (doc.data().unavailabilityPeriods || []).map((p: any) => ({
            ...p,
            id: p.id || crypto.randomUUID(), 
            startDate: p.startDate instanceof Timestamp ? p.startDate.toDate() : new Date(p.startDate),
            endDate: p.endDate instanceof Timestamp ? p.endDate.toDate() : new Date(p.endDate),
        }))
      } as Casa));
      setCasas(fetchedCasas);
      setIsLoadingCasas(false);
    }, (error) => {
      console.error("Error fetching casas:", error);
      toast({ title: "Error al Cargar Casas", description: "No se pudieron cargar las casas desde Firestore.", variant: "destructive" });
      setIsLoadingCasas(false);
    });

    setIsLoadingGroups(true);
    const groupsCollectionRef = collection(db, "preachingGroups");
    const qGroups = query(groupsCollectionRef, orderBy("name", "asc"));
    const unsubscribeGroups = onSnapshot(qGroups, (snapshot) => {
        const fetchedGroups = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as PreachingGroup));
        setAvailableGroups(fetchedGroups);
        setIsLoadingGroups(false);
    }, (error) => {
        console.error("Error fetching preaching groups:", error);
        toast({ title: "Error al Cargar Grupos", description: "No se pudieron cargar los grupos de predicación.", variant: "destructive" });
        setIsLoadingGroups(false);
    });

    setIsLoadingProgramSlots(true);
    const settingsDocRef = doc(db, "settings", "programConfig");
    const unsubscribeSlots = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const settingsData = docSnap.data() as SettingsDoc;
          const slots = settingsData.programScheduleSlots || [];
          setProgramScheduleSlots(slots.sort((a,b) => {
            const dayCompare = DAY_ORDER_AVAILABILITY.indexOf(a.dayOfWeek) - DAY_ORDER_AVAILABILITY.indexOf(b.dayOfWeek);
            if (dayCompare !== 0) return dayCompare;
            return a.startTime.localeCompare(b.startTime);
          }));
        } else {
          setProgramScheduleSlots([]);
        }
        setIsLoadingProgramSlots(false);
    }, (error) => {
        console.error("Error fetching program schedule slots for Casa Dialog:", error);
        toast({ title: "Error al Cargar Horarios", description: "No se pudieron cargar los horarios del programa.", variant: "destructive" });
        setIsLoadingProgramSlots(false);
    });


    return () => {
      unsubscribeCasas();
      unsubscribeGroups();
      unsubscribeSlots();
    };
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

    const isEditing = !!casas.find(c => c.id === submittedCasaData.id);
    const docRef = doc(db, "casas", submittedCasaData.id);
    
    const dataForFirestore: { [key: string]: any } = {
        ownerName: submittedCasaData.ownerName,
        address: submittedCasaData.address,
        isBlocked: submittedCasaData.isBlocked, // This comes from submittedCasaData, reflecting original state for edit
        updatedAt: Timestamp.now(),
        createdAt: (isEditing && casaToEdit?.createdAt) ? casaToEdit.createdAt : Timestamp.now(),
    };

    const optionalFields: (keyof Casa)[] = ['phoneNumber', 'notes', 'notesForSS', 'addedByGroupId', 'isSuitableForRural', 'lastVisitedAt'];
    optionalFields.forEach(key => {
        if (submittedCasaData[key] === undefined || (typeof submittedCasaData[key] === 'string' && (submittedCasaData[key] as string).trim() === "")) {
            dataForFirestore[key] = deleteField();
        } else if (submittedCasaData[key] !== null) { 
            dataForFirestore[key] = submittedCasaData[key];
        }
    });
    
    if (submittedCasaData.unavailabilityPeriods && submittedCasaData.unavailabilityPeriods.length > 0) {
        dataForFirestore.unavailabilityPeriods = submittedCasaData.unavailabilityPeriods.map((p: UnavailabilityPeriod) => ({
            id: p.id || crypto.randomUUID(),
            startDate: p.startDate instanceof Date ? Timestamp.fromDate(p.startDate) : p.startDate,
            endDate: p.endDate instanceof Date ? Timestamp.fromDate(p.endDate) : p.endDate,
            reason: p.reason?.trim() ? p.reason.trim() : deleteField(),
        }));
    } else {
        dataForFirestore.unavailabilityPeriods = deleteField();
    }

    if (submittedCasaData.availableDays && submittedCasaData.availableDays.availableProgramSlotIds && submittedCasaData.availableDays.availableProgramSlotIds.length > 0) {
        dataForFirestore.availableDays = { availableProgramSlotIds: submittedCasaData.availableDays.availableProgramSlotIds };
    } else {
        dataForFirestore.availableDays = deleteField();
    }

    // Explicitly handle blockReason to preserve it if the casa is still blocked
    if (submittedCasaData.isBlocked) {
      if (submittedCasaData.blockReason && submittedCasaData.blockReason.trim() !== "") {
        dataForFirestore.blockReason = submittedCasaData.blockReason.trim();
      } else {
        // If it's blocked but no reason is provided (e.g., cleared or was never set), remove the field
        dataForFirestore.blockReason = deleteField();
      }
    } else {
      // If it's not blocked, ensure blockReason is removed
      dataForFirestore.blockReason = deleteField();
    }
    
    Object.keys(dataForFirestore).forEach(k => {
        if (dataForFirestore[k] === undefined && !(dataForFirestore[k] instanceof FieldValue) ) {
            delete dataForFirestore[k]; 
        }
    });

    try {
      await setDoc(docRef, dataForFirestore, { merge: true });
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

  const handleOpenBlockReasonCasaDialog = (casa: Casa) => {
    setCasaToBlock(casa);
    setBlockReasonCasa(casa.blockReason || "");
    setIsBlockReasonCasaDialogOpen(true);
  };

  const confirmToggleBlockCasa = async () => {
    if (!casaToBlock || !db || Object.keys(db).length === 0) return;

    const newBlockStatus = !casaToBlock.isBlocked;
    const updateData: { isBlocked: boolean; updatedAt: Timestamp; blockReason?: any } = {
      isBlocked: newBlockStatus,
      updatedAt: Timestamp.now(),
    };

    if (newBlockStatus) {
      updateData.blockReason = blockReasonCasa.trim() ? blockReasonCasa.trim() : deleteField();
    } else {
      updateData.blockReason = deleteField();
    }

    try {
      await updateDoc(doc(db, "casas", casaToBlock.id), updateData);
      toast({
        title: newBlockStatus ? "Casa Bloqueada" : "Casa Desbloqueada",
        description: `La casa de ${casaToBlock.ownerName} ha sido ${newBlockStatus ? 'bloqueada' : 'desbloqueada'}.`
      });
    } catch (error) {
      console.error("Error toggling block status for casa:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo cambiar el estado de bloqueo de la casa.", variant: "destructive" });
    } finally {
      setIsBlockReasonCasaDialogOpen(false);
      setCasaToBlock(null);
      setBlockReasonCasa("");
    }
  };

  const filteredCasas = useMemo(() => {
    if (!searchTerm) return casas;
    return casas.filter(casa =>
      casa.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      casa.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (casa.addedByGroupId && getGroupNameById(casa.addedByGroupId).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [casas, searchTerm, availableGroups]);

  const getGroupNameById = useCallback((groupId?: string) => {
    if (!groupId) return 'N/A';
    const group = availableGroups.find(g => g.id === groupId);
    return group ? group.name : groupId;
  }, [availableGroups]);

  const isLoadingAny = isLoadingCasas || isLoadingGroups || isLoadingProgramSlots || isLoadingUserProfile;
  
  const canManageBlocking = userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO;
  const canViewBlockDetails = userProfile?.role === USER_ROLES.ENCARGADO_TERRITORIO || userProfile?.role === USER_ROLES.SS;


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
        <Button onClick={handleOpenAddDialog} size="lg" disabled={isLoadingAny}>
          {isLoadingAny ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
          Añadir Nueva Casa
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Casas</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2">
            <CardDescription>
              {isLoadingAny ? "Cargando información..." :
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
                    placeholder="Buscar por propietario, dirección o grupo..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAny ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="flex flex-col">
                  <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
                  <CardContent className="flex-grow space-y-2 pt-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                  <CardFooter className="border-t pt-3 pb-3 flex justify-center gap-1">
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
              {filteredCasas.map((casa) => {
                const formattedUnavailability = formatUnavailabilityPeriods(casa.unavailabilityPeriods);
                const formattedAvailability = formatAvailability(casa.availableDays?.availableProgramSlotIds, programScheduleSlots);
                const isCasaActuallyBlocked = casa.isBlocked;
                const showBlockedState = isCasaActuallyBlocked && canViewBlockDetails;
                
                let cardContentClass = "flex-grow space-y-3 pt-2 text-sm";
                let cardDescriptionClass = "text-sm pt-1 flex items-center";
                let cardPhoneClass = "text-xs text-muted-foreground flex items-center";
                let cardGroupClass = "text-xs text-muted-foreground flex items-center pt-1";

                if (showBlockedState && !canManageBlocking) { // Not admin, just viewing a blocked state
                    cardContentClass += " opacity-70";
                    cardDescriptionClass += " opacity-70";
                    cardPhoneClass += " opacity-70";
                    cardGroupClass += " opacity-70";
                }


                return (
                <Card key={casa.id} className={`flex flex-col hover:shadow-xl transition-shadow duration-200 rounded-lg ${showBlockedState ? 'bg-muted/50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-semibold">{casa.ownerName}</CardTitle>
                        {showBlockedState && (
                            <Badge variant='destructive' className="capitalize">Bloqueada</Badge>
                        )}
                    </div>
                    <CardDescription className={cardDescriptionClass}><MapPin size={14} className="mr-1.5 text-muted-foreground shrink-0" /> {casa.address}</CardDescription>
                    {casa.phoneNumber && (
                        <p className={cardPhoneClass}><Phone size={12} className="mr-1.5 shrink-0" /> {casa.phoneNumber}</p>
                    )}
                    {casa.addedByGroupId && (
                         <p className={cardGroupClass}><GroupIcon size={12} className="mr-1.5 shrink-0 text-blue-600" /> Grupo: <span className="font-medium text-blue-700 dark:text-blue-400 ml-1">{getGroupNameById(casa.addedByGroupId)}</span></p>
                    )}
                  </CardHeader>
                  <CardContent className={cardContentClass}>
                    <div>
                        <span className="font-medium text-muted-foreground flex items-center"><CalendarClock size={14} className="mr-2" /> Disponibilidad (Horarios Programa):</span>
                        <p className="text-foreground pl-1 text-xs">{formattedAvailability}</p>
                    </div>
                    {formattedUnavailability && (
                        <div>
                            <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center"><CalendarX2 size={14} className="mr-2" /> No Disponible:</span>
                            <p className="text-amber-700 dark:text-amber-500 pl-1 text-xs">{formattedUnavailability}</p>
                        </div>
                    )}
                    {casa.isSuitableForRural !== undefined && (
                        <div className="flex items-center">
                            {casa.isSuitableForRural ? <CheckCircle2 size={14} className="mr-2 text-green-600" /> : <ShieldAlert size={14} className="mr-2 text-red-600" />}
                            <span className="text-xs">{casa.isSuitableForRural ? 'Apta para rural' : 'No apta para rural'}</span>
                        </div>
                    )}
                    {casa.notes && (
                        <div>
                            <span className="font-medium text-muted-foreground flex items-center"><Info size={14} className="mr-2"/>Notas:</span>
                            <p className="text-foreground pl-1 text-xs italic">{casa.notes}</p>
                        </div>
                    )}
                    {canViewBlockDetails && casa.notesForSS && (
                         <div>
                            <span className="font-medium text-purple-600 dark:text-purple-400 flex items-center"><MessageSquareWarning size={14} className="mr-2"/>Notas para SS:</span>
                            <p className="text-purple-700 dark:text-purple-300 pl-1 text-xs italic">{casa.notesForSS}</p>
                        </div>
                    )}
                     {showBlockedState && casa.blockReason && (
                        <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                            <p className="text-xs font-medium text-destructive flex items-center"><MessageSquareWarning size={13} className="mr-1.5"/> Razón Bloqueo:</p>
                            <p className="text-xs text-destructive/90 italic">{casa.blockReason}</p>
                        </div>
                    )}
                  </CardContent>
                  <CardFooter className={`border-t pt-4 pb-4 flex justify-center gap-1 ${showBlockedState && !canManageBlocking ? 'opacity-60 pointer-events-none' : ''}`}>
                    {canManageBlocking && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(casa)} aria-label="Editar casa" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Editar</p></TooltipContent>
                      </Tooltip>
                    )}

                    {canManageBlocking && (
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    if (casa.isBlocked) { 
                                        setCasaToBlock(casa); 
                                        setBlockReasonCasa(casa.blockReason || ""); // Keep existing reason if unblocking
                                        confirmToggleBlockCasa(); 
                                    } else { 
                                        handleOpenBlockReasonCasaDialog(casa);
                                    }
                                }}
                                aria-label={casa.isBlocked ? "Desbloquear casa" : "Bloquear casa"}
                                className={`h-8 w-8 ${!casa.isBlocked ? 'text-amber-600 hover:bg-amber-500/10' : 'text-green-600 hover:bg-green-500/10'}`}
                            >
                            {casa.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{casa.isBlocked ? 'Desbloquear' : 'Bloquear'}</p></TooltipContent>
                        </Tooltip>
                    )}

                    {canManageBlocking && (
                        <AlertDialog>
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Eliminar casa" className="h-8 w-8 text-destructive hover:bg-destructive/10">
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
                            <AlertDialogAction onClick={() => handleDeleteCasa(casa.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                Sí, eliminar
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCasaDialog
        isOpen={isCasaDialogOpen}
        onOpenChange={setIsCasaDialogOpen}
        onCasaSubmit={handleCasaSubmit}
        casaToEdit={casaToEdit}
        availableGroups={availableGroups}
        programScheduleSlots={programScheduleSlots}
      />

      {casaToBlock && (
        <AlertDialog open={isBlockReasonCasaDialogOpen} onOpenChange={setIsBlockReasonCasaDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-amber-500"/>Bloquear Casa: {casaToBlock.ownerName}</AlertDialogTitle>
              <AlertDialogDescription>
                Estás a punto de bloquear esta casa. Si lo deseas, puedes añadir una razón (opcional).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="blockReasonCasaInput" className="text-sm font-medium">Razón del Bloqueo (Opcional)</Label>
              <Textarea
                id="blockReasonCasaInput"
                placeholder="Ej: No disponible temporalmente, renovaciones, etc."
                value={blockReasonCasa}
                onChange={(e) => setBlockReasonCasa(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsBlockReasonCasaDialogOpen(false); setCasaToBlock(null); setBlockReasonCasa(""); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmToggleBlockCasa} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Confirmar Bloqueo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
    </TooltipProvider>
  );
}
