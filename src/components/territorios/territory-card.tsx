
"use client";

import Image from 'next/image';
import { useState, useMemo } from 'react'; // Added useMemo
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, CalendarClock, Home, Users, AlertTriangle, Pencil, Trash2, Ban, Eye, Share2, Building, ShieldCheck, BarChart3, MessageSquareWarning } from "lucide-react";
import type { Territory, Casa, PreachingGroup } from "@/types"; // Added Casa, PreachingGroup
import { ViewImageDialog } from './view-image-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface TerritoryCardProps {
  territory: Territory;
  onEdit: () => void;
  onDelete: () => void;
  onBlockToggle: () => void; 
  canManage: boolean; 
  canViewBlockDetails: boolean; 
  availableCasas: Casa[]; // Added prop
  availableGroups: PreachingGroup[]; // Added prop
}

export function TerritoryCard({ 
    territory, 
    onEdit, 
    onDelete, 
    onBlockToggle, 
    canManage, 
    canViewBlockDetails,
    availableCasas,
    availableGroups 
}: TerritoryCardProps) {
  const approxHouseCountDisplay = territory.approxHouseCount ?? territory.blockHouseCounts?.reduce((a, b) => a + b, 0) ?? 'N/A';
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const { toast } = useToast();

  const getCasaNamesByIds = (ids?: string[]): string => {
    if (!ids || ids.length === 0) return 'N/A';
    return ids.map(id => availableCasas.find(casa => casa.id === id)?.ownerName || id).join(', ');
  };

  const getGroupNamesByIds = (ids?: string[]): string => {
    if (!ids || ids.length === 0) return 'N/A';
    return ids.map(id => availableGroups.find(group => group.id === id)?.name || id).join(', ');
  };

  const groupLabel = useMemo(() => {
    if (!territory.groupIds || territory.groupIds.length === 0) return "Grupos";
    return territory.groupIds.length === 1 ? "Grupo" : "Grupos";
  }, [territory.groupIds]);


  const handleShare = async () => {
    let textToShare = `Territorio: `;
    if (territory.type === 'urban' && territory.number) {
      textToShare += `U-${territory.number}: `;
    }
    textToShare += `${territory.name}`;

    if (territory.mapImageUrl) {
      textToShare += `\nMapa: ${territory.mapImageUrl}`;
    } else if (territory.googleMapsLink) {
      textToShare += `\nMapa: ${territory.googleMapsLink}`;
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
      } catch (error: any) {
        console.error("navigator.share() falló. Error:", error);
        if (error.name === 'AbortError') {
          toast({
            title: "Compartir Cancelado",
            description: "No se compartió la información del territorio.",
            variant: "default",
          });
        } else {
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textToShare)}`;
          window.open(whatsappUrl, '_blank');
          toast({
            title: "Compartir Directo Falló",
            description: "No se pudo usar la función nativa. Intentando abrir WhatsApp.",
          });
        }
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textToShare)}`;
      window.open(whatsappUrl, '_blank');
      toast({
        title: "Abriendo WhatsApp",
        description: "Compartir nativo no disponible. Intentando abrir WhatsApp.",
      });
    }
  };

  const showBlockedState = territory.isBlocked && canViewBlockDetails;

  return (
    <>
      <Card className={`flex flex-col hover:shadow-xl transition-shadow duration-200 rounded-lg ${showBlockedState ? 'bg-muted/50' : 'bg-card'}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-semibold">
              {territory.type === 'urban' && territory.number ? `U-${territory.number}: ` : ''}
              {territory.name}
            </CardTitle>
            {showBlockedState && (
              <Badge variant='destructive' className="capitalize">
                Bloqueado
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs pt-1 flex items-center">
            <Badge variant="outline" className="mr-2 capitalize">{territory.type}</Badge>
            {territory.lastWorked && (
              <span className="flex items-center"><CalendarClock size={12} className="mr-1 shrink-0" /> Pred. Últ.: {new Date(territory.lastWorked).toLocaleDateString()}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className={`flex-grow space-y-2 pt-2 text-sm ${showBlockedState && !canManage ? 'opacity-70' : ''}`}>
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
                  <p className="flex items-center"><Users size={12} className="mr-1.5 shrink-0 text-muted-foreground"/> {groupLabel}: {getGroupNamesByIds(territory.groupIds)}</p>
              )}
              {territory.associatedCasaIds && territory.associatedCasaIds.length > 0 && (
                  <p className="flex items-center"><Building size={12} className="mr-1.5 shrink-0 text-muted-foreground"/> Casas Cercanas: {getCasaNamesByIds(territory.associatedCasaIds)}</p>
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
          {showBlockedState && territory.blockReason && (
             <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-xs font-medium text-destructive flex items-center"><MessageSquareWarning size={13} className="mr-1.5"/> Razón Bloqueo:</p>
                <p className="text-xs text-destructive/90 italic">{territory.blockReason}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className={`border-t pt-3 pb-3 flex flex-wrap justify-center gap-1 ${showBlockedState && !canManage ? 'opacity-80 pointer-events-none' : ''}`}>
          {canManage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar territorio" className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Editar</p></TooltipContent>
            </Tooltip>
          )}

          {canManage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBlockToggle}
                  aria-label={territory.isBlocked ? "Desbloquear territorio" : "Bloquear territorio"}
                  className={`h-8 w-8 ${!territory.isBlocked ? 'text-amber-600 hover:bg-amber-500/10' : 'text-green-600 hover:bg-green-500/10'}`}
                >
                  {territory.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{territory.isBlocked ? 'Desbloquear' : 'Bloquear'}</p></TooltipContent>
            </Tooltip>
          )}

          {canManage && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Eliminar territorio" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Eliminar</p></TooltipContent>
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
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Sí, eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {territory.mapImageUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setIsImageDialogOpen(true)} aria-label="Ver imagen del mapa" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Ver Imagen</p></TooltipContent>
            </Tooltip>
          )}
          {territory.googleMapsLink && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => window.open(territory.googleMapsLink, '_blank')} aria-label="Ver en Google Maps" className="h-8 w-8">
                    <MapPin className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Ver en Google Maps</p></TooltipContent>
            </Tooltip>
          )}
           {(navigator.share || (typeof window !== 'undefined' && 'Clipboard' in window) ) && ( 
            <Tooltip>
                <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Compartir territorio" className="h-8 w-8">
                    <Share2 className="h-4 w-4" />
                </Button>
                </TooltipTrigger>
                <TooltipContent>
                <p>Compartir</p>
                </TooltipContent>
            </Tooltip>
            )}
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

