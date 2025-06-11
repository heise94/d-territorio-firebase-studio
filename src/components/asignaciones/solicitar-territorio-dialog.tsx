
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { UserAssignment, AdditionalTerritoryInfo, Territory, TerritoryType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Users, MountainSnow, CheckCircle, PlusCircle, Compass, ListChecks, Home as HomeIcon, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import Link from "next/link"; // Import Link for external URLs

// MOCK SUGGESTIONS - Replace with actual AI flow call later
const MOCK_TERRITORY_SUGGESTIONS: AdditionalTerritoryInfo[] = [
  {
    id: "T-ADD1",
    name: "Residencial Las Flores",
    number: "105B",
    type: "urban",
    mapImageUrl: "https://placehold.co/600x400.png?text=Flores+Parcial",
    dataAiHint: "residential map",
    isPartial: true,
    pendingBlockNumbers: [3, 5],
    approxPendingHousesCount: 23,
    blockHouseCounts: [0,0,15,0,8,0] // Example: Original counts, M3 & M5 pending
  },
  {
    id: "T-ADD2",
    name: "Vereda El Encanto",
    type: "rural",
    mapImageUrl: "https://placehold.co/600x400.png?text=Encanto+Rural",
    totalBlocks: 3,
    dataAiHint: "rural road",
    isPartial: false,
    approxHouseCount: 25
  },
  {
    id: "T-ADD3",
    name: "Centro Comercial",
    number: "201A",
    type: "urban",
    mapImageUrl: "https://placehold.co/600x400.png?text=Centro+Comercial",
    totalBlocks: 2,
    dataAiHint: "city center",
    isPartial: false,
    approxHouseCount: 30
  },
];


interface SolicitarTerritorioDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  assignment: UserAssignment | null;
  onTerritorySelected: (selectedTerritory: AdditionalTerritoryInfo) => void;
}

export function SolicitarTerritorioDialog({
  isOpen,
  onOpenChange,
  assignment,
  onTerritorySelected,
}: SolicitarTerritorioDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestedTerritories, setSuggestedTerritories] = useState<AdditionalTerritoryInfo[]>([]);

  useEffect(() => {
    if (isOpen && assignment) {
      setIsLoadingSuggestions(true);
      setTimeout(() => {
        setSuggestedTerritories(MOCK_TERRITORY_SUGGESTIONS);
        setIsLoadingSuggestions(false);
      }, 1000);
    } else if (!isOpen) {
        setSuggestedTerritories([]);
    }
  }, [isOpen, assignment]);

  const handleSelectTerritory = async (territory: AdditionalTerritoryInfo) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onTerritorySelected(territory);
    setIsSubmitting(false);
    onOpenChange(false);
  };


  if (!assignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Compass className="mr-2 h-6 w-6 text-primary" />
            Solicitar Territorio Adicional
          </DialogTitle>
          <DialogDescription>
            Tu asignación actual es para: <span className="font-semibold text-foreground">{assignment.locationName}</span>.
            Selecciona un territorio adicional si necesitas cubrir más.
          </DialogDescription>
        </DialogHeader>

        {isLoadingSuggestions ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Buscando sugerencias de territorios...</p>
          </div>
        ) : suggestedTerritories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <MapPin className="h-16 w-16 text-muted-foreground/70 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No hay sugerencias disponibles</p>
                <p className="text-sm text-muted-foreground">
                    No se encontraron territorios adicionales adecuados en este momento.
                </p>
            </div>
        ) : (
          <div className="py-4 space-y-6">
            <h3 className="text-lg font-medium text-center text-muted-foreground">Sugerencias de Territorios Adicionales:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedTerritories.map((terr) => (
                <Card key={terr.id} className="hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                        {terr.name}
                        <Badge variant={terr.type === 'urban' ? 'secondary' : 'outline'} className="capitalize text-xs">
                            {terr.type === 'urban' ? <Users className="mr-1 h-3 w-3"/> : <MountainSnow className="mr-1 h-3 w-3"/>}
                            {terr.type} {terr.number ? ` #${terr.number}`: ''}
                        </Badge>
                    </CardTitle>
                     {terr.isPartial && (
                        <CardDescription className="text-xs text-amber-600 pt-0.5 font-semibold">
                            Territorio parcialmente trabajado
                        </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2 text-xs">
                    {terr.mapImageUrl && (
                      <a
                        href={terr.mapImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative aspect-video w-full rounded-md overflow-hidden border group cursor-pointer"
                        title="Haz clic para agrandar el mapa"
                      >
                        <Image
                            src={terr.mapImageUrl}
                            alt={`Mapa de ${terr.name}`}
                            layout="fill"
                            objectFit="cover"
                            data-ai-hint={terr.dataAiHint || "map"}
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <ExternalLink className="h-8 w-8 text-white" />
                        </div>
                      </a>
                    )}
                    {terr.isPartial ? (
                        <>
                            {terr.pendingBlockNumbers && terr.pendingBlockNumbers.length > 0 && (
                                <p><span className="font-medium flex items-center"><ListChecks size={12} className="mr-1.5 shrink-0"/> Manzanas pendientes:</span> {terr.pendingBlockNumbers.join(', ')}</p>
                            )}
                            {terr.approxPendingHousesCount !== undefined && (
                                <p><span className="font-medium flex items-center"><HomeIcon size={12} className="mr-1.5 shrink-0"/> Casas totales aprox. (pendientes):</span> {terr.approxPendingHousesCount}</p>
                            )}
                        </>
                    ) : (
                        <>
                           <p><span className="font-medium flex items-center"><Users size={12} className="mr-1.5 shrink-0"/> Manzanas Totales:</span> {terr.totalBlocks || 'N/A'}</p>
                           <p><span className="font-medium flex items-center"><HomeIcon size={12} className="mr-1.5 shrink-0"/> Casas Totales Aprox:</span> {terr.approxHouseCount || 'N/A'}</p>
                        </>
                    )}
                  </CardContent>
                  <DialogFooter className="p-3 border-t mt-auto">
                    <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleSelectTerritory(terr)}
                        disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                      Seleccionar Este
                    </Button>
                  </DialogFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="pt-6 border-t mt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting || isLoadingSuggestions}>
              Cancelar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
