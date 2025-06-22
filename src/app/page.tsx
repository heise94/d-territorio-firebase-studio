"use client";
import { LoginForm } from "@/components/auth/login-form";
import { AppLogo } from "@/components/layout/app-logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || (!loading && user)) {
    return (
      <div className="flex h-screen min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl rounded-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mb-4 flex justify-center">
            <AppLogo iconSize={40} textSize="text-3xl" />
          </div>
          <CardTitle className="font-headline text-2xl">Bienvenido</CardTitle>
          <CardDescription>Inicia sesión para administrar los territorios.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-6 px-6">
          <LoginForm />
        </CardContent>
      </Card>
       <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} D-TERRITORIO. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
