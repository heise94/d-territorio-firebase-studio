
"use client";

import type { Territory } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, Home, Users, BarChart3, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ReportTerritoryCardProps {
    territory: Territory;
    status: 'Disponible' | 'En Curso' | 'Bloqueado';
}

export function ReportTerritoryCard({ territory, status }: ReportTerritoryCardProps) {
    const approxHouseCountDisplay = territory.approxHouseCount ?? territory.blockHouseCounts?.reduce((a, b) => a + (b || 0), 0) ?? 'N/A';
    
    const getStatusVariant = () => {
        switch (status) {
            case 'Disponible': return 'default';
            case 'En Curso': return 'secondary';
            case 'Bloqueado': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Card className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-semibold">
                        T-{territory.number || territory.name}
                    </CardTitle>
                    <Badge variant={getStatusVariant()} className="shrink-0">{status}</Badge>
                </div>
                <CardDescription className="text-xs pt-1 line-clamp-1">{territory.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 text-xs text-muted-foreground">
                 {territory.lastWorked && (
                    <p className="flex items-center">
                        <CalendarClock size={12} className="mr-1.5 shrink-0" />
                        <span>Últ. Pred.: {format(parseISO(territory.lastWorked), "dd/MM/yyyy", { locale: es })}</span>
                    </p>
                )}
                 <p className="flex items-center">
                    <BarChart3 size={12} className="mr-1.5 shrink-0" />
                    <span>Manzanas: {territory.totalBlocks ?? 'N/A'}</span>
                 </p>
                 <p className="flex items-center">
                    <Home size={12} className="mr-1.5 shrink-0" />
                    <span>Casas Aprox: {approxHouseCountDisplay}</span>
                 </p>
            </CardContent>
            <CardFooter className="border-t pt-3">
                 <Button variant="outline" size="sm" className="w-full">
                     <Eye className="mr-2 h-4 w-4" /> Ver Historial
                 </Button>
            </CardFooter>
        </Card>
    );
}
