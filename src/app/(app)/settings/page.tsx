
"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, CalendarCog, Users as UsersIconLucide, PlusCircle, Trash2, Video, MountainSnow, Users as UsersTypeIcon, AlertTriangle, Edit2, GanttChartSquare, Save, Edit, PackageSearch, CalendarDays, Upload, UsersRound, BookOpenCheck, KeyRound, Settings as SettingsIcon } from "lucide-react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { ProgramScheduleSlot, DayOfWeek, PreachingType, ScheduleSlotStatus, Campaign, CampaignType, CustomHoliday, PreachingGroup, Assembly, RoleConfiguration, UserRole, SettingsDoc } from "@/types";
import { USER_ROLES, USER_ROLES_LIST, PERMISSIONS_BY_MODULE, PermissionId, DEFAULT_ROLE_PERMISSIONS, PERMISSION_MODULES } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { AddCampaignDialog } from "@/components/settings/campaigns/add-campaign-dialog";
import { AddHolidayDialog } from "@/components/settings/holidays/add-holiday-dialog";
import { AddAssemblyDialog } from "@/components/settings/assemblies/add-assembly-dialog";
import { Timestamp, doc, getDoc, setDoc, serverTimestamp, updateDoc, deleteField, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionComponentInner,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponentInner,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format as formatDate, getYear as getYearFromDateFn, getMonth as getMonthFromDateFn } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";


const scheduleSlotFormSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Debe ser formato HH:mm."),
  type: z.enum(['general', 'rural', 'zoom'], { required_error: "Debes seleccionar un tipo." }),
  status: z.enum(['fixed', 'tentative'], { required_error: "Debes seleccionar un estado." }),
});

type ScheduleSlotFormValues = z.infer<typeof scheduleSlotFormSchema>;

const dayOfWeekLabels: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const dayOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PreachingTypeIcon = ({ type, className }: { type: PreachingType, className?: string }) => {
  const defaultClass = "mr-1 h-4 w-4 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === 'general') return <UsersTypeIcon className={combinedClass} />;
  if (type === 'rural') return <MountainSnow className={combinedClass} />;
  if (type === 'zoom') return <Video className={combinedClass} />;
  return null;
};

const CampaignTypeLabels: Record<CampaignType, string> = {
  invitation: "Invitación (Conmemoración/Asamblea)",
  superintendent_visit: "Visita de Superintendente",
  special: "Campaña Especial"
};

const MOCK_GROUPS_FOR_ROTATION_SELECT: Pick<PreachingGroup, 'id' | 'name' | 'superintendentId'>[] = [
    { id: 'G1', name: 'Grupo Los Pioneros', superintendentId: 'uidElena' },
    { id: 'G2', name: 'Grupo Betel', superintendentId: 'uidPedro' },
    { id: 'G3', name: 'Grupo Emanuel', superintendentId: 'uidLaura' },
    { id: 'G4', name: 'Grupo Sinai', superintendentId: 'uidCarlos' },
    { id: 'G5', name: 'Grupo Jerusalen', superintendentId: 'uidAna' },
];

type SettingsSectionId = "permissions" | "weeklyProgram" | "specialEvents" | "ruralRotation";

interface SettingsSectionInfo {
  id: SettingsSectionId;
  title: string;
  icon: React.ElementType;
  description: string;
}

const settingsSections: SettingsSectionInfo[] = [
  { id: "permissions", title: "Roles y Permisos", icon: KeyRound, description: "Define qué puede hacer cada rol de usuario en la aplicación." },
  { id: "weeklyProgram", title: "Programa Semanal", icon: CalendarCog, description: "Define los horarios fijos y tentativos para la predicación y qué días son organizados por grupos." },
  { id: "specialEvents", title: "Eventos Especiales", icon: Briefcase, description: "Gestiona campañas, asambleas y días festivos personalizados." },
  { id: "ruralRotation", title: "Rotación Rural", icon: UsersRound, description: "Define el último grupo que se hizo cargo de la predicación rural de fin de semana." },
];


export default function SettingsPage() {
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>(settingsSections[0].id);
  
  const [scheduleSlots, setScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isAddSlotDialogOpen, setIsAddSlotDialogOpen] = useState(false);
  const [dayForNewSlot, setDayForNewSlot] = useState<DayOfWeek | null>(null);
  const { toast } = useToast();
  const [isSubmittingSlotDialog, setIsSubmittingSlotDialog] = useState(false);

  const [groupOrganizedDays, setGroupOrganizedDays] = useState<DayOfWeek[]>([]);
  const [isSavingProgramSettings, setIsSavingProgramSettings] = useState(false);
  const [isLoadingProgramSettings, setIsLoadingProgramSettings] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);

  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<CustomHoliday | null>(null);
  const [selectedHolidayYear, setSelectedHolidayYear] = useState<string>(new Date().getUTCFullYear().toString());
  const [selectedHolidayMonth, setSelectedHolidayMonth] = useState<string>("ALL_MONTHS");


  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [isAssemblyDialogOpen, setIsAssemblyDialogOpen] = useState(false);
  const [assemblyToEdit, setAssemblyToEdit] = useState<Assembly | null>(null);

  const [isLoadingSpecialEvents, setIsLoadingSpecialEvents] = useState(false);
  const [isSavingSpecialEvents, setIsSavingSpecialEvents] = useState(false);


  const [selectedLastRuralGroupId, setSelectedLastRuralGroupId] = useState<string | null | undefined>(undefined); // null for "NONE", undefined for initial load
  const [isSavingRuralRotation, setIsSavingRuralRotation] = useState(false);

  const [editableRolePermissions, setEditableRolePermissions] = useState<RoleConfiguration>(DEFAULT_ROLE_PERMISSIONS);
  const [isLoadingPermissionsSettings, setIsLoadingPermissionsSettings] = useState(true);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const slotForm = useForm<ScheduleSlotFormValues>({
    resolver: zodResolver(scheduleSlotFormSchema),
    defaultValues: {
      startTime: "",
      type: undefined,
      status: "fixed",
    },
  });

  const loadPermissionsConfiguration = useCallback(async () => {
    if (!db || Object.keys(db).length === 0) {
      console.error("Firestore is not initialized.");
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setEditableRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      setIsLoadingPermissionsSettings(false);
      return;
    }
    setIsLoadingPermissionsSettings(true);
    try {
      const docRef = doc(db, "settings", "rolePermissions");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data()?.rolePermissions) {
        setEditableRolePermissions(docSnap.data().rolePermissions as RoleConfiguration);
      } else {
        console.warn("Role permissions document not found. Using default permissions. Creating one...");
        await setDoc(docRef, { rolePermissions: DEFAULT_ROLE_PERMISSIONS, updatedAt: serverTimestamp() });
        setEditableRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      }
    } catch (error) {
      console.error("Error fetching role permissions from Firestore:", error);
      toast({
        title: "Error al Cargar Permisos",
        description: "No se pudo cargar la configuración de permisos. Se usarán los valores por defecto.",
        variant: "destructive",
      });
      setEditableRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    } finally {
      setIsLoadingPermissionsSettings(false);
    }
  }, [toast]);

  const loadProgramConfiguration = useCallback(async () => {
    if (!db || Object.keys(db).length === 0) {
        toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
        setIsLoadingProgramSettings(false);
        return;
    }
    setIsLoadingProgramSettings(true);
    try {
        const docRef = doc(db, "settings", "programConfig");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as Partial<SettingsDoc>;
            setScheduleSlots(data.programScheduleSlots || []);
            setGroupOrganizedDays(data.groupOrganizedDays || []);
            setSelectedLastRuralGroupId(data.lastRuralWeekendLeadingGroupId === undefined ? null : data.lastRuralWeekendLeadingGroupId);
        } else {
            setScheduleSlots([]);
            setGroupOrganizedDays([]);
            setSelectedLastRuralGroupId(null); 
            console.log("Program config document (settings/programConfig) does not exist. Initializing with empty/default values.");
        }
    } catch (error) {
        console.error("Error fetching program configuration:", error);
        toast({ title: "Error al Cargar Config. Programa", description: "No se pudo cargar la configuración del programa.", variant: "destructive" });
        setScheduleSlots([]);
        setGroupOrganizedDays([]);
        setSelectedLastRuralGroupId(null);
    } finally {
        setIsLoadingProgramSettings(false);
    }
  }, [toast]);
  
  const loadSpecialEventsConfiguration = useCallback(async () => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      setIsLoadingSpecialEvents(false);
      return;
    }
    setIsLoadingSpecialEvents(true);
    try {
      const docRef = doc(db, "settings", "specialEventsConfig");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<SettingsDoc>;
        
        const convertTimestampToDateIfPresent = (item: any, dateFields: string[]) => {
            const newItem = { ...item };
            dateFields.forEach(field => {
                if (newItem[field] instanceof Timestamp) {
                    newItem[field] = newItem[field].toDate();
                } else if (typeof newItem[field] === 'string') { 
                     try {
                        const parsedDate = new Date(newItem[field]);
                        if (!isNaN(parsedDate.getTime())) {
                           newItem[field] = parsedDate;
                        } else {
                            console.warn(`Could not parse date string "${newItem[field]}" for field "${field}". Leaving as is or set to null.`);
                        }
                    } catch (e) {
                        console.warn(`Error parsing date string "${newItem[field]}" for field "${field}":`, e);
                    }
                }
            });
            return newItem;
        };

        setCampaigns((data.campaignsList || []).map(c => convertTimestampToDateIfPresent(c, ['startDate', 'endDate'])));
        setCustomHolidays((data.holidaysList || []).map(h => convertTimestampToDateIfPresent(h, ['date'])));
        setAssemblies((data.assembliesList || []).map(a => convertTimestampToDateIfPresent(a, ['startDate', 'endDate'])));

      } else {
        setCampaigns([]);
        setCustomHolidays([]);
        setAssemblies([]);
        console.log("Special events config document (settings/specialEventsConfig) does not exist. Initializing with empty values.");
      }
    } catch (error) {
      console.error("Error fetching special events configuration:", error);
      toast({ title: "Error al Cargar Eventos Especiales", description: "No se pudo cargar la configuración de eventos.", variant: "destructive" });
      setCampaigns([]);
      setCustomHolidays([]);
      setAssemblies([]);
    } finally {
      setIsLoadingSpecialEvents(false);
    }
  }, [toast]);


  useEffect(() => {
    if (activeSectionId === "permissions") {
      loadPermissionsConfiguration();
    } else if (activeSectionId === "weeklyProgram" || activeSectionId === "ruralRotation") {
      loadProgramConfiguration();
    } else if (activeSectionId === "specialEvents") {
      loadSpecialEventsConfiguration();
    }
  }, [activeSectionId, loadPermissionsConfiguration, loadProgramConfiguration, loadSpecialEventsConfiguration]);


  const handlePermissionChange = (role: UserRole, permissionId: PermissionId, checked: boolean) => {
    setEditableRolePermissions(prevConfig => {
      const currentPermissions = prevConfig[role] || [];
      let updatedPermissions;
      if (checked) {
        updatedPermissions = [...new Set([...currentPermissions, permissionId])];
      } else {
        updatedPermissions = currentPermissions.filter(pId => pId !== permissionId);
      }
      return {
        ...prevConfig,
        [role]: updatedPermissions,
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      return;
    }
    setIsSavingPermissions(true);
    try {
      const docRef = doc(db, "settings", "rolePermissions");
      await setDoc(docRef, {
        rolePermissions: editableRolePermissions,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({
        title: "Permisos Guardados",
        description: "La configuración de permisos de roles ha sido actualizada en Firebase.",
      });
    } catch (error) {
      console.error("Error saving role permissions to Firestore:", error);
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la configuración de permisos.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const saveProgramConfigToFirestore = async (
    configToSave: Partial<Pick<SettingsDoc, 'programScheduleSlots' | 'groupOrganizedDays' | 'lastRuralWeekendLeadingGroupId'>>
  ) => {
    if (!db || Object.keys(db).length === 0) {
        toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
        return false;
    }

    const dataToSave: any = { updatedAt: serverTimestamp() };

    if (configToSave.hasOwnProperty('programScheduleSlots')) {
        dataToSave.programScheduleSlots = configToSave.programScheduleSlots;
    }
    if (configToSave.hasOwnProperty('groupOrganizedDays')) {
        dataToSave.groupOrganizedDays = configToSave.groupOrganizedDays;
    }
    if (configToSave.hasOwnProperty('lastRuralWeekendLeadingGroupId')) {
        dataToSave.lastRuralWeekendLeadingGroupId = configToSave.lastRuralWeekendLeadingGroupId === undefined 
            ? null 
            : configToSave.lastRuralWeekendLeadingGroupId;
    }
    
    const sanitizedData = Object.entries(dataToSave).reduce((acc, [key, value]) => {
        if (value !== undefined) {
            (acc as any)[key] = value;
        }
        return acc;
    }, {});


    try {
        const docRef = doc(db, "settings", "programConfig");
        await setDoc(docRef, sanitizedData, { merge: true });
        return true;
    } catch (error) {
        console.error("Error saving program configuration:", error);
        toast({ title: "Error al Guardar Config. Programa", description: "No se pudo guardar la configuración del programa.", variant: "destructive" });
        return false;
    }
  };

const saveSpecialEventsToFirestore = async (eventsData: { campaigns?: Campaign[]; customHolidays?: CustomHoliday[]; assemblies?: Assembly[] }) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      return false;
    }
    
    const convertDatesToTimestamps = (item: any, dateFields: string[]) => {
      const newItem = { ...item };
      dateFields.forEach(field => {
        if (newItem[field] && !(newItem[field] instanceof Timestamp)) {
          const dateCandidate = new Date(newItem[field]);
          if (!isNaN(dateCandidate.getTime())) {
            newItem[field] = Timestamp.fromDate(dateCandidate);
          } else {
            console.warn(`Invalid date found for field ${field} in item:`, item);
            newItem[field] = null; 
          }
        } else if (newItem[field] === undefined) {
            newItem[field] = null;
        }
      });
      return newItem;
    };

    const sanitizeEvent = (event: any, dateFields: string[], optionalFields: string[]) => {
        let sanitizedEvent = { ...event };
        sanitizedEvent = convertDatesToTimestamps(sanitizedEvent, dateFields);
        optionalFields.forEach(field => {
            if (sanitizedEvent[field] === undefined || sanitizedEvent[field] === '' || (typeof sanitizedEvent[field] === 'number' && isNaN(sanitizedEvent[field]))) {
                 sanitizedEvent[field] = null; 
            }
        });
        
        return Object.fromEntries(Object.entries(sanitizedEvent).filter(([_, v]) => v !== undefined));
    };
    
    const payloadToSave: any = { updatedAt: serverTimestamp() };

    if (eventsData.campaigns !== undefined) {
        payloadToSave.campaignsList = (eventsData.campaigns || []).map(c => 
            sanitizeEvent(c, ['startDate', 'endDate'], ['superintendentName', 'description', 'specialCampaignTerritoriesPerDay'])
        );
    }
    if (eventsData.customHolidays !== undefined) {
        payloadToSave.holidaysList = (eventsData.customHolidays || []).map(h => 
            sanitizeEvent(h, ['date'], ['description'])
        );
    }
    if (eventsData.assemblies !== undefined) {
        payloadToSave.assembliesList = (eventsData.assemblies || []).map(a => 
            sanitizeEvent(a, ['startDate', 'endDate'], ['description'])
        );
    }

    setIsSavingSpecialEvents(true);
    try {
      const docRef = doc(db, "settings", "specialEventsConfig");
      await setDoc(docRef, payloadToSave, { merge: true });
      return true;
    } catch (error: any) {
      console.error("Error saving special events configuration:", error, error.code, error.message);
      toast({ title: "Error al Guardar Eventos", description: `No se pudo guardar: ${error.message}`, variant: "destructive" });
      return false;
    } finally {
      setIsSavingSpecialEvents(false);
    }
  };


  const handleOpenAddSlotDialog = (day: DayOfWeek) => {
    setDayForNewSlot(day);
    slotForm.reset({startTime: "", type: undefined, status: "fixed"});
    setIsAddSlotDialogOpen(true);
  };

  const onSubmitSlotDialog: SubmitHandler<ScheduleSlotFormValues> = async (data) => {
    if (!dayForNewSlot) return;
    setIsSubmittingSlotDialog(true);
    const newSlot: ProgramScheduleSlot = {
      id: crypto.randomUUID(),
      dayOfWeek: dayForNewSlot,
      startTime: data.startTime,
      type: data.type as PreachingType,
      status: data.status as ScheduleSlotStatus,
    };
    
    const updatedSlots = [...scheduleSlots, newSlot].sort((a, b) => {
        const dayCompare = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayCompare !== 0) return dayCompare;
        return a.startTime.localeCompare(b.startTime);
    });
    
    setIsSavingProgramSettings(true);
    const success = await saveProgramConfigToFirestore({ programScheduleSlots: updatedSlots });
    setIsSavingProgramSettings(false);

    if (success) {
        setScheduleSlots(updatedSlots);
        toast({ title: "Horario Añadido", description: `Nuevo horario para ${dayOfWeekLabels[dayForNewSlot]} a las ${data.startTime} guardado.` });
        setIsAddSlotDialogOpen(false);
        slotForm.reset();
    }
    setIsSubmittingSlotDialog(false);
  };

  const handleDeleteSlot = async (slotId: string) => {
    const updatedSlots = scheduleSlots.filter(slot => slot.id !== slotId);
    setIsSavingProgramSettings(true);
    const success = await saveProgramConfigToFirestore({ programScheduleSlots: updatedSlots });
    setIsSavingProgramSettings(false);
    if (success) {
        setScheduleSlots(updatedSlots);
        toast({ title: "Horario Eliminado", description: "El horario ha sido eliminado y guardado.", variant: "destructive" });
    }
  };

  const handleGroupOrganizedDayChange = (day: DayOfWeek, checked: boolean) => {
    setGroupOrganizedDays(prev =>
      checked ? [...new Set([...prev, day])] : prev.filter(d => d !== day)
    );
  };

  const handleSaveGroupOrganizedDays = async () => {
    setIsSavingProgramSettings(true);
    const success = await saveProgramConfigToFirestore({ groupOrganizedDays });
    setIsSavingProgramSettings(false);
    if (success) {
        toast({ title: "Días Grupales Guardados", description: "La configuración de días organizados por grupos ha sido guardada." });
    }
  };


  const handleCampaignSubmit = async (submittedCampaignData: Omit<Campaign, 'isActive' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: Timestamp; updatedAt?: Timestamp }) => {
    setIsSavingSpecialEvents(true);
    let updatedCampaigns;
    const isEdit = !!submittedCampaignData.id;
    
    const campaignToSave = {
      ...submittedCampaignData,
      id: submittedCampaignData.id || crypto.randomUUID(),
      superintendentName: submittedCampaignData.superintendentName?.trim() || null,
      description: submittedCampaignData.description?.trim() || null,
      specialCampaignTerritoriesPerDay: submittedCampaignData.specialCampaignTerritoriesPerDay === undefined ? null : submittedCampaignData.specialCampaignTerritoriesPerDay,
      createdAt: isEdit && campaignToEdit?.createdAt ? campaignToEdit.createdAt : Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const existingIndex = campaigns.findIndex(c => c.id === campaignToSave.id);
    if (existingIndex > -1) {
      updatedCampaigns = campaigns.map(c => c.id === campaignToSave.id ? campaignToSave : c);
    } else {
      updatedCampaigns = [...campaigns, campaignToSave];
    }
     updatedCampaigns.sort((a, b) => {
        const dateA = a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate);
        const dateB = b.startDate instanceof Timestamp ? b.startDate.toDate() : new Date(b.startDate);
        return dateB.getTime() - dateA.getTime();
    });
    
    const success = await saveSpecialEventsToFirestore({ campaigns: updatedCampaigns });
    setIsSavingSpecialEvents(false);

    if (success) {
        setCampaigns(updatedCampaigns.map(c => ({
            ...c, 
            startDate: c.startDate instanceof Timestamp ? c.startDate.toDate() : new Date(c.startDate), 
            endDate: c.endDate instanceof Timestamp ? c.endDate.toDate() : new Date(c.endDate)
        })));
        toast({ title: isEdit ? "Campaña Actualizada" : "Campaña Añadida", description: `La campaña "${campaignToSave.name}" ha sido guardada.` });
        setIsCampaignDialogOpen(false);
        setCampaignToEdit(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    const campaignToDelete = campaigns.find(c => c.id === campaignId);
    const updatedCampaigns = campaigns.filter(c => c.id !== campaignId);
    setIsSavingSpecialEvents(true);
    const success = await saveSpecialEventsToFirestore({ campaigns: updatedCampaigns });
    setIsSavingSpecialEvents(false);
    if (success) {
        setCampaigns(updatedCampaigns);
        toast({ title: "Campaña Eliminada", description: `La campaña "${campaignToDelete?.name}" ha sido eliminada.`, variant: "destructive" });
    }
  };

  const handleAssemblySubmit = async (submittedAssemblyData: Omit<Assembly, 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: Timestamp; updatedAt?: Timestamp }) => {
    setIsSavingSpecialEvents(true);
    let updatedAssemblies;
    const isEdit = !!submittedAssemblyData.id;
     const assemblyToSave = {
        ...submittedAssemblyData,
        id: submittedAssemblyData.id || crypto.randomUUID(),
        description: submittedAssemblyData.description?.trim() || null,
        createdAt: isEdit && assemblyToEdit?.createdAt ? assemblyToEdit.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    const existingIndex = assemblies.findIndex(a => a.id === assemblyToSave.id);
    if (existingIndex > -1) {
      updatedAssemblies = assemblies.map(a => a.id === assemblyToSave.id ? assemblyToSave : a);
    } else {
      updatedAssemblies = [...assemblies, assemblyToSave];
    }
    updatedAssemblies.sort((a, b) => {
        const dateA = a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate);
        const dateB = b.startDate instanceof Timestamp ? b.startDate.toDate() : new Date(b.startDate);
        return dateB.getTime() - dateA.getTime();
    });

    const success = await saveSpecialEventsToFirestore({ assemblies: updatedAssemblies });
    setIsSavingSpecialEvents(false);
    if (success) {
        setAssemblies(updatedAssemblies.map(a => ({
            ...a, 
            startDate: a.startDate instanceof Timestamp ? a.startDate.toDate() : new Date(a.startDate), 
            endDate: a.endDate instanceof Timestamp ? a.endDate.toDate() : new Date(a.endDate)
        })));
        toast({ title: isEdit ? "Asamblea Actualizada" : "Asamblea Añadida", description: `La asamblea "${assemblyToSave.name}" ha sido guardada.` });
        setIsAssemblyDialogOpen(false);
        setAssemblyToEdit(null);
    }
  };
  const handleDeleteAssembly = async (assemblyId: string) => {
    const assemblyToDelete = assemblies.find(a => a.id === assemblyId);
    const updatedAssemblies = assemblies.filter(a => a.id !== assemblyId);
    setIsSavingSpecialEvents(true);
    const success = await saveSpecialEventsToFirestore({ assemblies: updatedAssemblies });
    setIsSavingSpecialEvents(false);
    if (success) {
        setAssemblies(updatedAssemblies);
        toast({ title: "Asamblea Eliminada", description: `La asamblea "${assemblyToDelete?.name}" ha sido eliminada.`, variant: "destructive" });
    }
  };

  const handleHolidaySubmit = async (submittedHolidayData: Omit<CustomHoliday, 'createdAt' | 'updatedAt'> & { id?:string; createdAt?: Timestamp; updatedAt?: Timestamp }) => {
    setIsSavingSpecialEvents(true);
    let updatedHolidays;
    const isEdit = !!submittedHolidayData.id;
     const holidayToSave = {
        ...submittedHolidayData,
        id: submittedHolidayData.id || crypto.randomUUID(),
        description: submittedHolidayData.description?.trim() || null,
        createdAt: isEdit && holidayToEdit?.createdAt ? holidayToEdit.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    const existingIndex = customHolidays.findIndex(h => h.id === holidayToSave.id);
    if (existingIndex > -1) {
      updatedHolidays = customHolidays.map(h => h.id === holidayToSave.id ? holidayToSave : h);
    } else {
      updatedHolidays = [...customHolidays, holidayToSave];
    }
    updatedHolidays.sort((a,b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
    });

    const success = await saveSpecialEventsToFirestore({ customHolidays: updatedHolidays });
    setIsSavingSpecialEvents(false);
    if (success) {
        setCustomHolidays(updatedHolidays.map(h => ({...h, date: h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date)})));
        toast({ title: isEdit ? "Festivo Actualizado" : "Festivo Añadido", description: `El festivo "${holidayToSave.name}" ha sido guardado.` });
        setIsHolidayDialogOpen(false);
        setHolidayToEdit(null);
    }
  };
  const handleDeleteHoliday = async (holidayId: string) => {
    const holidayToDelete = customHolidays.find(h => h.id === holidayId);
    const updatedHolidays = customHolidays.filter(h => h.id !== holidayId);
    setIsSavingSpecialEvents(true);
    const success = await saveSpecialEventsToFirestore({ customHolidays: updatedHolidays });
    setIsSavingSpecialEvents(false);
    if (success) {
        setCustomHolidays(updatedHolidays);
        toast({ title: "Festivo Eliminado", description: `El festivo "${holidayToDelete?.name}" ha sido eliminada.`, variant: "destructive" });
    }
  };

  const handleLoadExampleHolidays = async () => {
    setIsSavingSpecialEvents(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const baseFixedHolidays: { day: number; month: number; name: string }[] = [
      { day: 1, month: 0, name: "Año Nuevo" }, { day: 1, month: 4, name: "Día del Trabajo" },
      { day: 21, month: 4, name: "Día de las Glorias Navales" }, { day: 20, month: 5, name: "Día Nacional de los Pueblos Indígenas" },
      { day: 29, month: 5, name: "San Pedro y San Pablo" }, { day: 16, month: 6, name: "Día de la Virgen del Carmen" },
      { day: 15, month: 7, name: "Asunción de la Virgen" }, { day: 18, month: 8, name: "Independencia Nacional" },
      { day: 19, month: 8, name: "Día de las Glorias del Ejército" }, { day: 12, month: 9, name: "Encuentro de Dos Mundos" },
      { day: 27, month: 9, name: "Día Nacional de las Iglesias Evangélicas y Protestantes" },
      { day: 31, month: 9, name: "Día Nacional de las Iglesias Evangélicas y Protestantes (Halloween)" }, 
      { day: 1, month: 10, name: "Día de Todos los Santos" }, { day: 8, month: 11, name: "Inmaculada Concepción" },
      { day: 25, month: 11, name: "Navidad" },
    ];
    const easterExamples = [ 
        { year: 2024, month: 2, day: 29, name: "Viernes Santo (Ej. 2024)"}, { year: 2024, month: 2, day: 30, name: "Sábado Santo (Ej. 2024)"},
        { year: 2025, month: 3, day: 18, name: "Viernes Santo (Ej. 2025)"}, { year: 2025, month: 3, day: 19, name: "Sábado Santo (Ej. 2025)"},
        { year: 2026, month: 3, day: 3, name: "Viernes Santo (Ej. 2026)"}, { year: 2026, month: 3, day: 4, name: "Sábado Santo (Ej. 2026)"},
    ];
    const newHolidaysToAdd: Omit<CustomHoliday, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const existingDates = new Set(customHolidays.map(h => {
        const d = h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date);
        d.setUTCHours(0,0,0,0);
        return d.toISOString().split('T')[0];
    }));

    const currentLoopDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const endDateLimit = new Date(Date.UTC(today.getUTCFullYear() + 1, today.getUTCMonth(), 1)); 

    while(currentLoopDate < endDateLimit) {
        const targetYear = currentLoopDate.getUTCFullYear();
        const targetMonth = currentLoopDate.getUTCMonth();

        baseFixedHolidays.forEach(bh => {
            if (bh.month === targetMonth) {
                const potentialHolidayDate = new Date(Date.UTC(targetYear, bh.month, bh.day));
                if (potentialHolidayDate >= today && !existingDates.has(potentialHolidayDate.toISOString().split('T')[0])) {
                    newHolidaysToAdd.push({ name: bh.name, date: Timestamp.fromDate(potentialHolidayDate) });
                    existingDates.add(potentialHolidayDate.toISOString().split('T')[0]);
                }
            }
        });
        easterExamples.forEach(ee => {
            if (ee.year === targetYear && ee.month === targetMonth) {
                const potentialHolidayDate = new Date(Date.UTC(ee.year, ee.month, ee.day));
                 if (potentialHolidayDate >= today && !existingDates.has(potentialHolidayDate.toISOString().split('T')[0])) {
                    newHolidaysToAdd.push({ name: ee.name, date: Timestamp.fromDate(potentialHolidayDate) });
                    existingDates.add(potentialHolidayDate.toISOString().split('T')[0]);
                }
            }
        });
        currentLoopDate.setUTCMonth(currentLoopDate.getUTCMonth() + 1);
    }
    
    if (newHolidaysToAdd.length > 0) {
        const holidaysWithIdsAndTimestamps = newHolidaysToAdd.map(h => ({
            ...h,
            id: crypto.randomUUID(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }));

        const currentCustomHolidaysAsDates = customHolidays.map(h => ({ ...h, date: (h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date)) }));
        const updatedHolidaysWithDates = [...currentCustomHolidaysAsDates, ...holidaysWithIdsAndTimestamps.map(h => ({...h, date: h.date.toDate()}))]
          .sort((a,b) => a.date.getTime() - b.date.getTime());
        
        const success = await saveSpecialEventsToFirestore({ customHolidays: updatedHolidaysWithDates });
        if (success) {
            setCustomHolidays(updatedHolidaysWithDates);
            toast({ title: "Festivos de Ejemplo Cargados", description: `${holidaysWithIdsAndTimestamps.length} festivos (Chile, próximos 12 meses) añadidos y guardados. Verifique y ajuste.`, duration: 10000 });
        }
    } else {
      toast({ title: "Sin Cambios", description: "No se añadieron nuevos festivos de ejemplo (ya existen o no aplican al rango).", });
    }
    setIsSavingSpecialEvents(false);
  };

  const holidayYearsForFilter = useMemo(() => {
    const years = new Set<string>();
    customHolidays.forEach(h => {
      const d = h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date);
      years.add(d.getUTCFullYear().toString());
    });
    const currentYr = new Date().getUTCFullYear().toString();
    if (!years.has(currentYr)) years.add(currentYr); 
    return ["Todos los Años", ...Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))];
  }, [customHolidays]);

  const holidayMonthsForFilter = useMemo(() => {
    const monthItems = Array.from({ length: 12 }, (_, i) => ({
      value: `month_${i}`, 
      label: formatDate(new Date(Date.UTC(2000, i, 15)), "MMMM", { locale: es, timeZone: 'UTC' }),
    }));
    return [{ value: "ALL_MONTHS", label: "Todos los Meses" }, ...monthItems];
  }, []);


  const filteredHolidaysForTable = useMemo(() => {
    return customHolidays
      .filter(holiday => {
        const holidayDate = holiday.date instanceof Timestamp ? holiday.date.toDate() : new Date(holiday.date);
        if (isNaN(holidayDate.getTime())) return false;

        const yearMatch = selectedHolidayYear === "Todos los Años" || holidayDate.getUTCFullYear().toString() === selectedHolidayYear;
        
        let monthMatch = true;
        if (selectedHolidayMonth !== "ALL_MONTHS") {
            const monthIndex = parseInt(selectedHolidayMonth.replace("month_", ""), 10);
            monthMatch = holidayDate.getUTCMonth() === monthIndex;
        }
        
        return yearMatch && monthMatch;
      })
      .sort((a, b) => {
          const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
          const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
          return dateA.getTime() - dateB.getTime();
      });
  }, [customHolidays, selectedHolidayYear, selectedHolidayMonth]);


  const handleSaveRuralRotation = async () => {
    setIsSavingRuralRotation(true);
    const valueToSave = selectedLastRuralGroupId === undefined ? null : selectedLastRuralGroupId;
    const success = await saveProgramConfigToFirestore({ lastRuralWeekendLeadingGroupId: valueToSave });
    
    if (success) {
        toast({ title: "Configuración Guardada", description: "La rotación para predicación rural de fin de semana ha sido actualizada." });
    }
    setIsSavingRuralRotation(false);
  };

  const currentSection = settingsSections.find(sec => sec.id === activeSectionId);
  const PERMISSIONS_MODULES_ORDERED_FOR_ACCORDION = PERMISSIONS_BY_MODULE.map(m => m.moduleName);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
            <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
            Configuración General
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentSection?.description || "Ajusta los parámetros y preferencias de D-TERRITORIO."}
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col md:flex-row gap-8">
        <nav className="md:w-64 space-y-1 shrink-0">
          {settingsSections.map((section) => (
            <Button
              key={section.id}
              variant={activeSectionId === section.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-left h-auto py-2.5 px-3",
                activeSectionId === section.id ? "font-semibold" : ""
              )}
              onClick={() => setActiveSectionId(section.id)}
            >
              <section.icon className="mr-2.5 h-5 w-5 text-primary/80" />
              {section.title}
            </Button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {activeSectionId === "permissions" && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <KeyRound className="mr-3 h-6 w-6 text-primary" />
                  Gestión de Roles y Permisos
                </CardTitle>
                <CardDescription>
                  Define qué puede hacer cada rol de usuario en la aplicación. El rol "Encargado Territorio" siempre tiene todos los permisos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPermissionsSettings ? (
                  <div className="space-y-4 py-10">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full space-y-2" defaultValue={PERMISSIONS_BY_MODULE.map(m => m.moduleName)}>
                    {PERMISSIONS_BY_MODULE.map((moduleItem) => (
                      <AccordionItem value={moduleItem.moduleName} key={moduleItem.moduleName} className="border rounded-md shadow-sm bg-muted/20">
                        <AccordionTrigger className="px-4 py-3 text-base hover:no-underline hover:bg-muted/30 rounded-t-md">
                          <div className="flex items-center">
                            <span className="font-semibold">{moduleItem.moduleName}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-1 pt-0 pb-2">
                          <p className="text-xs text-muted-foreground px-4 pb-2 pt-1">{moduleItem.moduleDescription}</p>
                          <div className="overflow-x-auto">
                            <Table className="min-w-full">
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="w-[300px] px-4 py-2.5 text-xs font-medium text-muted-foreground">Permiso Específico</TableHead>
                                  {USER_ROLES_LIST.map(role => (
                                    <TableHead key={role} className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">{role}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {moduleItem.permissions.map(permission => (
                                  <TableRow key={permission.id} className="hover:bg-muted/10">
                                    <TableCell className="px-4 py-2.5 text-sm">
                                      {permission.description}
                                      <p className="text-xs text-muted-foreground/80">({permission.id})</p>
                                    </TableCell>
                                    {USER_ROLES_LIST.map(role => (
                                      <TableCell key={`${permission.id}-${role}`} className="px-3 py-2.5 text-center">
                                        <Checkbox
                                          checked={
                                            role === USER_ROLES.ENCARGADO_TERRITORIO ||
                                            (editableRolePermissions[role]?.includes(permission.id) ?? false)
                                          }
                                          onCheckedChange={(checked) => handlePermissionChange(role as UserRole, permission.id, !!checked)}
                                          disabled={role === USER_ROLES.ENCARGADO_TERRITORIO}
                                          aria-label={`Permiso ${permission.description} para rol ${role}`}
                                        />
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button onClick={handleSavePermissions} disabled={isSavingPermissions || isLoadingPermissionsSettings}>
                  {isSavingPermissions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Permisos
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeSectionId === "weeklyProgram" && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <CalendarCog className="mr-3 h-6 w-6 text-primary" />
                  Ajustes del Programa Semanal
                </CardTitle>
                <CardDescription>
                  Define los horarios fijos y tentativos para la predicación durante la semana, y qué días son organizados por los grupos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProgramSettings ? (
                    <div className="space-y-4 py-10">
                        <Skeleton className="h-12 w-1/3 mb-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-md" />)}
                        </div>
                        <Skeleton className="h-12 w-1/3 mt-8 mb-4" />
                        <Skeleton className="h-24 w-full rounded-md" />
                    </div>
                ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dayOrder.map(dayKey => {
                        const slotsForDay = scheduleSlots.filter(slot => slot.dayOfWeek === dayKey).sort((a,b) => a.startTime.localeCompare(b.startTime));
                        return (
                        <Card key={dayKey} className="flex flex-col">
                            <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{dayOfWeekLabels[dayKey]}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-2 min-h-[100px]">
                            {slotsForDay.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">No hay horarios.</p>
                            ) : (
                                <ul className="space-y-1.5">
                                {slotsForDay.map(slot => (
                                    <li key={slot.id} className="flex justify-between items-center p-2 border rounded-md text-xs shadow-sm hover:shadow-md transition-shadow bg-card/80">
                                    <div className="flex items-center">
                                        <PreachingTypeIcon type={slot.type}/>
                                        <span className="font-medium">{slot.startTime}</span>
                                        <span className="text-muted-foreground mx-1">-</span>
                                        <span className="capitalize text-muted-foreground/80">{slot.type}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge variant={slot.status === 'tentative' ? 'outline' : 'default'} className={`capitalize text-[0.7rem] px-1.5 py-0.5 ${slot.status === 'tentative' ? 'border-amber-500 text-amber-600' : ''}`}>
                                            {slot.status === 'fixed' ? 'Fijo' : 'Tentativo'}
                                            {slot.status === 'tentative' && <AlertTriangle className="ml-1 h-3 w-3" />}
                                        </Badge>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSlot(slot.id)} className="h-6 w-6 text-destructive hover:text-destructive/80">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    </li>
                                ))}
                                </ul>
                            )}
                            </CardContent>
                            <CardFooter className="border-t pt-3">
                            <Button size="sm" onClick={() => handleOpenAddSlotDialog(dayKey)} className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Horario
                            </Button>
                            </CardFooter>
                        </Card>
                        );
                    })}
                    </div>
                    <Separator className="my-8" />
                    <div>
                    <h3 className="text-lg font-medium mb-1 flex items-center">
                        <GanttChartSquare className="mr-2 h-5 w-5 text-primary" />
                        Días Organizados por Grupos
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Marca los días en que la organización recae en los grupos. La IA no asignará horarios centralizados para estos días.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 p-4 border rounded-md shadow-sm bg-muted/20">
                        {dayOrder.map(dayKey => (
                        <div key={`group-day-${dayKey}`} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
                            <Checkbox id={`group-organized-${dayKey}`} checked={groupOrganizedDays.includes(dayKey)} onCheckedChange={(checked) => handleGroupOrganizedDayChange(dayKey, !!checked)} />
                            <label htmlFor={`group-organized-${dayKey}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">{dayOfWeekLabels[dayKey]}</label>
                        </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSaveGroupOrganizedDays} disabled={isSavingProgramSettings}>
                        {isSavingProgramSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} <Save className="mr-2 h-4 w-4" /> Guardar Días Grupales
                        </Button>
                    </div>
                    </div>
                </>
                )}
              </CardContent>
            </Card>
          )}

          {activeSectionId === "specialEvents" && (
            <div className="space-y-6">
              {isLoadingSpecialEvents ? (
                <>
                  <Card className="shadow-lg"><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
                  <Card className="shadow-lg"><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
                  <Card className="shadow-lg"><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
                </>
              ) : (
              <>
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl"><Briefcase className="mr-3 h-6 w-6 text-primary" />Gestión de Campañas</CardTitle>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-1">
                      <CardDescription>Define y administra campañas especiales de predicación.</CardDescription>
                      <Button onClick={() => { setCampaignToEdit(null); setIsCampaignDialogOpen(true); }} size="sm" className="mt-2 sm:mt-0"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Campaña</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {campaigns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-lg border border-dashed"><PackageSearch className="h-16 w-16 text-muted-foreground/70 mb-4" /><p className="text-lg font-medium text-muted-foreground mb-1">No hay campañas configuradas.</p><p className="text-sm text-muted-foreground">Haz clic en "Añadir Campaña".</p></div>
                    ) : (
                      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Fechas</TableHead><TableHead>Detalles Adic.</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
                        {campaigns.map((campaign) => {
                            const startDate = campaign.startDate instanceof Timestamp ? campaign.startDate.toDate() : new Date(campaign.startDate);
                            const endDate = campaign.endDate instanceof Timestamp ? campaign.endDate.toDate() : new Date(campaign.endDate);
                            return (
                            <TableRow key={campaign.id}><TableCell className="font-medium">{campaign.name}</TableCell><TableCell>{CampaignTypeLabels[campaign.type]}</TableCell><TableCell>{formatDate(startDate, "dd/MM/yyyy", { timeZone: 'UTC' })} - {formatDate(endDate, "dd/MM/yyyy", { timeZone: 'UTC' })}</TableCell><TableCell className="text-xs">{campaign.type === 'superintendent_visit' && campaign.superintendentName && (<div>Sup: {campaign.superintendentName}</div>)}{(campaign.specialCampaignTerritoriesPerDay ?? 0) > 0 && (<div>Terr/día (Camp.): {campaign.specialCampaignTerritoriesPerDay}</div>)}{campaign.description && <div className="italic text-muted-foreground mt-1 truncate w-48" title={campaign.description}>"{campaign.description}"</div>}</TableCell><TableCell className="text-right space-x-1"><Button variant="ghost" size="icon" onClick={() => { setCampaignToEdit(campaign); setIsCampaignDialogOpen(true);}} className="h-8 w-8"><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponentInner>¿Estás seguro?</AlertDialogTitleComponentInner><AlertDialogDescriptionComponentInner>Eliminarás la campaña "{campaign.name}".</AlertDialogDescriptionComponentInner></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCampaign(campaign.id)} className={buttonVariants({variant: "destructive"})}>Sí, eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>
                            );
                        })}
                      </TableBody></Table></div>
                    )}
                  </CardContent>
                </Card>
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl"><BookOpenCheck className="mr-3 h-6 w-6 text-primary" />Gestión de Asambleas</CardTitle>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-1">
                      <CardDescription>Define fechas de asambleas. No se programará predicación en estos días.</CardDescription>
                      <Button onClick={() => { setAssemblyToEdit(null); setIsAssemblyDialogOpen(true); }} size="sm" className="mt-2 sm:mt-0"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Asamblea</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {assemblies.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-lg border border-dashed"><BookOpenCheck className="h-16 w-16 text-muted-foreground/70 mb-4" /><p className="text-lg font-medium text-muted-foreground mb-1">No hay asambleas configuradas.</p><p className="text-sm text-muted-foreground">Haz clic en "Añadir Asamblea".</p></div>
                    ) : (
                      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nombre/Tipo</TableHead><TableHead>Fechas</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
                        {assemblies.map((assembly) => {
                             const startDate = assembly.startDate instanceof Timestamp ? assembly.startDate.toDate() : new Date(assembly.startDate);
                             const endDate = assembly.endDate instanceof Timestamp ? assembly.endDate.toDate() : new Date(assembly.endDate);
                            return (
                            <TableRow key={assembly.id}><TableCell className="font-medium">{assembly.name}</TableCell><TableCell>{formatDate(startDate, "dd/MM/yyyy", { timeZone: 'UTC' })} - {formatDate(endDate, "dd/MM/yyyy", { timeZone: 'UTC' })}</TableCell><TableCell className="text-xs italic text-muted-foreground truncate w-64" title={assembly.description || undefined}>{assembly.description || 'N/A'}</TableCell><TableCell className="text-right space-x-1"><Button variant="ghost" size="icon" onClick={() => { setAssemblyToEdit(assembly); setIsAssemblyDialogOpen(true); }} className="h-8 w-8"><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponentInner>¿Estás seguro?</AlertDialogTitleComponentInner><AlertDialogDescriptionComponentInner>Eliminarás la asamblea "{assembly.name}".</AlertDialogDescriptionComponentInner></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAssembly(assembly.id)} className={buttonVariants({variant: "destructive"})}>Sí, eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>
                            );
                        })}
                      </TableBody></Table></div>
                    )}
                  </CardContent>
                </Card>
                <Card className="shadow-lg">
                   <CardHeader>
                    <CardTitle className="flex items-center text-xl"><CalendarDays className="mr-3 h-6 w-6 text-primary" />Días Festivos Personalizados</CardTitle>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-1 gap-2">
                        <CardDescription>Añade festivos. Puedes cargar ejemplos (Chile). Verifica y ajusta los variables.</CardDescription>
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <Button onClick={handleLoadExampleHolidays} size="sm" variant="outline" className="w-full sm:w-auto" disabled={isSavingSpecialEvents}><Upload className="mr-2 h-4 w-4" /> Cargar Ejemplos</Button>
                            <Button onClick={() => { setHolidayToEdit(null); setIsHolidayDialogOpen(true); }} size="sm" className="w-full sm:w-auto" disabled={isSavingSpecialEvents}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Festivo Manual</Button>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-center pt-3">
                        <Select value={selectedHolidayYear} onValueChange={setSelectedHolidayYear}>
                            <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                                <SelectValue placeholder="Filtrar por Año" />
                            </SelectTrigger>
                            <SelectContent>
                                {holidayYearsForFilter.map(year => (
                                    <SelectItem key={year} value={year} className="text-xs">{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedHolidayMonth} onValueChange={setSelectedHolidayMonth}>
                            <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
                                <SelectValue placeholder="Filtrar por Mes" />
                            </SelectTrigger>
                            <SelectContent>
                                {holidayMonthsForFilter.map(month => (
                                    <SelectItem key={month.value} value={month.value} className="text-xs">
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredHolidaysForTable.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-lg border border-dashed">
                        <CalendarDays className="h-16 w-16 text-muted-foreground/70 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground mb-1">
                            {customHolidays.length === 0 ? "No hay festivos configurados." : "No hay festivos para el filtro seleccionado."}
                        </p>
                        <p className="text-sm text-muted-foreground">
                           {customHolidays.length === 0 ? "Añade festivos manualmente o carga ejemplos." : "Ajusta los filtros o añade nuevos festivos."}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredHolidaysForTable.map((holiday) => {
                                const holidayDate = holiday.date instanceof Timestamp ? holiday.date.toDate() : new Date(holiday.date);
                                return (
                                <TableRow key={holiday.id}>
                                    <TableCell>{formatDate(holidayDate, "dd/MM/yyyy", { timeZone: 'UTC' })}</TableCell>
                                    <TableCell className="font-medium">{holiday.name}</TableCell>
                                    <TableCell className="text-xs italic text-muted-foreground truncate w-64" title={holiday.description || undefined}>
                                    {holiday.description || 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => { setHolidayToEdit(holiday); setIsHolidayDialogOpen(true);}} className="h-8 w-8">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitleComponentInner>¿Estás seguro?</AlertDialogTitleComponentInner>
                                            <AlertDialogDescriptionComponentInner>Eliminarás el festivo "{holiday.name}".</AlertDialogDescriptionComponentInner>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteHoliday(holiday.id)} className={buttonVariants({variant: "destructive"})}>
                                            Sí, eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
              )}
            </div>
          )}

          {activeSectionId === "ruralRotation" && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl"><UsersRound className="mr-3 h-6 w-6 text-primary" />Rotación Rural Fin de Semana</CardTitle>
                <CardDescription>Define el último grupo que se hizo cargo de la predicación rural de fin de semana para una rotación equitativa.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProgramSettings ? (
                  <div className="space-y-3 py-6">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-10 w-full sm:w-[300px]" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="ruralRotationSelect">Último grupo que dirigió el rural de fin de semana</Label>
                    <Select
                        value={selectedLastRuralGroupId === null ? "NONE_OR_RESET" : selectedLastRuralGroupId || "NONE_OR_RESET"}
                        onValueChange={(value) => setSelectedLastRuralGroupId(value === "NONE_OR_RESET" ? null : value)}
                    >
                      <SelectTrigger className="w-full sm:w-[300px]" id="ruralRotationSelect"><SelectValue placeholder="Seleccionar grupo..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE_OR_RESET">Ninguno / Reiniciar Rotación</SelectItem>
                        {MOCK_GROUPS_FOR_ROTATION_SELECT.map(group => (<SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Selecciona el grupo más reciente. Si es la primera vez, selecciona "Ninguno".</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button onClick={handleSaveRuralRotation} disabled={isSavingRuralRotation || isLoadingProgramSettings}>
                  {isSavingRuralRotation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Save className="mr-2 h-4 w-4" /> Guardar Rotación Rural
                </Button>
              </CardFooter>
            </Card>
          )}

        </div>
      </div>

      <Dialog open={isAddSlotDialogOpen} onOpenChange={(isOpen) => {
          setIsAddSlotDialogOpen(isOpen);
          if (!isOpen) { slotForm.reset(); setDayForNewSlot(null); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Añadir Horario para {dayForNewSlot ? dayOfWeekLabels[dayForNewSlot] : ''}</DialogTitle><DialogDescriptionComponent>Completa los detalles.</DialogDescriptionComponent></DialogHeader>
          <Form {...slotForm}>
            <form onSubmit={slotForm.handleSubmit(onSubmitSlotDialog)} className="space-y-4 py-2">
              <FormField control={slotForm.control} name="startTime" render={({ field }) => (<FormItem><FormLabel>Hora (HH:mm)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={slotForm.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="rural">Rural</SelectItem><SelectItem value="zoom">Zoom</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={slotForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona estado" /></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">Fijo</SelectItem><SelectItem value="tentative">Tentativo</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <DialogFooter className="pt-4"><DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingSlotDialog}>Cancelar</Button></DialogClose><Button type="submit" disabled={isSubmittingSlotDialog}>{isSubmittingSlotDialog && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Añadir Horario</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isCampaignDialogOpen && (<AddCampaignDialog isOpen={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen} onCampaignSubmit={handleCampaignSubmit} campaignToEdit={campaignToEdit}/>)}
      {isAssemblyDialogOpen && (<AddAssemblyDialog isOpen={isAssemblyDialogOpen} onOpenChange={setIsAssemblyDialogOpen} onAssemblySubmit={handleAssemblySubmit} assemblyToEdit={assemblyToEdit} />)}
      {isHolidayDialogOpen && (<AddHolidayDialog isOpen={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen} onHolidaySubmit={handleHolidaySubmit} holidayToEdit={holidayToEdit} />)}
    </div>
  );
}
    

    
