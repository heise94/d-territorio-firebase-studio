
"use client";

import Image from 'next/image';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, CalendarClock, Home, Users, AlertTriangle, Pencil, Trash2, Ban, Eye, Share2, Building, ShieldCheck, BarChart3 } from "lucide-react";
import type { Territory } from "@/types";
import { ViewImageDialog } from './view-image-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface TerritoryCardProps {
  territory: Territory;
  onEdit: () => void;
  onDelete: () => void;
  onBlockToggle: () => void;
}

export function TerritoryCard({ territory, onEdit, onDelete, onBlockToggle }: TerritoryCardProps) {
  const approxHouseCountDisplay = territory.approxHouseCount ?? territory.blockHouseCounts?.reduce((a, b) => a + b, 0) ?? 'N/A';
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    let textToShare = `Territorio: `;
    if (territory.type === 'urban' && territory.number) {
      textToShare += `U-${territory.number}: `;
    }
    textToShare += `${territory.name}`;

    if (territory.mapImageUrl) {
      textToShare += `\nMapa: ${territory.mapImageUrl}`;
    }

    const shareData: ShareData = {
      title: `Información del Territorio: ${territory.name}`,
      text: textToShare,
      url: territory.mapImageUrl || territory.googleMapsLink || (typeof window !== 'undefined' ? window.location.href : undefined),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({
          title: "Territorio Compartido",
          description: "La información del territorio se ha compartido.",
        });
      } catch (error) {
        console.error("Error al compartir:", error);
        if (error instanceof DOMException && error.name === 'AbortError') {
            toast({
                title: "Compartir Cancelado",
                description: "No se compartió la información del territorio.",
                variant: "default",
            });
        } else {
            try {
                await navigator.clipboard.writeText(textToShare);
                toast({
                    title: "Copiado al Portapapeles",
                    description: "No se pudo compartir, pero la información se copió al portapapeles.",
                });
            } catch (copyError) {
                console.error("Error al copiar al portapapeles:", copyError);
                toast({
                    title: "Error",
                    description: "No se pudo compartir ni copiar la información del territorio.",
                    variant: "destructive",
                });
            }
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToShare);
        toast({
          title: "Copiado al Portapapeles",
          description: "La información del territorio se ha copiado al portapapeles.",
        });
      } catch (error) {
        console.error("Error al copiar al portapapeles:", error);
        toast({
          title: "Error al Copiar",
          description: "No se pudo copiar la información al portapapeles.",
          variant: "destructive",
        });
      }
    }
  };


  return (
    <>
      <Card className={`flex flex-col hover:shadow-xl transition-shadow duration-200 rounded-lg ${territory.isBlocked ? 'opacity-60 bg-muted/50' : 'bg-card'}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-semibold">
              {territory.type === 'urban' && territory.number ? `U-${territory.number}: ` : ''}
              {territory.name}
            </CardTitle>
            <Badge variant={territory.isBlocked ? 'destructive' : 'default'} className="capitalize">
              {territory.isBlocked ? 'Bloqueado' : 'Activo'}
            </Badge>
          </div>
          <CardDescription className="text-xs pt-1 flex items-center">
            <Badge variant="outline" className="mr-2 capitalize">{territory.type}</Badge>
            {territory.lastWorked && (
              <span className="flex items-center"><CalendarClock size={12} className="mr-1 shrink-0" /> Pred. Últ.: {new Date(territory.lastWorked).toLocaleDateString()}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-2 pt-2 text-sm">
          {territory.mapImageUrl && (
            <div className="relative aspect-video w-full rounded-md overflow-hidden mb-2 border">
              <Image
                  src={territory.mapImageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(territory.name)}`}
                  alt={`Mapa de ${territory.name}`}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={territory.dataAiHint || (territory.type === 'urban' ? 'city map' : 'rural landscape')}
              />
            </div>
          )}
           <div className="text-xs space-y-1">
              {territory.totalBlocks !== undefined && <p className="flex items-center"><BarChart3 size={12} className="mr-1.5 shrink-0 text-muted-foreground"/> Manzanas: {territory.totalBlocks}</p>}
              <p className="flex items-center"><Home size={12} className="mr-1.5 shrink-0 text-muted-foreground"/> Casas Aprox: {approxHouseCountDisplay}</p>
              {territory.groupIds && territory.groupIds.length > 0 && (
                  <p className="flex items-center"><Users size={12} className="mr-1.5 shrink-0 text-muted-foreground"/> Grupos: {territory.groupIds.join(', ')}</p>
              )}
              {territory.associatedCasaIds && territory.associatedCasaIds.length > 0 && (
                  <p className="flex items-center"><Building size={12} className="mr-1.5 shrink-0 text-muted-foreground"/> Casas Cercanas: {territory.associatedCasaIds.join(', ')}</p>
              )}
           </div>
           {territory.warnings && territory.warnings.length > 0 && (
              <div className="mt-2">
                  <p className="text-xs font-medium text-amber-600 flex items-center"><AlertTriangle size={12} className="mr-1.5"/> Advertencias:</p>
                  <ul className="list-disc list-inside pl-2 text-xs text-amber-700">
                      {territory.warnings.slice(0, 2).map((warning, idx) => <li key={idx}>{warning}</li>)}
                      {territory.warnings.length > 2 && <li>...y {territory.warnings.length - 2} más.</li>}
                  </ul>
              </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-3 pb-3 flex flex-wrap justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onEdit} aria-label="Editar territorio" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Editar</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={territory.isBlocked ? "secondary" : "outline"}
                size="icon"
                onClick={onBlockToggle}
                aria-label={territory.isBlocked ? "Desbloquear territorio" : "Bloquear territorio"}
                className={`h-8 w-8 ${!territory.isBlocked ? 'hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-600' : 'hover:bg-green-500/10 hover:border-green-500 hover:text-green-600'}`}
              >
                {territory.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{territory.isBlocked ? 'Desbloquear' : 'Bloquear'}</p>
            </TooltipContent>
          </Tooltip>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" aria-label="Eliminar territorio" className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Eliminar</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente el territorio
                  de los registros.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  Sí, eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {territory.mapImageUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setIsImageDialogOpen(true)} aria-label="Ver imagen del mapa" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver Imagen</p>
              </TooltipContent>
            </Tooltip>
          )}
          {territory.googleMapsLink && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => window.open(territory.googleMapsLink, '_blank')} aria-label="Ver en Google Maps" className="h-8 w-8">
                    <MapPin className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver en Google Maps</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleShare} aria-label="Compartir territorio" className="h-8 w-8">
                  <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Compartir</p>
            </TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>
      {territory.mapImageUrl && (
        <ViewImageDialog
          isOpen={isImageDialogOpen}
          onOpenChange={setIsImageDialogOpen}
          imageUrl={territory.mapImageUrl}
          imageAlt={`Mapa de ${territory.name}`}
        />
      )}
    </>
  );
}
