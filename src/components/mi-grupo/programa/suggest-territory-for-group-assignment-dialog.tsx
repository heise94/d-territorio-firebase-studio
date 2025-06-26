
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
import type { GroupAssignment, AdditionalTerritoryInfo, Territory, TerritoryType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin as MapPinIcon, Users, MountainSnow, CheckCircle, Compass, ListChecks, Home as HomeIcon, ExternalLink } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCardDescription } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";


interface SuggestTerritoryForGroupAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  groupAssignment: GroupAssignment | null;
  currentGroupId: string; 
  onTerritorySelected: (selectedTerritory: AdditionalTerritoryInfo, groupAssignmentContext: GroupAssignment) => void;
}

export function SuggestTerritoryForGroupAssignmentDialog({
  isOpen,
  onOpenChange,
  groupAssignment,
  currentGroupId,
  onTerritorySelected,
}: SuggestTerritoryForGroupAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestedTerritories, setSuggestedTerritories] = useState<AdditionalTerritoryInfo[]>([]);

  useEffect(() => {
    if (isOpen && groupAssignment && currentGroupId) {
      const fetchSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
          if (!db) throw new Error("Firestore not initialized");

          const territoriesRef = collection(db, "territories");
          const preachingTypeForQuery = groupAssignment.preachingType === 'rural' ? 'rural' : 'urban';
          
          const q = query(
            territoriesRef,
            where("isBlocked", "==", false),
            where("type", "==", preachingTypeForQuery)
          );
          
          const querySnapshot = await getDocs(q);
          const allTerritories: Territory[] = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Territory));

          const groupTerritories = allTerritories.filter(t => t.groupIds?.includes(currentGroupId));
          const otherTerritories = allTerritories.filter(t => !t.groupIds?.includes(currentGroupId));
          
          const suggestions = [...groupTerritories, ...otherTerritories]
            .filter(t => t.id !== groupAssignment.assignedTerritoryId)
            .slice(0, 5)
            .map(t => ({
              id: t.id,
              name: t.name,
              number: t.number,
              type: t.type,
              mapImageUrl: t.mapImageUrl,
              dataAiHint: t.dataAiHint,
              totalBlocks: t.totalBlocks,
              isPartial: false,
              approxHouseCount: t.approxHouseCount,
              blockHouseCounts: t.blockHouseCounts,
            }));

          setSuggestedTerritories(suggestions);
        } catch (error) {
          console.error("Error fetching territory suggestions:", error);
          toast({ title: "Error", description: "No se pudieron cargar las sugerencias de territorios.", variant: "destructive" });
        } finally {
          setIsLoadingSuggestions(false);
        }
      };
      fetchSuggestions();
    } else if (!isOpen) {
      setSuggestedTerritories([]);
    }
  }, [isOpen, groupAssignment, currentGroupId, toast]);

  const handleSelectTerritory = async (territory: AdditionalTerritoryInfo) => {
    if (!groupAssignment) return;
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    onTerritorySelected(territory, groupAssignment);
    setIsSubmitting(false);
  };


  if (!groupAssignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Compass className="mr-2 h-6 w-6 text-primary" />
            Sugerir Territorio para Asignación de Grupo
          </DialogTitle>
          <ShadCardDescription> 
            Asignación para: <span className="font-semibold text-foreground">{groupAssignment.captainName}</span> el {groupAssignment.date} a las {groupAssignment.time}.
            <br/>
            Selecciona un territorio para esta salida de predicación del grupo.
          </ShadCardDescription>
        </DialogHeader>

        {isLoadingSuggestions ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Buscando sugerencias de territorios para el grupo...</p>
          </div>
        ) : suggestedTerritories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <MapPinIcon className="h-16 w-16 text-muted-foreground/70 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No hay sugerencias disponibles</p>
                <p className="text-sm text-muted-foreground">
                    No se encontraron territorios adecuados para este grupo en este momento.
                </p>
            </div>
        ) : (
          <div className="py-4 space-y-6">
            <h3 className="text-lg font-medium text-center text-muted-foreground">Sugerencias de Territorios para el Grupo:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedTerritories.map((terr) => {
                const displayName = terr.type === 'urban' && terr.number ? `U-${terr.number}` : terr.name;
                return (
                <Card key={terr.id} className="hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                        <span>{displayName}</span>
                        <Badge variant={terr.type === 'urban' ? 'secondary' : 'outline'} className="capitalize text-xs">
                            {terr.type === 'urban' ? <Users className="mr-1 h-3 w-3"/> : <MountainSnow className="mr-1 h-3 w-3"/>}
                            {terr.type}
                        </Badge>
                    </CardTitle>
                     {terr.isPartial && (
                        <ShadCardDescription className="text-xs text-amber-600 pt-0.5 font-semibold">
                            Territorio parcialmente trabajado
                        </ShadCardDescription>
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
                                <p><span className="font-medium flex items-center"><HomeIcon size={12} className="mr-1.5 shrink-0"/> Casas aprox. (pendientes):</span> {terr.approxPendingHousesCount}</p>
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
                      Seleccionar este Territorio
                    </Button>
                  </DialogFooter>
                </Card>
              )})}
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
