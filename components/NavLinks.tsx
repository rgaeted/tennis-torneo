"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavLinks({ rol, isLoggedIn }: { rol?: string; isLoggedIn?: boolean }) {
  const path = usePathname();

  const links = [
    { href: "/", label: "Inicio" },
    { href: "/#torneos", label: "Torneos" },
    { href: "/#organizadores", label: "Organizar" },
    ...(isLoggedIn
      ? [{ href: "/mis-partidos", label: "Mis partidos" }]
      : []),
    ...(rol === "admin" || rol === "turno"
      ? [{ href: "/turno", label: "Control" }]
      : []),
    ...(rol === "organizador"
      ? [{ href: "/organizador", label: "Mi organización" }]
      : []),
    ...(rol === "admin"
      ? [{ href: "/admin", label: "Admin" }]
      : []),
  ];

  const isLiveActive = path.startsWith("/live");

  return (
    <nav className="hidden md:flex items-center gap-7">
      {links.map(({ href, label }) => {
        const base = href.split("#")[0];
        const isActive = base === "/" ? path === "/" : path.startsWith(base);
        return (
          <Link
            key={href}
            href={href}
            style={{ color: isActive ? "#C8FF00" : "#888" }}
            className="text-sm font-medium hover:text-white transition-colors"
          >
            {label}
          </Link>
        );
      })}

      {/* En Vivo — siempre visible */}
      <Link
        href="/live"
        className="flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: isLiveActive ? "#C8FF00" : "#888" }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        En Vivo
      </Link>
    </nav>
  );
}
