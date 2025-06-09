
"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, CalendarCog, ShieldAlert, Users as UsersIconLucide, Palette, Hourglass, PlusCircle, Trash2, Video, MountainSnow, Users as UsersTypeIcon, AlertTriangle, Edit2, GanttChartSquare, Save, Edit, PackageSearch } from "lucide-react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { ProgramScheduleSlot, DayOfWeek, PreachingType, ScheduleSlotStatus, Campaign, CampaignType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { AddCampaignDialog } from "@/components/settings/campaigns/add-campaign-dialog";
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
import { format as formatDate } from 'date-fns'; // Renamed to avoid conflict with internal format function


// Schema for the slot form (inside the dialog)
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

  // Campaign Management Functions
  const handleOpenAddCampaignDialog = () => {
    setCampaignToEdit(null);
    setIsCampaignDialogOpen(true);
  };

  const handleOpenEditCampaignDialog = (campaign: Campaign) => {
    setCampaignToEdit(campaign);
    setIsCampaignDialogOpen(true);
  };

  const handleCampaignSubmit = (submittedCampaign: Campaign) => {
    setCampaigns(prevCampaigns => {
      const existingIndex = prevCampaigns.findIndex(c => c.id === submittedCampaign.id);
      if (existingIndex > -1) {
        const updatedCampaigns = [...prevCampaigns];
        updatedCampaigns[existingIndex] = submittedCampaign;
        return updatedCampaigns;
      } else {
        return [submittedCampaign, ...prevCampaigns];
      }
    });
    setIsCampaignDialogOpen(false);
  };

  const handleDeleteCampaign = (campaignId: string) => {
    setCampaigns(prevCampaigns => prevCampaigns.filter(c => c.id !== campaignId));
    toast({ title: "Campaña Eliminada", description: "La campaña ha sido eliminada (simulación).", variant: "destructive" });
  };


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
            <DialogDescription>
              Completa los detalles para el nuevo horario.
            </DialogDescription>
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
              <UsersIconLucide className="mr-3 h-6 w-6 text-primary" />
              Días Festivos Personalizados
            </CardTitle>
            <CardDescription>
              Añade días festivos específicos que afecten la programación.
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
