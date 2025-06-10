
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MiActividadRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/mi-actividad/asignaciones');
  }, [router]);
  return (
    <div className="flex h-screen items-center justify-center">
      <p>Redirigiendo...</p>
    </div>
  );
}
