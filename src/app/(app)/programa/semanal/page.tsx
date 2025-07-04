
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Assignment, PreachingAssignedType, SettingsDoc, DayOfWeek } from "@/types";
import { format, startOfWeek, addDays, parse, isSameDay, startOfDay, subWeeks, addWeeks, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Users, MountainSnow, Video, CalendarDays, ChevronRight, AlertTriangle, ChevronLeft, CalendarClockIcon, Loader2, ImageIcon, Home, User, MapPin } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { collection, doc, onSnapshot, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toPng } from 'html-to-image';
import { WeeklyScheduleImage } from "@/components/programa/weekly-schedule-image";
import { Badge } from "@/components/ui/badge";

const PreachingTypeIcon = ({ type, className }: { type: PreachingAssignedType; className?: string }) => {
  const defaultClass = "h-5 w-5 shrink-0";
  const combinedClass = className ? `${defaultClass} ${className}` : defaultClass;
  if (type === "publica") return <Users className={combinedClass} />;
  if (type === "rural") return <MountainSnow className={combinedClass} />;
  if (type === "zoom") return <Video className={combinedClass} />;
  return null;
};

export default function ProgramaSemanalPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAssignmentToLead, setSelectedAssignmentToLead] = useState<Assignment | null>(null);
  const { toast } = useToast();
  const { userProfile } = usePermissions();

  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
  const today = startOfDay(new Date());

  const imageRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const [groupOrganizedDays, setGroupOrganizedDays] = useState<DayOfWeek[]>([]);


  const currentWeekDays = useMemo(() => {
    const start = startOfWeek(currentDisplayDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDisplayDate]);

  useEffect(() => {
    setIsLoading(true);
    const start = startOfWeek(currentDisplayDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDisplayDate, { weekStartsOn: 1 });
    
    const unsubscribers: (() => void)[] = [];

    const q = query(
      collection(db, "assignments"),
      where("date", ">=", format(start, "yyyy-MM-dd")),
      where("date", "<=", format(end, "yyyy-MM-dd"))
    );

    unsubscribers.push(onSnapshot(q, (snapshot) => {
        const fetchedAssignments = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Assignment));
        setAssignments(fetchedAssignments);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching weekly assignments:", error);
        toast({title: "Error", description: "No se pudieron cargar las asignaciones de la semana.", variant: "destructive"});
        setIsLoading(false);
    }));

    // Fetch Group Organized Days
    const settingsRef = doc(db, "settings", "programConfig");
    unsubscribers.push(onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            const settingsData = snapshot.data() as SettingsDoc;
            setGroupOrganizedDays(settingsData.groupOrganizedDays || []);
        }
    }));


    return () => unsubscribers.forEach(unsub => unsub());
  }, [currentDisplayDate, toast]);


  const goToPreviousWeek = () => {
    setCurrentDisplayDate(prev => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentDisplayDate(prev => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentDisplayDate(new Date());
  };


  const handleRequestToLead = (assignment: Assignment) => {
    if (assignment.userId === userProfile?.firebaseAuthUid) {
        toast({
            title: "Ya eres el encargado",
            description: "Ya estás asignado para dirigir esta predicación.",
            variant: "default",
        });
        return;
    }
    setSelectedAssignmentToLead(assignment);
    setShowConfirmDialog(true);
  };

  const handleConfirmLead = async () => {
    if (!selectedAssignmentToLead || !userProfile) {
      toast({ title: "Error", description: "No se pudo procesar la solicitud.", variant: "destructive" });
      return;
    }

    const assignmentRef = doc(db, "assignments", selectedAssignmentToLead.id);
    try {
        await updateDoc(assignmentRef, {
            userId: userProfile.firebaseAuthUid,
            userName: userProfile.name,
            userEmail: userProfile.email,
            userPhoneNumber: userProfile.phoneNumber,
            updatedAt: serverTimestamp(),
            notes: `Asumido por ${userProfile.name}. Encargado original: ${selectedAssignmentToLead.userName}`
        });
        
        toast({
          title: "¡Encargo Aceptado!",
          description: `Ahora eres el encargado de dirigir la predicación en "${selectedAssignmentToLead.locationName}" y de enviar el reporte.`,
          variant: "default",
        });

    } catch (error) {
        console.error("Error assuming leadership:", error);
        toast({ title: "Error", description: "No se pudo actualizar la asignación.", variant: "destructive" });
    }

    setShowConfirmDialog(false);
    setSelectedAssignmentToLead(null);
  };

  const handleCloseDialog = () => {
    setShowConfirmDialog(false);
    setSelectedAssignmentToLead(null);
  };

  const handleGenerateImage = useCallback(async () => {
    if (!imageRef.current) {
        toast({ title: "Error", description: "No se encontró el contenido para generar la imagen.", variant: "destructive" });
        return;
    }
    setIsGeneratingImage(true);
    toast({ title: "Generando imagen...", description: "Esto puede tardar unos segundos." });

    try {
        const fontURL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
        const response = await fetch(fontURL);
        const cssText = await response.text();
        
        const dataUrl = await toPng(imageRef.current, { 
            cacheBust: true, 
            pixelRatio: 2,
            fontEmbedCSS: cssText,
        });
        const link = document.createElement('a');
        link.download = `programa-semanal-${format(currentWeekDays[0], 'yyyy-MM-dd')}.png`;
        link.href = dataUrl;
        link.click();
        toast({ title: "¡Imagen Generada!", description: "La descarga de la imagen ha comenzado." });
    } catch (err) {
        console.error('oops, something went wrong!', err);
        toast({ title: "Error al generar imagen", description: "No se pudo crear la imagen del programa.", variant: "destructive" });
    } finally {
        setIsGeneratingImage(false);
    }
  }, [currentWeekDays, toast]);

  const weekTitle = `Semana del ${format(currentWeekDays[0], "d 'de' MMMM", { locale: es })} al ${format(currentWeekDays[6], "d 'de' MMMM 'de' yyyy", { locale: es })}`;


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
                <CalendarDays className="mr-3 h-8 w-8 text-primary" />
                Programa Semanal
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Visualiza las asignaciones de la semana. Si el encargado no puede, puedes solicitar dirigir las del día de hoy.
            </p>
        </div>
         <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={goToPreviousWeek} size="icon" aria-label="Semana anterior">
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" onClick={goToCurrentWeek} className="px-3 text-xs md:text-sm whitespace-nowrap">
                <CalendarClockIcon className="mr-2 h-4 w-4" /> Volver a Hoy
            </Button>
            <Button variant="outline" onClick={goToNextWeek} size="icon" aria-label="Semana siguiente">
                <ChevronRight className="h-5 w-5" />
            </Button>
            <Button variant="default" onClick={handleGenerateImage} disabled={isGeneratingImage}>
                {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ImageIcon className="mr-2 h-4 w-4" />}
                Generar Imagen
            </Button>
        </div>
      </div>
      
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-semibold font-headline text-primary">
            {weekTitle}
        </h2>
      </div>

      {isLoading ? (
         <div className="flex items-center justify-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentWeekDays.map(day => {
            const assignmentsForDay = assignments.filter(assign =>
                isSameDay(parse(assign.date, "yyyy-MM-dd", new Date()), day) && assign.status === 'accepted'
            ).sort((a,b) => a.time.localeCompare(b.time));

            const isActualCurrentDay = isSameDay(day, today); 

            return (
                <Card key={day.toISOString()} className={`shadow-md hover:shadow-lg transition-shadow flex flex-col ${isActualCurrentDay ? 'border-primary border-2' : 'border-border'}`}>
                <CardHeader className={`pb-3 rounded-t-lg ${isActualCurrentDay ? 'bg-primary/10' : 'bg-muted/30'}`}>
                    <CardTitle className="text-base md:text-lg font-semibold">
                    {format(day, "EEEE, dd 'de' MMMM", { locale: es })}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 flex-grow">
                    {assignmentsForDay.length > 0 ? (
                    assignmentsForDay.map(assign => (
                       <div key={assign.id} className="p-3 border rounded-lg shadow-sm bg-card hover:bg-muted/20 transition-colors flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <PreachingTypeIcon type={assign.type} className="text-primary h-5 w-5" />
                              <span className="font-bold text-base">{assign.time}</span>
                            </div>
                            <Badge variant="outline" className="capitalize">{assign.type}</Badge>
                          </div>
                          <div className="pl-1 space-y-2 text-sm">
                            <p className="flex items-start">
                              <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground shrink-0" />
                              <span className="font-semibold text-primary">{assign.locationName}</span>
                            </p>
                            {assign.type !== 'zoom' && (
                              <p className="flex items-start">
                                <Home className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground shrink-0" />
                                <span>
                                  {assign.casaName || 'Casa no especificada'}<br/>
                                  <span className="text-xs text-muted-foreground">{assign.casaAddress || 'Dirección no disponible'}</span>
                                </span>
                              </p>
                            )}
                            <p className="flex items-start">
                              <User className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground shrink-0" />
                              <span className="font-semibold">{assign.userName || 'No asignado'}</span>
                            </p>
                          </div>
                          <div className="mt-auto pt-2">
                            {isActualCurrentDay && assign.userId !== userProfile?.firebaseAuthUid && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs hover:bg-primary/10 hover:border-primary hover:text-primary"
                                onClick={() => handleRequestToLead(assign)}
                              >
                                <ChevronRight className="mr-1.5 h-3.5 w-3.5" /> Solicitar Dirigir
                              </Button>
                            )}
                            {assign.userId === userProfile?.firebaseAuthUid && (
                              <p className="text-xs text-green-600 font-medium bg-green-500/10 p-1.5 rounded-md text-center">
                                Tú eres el encargado actual.
                              </p>
                            )}
                          </div>
                        </div>
                    ))
                    ) : (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-4">No hay asignaciones para este día.</p>
                    )}
                </CardContent>
                </Card>
            );
            })}
        </div>
      )}

      {selectedAssignmentToLead && (
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="h-6 w-6 mr-2 text-amber-500" />
                Confirmar Encargo de Predicación
              </AlertDialogTitle>
              <AlertDialogDescription className="pt-2">
                Estás a punto de asumir la dirección de la predicación para:
                <br />
                <span className="font-semibold text-foreground">{selectedAssignmentToLead.locationName}</span> el <span className="font-semibold text-foreground">{format(parse(selectedAssignmentToLead.date, "yyyy-MM-dd", new Date()), "EEEE dd/MM", { locale: es })} a las {selectedAssignmentToLead.time}</span>.
                <br /><br />
                Al aceptar, serás el encargado y responsable de enviar el reporte al finalizar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDialog}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmLead} className="bg-primary hover:bg-primary/90">
                Aceptar y Dirigir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <WeeklyScheduleImage 
        ref={imageRef}
        weekDays={currentWeekDays}
        assignments={assignments}
        weekTitle={weekTitle}
        groupOrganizedDays={groupOrganizedDays}
      />
    </div>
  );
}
