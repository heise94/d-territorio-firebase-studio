import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";
import { AppLogo } from "@/components/layout/app-logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface InvitationPageProps {
  params: {
    token: string;
  };
}

export default function InvitationPage({ params }: InvitationPageProps) {
  const { token } = params;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-xl rounded-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mb-4 flex justify-center">
             <AppLogo iconSize={40} textSize="text-3xl" />
          </div>
          <CardTitle className="font-headline text-2xl">Aceptar Invitación</CardTitle>
          <CardDescription>Completa tu registro para D-TERRITORIO.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-6 px-6">
          <AcceptInvitationForm token={token} />
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} D-TERRITORIO. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
