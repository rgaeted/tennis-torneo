"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { suffix: "",               label: "Detalle" },
  { suffix: "/inscripciones", label: "Inscripciones" },
  { suffix: "/cuadros",       label: "Cuadros" },
  { suffix: "/partidos",      label: "Partidos" },
];

export default function TorneoNav({ id }: { id: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-0 border-b border-navy-700 mb-6 -mx-1">
      {TABS.map(({ suffix, label }) => {
        const href = `/admin/torneo/${id}${suffix}`;
        const active = suffix === ""
          ? pathname === href
          : pathname.startsWith(href);

        return (
          <Link
            key={suffix}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-court text-white"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:border-navy-500"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
