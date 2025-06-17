
"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, CalendarCog, ShieldAlert, Users as UsersIconLucide, Palette, Hourglass, PlusCircle, Trash2, Video, MountainSnow, Users as UsersTypeIcon, AlertTriangle, Edit2, GanttChartSquare, Save, Edit, PackageSearch, CalendarDays, Upload, UsersRound, BookOpenCheck, KeyRound, Settings as SettingsIcon } from "lucide-react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { ProgramScheduleSlot, DayOfWeek, PreachingType, ScheduleSlotStatus, Campaign, CampaignType, CustomHoliday, PreachingGroup, Assembly, RoleConfiguration, UserRole } from "@/types";
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
import { Timestamp, doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
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
import { format as formatDate, getYear, getMonth } from 'date-fns';
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

type SettingsSectionId = "permissions" | "weeklyProgram" | "specialEvents" | "ruralRotation" | "appearance" | "timings";

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
  { id: "appearance", title: "Apariencia y Tema", icon: Palette, description: "Personaliza los colores y el tema de la aplicación (Próximamente)." },
  { id: "timings", title: "Tiempos y Duraciones", icon: Hourglass, description: "Define duraciones predeterminadas para turnos, etc. (Próximamente)." },
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

  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [isAssemblyDialogOpen, setIsAssemblyDialogOpen] = useState(false);
  const [assemblyToEdit, setAssemblyToEdit] = useState<Assembly | null>(null);

  const [isLoadingSpecialEvents, setIsLoadingSpecialEvents] = useState(false);
  const [isSavingSpecialEvents, setIsSavingSpecialEvents] = useState(false);


  const [selectedLastRuralGroupId, setSelectedLastRuralGroupId] = useState<string | undefined>(undefined);
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
            const data = docSnap.data();
            setScheduleSlots(data.scheduleSlots || []);
            setGroupOrganizedDays(data.groupOrganizedDays || []);
        } else {
            setScheduleSlots([]);
            setGroupOrganizedDays([]);
        }
    } catch (error) {
        console.error("Error fetching program configuration:", error);
        toast({ title: "Error al Cargar Programa Semanal", description: "No se pudo cargar la configuración del programa.", variant: "destructive" });
        setScheduleSlots([]);
        setGroupOrganizedDays([]);
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
        const data = docSnap.data();
        setCampaigns(data.campaignsList || []);
        setCustomHolidays(data.holidaysList || []);
        setAssemblies(data.assembliesList || []);
      } else {
        setCampaigns([]);
        setCustomHolidays([]);
        setAssemblies([]);
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
    } else if (activeSectionId === "weeklyProgram") {
      loadProgramConfiguration();
    } else if (activeSectionId === "specialEvents") {
      loadSpecialEventsConfiguration();
    }
    // TODO: Add loading logic for "ruralRotation" when connected
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
      });
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

  const saveProgramConfigToFirestore = async (configToSave: { scheduleSlots?: ProgramScheduleSlot[], groupOrganizedDays?: DayOfWeek[] }) => {
    if (!db || Object.keys(db).length === 0) {
        toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
        return false;
    }
    setIsSavingProgramSettings(true);
    try {
        const docRef = doc(db, "settings", "programConfig");
        await setDoc(docRef, { ...configToSave, updatedAt: serverTimestamp() }, { merge: true });
        // Toast success will be handled by the calling function to be more specific
        return true;
    } catch (error) {
        console.error("Error saving program configuration:", error);
        toast({ title: "Error al Guardar Programa", description: "No se pudo guardar la configuración del programa semanal.", variant: "destructive" });
        return false;
    } finally {
        setIsSavingProgramSettings(false);
    }
  };

  const saveSpecialEventsToFirestore = async (eventsData: { campaignsList: Campaign[], holidaysList: CustomHoliday[], assembliesList: Assembly[] }) => {
    if (!db || Object.keys(db).length === 0) {
      toast({ title: "Error de Configuración", description: "La base de datos no está disponible.", variant: "destructive" });
      return false;
    }
    setIsSavingSpecialEvents(true);
    try {
      const docRef = doc(db, "settings", "specialEventsConfig");
      await setDoc(docRef, { ...eventsData, updatedAt: serverTimestamp() }, { merge: true });
      return true;
    } catch (error) {
      console.error("Error saving special events configuration:", error);
      toast({ title: "Error al Guardar Eventos", description: "No se pudo guardar la configuración de eventos especiales.", variant: "destructive" });
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
    
    const success = await saveProgramConfigToFirestore({ scheduleSlots: updatedSlots, groupOrganizedDays });
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
    const success = await saveProgramConfigToFirestore({ scheduleSlots: updatedSlots, groupOrganizedDays });
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
    const success = await saveProgramConfigToFirestore({ scheduleSlots, groupOrganizedDays });
    if (success) {
        toast({ title: "Días Grupales Guardados", description: "La configuración de días organizados por grupos ha sido guardada." });
    }
  };


  const handleCampaignSubmit = async (submittedCampaign: Campaign) => {
    let updatedCampaigns;
    const existingIndex = campaigns.findIndex(c => c.id === submittedCampaign.id);
    if (existingIndex > -1) {
      updatedCampaigns = campaigns.map(c => c.id === submittedCampaign.id ? submittedCampaign : c);
    } else {
      updatedCampaigns = [...campaigns, submittedCampaign];
    }
    updatedCampaigns.sort((a, b) => b.startDate.toMillis() - a.startDate.toMillis());
    
    const success = await saveSpecialEventsToFirestore({ campaignsList: updatedCampaigns, holidaysList: customHolidays, assembliesList: assemblies });
    if (success) {
        setCampaigns(updatedCampaigns);
        toast({ title: campaignToEdit ? "Campaña Actualizada" : "Campaña Añadida", description: `La campaña "${submittedCampaign.name}" ha sido guardada.` });
        setIsCampaignDialogOpen(false);
        setCampaignToEdit(null);
    }
  };
  const handleDeleteCampaign = async (campaignId: string) => {
    const campaignToDelete = campaigns.find(c => c.id === campaignId);
    const updatedCampaigns = campaigns.filter(c => c.id !== campaignId);
    const success = await saveSpecialEventsToFirestore({ campaignsList: updatedCampaigns, holidaysList: customHolidays, assembliesList: assemblies });
    if (success) {
        setCampaigns(updatedCampaigns);
        toast({ title: "Campaña Eliminada", description: `La campaña "${campaignToDelete?.name}" ha sido eliminada.`, variant: "destructive" });
    }
  };

  const handleAssemblySubmit = async (submittedAssembly: Assembly) => {
    let updatedAssemblies;
    const existingIndex = assemblies.findIndex(a => a.id === submittedAssembly.id);
    if (existingIndex > -1) {
      updatedAssemblies = assemblies.map(a => a.id === submittedAssembly.id ? submittedAssembly : a);
    } else {
      updatedAssemblies = [...assemblies, submittedAssembly];
    }
    updatedAssemblies.sort((a, b) => b.startDate.toMillis() - a.startDate.toMillis());

    const success = await saveSpecialEventsToFirestore({ campaignsList: campaigns, holidaysList: customHolidays, assembliesList: updatedAssemblies });
    if (success) {
        setAssemblies(updatedAssemblies);
        toast({ title: assemblyToEdit ? "Asamblea Actualizada" : "Asamblea Añadida", description: `La asamblea "${submittedAssembly.name}" ha sido guardada.` });
        setIsAssemblyDialogOpen(false);
        setAssemblyToEdit(null);
    }
  };
  const handleDeleteAssembly = async (assemblyId: string) => {
    const assemblyToDelete = assemblies.find(a => a.id === assemblyId);
    const updatedAssemblies = assemblies.filter(a => a.id !== assemblyId);
    const success = await saveSpecialEventsToFirestore({ campaignsList: campaigns, holidaysList: customHolidays, assembliesList: updatedAssemblies });
    if (success) {
        setAssemblies(updatedAssemblies);
        toast({ title: "Asamblea Eliminada", description: `La asamblea "${assemblyToDelete?.name}" ha sido eliminada.`, variant: "destructive" });
    }
  };

  const handleHolidaySubmit = async (submittedHoliday: CustomHoliday) => {
    let updatedHolidays;
    const existingIndex = customHolidays.findIndex(h => h.id === submittedHoliday.id);
    if (existingIndex > -1) {
      updatedHolidays = customHolidays.map(h => h.id === submittedHoliday.id ? submittedHoliday : h);
    } else {
      updatedHolidays = [...customHolidays, submittedHoliday];
    }
    updatedHolidays.sort((a,b) => a.date.toMillis() - b.date.toMillis());

    const success = await saveSpecialEventsToFirestore({ campaignsList: campaigns, holidaysList: updatedHolidays, assembliesList: assemblies });
    if (success) {
        setCustomHolidays(updatedHolidays);
        toast({ title: holidayToEdit ? "Festivo Actualizado" : "Festivo Añadido", description: `El festivo "${submittedHoliday.name}" ha sido guardado.` });
        setIsHolidayDialogOpen(false);
        setHolidayToEdit(null);
    }
  };
  const handleDeleteHoliday = async (holidayId: string) => {
    const holidayToDelete = customHolidays.find(h => h.id === holidayId);
    const updatedHolidays = customHolidays.filter(h => h.id !== holidayId);
    const success = await saveSpecialEventsToFirestore({ campaignsList: campaigns, holidaysList: updatedHolidays, assembliesList: assemblies });
    if (success) {
        setCustomHolidays(updatedHolidays);
        toast({ title: "Festivo Eliminado", description: `El festivo "${holidayToDelete?.name}" ha sido eliminado.`, variant: "destructive" });
    }
  };

  const handleLoadExampleHolidays = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const baseFixedHolidays: { day: number; month: number; name: string }[] = [
      { day: 1, month: 0, name: "Año Nuevo" }, { day: 1, month: 4, name: "Día del Trabajo" },
      { day: 21, month: 4, name: "Día de las Glorias Navales" }, { day: 20, month: 5, name: "Día Nacional de los Pueblos Indígenas" },
      { day: 29, month: 5, name: "San Pedro y San Pablo" }, { day: 16, month: 6, name: "Día de la Virgen del Carmen" },
      { day: 15, month: 7, name: "Asunción de la Virgen" }, { day: 18, month: 8, name: "Independencia Nacional" },
      { day: 19, month: 8, name: "Día de las Glorias del Ejército" }, { day: 12, month: 9, name: "Encuentro de Dos Mundos" },
      { day: 27, month: 9, name: "Día Nacional de las Iglesias Evangélicas y Protestantes" },
      { day: 31, month: 9, name: "Día Nacional de las Iglesias Evangélicas y Protestantes" },
      { day: 1, month: 10, name: "Día de Todos los Santos" }, { day: 8, month: 11, name: "Inmaculada Concepción" },
      { day: 25, month: 11, name: "Navidad" },
    ];
    const easterExamples = [
        { year: 2024, month: 2, day: 29, name: "Viernes Santo (Ej. 2024)"}, { year: 2024, month: 2, day: 30, name: "Sábado Santo (Ej. 2024)"},
        { year: 2025, month: 3, day: 18, name: "Viernes Santo (Ej. 2025)"}, { year: 2025, month: 3, day: 19, name: "Sábado Santo (Ej. 2025)"},
        { year: 2026, month: 3, day: 3, name: "Viernes Santo (Ej. 2026)"}, { year: 2026, month: 3, day: 4, name: "Sábado Santo (Ej. 2026)"},
    ];
    const newHolidaysToAdd: CustomHoliday[] = [];
    const existingDates = new Set(customHolidays.map(h => h.date.toDate().toDateString()));
    const twelveMonthsFromTodayEnd = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate());
    for (let i = 0; i < 12; i++) {
      const currentDateIter = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const targetYear = currentDateIter.getFullYear(); const targetMonth = currentDateIter.getMonth();
      baseFixedHolidays.forEach(bh => {
        if (bh.month === targetMonth) {
          const potentialHolidayDate = new Date(targetYear, bh.month, bh.day); potentialHolidayDate.setHours(0,0,0,0);
          if (potentialHolidayDate >= today && potentialHolidayDate < twelveMonthsFromTodayEnd && !existingDates.has(potentialHolidayDate.toDateString())) {
            newHolidaysToAdd.push({ id: crypto.randomUUID(), name: bh.name, date: Timestamp.fromDate(potentialHolidayDate), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
            existingDates.add(potentialHolidayDate.toDateString());
          }
        }
      });
       easterExamples.forEach(ee => {
        if (ee.year === targetYear && ee.month === targetMonth) {
            const potentialHolidayDate = new Date(ee.year, ee.month, ee.day); potentialHolidayDate.setHours(0,0,0,0);
            if (potentialHolidayDate >= today && potentialHolidayDate < twelveMonthsFromTodayEnd && !existingDates.has(potentialHolidayDate.toDateString())) {
                 newHolidaysToAdd.push({ id: crypto.randomUUID(), name: ee.name, date: Timestamp.fromDate(potentialHolidayDate), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
                existingDates.add(potentialHolidayDate.toDateString());
            }
        }
      });
    }
    
    if (newHolidaysToAdd.length > 0) {
        const updatedHolidays = [...customHolidays, ...newHolidaysToAdd].sort((a,b) => a.date.toMillis() - b.date.toMillis());
        const success = await saveSpecialEventsToFirestore({ campaignsList: campaigns, holidaysList: updatedHolidays, assembliesList: assemblies });
        if (success) {
            setCustomHolidays(updatedHolidays);
            toast({ title: "Festivos de Ejemplo Cargados", description: `${newHolidaysToAdd.length} festivos (Chile, próximos 12 meses) añadidos y guardados. Verifique y ajuste.`, duration: 10000 });
        }
    } else {
      toast({ title: "Sin Cambios", description: "No se añadieron nuevos festivos de ejemplo.", });
    }
  };

  const groupedHolidays = useMemo(() => {
    if (!customHolidays.length) return {}; const groups: Record<string, CustomHoliday[]> = {};
    customHolidays.forEach(holiday => {
      const holidayDate = holiday.date.toDate(); const year = holidayDate.getUTCFullYear(); const month = holidayDate.getUTCMonth();
      const monthYearKey = `${year}-${String(month).padStart(2, '0')}`;
      if (!groups[monthYearKey]) groups[monthYearKey] = [];
      groups[monthYearKey].push(holiday);
    }); return groups;
  }, [customHolidays]);
  const sortedMonthYearKeys = useMemo(() => Object.keys(groupedHolidays).sort(), [groupedHolidays]);

  const handleSaveRuralRotation = async () => {
    setIsSavingRuralRotation(true); await new Promise(resolve => setTimeout(resolve, 700));
    console.log("Configuración de rotación rural guardada (simulación):", selectedLastRuralGroupId);
    toast({ title: "Configuración Guardada", description: "La rotación para predicación rural de fin de semana ha sido actualizada (simulación)." });
    setIsSavingRuralRotation(false);
  };

  const currentSection = settingsSections.find(sec => sec.id === activeSectionId);

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
        {/* Left Column: Navigation Menu */}
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

        {/* Right Column: Content Area */}
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
                  <Accordion type="multiple" className="w-full space-y-2" defaultValue={PERMISSION_MODULES_ORDERED_FOR_ACCORDION}>
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
                        {campaigns.map((campaign) => (<TableRow key={campaign.id}><TableCell className="font-medium">{campaign.name}</TableCell><TableCell>{CampaignTypeLabels[campaign.type]}</TableCell><TableCell>{formatDate(campaign.startDate.toDate(), "dd/MM/yyyy")} - {formatDate(campaign.endDate.toDate(), "dd/MM/yyyy")}</TableCell><TableCell className="text-xs">{campaign.type === 'superintendent_visit' && campaign.superintendentName && (<div>Sup: {campaign.superintendentName}</div>)}{(campaign.specialCampaignTerritoriesPerDay ?? 0) > 0 && (<div>Terr/día (Camp.): {campaign.specialCampaignTerritoriesPerDay}</div>)}{campaign.description && <div className="italic text-muted-foreground mt-1 truncate w-48" title={campaign.description}>"{campaign.description}"</div>}</TableCell><TableCell className="text-right space-x-1"><Button variant="ghost" size="icon" onClick={() => { setCampaignToEdit(campaign); setIsCampaignDialogOpen(true);}} className="h-8 w-8"><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponentInner>¿Estás seguro?</AlertDialogTitleComponentInner><AlertDialogDescriptionComponentInner>Eliminarás la campaña "{campaign.name}".</AlertDialogDescriptionComponentInner></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCampaign(campaign.id)} className={buttonVariants({variant: "destructive"})}>Sí, eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>))}
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
                        {assemblies.map((assembly) => (<TableRow key={assembly.id}><TableCell className="font-medium">{assembly.name}</TableCell><TableCell>{formatDate(assembly.startDate.toDate(), "dd/MM/yyyy")} - {formatDate(assembly.endDate.toDate(), "dd/MM/yyyy")}</TableCell><TableCell className="text-xs italic text-muted-foreground truncate w-64" title={assembly.description}>{assembly.description || 'N/A'}</TableCell><TableCell className="text-right space-x-1"><Button variant="ghost" size="icon" onClick={() => { setAssemblyToEdit(assembly); setIsAssemblyDialogOpen(true); }} className="h-8 w-8"><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponentInner>¿Estás seguro?</AlertDialogTitleComponentInner><AlertDialogDescriptionComponentInner>Eliminarás la asamblea "{assembly.name}".</AlertDialogDescriptionComponentInner></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAssembly(assembly.id)} className={buttonVariants({variant: "destructive"})}>Sí, eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>))}
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
                          <Button onClick={handleLoadExampleHolidays} size="sm" variant="outline" className="w-full sm:w-auto"><Upload className="mr-2 h-4 w-4" /> Cargar Ejemplos</Button>
                          <Button onClick={() => { setHolidayToEdit(null); setIsHolidayDialogOpen(true); }} size="sm" className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Festivo Manual</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {customHolidays.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-lg border border-dashed"><CalendarDays className="h-16 w-16 text-muted-foreground/70 mb-4" /><p className="text-lg font-medium text-muted-foreground mb-1">No hay festivos.</p><p className="text-sm text-muted-foreground">Añade festivos manualmente o carga ejemplos.</p></div>
                    ) : (
                      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
                        {sortedMonthYearKeys.map((monthYearKey) => {
                          const holidaysInMonth = groupedHolidays[monthYearKey]; const [yearStr, monthIndexStr] = monthYearKey.split('-');
                          const year = parseInt(yearStr, 10); const monthIndex = parseInt(monthIndexStr, 10);
                          const monthDate = new Date(Date.UTC(year, monthIndex, 1));
                          return (<React.Fragment key={monthYearKey}><TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10"><TableCell colSpan={4} className="font-semibold text-primary py-2.5 px-4 text-sm">{formatDate(monthDate, "MMMM yyyy", { locale: es, timeZone: 'UTC' }).toUpperCase()}</TableCell></TableRow>
                            {holidaysInMonth.map((holiday) => (<TableRow key={holiday.id}><TableCell>{formatDate(holiday.date.toDate(), "dd/MM/yyyy")}</TableCell><TableCell className="font-medium">{holiday.name}</TableCell><TableCell className="text-xs italic text-muted-foreground truncate w-64" title={holiday.description}>{holiday.description || 'N/A'}</TableCell><TableCell className="text-right space-x-1"><Button variant="ghost" size="icon" onClick={() => { setHolidayToEdit(holiday); setIsHolidayDialogOpen(true);}} className="h-8 w-8"><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponentInner>¿Estás seguro?</AlertDialogTitleComponentInner><AlertDialogDescriptionComponentInner>Eliminarás el festivo "{holiday.name}".</AlertDialogDescriptionComponentInner></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteHoliday(holiday.id)} className={buttonVariants({variant: "destructive"})}>Sí, eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>))}
                          </React.Fragment>);
                        })}
                      </TableBody></Table></div>
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
                <div className="space-y-2">
                  <Label htmlFor="ruralRotationSelect">Último grupo que dirigió el rural de fin de semana</Label>
                  <Select value={selectedLastRuralGroupId} onValueChange={setSelectedLastRuralGroupId}>
                    <SelectTrigger className="w-full sm:w-[300px]" id="ruralRotationSelect"><SelectValue placeholder="Seleccionar grupo..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE_OR_RESET">Ninguno / Reiniciar Rotación</SelectItem>
                      {MOCK_GROUPS_FOR_ROTATION_SELECT.map(group => (<SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Selecciona el grupo más reciente. Si es la primera vez, selecciona "Ninguno".</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveRuralRotation} disabled={isSavingRuralRotation}>
                  {isSavingRuralRotation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Save className="mr-2 h-4 w-4" /> Guardar Rotación Rural
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeSectionId === "appearance" && (
             <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl"><Palette className="mr-3 h-6 w-6 text-primary" />Apariencia y Tema</CardTitle>
                <CardDescription>Personaliza los colores y el tema de la aplicación.</CardDescription>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Próximamente...</p></CardContent>
            </Card>
          )}
          {activeSectionId === "timings" && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl"><Hourglass className="mr-3 h-6 w-6 text-primary" />Tiempos y Duraciones</CardTitle>
                <CardDescription>Define duraciones predeterminadas para turnos, reuniones, etc.</CardDescription>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Próximamente...</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs for adding/editing items */}
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

// Helper to ensure consistent order of modules in accordion
const PERMISSION_MODULES_ORDERED_FOR_ACCORDION = PERMISSIONS_BY_MODULE.map(m => m.moduleName);
    

    
