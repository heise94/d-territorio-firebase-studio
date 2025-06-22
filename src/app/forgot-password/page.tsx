"use client";

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AppLogo } from "@/components/layout/app-logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MailCheck } from "lucide-react";
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    if (!auth || Object.keys(auth).length === 0) {
      toast({ title: "Error de Configuración", description: "Firebase Auth no está inicializado.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, values.email);
      setEmailSent(true);
      toast({
        title: "Correo Enviado",
        description: `Si hay una cuenta asociada con ${values.email}, se ha enviado un enlace para restablecer la contraseña.`,
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      // We don't want to reveal if an email exists or not, so we show a generic success message
      // This is a common security practice to prevent email enumeration attacks.
      setEmailSent(true);
      toast({
        title: "Correo Enviado",
        description: `Si hay una cuenta asociada con ${values.email}, se ha enviado un enlace para restablecer la contraseña.`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl rounded-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mb-4 flex justify-center">
            <AppLogo iconSize={40} textSize="text-3xl" />
          </div>
          <CardTitle className="font-headline text-2xl">Restablecer Contraseña</CardTitle>
          <CardDescription>
            {emailSent
              ? "Revisa tu bandeja de entrada (y spam) para continuar."
              : "Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-6 px-6">
          {emailSent ? (
            <div className="text-center space-y-4">
              <MailCheck className="mx-auto h-16 w-16 text-primary" />
              <p className="text-muted-foreground">
                El enlace ha sido enviado. Si no lo recibes en unos minutos, revisa tu carpeta de spam.
              </p>
              <Button asChild className="w-full">
                <Link href="/">Volver a Inicio de Sesión</Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="tu@email.com" {...field} autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Enlace de Restablecimiento
                </Button>
                 <div className="text-center text-sm">
                  <Link href="/" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                    Volver a Inicio de Sesión
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
