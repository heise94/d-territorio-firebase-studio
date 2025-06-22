
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { AppLogo } from "@/components/layout/app-logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import Link from 'next/link';

const formSchema = z.object({
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (!emailParam) {
      setError("No se proporcionó un email en la invitación. Por favor, contacta al administrador.");
    } else {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!email) {
      toast({ title: "Error", description: "Email no encontrado.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, values.password);
      const authUser = userCredential.user;

      // 2. Find the user profile in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("No se encontró un perfil de usuario para este email. Contacta al administrador.");
      }

      // 3. Update the Firestore document with the new Auth UID and set status to 'Activo'
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, "users", userDoc.id), {
        firebaseAuthUid: authUser.uid,
        status: 'Activo',
        updatedAt: new Date(),
      });
      
      toast({ title: "¡Cuenta Activada!", description: "Tu cuenta ha sido creada y activada. ¡Bienvenido!" });
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Invitation acceptance error:", error);
      let errorMessage = "Ocurrió un error inesperado.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya ha sido registrado. Por favor, inicia sesión.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
      }
      toast({ title: "Error al Activar Cuenta", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <Card className="w-full max-w-md shadow-xl rounded-lg">
        <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="font-headline text-2xl text-destructive">Enlace de Invitación Inválido</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button asChild>
                <Link href="/">Ir a la página de inicio</Link>
            </Button>
        </CardContent>
      </Card>
    );
  }

  if (!email) {
    return <Loader2 className="h-16 w-16 animate-spin text-primary" />;
  }

  return (
    <Card className="w-full max-w-md shadow-xl rounded-lg">
      <CardHeader className="text-center space-y-2">
        <div className="mb-4 flex justify-center">
          <AppLogo iconSize={40} textSize="text-3xl" />
        </div>
        <CardTitle className="font-headline text-2xl">Activa tu Cuenta</CardTitle>
        <CardDescription>
          Estás activando la cuenta para <span className="font-semibold text-foreground">{email}</span>. Crea una contraseña para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 pb-6 px-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Cuenta y Entrar
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitationPage() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <Suspense fallback={<Loader2 className="h-16 w-16 animate-spin text-primary" />}>
                <AcceptInvitationContent />
            </Suspense>
        </div>
    );
}
