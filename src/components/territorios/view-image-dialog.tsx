
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogFooter, // Added DialogFooter
} from "@/components/ui/dialog";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X, ZoomIn } from "lucide-react";

interface ViewImageDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  imageUrl: string;
  imageAlt: string;
}

export function ViewImageDialog({
  isOpen,
  onOpenChange,
  imageUrl,
  imageAlt,
}: ViewImageDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center text-lg">
            <ZoomIn className="mr-2 h-5 w-5 text-primary" />
            Vista Previa del Mapa
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-0.5">
            {imageAlt}
          </DialogDescription>
        </DialogHeader>
        <div className="p-2 md:p-4">
          <div className="relative w-full aspect-[4/3] max-h-[75vh] bg-muted/30 rounded-md overflow-hidden">
            <Image
              src={imageUrl}
              alt={imageAlt}
              layout="fill"
              objectFit="contain"
            />
          </div>
        </div>
        <DialogFooter className="p-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">
              <X className="mr-2 h-4 w-4" /> Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
