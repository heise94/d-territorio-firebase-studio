import Link from "next/link";

export default function ParticipantRecoveryPage() {
  return (
    <main className="mx-auto max-w-md space-y-5 px-5 py-10">
      <h1 className="text-2xl font-bold">¿No recuerdas tu PIN?</h1>
      <p className="leading-7">
        Contacta a la organización o al coordinador. Te ayudarán a recuperar el
        acceso después de confirmar tu identidad por un medio externo.
      </p>
      <p className="leading-7">
        Tú eliges el nuevo PIN. El cambio invalida las sesiones anteriores y
        deberás ingresar nuevamente. No enviamos códigos SMS ni usamos preguntas
        de seguridad.
      </p>
      <Link
        className="inline-flex min-h-12 items-center rounded-xl bg-teal-700 px-4 font-semibold text-white"
        href="/campanas/ingresar"
      >
        Volver a ingresar
      </Link>
    </main>
  );
}
