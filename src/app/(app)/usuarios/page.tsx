
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Users, Settings2 } from "lucide-react";
import { InviteUserDialog } from "@/components/usuarios/invite-user-dialog";
import type { UserProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function UsuariosPage() {
  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]); // Simulación, se llenará desde Firestore
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Simulación de usuarios para demostración inicial
  // const [users, setUsers] = useState<UserProfile[]>([
  //   { id: '1', name: 'Juan Pérez', email: 'juan@example.com', role: 'Publicador', status: 'Activo', invitationStatus: 'accepted', firebaseAuthUid: 'uid1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  //   { id: '2', name: 'Ana Gómez', email: 'ana@example.com', role: 'Encargado Territorio', status: 'Activo', invitationStatus: 'accepted', firebaseAuthUid: 'uid2', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  //   { id: '3', name: 'Luis Kato', email: 'luis@example.com', role: 'SS', status: 'Bloqueado', invitationStatus: 'accepted', firebaseAuthUid: 'uid3', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  // ]);

  const handleOpenInviteDialog = () => {
    setIsInviteUserDialogOpen(true);
  };

  const handleManagePermissions = () => {
    toast({
      title: "Próximamente",
      description: "La gestión de permisos de roles estará disponible pronto.",
    });
  };
  
  const handleUserInvited = (invitedUser: Pick<UserProfile, 'name' | 'email' | 'role'>) => {
    // Simulación: Aquí normalmente se generaría el token y se guardaría en Firestore.
    // Por ahora, solo añadimos al estado local para visualización.
    const newUser: UserProfile = {
      id: crypto.randomUUID(),
      ...invitedUser,
      status: 'Activo', // O 'Invitado' si tienes ese estado
      invitationStatus: 'pending',
      createdAt: new (window as any).firebase.firestore.Timestamp(Date.now()/1000,0), // Simulación de Timestamp
      updatedAt: new (window as any).firebase.firestore.Timestamp(Date.now()/1000,0), // Simulación de Timestamp
    };
    setUsers(prev => [...prev, newUser]);
    setIsInviteUserDialogOpen(false);
  };


  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Administra los usuarios, sus roles y permisos en la aplicación.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleManagePermissions} variant="outline" size="lg">
                <Settings2 className="mr-2 h-5 w-5" />
                Permisos de Roles
            </Button>
            <Button onClick={handleOpenInviteDialog} size="lg">
                <PlusCircle className="mr-2 h-5 w-5" />
                Invitar Nuevo Usuario
            </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2">
            <CardDescription>
              {filteredUsers.length > 0
                ? `Mostrando ${filteredUsers.length} de ${users.length} usuario(s) registrados.`
                : users.length > 0 ? "Ningún usuario coincide con la búsqueda."
                : "Actualmente no hay usuarios registrados."
              }
            </CardDescription>
            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre, email o rol..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
              <Users className="h-20 w-20 text-muted-foreground/70 mb-6" />
              <p className="text-xl font-medium text-muted-foreground mb-2">No hay usuarios para mostrar.</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en "Invitar Nuevo Usuario" para registrar el primero.
              </p>
            </div>
          ) : filteredUsers.length === 0 && searchTerm ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-lg border border-dashed">
              <Search className="h-20 w-20 text-muted-foreground/70 mb-6" />
              <p className="text-xl font-medium text-muted-foreground mb-2">Sin resultados</p>
              <p className="text-sm text-muted-foreground">
                No se encontraron usuarios que coincidan con "{searchTerm}".
              </p>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground font-medium text-lg">¡Listado de Usuarios en Construcción!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Aquí se mostrará una tabla responsiva con los usuarios y sus detalles.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                (Nombre, Email, Rol, Grupo, Estado, Estado Invitación, Acciones)
              </p>
              {/* Aquí iría el mapeo de `filteredUsers` a componentes de tabla/tarjeta de usuario */}
            </div>
          )}
        </CardContent>
      </Card>

      <InviteUserDialog
        isOpen={isInviteUserDialogOpen}
        onOpenChange={setIsInviteUserDialogOpen}
        onUserInvited={handleUserInvited}
      />
    </div>
  );
}
