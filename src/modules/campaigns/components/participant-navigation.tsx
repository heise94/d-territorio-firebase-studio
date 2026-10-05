import Link from "next/link";
import { Bell, CalendarDays, Home, Info, ListChecks } from "lucide-react";

export function ParticipantNavigation({
  active,
}: {
  active: "Inicio" | "Disponibilidad" | "Mi programa" | "Avisos";
}) {
  const items = [
    { label: "Inicio", icon: Home, href: "/campanas" },
    {
      label: "Disponibilidad",
      icon: CalendarDays,
      href: "/campanas/disponibilidad",
    },
    { label: "Mi programa", icon: ListChecks, href: "/campanas/mi-programa" },
    { label: "Avisos", icon: Bell, href: "/campanas/avisos" },
    { label: "Información", icon: Info },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-slate-200 bg-white px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
      aria-label="Navegación principal de Campañas"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map(({ label, icon: Icon, href }) => {
          const content = (
            <>
              <Icon className="mb-1 h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </>
          );
          const classes = `flex min-h-14 flex-col items-center justify-center rounded-xl px-1 text-xs font-semibold ${active === label ? "bg-teal-100 text-teal-800" : "text-slate-600"}`;
          return href ? (
            <Link
              key={label}
              href={href}
              prefetch={false}
              aria-current={active === label ? "page" : undefined}
              className={`${classes} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700`}
            >
              {content}
            </Link>
          ) : (
            <span key={label} className={classes} aria-disabled="true">
              {content}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
