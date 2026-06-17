import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  if (jugador?.rol !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-navy-900 border-r border-navy-700 p-4 flex flex-col gap-1">
        <div className="mb-5">
          <p className="text-xs font-bold text-court uppercase tracking-widest">MisTorneos.cl</p>
          <p className="text-xs text-slate-500 mt-0.5">Panel de administración</p>
        </div>
        {[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/torneo", label: "Torneos" },
          { href: "/admin/organizaciones", label: "Organizaciones" },
          { href: "/admin/clubes", label: "Clubes" },
          { href: "/admin/jugadores", label: "Jugadores" },
          { href: "/turno", label: "Control partidos" },
          { href: "/live", label: "En Vivo" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-navy-800 hover:text-white transition-colors"
          >
            {label}
          </Link>
        ))}
        <div className="mt-auto border-t border-navy-700 pt-3">
          <Link href="/" className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-navy-800 hover:text-slate-300 block transition-colors">
            ← Ver sitio
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
