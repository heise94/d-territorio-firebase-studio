
"use client";

import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, CalendarClock, Home, Users, AlertTriangle, Pencil, Trash2, Ban, CheckCircle2, Eye, Share2, Link as LinkIcon, BarChart3, Building } from "lucide-react"; // Added Building icon
import type { Territory } from "@/types";

interface TerritoryCardProps {
  territory: Territory;
  onEdit: () => void;
  onDelete: () => void; 
  onBlockToggle: () => void;
}

export function TerritoryCard({ territory, onEdit, onDelete, onBlockToggle }: TerritoryCardProps) {
  const approxHouseCountDisplay = territory.approxHouseCount ?? territory.blockHouseCounts?.reduce((a, b) => a + b, 0) ?? 'N/A';

  return (
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
                data-ai-hint={territory.type === 'urban' ? 'city map' : 'rural landscape'}
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
      <CardFooter className="border-t pt-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} className="text-xs col-span-1">
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
        </Button>
        <Button
          variant={territory.isBlocked ? "secondary" : "outline"}
          size="sm"
          onClick={onBlockToggle}
          className={`text-xs col-span-1 ${!territory.isBlocked ? 'hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-600' : 'hover:bg-green-500/10 hover:border-green-500 hover:text-green-600'}`}
        >
          {territory.isBlocked ? <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> : <Ban className="mr-1.5 h-3.5 w-3.5" />}
          {territory.isBlocked ? 'Desbloq.' : 'Bloquear'}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="text-xs col-span-1">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente el territorio
                de los registros (simulación por ahora).
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
             <Button variant="outline" size="sm" onClick={() => window.open(territory.mapImageUrl, '_blank')} className="text-xs col-span-1">
                <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver Imagen
            </Button>
        )}
        {territory.googleMapsLink && (
            <Button variant="outline" size="sm" onClick={() => window.open(territory.googleMapsLink, '_blank')} className="text-xs col-span-1">
                <MapPin className="mr-1.5 h-3.5 w-3.5" /> Ver Mapa
            </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => alert('Función "Compartir" no implementada.')} className="text-xs col-span-1">
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Compartir
        </Button>
      </CardFooter>
    </Card>
  );
}
