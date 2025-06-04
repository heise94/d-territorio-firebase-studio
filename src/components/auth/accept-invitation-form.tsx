"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import type { UserProfile } from "@/types";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
    .regex(/[a-z]/, { message: "Debe contener al menos una letra minúscula."})
    .regex(/[A-Z]/, { message: "Debe contener al menos una letra mayúscula."})
    .regex(/[0-9]/, { message: "Debe contener al menos un número."}),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

interface AcceptInvitationFormProps {
  token: string;
}

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    async function verifyToken() {
      setCheckingToken(true);
      setError(null);
      if (!token) {
        setError("Token de invitación no proporcionado.");
        setCheckingToken(false);
        return;
      }
      if (!db || Object.keys(db).length === 0) {
        setError("Error de configuración de base de datos.");
        setCheckingToken(false);
        return;
      }
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("invitationToken", "==", token), where("invitationStatus", "==", "pending"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Token de invitación inválido, expirado o ya utilizado.");
          setUserData(null);
        } else {
          // Assuming token is unique, so only one doc should match
          const userDoc = querySnapshot.docs[0];
          setUserData({ id: userDoc.id, ...userDoc.data() } as UserProfile);
        }
      } catch (e) {
        console.error("Error verifying token:", e);
        setError("Error al verificar el token. Por favor, inténtalo de nuevo más tarde.");
        setUserData(null);
      } finally {
        setCheckingToken(false);
      }
    }
    verifyToken();
  }, [token]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userData || !userData.email || !userData.name) {
        toast({ title: "Error de Usuario", description: "No se pudo encontrar la información del usuario para esta invitación.", variant: "destructive" });
        return;
    }
    if (!auth || Object.keys(auth).length === 0) {
        toast({ title: "Error de Configuración", description: "Firebase Auth no está inicializado.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, values.password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: userData.name });
      }

      const userDocRef = doc(db, "users", userData.id);
      // It's possible the email is already in use if something went wrong previously or if the user exists.
      // createUserWithEmailAndPassword will throw 'auth/email-already-in-use'.
      // If successful, update Firestore.
      
      // Check if another user already has this firebaseAuthUid (should not happen with new user creation)
      const existingUserWithUidQuery = query(collection(db, "users"), where("firebaseAuthUid", "==", firebaseUser.uid));
      const existingUserDocs = await getDocs(existingUserWithUidQuery);
      if (!existingUserDocs.empty && existingUserDocs.docs.some(d => d.id !== userData.id)) {
          throw new Error("Este UID de Firebase ya está asignado a otro perfil de D-TERRITORIO.");
      }

      await updateDoc(userDocRef, {
        firebaseAuthUid: firebaseUser.uid,
        invitationStatus: "accepted",
        invitationToken: null, 
        status: "Activo",
        updatedAt: serverTimestamp(),
      });

      toast({ title: "¡Cuenta Activada!", description: "Tu cuenta ha sido activada exitosamente. Serás redirigido al dashboard." });
      router.push("/dashboard");

    } catch (error: any) {
      console.error("Invitation acceptance error", error);
      let errorMessage = "Error al activar la cuenta.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya está registrado en Firebase Authentication. Si ya tienes una cuenta, intenta iniciar sesión. Si olvidaste tu contraseña, contacta al administrador.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "La contraseña es demasiado débil. Asegúrate de que cumpla los requisitos.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      toast({ title: "Error de Activación", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (checkingToken) {
    return <div className="flex flex-col justify-center items-center py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" /> 
        <p className="text-muted-foreground">Verificando invitación...</p>
    </div>;
  }

  if (error || !userData) {
    return <div className="text-center py-6">
        <p className="text-destructive font-medium text-lg">No se pudo validar la invitación</p>
        <p className="text-muted-foreground mt-2">{error || "El token proporcionado no es válido o ya ha sido utilizado."}</p>
        <Button onClick={() => router.push('/login')} className="mt-6">Volver a Inicio de Sesión</Button>
    </div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="text-center mb-4">
            <p className="text-xl font-semibold font-headline">¡Bienvenido, {userData.name}!</p>
            <p className="text-sm text-muted-foreground">Estás a un paso de activar tu cuenta. Por favor, crea una contraseña para tu email: <span className="font-medium text-foreground">{userData.email}</span>.</p>
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nueva Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
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
                <Input type="password" placeholder="Repite tu contraseña" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Activar Cuenta y Entrar
        </Button>
      </form>
    </Form>
  );
}
