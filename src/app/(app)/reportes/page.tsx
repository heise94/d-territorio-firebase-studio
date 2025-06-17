
// src/app/(app)/reportes/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader, // Using direct import
  DialogTitle,   // Using direct import
  DialogDescription as DialogDescriptionComponent, // Using direct import to avoid conflict
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, parse, isValid as isDateValid, isWithinInterval, compareDesc, getYear as getYearFromDateFn } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Filter, FileText, Eye, History, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"; // Added AlertTriangle
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions"; // Import usePermissions
import { PERMISSIONS } from "@/lib/constants"; // Import PERMISSIONS


// --- Interfaces de Datos (ejemplos basados en DETALLES_PAGINA_REPORTES.md) ---

interface CampaignAssignment {
  assignedTo: string | null;
  assignedDate: string | null; // "dd/MM/yyyy"
  blocksWorked: string | null;
  blocksPending: string | number | null; // Puede ser string o number
}

interface ReportEntry {
  id: string; // Firestore document ID
  territoryNumber: string;
  lastCompletedHistoric: string; // "dd/MM/yyyy"
  campaigns: CampaignAssignment[];
  completedCurrentCycle: string | null; // "dd/MM/yyyy" o "En curso"
}

// Para la vista de "Registro Detallado"
interface ProcessedDetailedReportView {
  id: string;
  territoryNumber: string;
  status: "Disponible" | "En Curso";
  lastCompletedDate: string; // Fecha histórica si En Curso, fecha de completitud actual si Disponible
  assignedTo?: string | null;
  assignedDate?: string | null;
  blocksWorked?: string | null;
  blocksPending?: string | number | null;
  completedCurrentCycleDisplay: string | null; // Valor original de completedCurrentCycle
  campaignsForHistoryModal: CampaignAssignment[]; // Para el modal de historial
}

// Para la vista "Registro S-13"
interface S13CycleDetail {
  reportId: string; // ID del documento de reporte que representa este ciclo
  territoryNumber: string;
  lastCompletedHistoric: string; // La 'lastCompletedHistoric' del reporte que representa este ciclo
  firstAssignedToInCycle: string | null;
  firstAssignedDateInCycle: string | null;
  dateCycleCompleted: string; // El 'completedCurrentCycle' que tiene la fecha de este ciclo
}


const REPORTS_COLLECTION_NAME = "reports"; // TODO: Asegúrate que coincida con tu colección

export default function ReportesPage() {
  const { toast } = useToast();
  const { hasPermission, isLoadingPermissions } = usePermissions(); // Use permissions hook

  const [activeView, setActiveView] = useState<'detailedReports' | 's13Log'>('detailedReports');
  const [isLoading, setIsLoading] = useState(true); // General data loading
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Estados para los filtros
  const [filterServiceYear, setFilterServiceYear] = useState<string | undefined>("Todos los Años");
  const [filterFromDate, setFilterFromDate] = useState<Date | undefined>();
  const [filterToDate, setFilterToDate] = useState<Date | undefined>();
  const [filterTerritoryNumber, setFilterTerritoryNumber] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");

  // Estados para los datos
  const [allStoredReports, setAllStoredReports] = useState<ReportEntry[]>([]);
  const [processedDetailedData, setProcessedDetailedData] = useState<ProcessedDetailedReportView[]>([]);
  const [processedS13Data, setProcessedS13Data] = useState<S13CycleDetail[]>([]);

  // Estados para modales
  const [selectedReportForCampaignHistory, setSelectedReportForCampaignHistory] = useState<ReportEntry | null>(null);
  const [isCampaignHistoryModalOpen, setIsCampaignHistoryModalOpen] = useState(false);
  
  const [selectedTerritoryS13History, setSelectedTerritoryS13History] = useState<{ territoryNumber: string; cycles: S13CycleDetail[] } | null>(null);
  const [isS13HistoryModalOpen, setIsS13HistoryModalOpen] = useState(false);
  const [s13HistoryModalFilterYear, setS13HistoryModalFilterYear] = useState<string>("Todos los Años");


  // Paginación para S-13
  const [s13CurrentPage, setS13CurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    
    const exampleReports: ReportEntry[] = [
      { id: "rep1", territoryNumber: "001", lastCompletedHistoric: "01/01/2023", campaigns: [{ assignedTo: "Juan Pérez", assignedDate: "15/06/2024", blocksWorked: "5", blocksPending: "2" }], completedCurrentCycle: "En curso" },
      { id: "rep2", territoryNumber: "002", lastCompletedHistoric: "10/03/2023", campaigns: [{ assignedTo: "Ana Gómez", assignedDate: "01/05/2024", blocksWorked: "Todo", blocksPending: "0" }], completedCurrentCycle: "30/05/2024" },
      { id: "rep3", territoryNumber: "001", lastCompletedHistoric: "15/09/2022", campaigns: [{ assignedTo: "Luis Paz", assignedDate: "01/10/2022", blocksWorked: "Todo", blocksPending: "0" }], completedCurrentCycle: "01/01/2023" },
      { id: "rep4", territoryNumber: "003", lastCompletedHistoric: "N/A", campaigns: [{ assignedTo: "Publicador X", assignedDate: "20/06/2024", blocksWorked: "Manzanas 1-3", blocksPending: "Manzanas 4-5" }], completedCurrentCycle: "En curso" },
      { id: "rep5", territoryNumber: "001", lastCompletedHistoric: "10/08/2023", campaigns: [{ assignedTo: "Maria Silva", assignedDate: "15/08/2023", blocksWorked: "Todo", blocksPending: 0 }], completedCurrentCycle: "15/09/2023" },
      { id: "rep6", territoryNumber: "002", lastCompletedHistoric: "30/05/2024", campaigns: [{ assignedTo: "Carlos Lopez", assignedDate: "01/07/2024", blocksWorked: "2", blocksPending: "8" }], completedCurrentCycle: "En curso" },
      { id: "rep7", territoryNumber: "004", lastCompletedHistoric: "05/02/2024", campaigns: [{ assignedTo: "Laura Nuñez", assignedDate: "10/03/2024", blocksWorked: "Todo", blocksPending: 0 }], completedCurrentCycle: "10/04/2024" },
    ];
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    setAllStoredReports(exampleReports);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoadingPermissions && hasPermission(PERMISSIONS.VIEW_REPORTS)) {
      fetchReports();
    } else if (!isLoadingPermissions && !hasPermission(PERMISSIONS.VIEW_REPORTS)) {
      setIsLoading(false); // Not loading data if no permission
    }
  }, [fetchReports, isLoadingPermissions, hasPermission]);

  useEffect(() => {
    let filtered = allStoredReports;
    if (filterTerritoryNumber) {
      filtered = filtered.filter(r => r.territoryNumber.toLowerCase().includes(filterTerritoryNumber.toLowerCase()));
    }
    if (filterAssignedTo) {
      filtered = filtered.filter(r => r.campaigns.some(c => c.assignedTo?.toLowerCase().includes(filterAssignedTo.toLowerCase())));
    }
    if (filterFromDate) {
        filtered = filtered.filter(r => {
            const dateToCheckStr = r.completedCurrentCycle !== "En curso" ? r.completedCurrentCycle : r.campaigns[r.campaigns.length -1]?.assignedDate;
            if (!dateToCheckStr) return false;
            try {
                const dateToCheck = parse(dateToCheckStr, "dd/MM/yyyy", new Date());
                return isDateValid(dateToCheck) && dateToCheck >= filterFromDate;
            } catch { return false; }
        });
    }
    if (filterToDate) {
        filtered = filtered.filter(r => {
            const dateToCheckStr = r.completedCurrentCycle !== "En curso" ? r.completedCurrentCycle : r.campaigns[r.campaigns.length -1]?.assignedDate;
            if (!dateToCheckStr) return false;
            try {
                const dateToCheck = parse(dateToCheckStr, "dd/MM/yyyy", new Date());
                return isDateValid(dateToCheck) && dateToCheck <= filterToDate;
            } catch { return false; }
        });
    }

    const groupedForDetailed: Record<string, ReportEntry[]> = {};
    filtered.forEach(report => {
      if (!groupedForDetailed[report.territoryNumber]) {
        groupedForDetailed[report.territoryNumber] = [];
      }
      groupedForDetailed[report.territoryNumber].push(report);
    });

    const detailedViewData = Object.values(groupedForDetailed).map(territoryEntries => {
      const sortedEntries = [...territoryEntries].sort((a, b) => {
        const dateA = a.completedCurrentCycle !== "En curso" && a.completedCurrentCycle ? parse(a.completedCurrentCycle, "dd/MM/yyyy", new Date()) : (a.campaigns[a.campaigns.length -1]?.assignedDate ? parse(a.campaigns[a.campaigns.length -1].assignedDate!, "dd/MM/yyyy", new Date()) : new Date(0));
        const dateB = b.completedCurrentCycle !== "En curso" && b.completedCurrentCycle ? parse(b.completedCurrentCycle, "dd/MM/yyyy", new Date()) : (b.campaigns[b.campaigns.length -1]?.assignedDate ? parse(b.campaigns[b.campaigns.length -1].assignedDate!, "dd/MM/yyyy", new Date()) : new Date(0));
        if (!isDateValid(dateA)) return 1; 
        if (!isDateValid(dateB)) return -1;
        if (a.completedCurrentCycle === "En curso" && b.completedCurrentCycle !== "En curso") return -1;
        if (b.completedCurrentCycle === "En curso" && a.completedCurrentCycle !== "En curso") return 1;
        return compareDesc(dateA, dateB);
      });
      const mostRecent = sortedEntries[0];
      const lastCampaign = mostRecent.campaigns[mostRecent.campaigns.length - 1];
      const isCompleted = mostRecent.completedCurrentCycle && mostRecent.completedCurrentCycle.toLowerCase() !== "en curso";
      return {
        id: mostRecent.id,
        territoryNumber: mostRecent.territoryNumber,
        status: isCompleted ? "Disponible" : "En Curso",
        lastCompletedDate: mostRecent.lastCompletedHistoric, 
        assignedTo: !isCompleted ? lastCampaign?.assignedTo : undefined,
        assignedDate: !isCompleted ? lastCampaign?.assignedDate : undefined,
        blocksWorked: !isCompleted ? lastCampaign?.blocksWorked : undefined,
        blocksPending: !isCompleted ? lastCampaign?.blocksPending : undefined,
        completedCurrentCycleDisplay: mostRecent.completedCurrentCycle,
        campaignsForHistoryModal: mostRecent.campaigns,
      } as ProcessedDetailedReportView;
    });
    setProcessedDetailedData(detailedViewData);

    let s13Entries: S13CycleDetail[] = [];
    filtered.forEach(report => {
      if (report.completedCurrentCycle && report.completedCurrentCycle !== "En curso") {
        try {
            const completedDate = parse(report.completedCurrentCycle, "dd/MM/yyyy", new Date());
            if (!isDateValid(completedDate)) return;

            if (filterServiceYear && filterServiceYear !== "Todos los Años") {
                const serviceYear = getYearFromDateFn(completedDate);
                if (serviceYear.toString() !== filterServiceYear) return;
            }
            const firstCampaign = report.campaigns[0];
            s13Entries.push({
                reportId: report.id,
                territoryNumber: report.territoryNumber,
                lastCompletedHistoric: report.lastCompletedHistoric,
                firstAssignedToInCycle: firstCampaign?.assignedTo || null,
                firstAssignedDateInCycle: firstCampaign?.assignedDate || null,
                dateCycleCompleted: report.completedCurrentCycle,
            });
        } catch(e){ /*Ignorar errores de parseo para S13*/ }
      }
    });
    s13Entries.sort((a,b) => compareDesc(parse(a.dateCycleCompleted, "dd/MM/yyyy", new Date()), parse(b.dateCycleCompleted, "dd/MM/yyyy", new Date())));
    setProcessedS13Data(s13Entries);

  }, [allStoredReports, filterServiceYear, filterFromDate, filterToDate, filterTerritoryNumber, filterAssignedTo]);

  const handleApplyFilters = () => {
    setS13CurrentPage(1); 
    toast({ title: "Filtros Aplicados", description: "Los reportes han sido actualizados." });
    setIsFilterSheetOpen(false); 
  };

  const handleClearFilters = () => {
    setFilterServiceYear("Todos los Años");
    setFilterFromDate(undefined);
    setFilterToDate(undefined);
    setFilterTerritoryNumber("");
    setFilterAssignedTo("");
    setS13CurrentPage(1);
    toast({ title: "Filtros Limpiados", description: "Se han restablecido los filtros." });
  };

  const s13TotalPages = Math.ceil(processedS13Data.length / ITEMS_PER_PAGE);
  const currentS13PageData = processedS13Data.slice(
    (s13CurrentPage - 1) * ITEMS_PER_PAGE,
    s13CurrentPage * ITEMS_PER_PAGE
  );
  
  const s13HistoryModalYears = useMemo(() => {
    if (!selectedTerritoryS13History) return ["Todos los Años"];
    const years = new Set(selectedTerritoryS13History.cycles.map(cycle => 
        getYearFromDateFn(parse(cycle.dateCycleCompleted, "dd/MM/yyyy", new Date())).toString()
    ));
    return ["Todos los Años", ...Array.from(years).sort((a,b) => b.localeCompare(a))];
  }, [selectedTerritoryS13History]);

  const filteredS13HistoryModalCycles = useMemo(() => {
    if (!selectedTerritoryS13History) return [];
    if (s13HistoryModalFilterYear === "Todos los Años") return selectedTerritoryS13History.cycles;
    return selectedTerritoryS13History.cycles.filter(cycle => 
      getYearFromDateFn(parse(cycle.dateCycleCompleted, "dd/MM/yyyy", new Date())).toString() === s13HistoryModalFilterYear
    );
  }, [selectedTerritoryS13History, s13HistoryModalFilterYear]);

  const handleExportS13Csv = () => {
    if (!hasPermission(PERMISSIONS.EXPORT_REPORTS)) {
      toast({ title: "Permiso Denegado", description: "No tienes permiso para exportar reportes.", variant: "destructive" });
      return;
    }
    if (processedS13Data.length === 0) {
      toast({ title: "Sin Datos", description: "No hay datos S-13 para exportar con los filtros actuales.", variant: "destructive" });
      return;
    }
    toast({ title: "Exportar S-13", description: "Funcionalidad de exportación CSV S-13 pendiente de implementar." });
  };

  const currentCalendarYear = new Date().getFullYear();
  const serviceYears = ["Todos los Años", ...Array.from({length: 5}, (_, i) => (currentCalendarYear - i).toString())];


  if (isLoadingPermissions || isLoading) { // Check both loading states
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Cargando reportes...</p></div>;
  }

  if (!hasPermission(PERMISSIONS.VIEW_REPORTS)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-destructive">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes los permisos necesarios para ver esta sección de reportes.</p>
        <Button onClick={() => window.history.back()}>Volver</Button>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Reporte de Actividad de Territorios</h1>
          <p className="text-sm text-muted-foreground">Consulta y exporta el historial de actividad de los territorios.</p>
        </div>
        <Button onClick={() => setIsFilterSheetOpen(true)} variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </header>

      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filtros de Reportes</SheetTitle>
            <SheetDescription>Define los criterios para tu consulta.</SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="serviceYearFilter" className="text-sm font-medium">Año de Servicio (para S-13)</Label>
              <Select value={filterServiceYear} onValueChange={setFilterServiceYear}>
                <SelectTrigger id="serviceYearFilter">
                  <SelectValue placeholder="Selecciona año" />
                </SelectTrigger>
                <SelectContent>
                  {serviceYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fromDate" className="text-sm font-medium">Desde Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="fromDate" variant="outline" className={cn("w-full justify-start text-left font-normal", !filterFromDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterFromDate ? format(filterFromDate, "PPP", { locale: es }) : <span>dd-mm-aaaa</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterFromDate} onSelect={setFilterFromDate} initialFocus locale={es} weekStartsOn={1} /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label htmlFor="toDate" className="text-sm font-medium">Hasta Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="toDate" variant="outline" className={cn("w-full justify-start text-left font-normal", !filterToDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterToDate ? format(filterToDate, "PPP", { locale: es }) : <span>dd-mm-aaaa</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterToDate} onSelect={setFilterToDate} disabled={(date) => filterFromDate ? date < filterFromDate : false} initialFocus locale={es} weekStartsOn={1} /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label htmlFor="territoryNumberFilter" className="text-sm font-medium">Núm. de Territorio</Label>
              <Input id="territoryNumberFilter" placeholder="Ej: 001" value={filterTerritoryNumber} onChange={(e) => setFilterTerritoryNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assignedToFilter" className="text-sm font-medium">Asignado a</Label>
              <Input id="assignedToFilter" placeholder="Nombre del publicador" value={filterAssignedTo} onChange={(e) => setFilterAssignedTo(e.target.value)} />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={handleClearFilters}>Limpiar Filtros</Button>
            <Button onClick={handleApplyFilters} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Filter className="mr-2 h-4 w-4" /> Aplicar Filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'detailedReports' | 's13Log')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="detailedReports">Registro de Actividad Detallado</TabsTrigger>
          <TabsTrigger value="s13Log">Registro S-13 (Completados)</TabsTrigger>
        </TabsList>
        <TabsContent value="detailedReports" className="mt-4">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Vista Detallada de Actividad</CardTitle>
                <Button onClick={() => setIsFilterSheetOpen(true)} variant="outline" size="sm" className="ml-auto">
                  <Filter className="mr-2 h-3.5 w-3.5" />
                  Filtros
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Núm. Terr.</TableHead>
                    <TableHead>Últ. Completó (Hist.)</TableHead>
                    <TableHead>Asignado a (Actual)</TableHead>
                    <TableHead>Fecha Asig. (Actual)</TableHead>
                    <TableHead>Trabajado (Actual)</TableHead>
                    <TableHead>Pendiente (Actual)</TableHead>
                    <TableHead>Estado Ciclo Actual</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedDetailedData.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.territoryNumber}</TableCell>
                      <TableCell>{report.lastCompletedDate}</TableCell>
                      <TableCell>{report.status === "En Curso" ? (report.assignedTo || '-') : "N/A"}</TableCell>
                      <TableCell>{report.status === "En Curso" ? (report.assignedDate || '-') : "N/A"}</TableCell>
                      <TableCell>{report.status === "En Curso" ? (report.blocksWorked || '-') : "N/A"}</TableCell>
                      <TableCell className={cn(typeof report.blocksPending === 'number' && report.blocksPending > 0 && 'text-red-600 font-semibold')}>
                        {report.status === "En Curso" ? (report.blocksPending ?? '-') : "N/A"}
                      </TableCell>
                      <TableCell>{report.status}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedReportForCampaignHistory(allStoredReports.find(r => r.id === report.id) || null); setIsCampaignHistoryModalOpen(true); }} className="h-7 w-7">
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {processedDetailedData.length === 0 && <TableRow><TableCell colSpan={8} className="h-24 text-center">No hay datos detallados para mostrar con los filtros actuales.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="s13Log" className="mt-4">
          <Card className="shadow-md">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <CardTitle>Vista S-13 (Ciclos Completados)</CardTitle>
                    <CardDescription>Visualiza los ciclos de predicación completados por territorio.</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                    <Button onClick={() => setIsFilterSheetOpen(true)} variant="outline" size="sm">
                        <Filter className="mr-2 h-3.5 w-3.5" />
                        Filtros S-13
                    </Button>
                    <Button onClick={handleExportS13Csv} variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 h-auto text-sm">
                        <FileText className="mr-2 h-4 w-4" /> Exportar S-13 a CSV
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Núm. Terr.</TableHead>
                    <TableHead>Completó Hist. Anterior</TableHead>
                    <TableHead>1er Asignado Ciclo</TableHead>
                    <TableHead>Fecha 1ra Asig. Ciclo</TableHead>
                    <TableHead>Fecha Completó Ciclo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentS13PageData.map((s13) => (
                    <TableRow key={s13.reportId}>
                      <TableCell>{s13.territoryNumber}</TableCell>
                      <TableCell>{s13.lastCompletedHistoric}</TableCell>
                      <TableCell>{s13.firstAssignedToInCycle || '-'}</TableCell>
                      <TableCell>{s13.firstAssignedDateInCycle || '-'}</TableCell>
                      <TableCell>{s13.dateCycleCompleted}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { 
                            const fullHistory = allStoredReports.filter(r => r.territoryNumber === s13.territoryNumber && r.completedCurrentCycle && r.completedCurrentCycle !== "En curso").map(r => ({ reportId: r.id, territoryNumber: r.territoryNumber, lastCompletedHistoric: r.lastCompletedHistoric, firstAssignedToInCycle: r.campaigns[0]?.assignedTo || null, firstAssignedDateInCycle: r.campaigns[0]?.assignedDate || null, dateCycleCompleted: r.completedCurrentCycle! }));
                            setSelectedTerritoryS13History({territoryNumber: s13.territoryNumber, cycles: fullHistory.sort((a,b) => compareDesc(parse(a.dateCycleCompleted, "dd/MM/yyyy", new Date()), parse(b.dateCycleCompleted, "dd/MM/yyyy", new Date())))});
                            setIsS13HistoryModalOpen(true);
                         }} className="h-7 w-7">
                          <History className="h-4 w-4 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                   {currentS13PageData.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay datos S-13 para mostrar con los filtros actuales.</TableCell></TableRow>}
                </TableBody>
              </Table>
              {s13TotalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4 border-t mt-4">
                  <Button variant="outline" size="sm" onClick={() => setS13CurrentPage(p => Math.max(1, p - 1))} disabled={s13CurrentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</Button>
                  <span className="text-sm text-muted-foreground">Página {s13CurrentPage} de {s13TotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setS13CurrentPage(p => Math.min(s13TotalPages, p + 1))} disabled={s13CurrentPage === s13TotalPages}>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal para Historial de Campañas del Ciclo */}
      {selectedReportForCampaignHistory && (
        <Dialog open={isCampaignHistoryModalOpen} onOpenChange={setIsCampaignHistoryModalOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader> 
              <DialogTitle>Historial de Campañas del Ciclo: {selectedReportForCampaignHistory.territoryNumber}</DialogTitle>
              <DialogDescriptionComponent>Detalle de las asignaciones dentro de este ciclo de trabajo.</DialogDescriptionComponent>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto py-4">
              <Table>
                <TableHeader><TableRow><TableHead>Asignado a</TableHead><TableHead>Fecha Asignó</TableHead><TableHead>Trabajado</TableHead><TableHead>Pendiente</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedReportForCampaignHistory.campaigns.map((campaign, index) => (
                    <TableRow key={index}><TableCell>{campaign.assignedTo || '-'}</TableCell><TableCell>{campaign.assignedDate || '-'}</TableCell><TableCell>{campaign.blocksWorked || '-'}</TableCell><TableCell>{campaign.blocksPending ?? '-'}</TableCell></TableRow>
                  ))}
                   {selectedReportForCampaignHistory.campaigns.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No hay campañas en este ciclo.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal para Historial Completo de Ciclos S-13 del Territorio */}
      {selectedTerritoryS13History && (
        <Dialog open={isS13HistoryModalOpen} onOpenChange={setIsS13HistoryModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader> 
              <DialogTitle>Historial S-13 de Ciclos Completados: {selectedTerritoryS13History.territoryNumber}</DialogTitle>
              <DialogDescriptionComponent>Todos los ciclos completados registrados para este territorio.</DialogDescriptionComponent>
               <div className="pt-2">
                    <Label htmlFor="s13HistoryYearFilterModal" className="text-xs">Filtrar por Año de Servicio:</Label>
                    <Select value={s13HistoryModalFilterYear} onValueChange={setS13HistoryModalFilterYear}>
                        <SelectTrigger id="s13HistoryYearFilterModal" className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="Selecciona año" />
                        </SelectTrigger>
                        <SelectContent>
                            {s13HistoryModalYears.map(year => (
                                <SelectItem key={year} value={year} className="text-xs">{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto py-4">
              <Table>
                <TableHeader><TableRow><TableHead>Completó Hist. Ant.</TableHead><TableHead>1er Asignado</TableHead><TableHead>Fecha 1ra Asig.</TableHead><TableHead>Fecha Completó Ciclo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredS13HistoryModalCycles.map((cycle) => (
                    <TableRow key={cycle.reportId}><TableCell>{cycle.lastCompletedHistoric}</TableCell><TableCell>{cycle.firstAssignedToInCycle || '-'}</TableCell><TableCell>{cycle.firstAssignedDateInCycle || '-'}</TableCell><TableCell>{cycle.dateCycleCompleted}</TableCell></TableRow>
                  ))}
                  {filteredS13HistoryModalCycles.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No hay ciclos completados para este territorio/año.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


