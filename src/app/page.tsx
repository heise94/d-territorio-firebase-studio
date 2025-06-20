
"use client";

import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/layout/app-logo";
import Link from 'next/link';
import { LogIn } from "lucide-react";

export default function TestHomePage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-8">
        <AppLogo iconSize={60} textSize="text-5xl" />
      </div>
      <h1 className="text-4xl font-headline font-bold tracking-tight text-primary mb-6">
        Página de Prueba D-TERRITORIO
      </h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Esta es una página de inicio simplificada para ayudar a diagnosticar problemas con el acceso al dominio.
      </p>
      <Link href="/login" passHref legacyBehavior>
        <Button size="lg" className="text-lg px-8 py-6">
          <LogIn className="mr-2 h-5 w-5" />
          Ir a Iniciar Sesión
        </Button>
      </Link>
      <footer className="absolute bottom-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} D-TERRITORIO. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
