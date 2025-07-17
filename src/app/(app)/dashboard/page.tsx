
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Trash2 as CleaningIcon, Map as TerritoryIcon } from "lucide-react";
import Link from 'next/link';
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants";

interface ModuleCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

const modules: ModuleCardProps[] = [
  {
    title: "Gestión de Territorios",
    description: "Administra territorios, grupos, casas, asignaciones y reportes.",
    href: "/territorios",
    icon: TerritoryIcon,
    permission: PERMISSIONS.VIEW_TERRITORIES,
  },
  {
    title: "Programa de Aseo",
    description: "Organiza los grupos y el calendario semanal de aseo.",
    href: "/cleaning/program",
    icon: CleaningIcon,
    permission: PERMISSIONS.VIEW_CLEANING_PROGRAM,
  },
  // Add new modules here
];

export default function DashboardPage() {
  const { hasPermission } = usePermissions();

  const visibleModules = modules.filter(module => 
    !module.permission || hasPermission(module.permission as any)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Panel de Módulos</h1>
        <p className="text-muted-foreground mt-1">
          Selecciona el módulo con el que deseas trabajar.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleModules.map((module) => (
          <Link key={module.href} href={module.href} passHref>
            <Card className="group flex h-full transform flex-col justify-between overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <module.icon className="mb-4 h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-xl">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm font-semibold text-primary transition-transform duration-300 group-hover:translate-x-1">
                  <span>Acceder al Módulo</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
