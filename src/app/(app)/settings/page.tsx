
"use client";

import * as React from "react"; 
import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, CalendarCog, ShieldAlert, Users as UsersIconLucide, Palette, Hourglass, PlusCircle, Trash2, Video, MountainSnow, Users as UsersTypeIcon, AlertTriangle, Edit2, GanttChartSquare, Save, Edit, PackageSearch, CalendarDays, Upload, UsersRound } from "lucide-react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { ProgramScheduleSlot, DayOfWeek, PreachingType, ScheduleSlotStatus, Campaign, CampaignType, CustomHoliday, PreachingGroup } from "@/types";
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
import { Timestamp } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format as formatDate, getYear, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';


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


export default function SettingsPage() {
  const [scheduleSlots, setScheduleSlots] = useState<ProgramScheduleSlot[]>([]);
  const [isAddSlotDialogOpen, setIsAddSlotDialogOpen] = useState(false);
  const [dayForNewSlot, setDayForNewSlot] = useState<DayOfWeek | null>(null);
  const { toast } = useToast();
  const [isSubmittingSlotDialog, setIsSubmittingSlotDialog] = useState(false);
  
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<DayOfWeek[]>([]);
  const [isSavingGroupOrganizedDays, setIsSavingGroupOrganizedDays] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);

  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<CustomHoliday | null>(null);

  const [selectedLastRuralGroupId, setSelectedLastRuralGroupId] = useState<string | undefined>(undefined);
  const [isSavingRuralRotation, setIsSavingRuralRotation] = useState(false);


  const slotForm = useForm<ScheduleSlotFormValues>({
    resolver: zodResolver(scheduleSlotFormSchema),
    defaultValues: {
      startTime: "",
      type: undefined,
      status: "fixed",
    },
  });

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

    await new Promise(resolve => setTimeout(resolve, 500));

    setScheduleSlots((prev) => [...prev, newSlot].sort((a,b) => {
        const dayCompare = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayCompare !== 0) return dayCompare;
        return a.startTime.localeCompare(b.startTime);
    }));
    toast({ title: "Horario Añadido", description: `Nuevo horario para ${dayOfWeekLabels[dayForNewSlot]} a las ${data.startTime} (simulación).` });
    
    setIsSubmittingSlotDialog(false);
    setIsAddSlotDialogOpen(false);
    slotForm.reset();
  };

  const handleDeleteSlot = (slotId: string) => {
    setScheduleSlots((prev) => prev.filter(slot => slot.id !== slotId));
    toast({ title: "Horario Eliminado", description: "El horario ha sido eliminado (simulación).", variant: "destructive" });
  };

  const handleGroupOrganizedDayChange = (day: DayOfWeek, checked: boolean) => {
    setGroupOrganizedDays(prev => 
      checked ? [...prev, day] : prev.filter(d => d !== day)
    );
  };

  const handleSaveGroupOrganizedDays = async () => {
    setIsSavingGroupOrganizedDays(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    console.log("Días organizados por grupo guardados (simulación):", groupOrganizedDays);
    toast({
      title: "Configuración Guardada",
      description: "Los días de predicación organizados por grupos han sido actualizados (simulación).",
    });
    setIsSavingGroupOrganizedDays(false);
  };

  const handleOpenAddCampaignDialog = () => {
    setCampaignToEdit(null);
    setIsCampaignDialogOpen(true);
  };

  const handleOpenEditCampaignDialog = (campaign: Campaign) => {
    setCampaignToEdit(campaign);
    setIsCampaignDialogOpen(true);
  };

  const handleCampaignSubmit = (submittedCampaign: Omit<Campaign, 'isActive'>) => {
    const campaignWithIsActive = {
        ...submittedCampaign,
        // isActive will be determined by dates, so not needed here for storage if removed from type
    } as Campaign;


    setCampaigns(prevCampaigns => {
      const existingIndex = prevCampaigns.findIndex(c => c.id === campaignWithIsActive.id);
      if (existingIndex > -1) {
        const updatedCampaigns = [...prevCampaigns];
        updatedCampaigns[existingIndex] = campaignWithIsActive;
        return updatedCampaigns.sort((a, b) => b.startDate.toMillis() - a.startDate.toMillis());
      } else {
        return [...prevCampaigns, campaignWithIsActive].sort((a, b) => b.startDate.toMillis() - a.startDate.toMillis());
      }
    });
    setIsCampaignDialogOpen(false);
  };

  const handleDeleteCampaign = (campaignId: string) => {
    setCampaigns(prevCampaigns => prevCampaigns.filter(c => c.id !== campaignId));
    toast({ title: "Campaña Eliminada", description: "La campaña ha sido eliminada (simulación).", variant: "destructive" });
  };
  
  const handleOpenAddHolidayDialog = () => {
    setHolidayToEdit(null);
    setIsHolidayDialogOpen(true);
  };

  const handleOpenEditHolidayDialog = (holiday: CustomHoliday) => {
    setHolidayToEdit(holiday);
    setIsHolidayDialogOpen(true);
  };

  const handleHolidaySubmit = (submittedHoliday: CustomHoliday) => {
    setCustomHolidays(prevHolidays => {
      const existingIndex = prevHolidays.findIndex(h => h.id === submittedHoliday.id);
      if (existingIndex > -1) {
        const updatedHolidays = [...prevHolidays];
        updatedHolidays[existingIndex] = submittedHoliday;
        return updatedHolidays.sort((a,b) => a.date.toMillis() - b.date.toMillis());
      } else {
        return [...prevHolidays, submittedHoliday].sort((a,b) => a.date.toMillis() - b.date.toMillis());
      }
    });
    setIsHolidayDialogOpen(false);
  };

  const handleDeleteHoliday = (holidayId: string) => {
    setCustomHolidays(prevHolidays => prevHolidays.filter(h => h.id !== holidayId));
    toast({ title: "Festivo Eliminado", description: "El festivo ha sido eliminado (simulación).", variant: "destructive" });
  };

  const handleLoadExampleHolidays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const baseFixedHolidays: { day: number; month: number; name: string }[] = [
      { day: 1, month: 0, name: "Año Nuevo" }, // month is 0-indexed
      { day: 1, month: 4, name: "Día del Trabajo" },
      { day: 21, month: 4, name: "Día de las Glorias Navales" },
      // Junio
      // { day: 9, month: 5, name: "Elecciones Primarias Alcaldes y Gobernadores (Irrenunciable)" }, // Variable, specific to 2024
      { day: 20, month: 5, name: "Día Nacional de los Pueblos Indígenas" },
      { day: 29, month: 5, name: "San Pedro y San Pablo" }, // Usually moved to nearest Monday if on Tue/Wed/Thu
      // Julio
      { day: 16, month: 6, name: "Día de la Virgen del Carmen" },
      // Agosto
      { day: 15, month: 7, name: "Asunción de la Virgen" },
      // Septiembre
      { day: 18, month: 8, name: "Independencia Nacional" },
      { day: 19, month: 8, name: "Día de las Glorias del Ejército" },
      // { day: 20, month: 8, name: "Fiestas Patrias (Adicional 2023, check for current year)" }, // Variable, specific to some years
      // Octubre
      { day: 12, month: 9, name: "Encuentro de Dos Mundos" }, // Often moved
      { day: 27, month: 9, name: "Día Nacional de las Iglesias Evangélicas y Protestantes" }, // (variable, usually Oct 31, moved to Fri if Oct 31 is Wed)
      { day: 31, month: 9, name: "Día Nacional de las Iglesias Evangélicas y Protestantes" },
      // Noviembre
      { day: 1, month: 10, name: "Día de Todos los Santos" },
      // Diciembre
      { day: 8, month: 11, name: "Inmaculada Concepción" },
      { day: 25, month: 11, name: "Navidad" },
    ];
    
    const easterExamples = [ // These need verification each year
        { year: 2024, month: 2, day: 29, name: "Viernes Santo (Ej. 2024)"},
        { year: 2024, month: 2, day: 30, name: "Sábado Santo (Ej. 2024)"},
        { year: 2025, month: 3, day: 18, name: "Viernes Santo (Ej. 2025)"},
        { year: 2025, month: 3, day: 19, name: "Sábado Santo (Ej. 2025)"},
        { year: 2026, month: 3, day: 3, name: "Viernes Santo (Ej. 2026)"},
        { year: 2026, month: 3, day: 4, name: "Sábado Santo (Ej. 2026)"},
    ];

    const newHolidaysToAdd: CustomHoliday[] = [];
    const existingDates = new Set(customHolidays.map(h => h.date.toDate().toDateString()));
    const twelveMonthsFromTodayEnd = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate());


    for (let i = 0; i < 12; i++) { 
      const currentDateIter = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const targetYear = currentDateIter.getFullYear();
      const targetMonth = currentDateIter.getMonth();

      baseFixedHolidays.forEach(bh => {
        if (bh.month === targetMonth) { 
          const potentialHolidayDate = new Date(targetYear, bh.month, bh.day);
          potentialHolidayDate.setHours(0,0,0,0);

          if (potentialHolidayDate >= today && potentialHolidayDate < twelveMonthsFromTodayEnd && !existingDates.has(potentialHolidayDate.toDateString())) {
            newHolidaysToAdd.push({
              id: crypto.randomUUID(),
              name: bh.name,
              date: Timestamp.fromDate(potentialHolidayDate),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
            existingDates.add(potentialHolidayDate.toDateString()); 
          }
        }
      });
       easterExamples.forEach(ee => {
        if (ee.year === targetYear && ee.month === targetMonth) {
            const potentialHolidayDate = new Date(ee.year, ee.month, ee.day);
            potentialHolidayDate.setHours(0,0,0,0);
            
            if (potentialHolidayDate >= today && potentialHolidayDate < twelveMonthsFromTodayEnd && !existingDates.has(potentialHolidayDate.toDateString())) {
                 newHolidaysToAdd.push({
                  id: crypto.randomUUID(),
                  name: ee.name,
                  date: Timestamp.fromDate(potentialHolidayDate),
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                });
                existingDates.add(potentialHolidayDate.toDateString());
            }
        }
    });
    }
    

    if (newHolidaysToAdd.length > 0) {
      setCustomHolidays(prev => [...prev, ...newHolidaysToAdd].sort((a,b) => a.date.toMillis() - b.date.toMillis()));
      toast({
        title: "Festivos de Ejemplo Cargados",
        description: `${newHolidaysToAdd.length} festivos de ejemplo para Chile (próximos 12 meses) han sido añadidos. Los festivos variables (ej. Semana Santa) y aquellos que se trasladan a lunes son ejemplos y deben ser verificados/ajustados manualmente.`,
        duration: 10000,
      });
    } else {
      toast({
        title: "Sin Cambios",
        description: "No se añadieron nuevos festivos de ejemplo (ya existen o no aplican para los próximos 12 meses).",
      });
    }
  };

  const groupedHolidays = useMemo(() => {
    if (!customHolidays.length) return {};
    
    const groups: Record<string, CustomHoliday[]> = {};
    
    customHolidays.forEach(holiday => {
      const holidayDate = holiday.date.toDate();
      const year = holidayDate.getUTCFullYear(); // Use UTC to avoid timezone shifts changing the date
      const month = holidayDate.getUTCMonth(); 
      const monthYearKey = `${year}-${String(month).padStart(2, '0')}`; // Pad month for correct sorting
      
      if (!groups[monthYearKey]) {
        groups[monthYearKey] = [];
      }
      groups[monthYearKey].push(holiday);
    });
    return groups;
  }, [customHolidays]);

  const sortedMonthYearKeys = useMemo(() => Object.keys(groupedHolidays).sort(), [groupedHolidays]);

  const handleSaveRuralRotation = async () => {
    setIsSavingRuralRotation(true);
    // Simulate saving to Firestore
    await new Promise(resolve => setTimeout(resolve, 700));
    console.log("Configuración de rotación rural guardada (simulación):", selectedLastRuralGroupId);
    toast({
        title: "Configuración Guardada",
        description: "La rotación para predicación rural de fin de semana ha sido actualizada (simulación).",
    });
    setIsSavingRuralRotation(false);
  };
  
  // TODO: Cargar `selectedLastRuralGroupId` desde Firestore en un useEffect


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Configuración General</h1>
        <p className="text-muted-foreground mt-1">
          Ajusta los parámetros y preferencias de D-TERRITORIO.
        </p>
      </div>

      <Separator />

      <Card className="hover:shadow-lg transition-shadow">
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
                      <p className="text-xs text-muted-foreground text-center py-4">No hay horarios para este día.</p>
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
                Días Organizados por Grupos de Predicación
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Marca los días en que la organización de la predicación recae directamente en los grupos.
              La IA no asignará horarios centralizados para estos días.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 p-4 border rounded-md shadow-sm bg-muted/20">
              {dayOrder.map(dayKey => (
                <div key={`group-day-${dayKey}`} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
                  <Checkbox
                    id={`group-organized-${dayKey}`}
                    checked={groupOrganizedDays.includes(dayKey)}
                    onCheckedChange={(checked) => {
                      handleGroupOrganizedDayChange(dayKey, !!checked);
                    }}
                  />
                  <label
                    htmlFor={`group-organized-${dayKey}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {dayOfWeekLabels[dayKey]}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveGroupOrganizedDays} disabled={isSavingGroupOrganizedDays}>
                {isSavingGroupOrganizedDays && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Guardar Días Grupales
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddSlotDialogOpen} onOpenChange={(isOpen) => {
          setIsAddSlotDialogOpen(isOpen);
          if (!isOpen) {
            slotForm.reset();
            setDayForNewSlot(null);
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Añadir Nuevo Horario para {dayForNewSlot ? dayOfWeekLabels[dayForNewSlot] : ''}
            </DialogTitle>
            <DialogDescriptionComponent>
              Completa los detalles para el nuevo horario.
            </DialogDescriptionComponent>
          </DialogHeader>
          <Form {...slotForm}>
            <form onSubmit={slotForm.handleSubmit(onSubmitSlotDialog)} className="space-y-4 py-2">
              <FormField
                control={slotForm.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Inicio (HH:mm)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={slotForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Predicación</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="rural">Rural</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={slotForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado del Horario</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fijo</SelectItem>
                        <SelectItem value="tentative">Tentativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmittingSlotDialog}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmittingSlotDialog}>
                  {isSubmittingSlotDialog && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Añadir Horario
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Briefcase className="mr-3 h-6 w-6 text-primary" />
            Gestión de Campañas
          </CardTitle>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-1">
            <CardDescription>
              Define y administra campañas especiales de predicación.
            </CardDescription>
            <Button onClick={handleOpenAddCampaignDialog} size="sm" className="mt-2 sm:mt-0">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Campaña
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-lg border border-dashed">
              <PackageSearch className="h-16 w-16 text-muted-foreground/70 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-1">No hay campañas configuradas.</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en "Añadir Campaña" para crear la primera.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead>Detalles Adic.</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{CampaignTypeLabels[campaign.type]}</TableCell>
                      <TableCell>
                        {formatDate(campaign.startDate.toDate(), "dd/MM/yyyy")} - {formatDate(campaign.endDate.toDate(), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {campaign.type === 'superintendent_visit' && campaign.superintendentName && (
                          <div>Sup: {campaign.superintendentName}</div>
                        )}
                        {(campaign.specialCampaignTerritoriesPerDay ?? 0) > 0 && (
                           <div>Terr/día (Camp.): {campaign.specialCampaignTerritoriesPerDay}</div>
                        )}
                        {campaign.description && <div className="italic text-muted-foreground mt-1 truncate w-48" title={campaign.description}>"{campaign.description}"</div>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditCampaignDialog(campaign)} className="h-8 w-8">
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
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente la campaña "{campaign.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                className={buttonVariants({variant: "destructive"})}
                              >
                                Sí, eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isCampaignDialogOpen && (
        <AddCampaignDialog
            isOpen={isCampaignDialogOpen}
            onOpenChange={setIsCampaignDialogOpen}
            onCampaignSubmit={handleCampaignSubmit}
            campaignToEdit={campaignToEdit}
        />
      )}

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <UsersRound className="mr-3 h-6 w-6 text-primary" />
            Rotación Rural Fin de Semana
          </CardTitle>
          <CardDescription>
            Define el último grupo que se hizo cargo de la predicación rural de fin de semana para asegurar una rotación equitativa. La IA usará esta información para asignar al SG del siguiente grupo como capitán.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ruralRotationSelect">Último grupo que dirigió el rural de fin de semana</Label>
            <Select
              id="ruralRotationSelect"
              value={selectedLastRuralGroupId}
              onValueChange={setSelectedLastRuralGroupId}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Seleccionar grupo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE_OR_RESET">Ninguno / Reiniciar Rotación</SelectItem>
                {MOCK_GROUPS_FOR_ROTATION_SELECT.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Selecciona el grupo que más recientemente dirigió. Si es la primera vez o quieres reiniciar, selecciona "Ninguno".
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveRuralRotation} disabled={isSavingRuralRotation}>
            {isSavingRuralRotation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Guardar Rotación Rural
          </Button>
        </CardFooter>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <CalendarDays className="mr-3 h-6 w-6 text-primary" /> 
            Días Festivos Personalizados
          </CardTitle>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-1 gap-2">
            <CardDescription>
               Añade días festivos que la IA debe considerar. Puedes cargar ejemplos de festivos fijos chilenos para los próximos 12 meses. Los festivos variables (ej. Semana Santa) y aquellos que se trasladan a lunes son ejemplos y deben ser verificados/ajustados manualmente. Otros festivos móviles o regionales deben añadirse manualmente.
            </CardDescription>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Button onClick={handleLoadExampleHolidays} size="sm" variant="outline" className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" /> Cargar Ejemplos (Chile)
                </Button>
                <Button onClick={handleOpenAddHolidayDialog} size="sm" className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Festivo Manual
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customHolidays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-lg border border-dashed">
              <CalendarDays className="h-16 w-16 text-muted-foreground/70 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-1">No hay festivos personalizados.</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en "Añadir Festivo Manual" o "Cargar Ejemplos".
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
                  {sortedMonthYearKeys.map((monthYearKey) => {
                    const holidaysInMonth = groupedHolidays[monthYearKey];
                    const [yearStr, monthIndexStr] = monthYearKey.split('-');
                    const year = parseInt(yearStr, 10);
                    const monthIndex = parseInt(monthIndexStr, 10); 
                    const monthDate = new Date(Date.UTC(year, monthIndex, 1)); 
                                        
                    return (
                      <React.Fragment key={monthYearKey}>
                        <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                          <TableCell 
                            colSpan={4} 
                            className="font-semibold text-primary py-2.5 px-4 text-sm"
                          >
                            {formatDate(monthDate, "MMMM yyyy", { locale: es, timeZone: 'UTC' }).toUpperCase()}
                          </TableCell>
                        </TableRow>
                        {holidaysInMonth.map((holiday) => (
                          <TableRow key={holiday.id}>
                            <TableCell>{formatDate(holiday.date.toDate(), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="font-medium">{holiday.name}</TableCell>
                            <TableCell className="text-xs italic text-muted-foreground truncate w-64" title={holiday.description}>
                              {holiday.description || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEditHolidayDialog(holiday)} className="h-8 w-8">
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
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará permanentemente el festivo "{holiday.name}".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteHoliday(holiday.id)}
                                      className={buttonVariants({variant: "destructive"})}
                                    >
                                      Sí, eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isHolidayDialogOpen && (
        <AddHolidayDialog
            isOpen={isHolidayDialogOpen}
            onOpenChange={setIsHolidayDialogOpen}
            onHolidaySubmit={handleHolidaySubmit}
            holidayToEdit={holidayToEdit}
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <ShieldAlert className="mr-3 h-6 w-6 text-primary" />
              Roles y Permisos
            </CardTitle>
            <CardDescription>
              Administra los roles de usuario y sus permisos detallados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Próximamente...</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Palette className="mr-3 h-6 w-6 text-primary" />
              Apariencia y Tema
            </CardTitle>
            <CardDescription>
              Personaliza los colores y el tema de la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Próximamente...</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Hourglass className="mr-3 h-6 w-6 text-primary" />
              Tiempos y Duraciones
            </CardTitle>
            <CardDescription>
              Define duraciones predeterminadas para turnos, reuniones, etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Próximamente...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

