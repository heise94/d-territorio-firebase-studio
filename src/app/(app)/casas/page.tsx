
"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AddCasaDialog } from "@/components/casas/add-casa-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building, PlusCircle, Pencil, Trash2, Ban, CheckCircle2, Search, Phone, MapPin, CalendarClock, Users, ShieldCheck, ShieldAlert, Loader2, Users2 as GroupIcon, CalendarX2, Info, Users as UsersTypeIcon, MountainSnow, Video, MessageSquareWarning, Filter, X as XIcon, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import type { Casa, UnavailabilityPeriod, PreachingGroup, ProgramScheduleSlot, DayOfWeek, SettingsDoc, PreachingType, Territory } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, query, orderBy, deleteField, FieldValue, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/use-permissions";
import { USER_ROLES, PERMISSIONS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormDescription as FormFieldDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";


const DAY_ORDER_AVAILABILITY: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS_AVAILABILITY: Record<DayOfWeek, string> = {
  monday: 'Lu', tuesday: 'Ma', wednesday: 'Mi', thursday: 'Ju', friday: 'Vi', saturday: 'Sá', sunday: 'Do'
};

const dayOfWeekLabels: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const PreachingTypeIconSmall = ({ type, className }: { type: PreachingType, className?: string }) => {
  const defaultClass = "mr-1 h-3 w-3 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersTypeIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  return null;
};

const blockCasaFormSchema = z.object({
  forSystem: z.boolean().default(false),
  forGroup: z.boolean().default(false),
  reason: z.string().max(200, "Máximo 200 caracteres.").optional(),
}).refine(data => data.forSystem || data.forGroup, {
  message: "Debes seleccionar al menos un tipo de bloqueo.",
  path: ["forSystem"], // You can point to any of the checkboxes
});

type BlockCasaFormValues = z.infer<typeof blockCasaFormSchema>;


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

  const [availableTerritories, setAvailableTerritories] = useState<Territory[]>([]);
  const [isLoadingTerritories, setIsLoadingTerritories] = useState(true);

  const [isBlockCasaDialogOpen, setIsBlockCasaDialogOpen] = useState(false);
  const [casaToBlock, setCasaToBlock] = useState<Casa | null>(null);
  
  const [filterGroupId, setFilterGroupId] = useState<string>("ALL_GROUPS");
  const [filterStatus, setFilterStatus] = useState<string>("all"); 
  const [filterAvailabilityDay, setFilterAvailabilityDay] = useState<string>("ALL_DAYS"); 
  const [filterAvailabilitySlotId, setFilterAvailabilitySlotId] = useState<string>("ALL_SLOTS"); 
  const [filterSuitableForRural, setFilterSuitableForRural] = useState<string>("all"); 
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const blockForm = useForm<BlockCasaFormValues>({
    resolver: zodResolver(blockCasaFormSchema),
    defaultValues: { forSystem: false, forGroup: false, reason: "" },
  });

  const nonZoomProgramSlots = useMemo(() => {
    return programScheduleSlots.filter(slot => slot.type !== 'zoom');
  }, [programScheduleSlots]);

  const availabilitySlotOptions = useMemo(() => {
    if (filterAvailabilityDay === "ALL_DAYS") {
      const uniqueSlots = new Map<string, { id: string; label: string }>();
      nonZoomProgramSlots.forEach(slot => {
        const label = `${slot.startTime} (${slot.type === 'rural' ? 'R' : 'G'})`;
        if (!uniqueSlots.has(label)) { 
           uniqueSlots.set(label, { id: slot.id, label: `${label} - ${dayOfWeekLabels[slot.dayOfWeek].substring(0,2)}` }); 
        }
      });
      return Array.from(uniqueSlots.values()).sort((a,b) => a.label.localeCompare(b.label));
    }
    return nonZoomProgramSlots
      .filter(slot => slot.dayOfWeek === filterAvailabilityDay)
      .map(slot => ({ id: slot.id, label: `${slot.startTime} (${slot.type === 'rural' ? 'R' : 'G'})` }))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [nonZoomProgramSlots, filterAvailabilityDay]);


  useEffect(() => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingCasas(false);
      setIsLoadingGroups(false);
      setIsLoadingProgramSlots(false);
      setIsLoadingTerritories(false);
      return;
    }
    // Casas
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

    // Grupos
    setIsLoadingGroups(true);
    const groupsCollectionRef = collection(db, "preachingGroups");
    const qGroups = query(groupsCollectionRef, orderBy("name", "asc"));
    const unsubscribeGroups = onSnapshot(qGroups, (snapshot) => {
        const fetchedGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreachingGroup));
        setAvailableGroups(fetchedGroups);
        setIsLoadingGroups(false);
    }, (error) => {
        console.error("Error fetching preaching groups:", error);
        toast({ title: "Error al Cargar Grupos", description: "No se pudieron cargar los grupos de predicación.", variant: "destructive" });
        setIsLoadingGroups(false);
    });

    // Horarios del Programa
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

    // Territorios
    setIsLoadingTerritories(true);
    const territoriesCollectionRef = collection(db, "territories");
    const qTerritories = query(territoriesCollectionRef, orderBy("name", "asc"));
    const unsubscribeTerritories = onSnapshot(qTerritories, (snapshot) => {
        const fetchedTerritories = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Territory));
        setAvailableTerritories(fetchedTerritories);
        setIsLoadingTerritories(false);
    }, (error) => {
        console.error("Error fetching territories for Casa Dialog:", error);
        toast({ title: "Error al Cargar Territorios", description: "No se pudieron cargar los territorios disponibles.", variant: "destructive" });
        setIsLoadingTerritories(false);
    });


    return () => {
      unsubscribeCasas();
      unsubscribeGroups();
      unsubscribeSlots();
      unsubscribeTerritories();
    };
  }, [toast]);

  useEffect(() => {
    if (!isCasaDialogOpen) {
      setCasaToEdit(null);
    }
  }, [isCasaDialogOpen]);

  useEffect(() => {
    if (isBlockCasaDialogOpen && casaToBlock) {
      blockForm.reset(casaToBlock.blockInfo || { forSystem: false, forGroup: false, reason: "" });
    } else {
      blockForm.reset({ forSystem: false, forGroup: false, reason: "" });
    }
  }, [isBlockCasaDialogOpen, casaToBlock, blockForm]);
  
  // Reset page when filters or view mode change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGroupId, filterStatus, filterAvailabilityDay, filterAvailabilitySlotId, filterSuitableForRural, viewMode]);

  // Adjust items per page based on view mode
  useEffect(() => {
    if (viewMode === 'list') {
      setItemsPerPage(10);
    } else {
      setItemsPerPage(9);
    }
    setCurrentPage(1);
  }, [viewMode]);

  const handleOpenAddDialog = () => {
    setCasaToEdit(null);
    setIsCasaDialogOpen(true);
  };

  const handleOpenEditDialog = (casa: Casa) => {
    setCasaToEdit(casa);
    setIsCasaDialogOpen(true);
  };

  const handleCasaSubmit = async (
    submittedCasaData: Partial<Casa> & Pick<Casa, 'id' | 'ownerName' | 'address' | 'createdAt' | 'updatedAt'> & { selectedNearbyTerritoryIds?: string[] }
  ) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
      return;
    }
    
    const isActualEditOperation = !!casaToEdit; 
    const casaIdToUse = submittedCasaData.id; 

    const dataForCasaDoc: { [key: string]: any } = {
        id: casaIdToUse,
        ownerName: submittedCasaData.ownerName,
        address: submittedCasaData.address,
        updatedAt: Timestamp.now(),
        createdAt: submittedCasaData.createdAt,
    };
    
    const optionalFields: (keyof Casa)[] = ['phoneNumber', 'notes', 'notesForSS', 'addedByGroupId', 'isSuitableForRural', 'lastVisitedAt'];
    optionalFields.forEach(key => {
        const K = key as keyof typeof submittedCasaData;
        if (submittedCasaData[K] === undefined || (typeof submittedCasaData[K] === 'string' && (submittedCasaData[K] as string).trim() === "")) {
            dataForCasaDoc[key] = deleteField();
        } else if (submittedCasaData[K] !== null) { 
            dataForCasaDoc[key] = submittedCasaData[K];
        }
    });
    
    if (submittedCasaData.unavailabilityPeriods && submittedCasaData.unavailabilityPeriods.length > 0) {
        dataForCasaDoc.unavailabilityPeriods = submittedCasaData.unavailabilityPeriods.map((p: UnavailabilityPeriod) => ({
            id: p.id || crypto.randomUUID(),
            startDate: p.startDate instanceof Date ? Timestamp.fromDate(p.startDate) : p.startDate,
            endDate: p.endDate instanceof Date ? Timestamp.fromDate(p.endDate) : p.endDate,
            reason: (p.reason && p.reason.trim() !== "") ? p.reason.trim() : deleteField(),
        }));
    } else {
        dataForCasaDoc.unavailabilityPeriods = deleteField();
    }

    if (submittedCasaData.availableDays && submittedCasaData.availableDays.availableProgramSlotIds && submittedCasaData.availableDays.availableProgramSlotIds.length > 0) {
        dataForCasaDoc.availableDays = { availableProgramSlotIds: submittedCasaData.availableDays.availableProgramSlotIds };
    } else {
        dataForCasaDoc.availableDays = deleteField();
    }
    
    Object.keys(dataForCasaDoc).forEach(k => {
        if (dataForCasaDoc[k] === undefined && !(dataForCasaDoc[k] instanceof FieldValue) ) {
            delete dataForCasaDoc[k]; 
        }
    });

    const batch = writeBatch(db);
    const casaDocRef = doc(db, "casas", casaIdToUse);
    batch.set(casaDocRef, dataForCasaDoc, { merge: true });

    const newSelectedTerritoryIds = new Set(submittedCasaData.selectedNearbyTerritoryIds || []);
    
    availableTerritories.forEach(terr => {
      const currentAssociations = new Set(terr.associatedCasaIds || []);
      let needsUpdate = false;

      if (newSelectedTerritoryIds.has(terr.id)) { 
        if (!currentAssociations.has(casaIdToUse)) {
          currentAssociations.add(casaIdToUse);
          needsUpdate = true;
        }
      } else { 
        if (currentAssociations.has(casaIdToUse)) {
          currentAssociations.delete(casaIdToUse);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const terrUpdateRef = doc(db, "territories", terr.id);
        const updatedAssociatedCasaIds = Array.from(currentAssociations);
        if (updatedAssociatedCasaIds.length > 0) {
            batch.update(terrUpdateRef, { associatedCasaIds: updatedAssociatedCasaIds, updatedAt: Timestamp.now() });
        } else {
            batch.update(terrUpdateRef, { associatedCasaIds: deleteField(), updatedAt: Timestamp.now() });
        }
      }
    });

    try {
      await batch.commit();
      toast({
        title: isActualEditOperation ? "Casa Actualizada" : "Casa Añadida",
        description: `La casa de ${submittedCasaData.ownerName} ha sido ${isActualEditOperation ? 'actualizada' : 'guardada'}. Territorios cercanos sincronizados.`,
      });
      setIsCasaDialogOpen(false); 
    } catch (error) {
      console.error("Error saving casa and updating territories:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar la casa o sincronizar los territorios.", variant: "destructive" });
    }
  };

  const handleDeleteCasa = async (casaId: string) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Base de Datos", description: "No se pudo conectar.", variant: "destructive" });
      return;
    }
    const casaToDelete = casas.find(c => c.id === casaId);
    const batch = writeBatch(db);

    availableTerritories.forEach(terr => {
      if (terr.associatedCasaIds?.includes(casaId)) {
        const updatedAssociatedCasaIds = terr.associatedCasaIds.filter(id => id !== casaId);
        const terrUpdateRef = doc(db, "territories", terr.id);
        if (updatedAssociatedCasaIds.length > 0) {
            batch.update(terrUpdateRef, { associatedCasaIds: updatedAssociatedCasaIds, updatedAt: Timestamp.now() });
        } else {
             batch.update(terrUpdateRef, { associatedCasaIds: deleteField(), updatedAt: Timestamp.now() });
        }
      }
    });

    batch.delete(doc(db, "casas", casaId));

    try {
      await batch.commit();
      toast({ title: "Casa Eliminada", description: `La casa de ${casaToDelete?.ownerName || casaId} ha sido eliminada y desvinculada de los territorios.`, variant: "default" });
    } catch (error) {
      console.error("Error deleting casa and updating territories:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar la casa o actualizar los territorios.", variant: "destructive" });
    }
  };

  const handleOpenBlockCasaDialog = (casa: Casa) => {
    setCasaToBlock(casa);
    setIsBlockCasaDialogOpen(true);
  };
  
  const handleUnblockCasa = async (casa: Casa) => {
    if (!db || Object.keys(db).length === 0) return;
    try {
      await updateDoc(doc(db, "casas", casa.id), {
        blockInfo: deleteField(),
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Casa Desbloqueada", description: `La casa de ${casa.ownerName} ha sido desbloqueada.` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo desbloquear la casa.", variant: "destructive" });
    }
  };
  
  const onBlockCasaSubmit = async (values: BlockCasaFormValues) => {
    if (!casaToBlock) return;
    try {
      await updateDoc(doc(db, "casas", casaToBlock.id), {
        blockInfo: {
          forSystem: values.forSystem,
          forGroup: values.forGroup,
          reason: values.reason || "",
        },
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Casa Bloqueada", description: `La casa de ${casaToBlock.ownerName} ha sido bloqueada.` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo bloquear la casa.", variant: "destructive" });
    } finally {
      setIsBlockCasaDialogOpen(false);
    }
  };

  const getGroupNameById = useCallback((groupId?: string) => {
    if (!groupId) return 'N/A';
    const group = availableGroups.find(g => g.id === groupId);
    return group ? group.name : groupId;
  }, [availableGroups]);

  const filteredCasas = useMemo(() => {
    return casas.filter(casa => {
        const searchMatch = searchTerm === "" ||
            casa.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            casa.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (casa.addedByGroupId && getGroupNameById(casa.addedByGroupId).toLowerCase().includes(searchTerm.toLowerCase()));
        if (!searchMatch) return false;

        const groupMatch = filterGroupId === "ALL_GROUPS" || casa.addedByGroupId === filterGroupId;
        if (!groupMatch) return false;

        const statusMatch = filterStatus === "all" ||
            (filterStatus === "available" && !casa.blockInfo) ||
            (filterStatus === "blocked" && !!casa.blockInfo);
        if (!statusMatch) return false;
        
        const ruralMatch = filterSuitableForRural === "all" ||
            (filterSuitableForRural === "yes" && casa.isSuitableForRural === true) ||
            (filterSuitableForRural === "no" && (casa.isSuitableForRural === false || casa.isSuitableForRural === undefined));
        if (!ruralMatch) return false;
        
        const casaAvailableSlots = casa.availableDays?.availableProgramSlotIds || [];
        if (filterAvailabilitySlotId !== "ALL_SLOTS") { 
            if (!casaAvailableSlots.includes(filterAvailabilitySlotId)) return false;
        } else if (filterAvailabilityDay !== "ALL_DAYS") { 
            const dayMatch = casaAvailableSlots.some(slotId => {
                const slotDetail = programScheduleSlots.find(s => s.id === slotId);
                return slotDetail && slotDetail.dayOfWeek === filterAvailabilityDay && slotDetail.type !== 'zoom';
            });
            if (!dayMatch) return false;
        }
        return true;
    });
  }, [casas, searchTerm, availableGroups, filterGroupId, filterStatus, filterAvailabilityDay, filterAvailabilitySlotId, filterSuitableForRural, programScheduleSlots, getGroupNameById]);
  
  const totalPages = useMemo(() => {
    return Math.ceil(filteredCasas.length / itemsPerPage);
  }, [filteredCasas.length, itemsPerPage]);

  const paginatedCasas = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCasas.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCasas, currentPage, itemsPerPage]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterGroupId("ALL_GROUPS");
    setFilterStatus("all");
    setFilterAvailabilityDay("ALL_DAYS");
    setFilterAvailabilitySlotId("ALL_SLOTS");
    setFilterSuitableForRural("all");
    toast({ title: "Filtros Limpiados", description: "Se han restablecido todos los filtros." });
  };


  const isLoadingAny = isLoadingCasas || isLoadingGroups || isLoadingProgramSlots || isLoadingUserProfile || isLoadingTerritories;
  
  const canManageCasas = hasPermission(PERMISSIONS.MANAGE_CASAS);
  const canViewBlockDetails = hasPermission(PERMISSIONS.VIEW_CASAS);

  const renderCasaActions = (casa: Casa) => (
    <div className="flex items-center justify-center gap-0.5">
      {canManageCasas && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(casa)} aria-label="Editar casa" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Editar</p></TooltipContent>
        </Tooltip>
      )}

      {canManageCasas && (
          <Tooltip>
          <TooltipTrigger asChild>
              <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => casa.blockInfo ? handleUnblockCasa(casa) : handleOpenBlockCasaDialog(casa)}
                  aria-label={casa.blockInfo ? "Desbloquear casa" : "Bloquear casa"}
                  className={`h-8 w-8 ${!casa.blockInfo ? 'text-amber-600 hover:bg-amber-500/10' : 'text-green-600 hover:bg-green-500/10'}`}
              >
              {casa.blockInfo ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              </Button>
          </TooltipTrigger>
          <TooltipContent><p>{casa.blockInfo ? 'Desbloquear' : 'Bloquear'}</p></TooltipContent>
          </Tooltip>
      )}

      {canManageCasas && (
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
    </div>
  );


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
        {canManageCasas && (
            <Button onClick={handleOpenAddDialog} size="lg" disabled={isLoadingAny}>
            {isLoadingAny ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
            Añadir Nueva Casa
            </Button>
        )}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Casas</CardTitle>
          <div className="space-y-4 pt-3">
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
                <div className="relative sm:col-span-2 md:col-span-1 xl:col-span-1">
                    <Label htmlFor="searchTermInput" className="text-xs">Buscar General</Label>
                    <Search className="absolute left-2.5 top-[calc(0.75rem+14px)] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="searchTermInput"
                        type="search"
                        placeholder="Propietario, dirección, grupo..."
                        className="pl-8 w-full h-9 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="filterGroup" className="text-xs">Grupo</Label>
                    <Select value={filterGroupId} onValueChange={setFilterGroupId} disabled={availableGroups.length === 0}>
                        <SelectTrigger id="filterGroup" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL_GROUPS">Todos los Grupos</SelectItem>
                            {availableGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="filterStatus" className="text-xs">Estado</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="filterStatus" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="available">Disponibles</SelectItem>
                            <SelectItem value="blocked">Bloqueadas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="filterAvailabilityDay" className="text-xs">Día Disponible</Label>
                    <Select value={filterAvailabilityDay} onValueChange={(value) => { setFilterAvailabilityDay(value); setFilterAvailabilitySlotId("ALL_SLOTS");}}>
                        <SelectTrigger id="filterAvailabilityDay" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL_DAYS">Cualquier Día</SelectItem>
                            {DAY_ORDER_AVAILABILITY.map(dayKey => <SelectItem key={dayKey} value={dayKey}>{dayOfWeekLabels[dayKey]}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="filterAvailabilitySlot" className="text-xs">Horario Específico</Label>
                    <Select value={filterAvailabilitySlotId} onValueChange={setFilterAvailabilitySlotId} disabled={availabilitySlotOptions.length === 0 && filterAvailabilityDay === "ALL_DAYS"}>
                        <SelectTrigger id="filterAvailabilitySlot" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL_SLOTS">Cualquier Horario</SelectItem>
                            {availabilitySlotOptions.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="filterSuitableRural" className="text-xs">Apta para Rural</Label>
                    <Select value={filterSuitableForRural} onValueChange={setFilterSuitableForRural}>
                        <SelectTrigger id="filterSuitableRural" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Ambos</SelectItem>
                            <SelectItem value="yes">Sí</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleClearFilters} variant="outline" size="sm" className="h-9 self-end">
                    <XIcon className="mr-1.5 h-4 w-4" /> Limpiar
                </Button>
            </div>
             <div className="pt-2 flex justify-between items-center">
              <CardDescription>
                {isLoadingAny ? "Cargando información..." :
                  (filteredCasas.length > 0
                    ? `Mostrando ${paginatedCasas.length} de ${filteredCasas.length} casa(s) según filtros.`
                    : casas.length > 0 ? "Ninguna casa coincide con los filtros."
                    : "Actualmente no hay casas registradas."
                  )
                }
              </CardDescription>
              <div className="flex items-center gap-2">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} aria-label="Vista de tarjetas">
                  <LayoutGrid className="h-5 w-5" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} aria-label="Vista de lista">
                  <List className="h-5 w-5" />
                </Button>
              </div>
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
          ) : viewMode === 'grid' ? (
              paginatedCasas.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                    <Filter className="h-20 w-20 text-muted-foreground/70 mb-6" />
                    <p className="text-xl font-medium text-muted-foreground mb-2">Sin resultados para los filtros</p>
                    <p className="text-sm text-muted-foreground">
                        Intenta ajustar o limpiar los filtros para encontrar casas.
                    </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedCasas.map((casa) => {
                    const formattedUnavailability = formatUnavailabilityPeriods(casa.unavailabilityPeriods);
                    const formattedAvailability = formatAvailability(casa.availableDays?.availableProgramSlotIds, programScheduleSlots);
                    const showBlockedBadge = !!casa.blockInfo && canViewBlockDetails;
                    
                    let cardBaseClass = "flex flex-col hover:shadow-xl transition-shadow duration-200 rounded-lg";
                    let cardContentClass = "flex-grow space-y-3 pt-2 text-sm";
                    
                    if (showBlockedBadge) {
                        cardBaseClass += ' bg-muted/50'; 
                    }
                     if (showBlockedBadge && !canManageCasas) { 
                        cardContentClass += " opacity-70";
                    }

                    return (
                    <Card key={casa.id} className={cardBaseClass}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-xl font-semibold">{casa.ownerName}</CardTitle>
                            {showBlockedBadge && (
                                <Badge variant='destructive' className="capitalize">Bloqueada</Badge>
                            )}
                        </div>
                        <CardDescription className="text-sm pt-1 flex items-center"><MapPin size={14} className="mr-1.5 text-muted-foreground shrink-0" /> {casa.address}</CardDescription>
                      </CardHeader>
                      <CardContent className={cardContentClass}>
                        {casa.phoneNumber && (
                            <p className="text-xs flex items-center"><Phone size={12} className="mr-1.5 shrink-0" /> {casa.phoneNumber}</p>
                        )}
                        {casa.addedByGroupId && (
                            <p className="text-xs flex items-center pt-1"><GroupIcon size={12} className="mr-1.5 shrink-0 text-blue-600" /> Grupo: <span className="font-medium text-blue-700 dark:text-blue-400 ml-1">{getGroupNameById(casa.addedByGroupId)}</span></p>
                        )}
                        <div>
                            <span className="font-medium text-muted-foreground flex items-center"><CalendarClock size={14} className="mr-2" /> Disponibilidad:</span>
                            <p className="text-foreground pl-1 text-xs">{formattedAvailability}</p>
                        </div>
                         {showBlockedBadge && casa.blockInfo?.reason && (
                            <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                                <p className="text-xs font-medium text-destructive flex items-center"><MessageSquareWarning size={13} className="mr-1.5"/> Razón Bloqueo:</p>
                                <p className="text-xs text-destructive/90 italic">{casa.blockInfo.reason}</p>
                            </div>
                        )}
                      </CardContent>
                       <CardFooter className={`border-t pt-4 pb-4 ${showBlockedBadge && !canManageCasas ? 'opacity-60 pointer-events-none' : ''}`}>
                          {renderCasaActions(casa)}
                       </CardFooter>
                    </Card>
                  );
                })}
                </div>
              )
          ) : ( // viewMode === 'list'
            <div className="overflow-x-auto">
              {paginatedCasas.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
                    <Filter className="h-20 w-20 text-muted-foreground/70 mb-6" />
                    <p className="text-xl font-medium text-muted-foreground mb-2">Sin resultados para los filtros</p>
                    <p className="text-sm text-muted-foreground">
                        Intenta ajustar o limpiar los filtros para encontrar casas.
                    </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propietario</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Disponibilidad</TableHead>
                      <TableHead>Apta p/ Rural</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCasas.map((casa) => {
                      const isCasaBlocked = !!casa.blockInfo;
                      const showBlockedBadge = isCasaBlocked && canViewBlockDetails;
                      return (
                        <TableRow key={casa.id} className={showBlockedBadge ? "bg-muted/50" : ""}>
                          <TableCell className="font-medium">{casa.ownerName}</TableCell>
                          <TableCell className="text-xs">{casa.address}</TableCell>
                          <TableCell className="text-xs">{getGroupNameById(casa.addedByGroupId)}</TableCell>
                          <TableCell className="text-xs">{formatAvailability(casa.availableDays?.availableProgramSlotIds, programScheduleSlots)}</TableCell>
                          <TableCell className="text-center">
                            {casa.isSuitableForRural ? <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" /> : <XIcon className="h-5 w-5 text-destructive mx-auto" />}
                          </TableCell>
                          <TableCell>
                            {showBlockedBadge ? <Badge variant="destructive">Bloqueada</Badge> : <Badge variant="default">Disponible</Badge>}
                          </TableCell>
                          <TableCell>{renderCasaActions(casa)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
         {totalPages > 1 && (
            <CardFooter className="border-t pt-4 pb-4 flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
           )}
      </Card>

      {canManageCasas && (
          <AddCasaDialog
            isOpen={isCasaDialogOpen}
            onOpenChange={setIsCasaDialogOpen}
            onCasaSubmit={handleCasaSubmit}
            casaToEdit={casaToEdit}
            availableGroups={availableGroups}
            programScheduleSlots={programScheduleSlots}
            availableTerritories={availableTerritories}
        />
      )}

       <Dialog open={isBlockCasaDialogOpen} onOpenChange={setIsBlockCasaDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-amber-500"/>Bloquear Casa: {casaToBlock?.ownerName}</DialogTitle>
              <DialogDescriptionComponent>
                Define el alcance y la razón del bloqueo.
              </DialogDescriptionComponent>
            </DialogHeader>
            <Form {...blockForm}>
            <form onSubmit={blockForm.handleSubmit(onBlockCasaSubmit)} className="space-y-4 py-2">
                <div className="space-y-3 rounded-md border p-4">
                  <FormField
                    control={blockForm.control}
                    name="forSystem"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none"><Label htmlFor="forSystem" className="font-normal">Bloquear para Sistema</Label><FormFieldDescription className="text-xs">La casa no será considerada por el sistema para la generación automática del programa.</FormFieldDescription></div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={blockForm.control}
                    name="forGroup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none"><Label htmlFor="forGroup" className="font-normal">Bloquear para Grupo (Manual)</Label><FormFieldDescription className="text-xs">La casa no aparecerá como opción para los SG en la planificación de grupo.</FormFieldDescription></div>
                      </FormItem>
                    )}
                  />
                  {blockForm.formState.errors.forSystem && <p className="text-sm font-medium text-destructive">{blockForm.formState.errors.forSystem.message}</p>}
                </div>
                <FormField
                  control={blockForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem><Label>Razón del Bloqueo (Opcional)</Label><FormControl><Textarea placeholder="Ej: Renovaciones..." {...field} /></FormControl></FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsBlockCasaDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Confirmar Bloqueo</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
    </div>
    </TooltipProvider>
  );
}
