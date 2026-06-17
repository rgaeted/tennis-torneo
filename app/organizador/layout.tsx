import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OrganizadorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: jugador } = await supabase
    .from("jugador")
    .select("rol, organizacion_id, organizacion:organizacion_id(id, nombre)")
    .eq("id", user.id)
    .single();

  if (!jugador || (jugador.rol !== "organizador" && jugador.rol !== "admin")) redirect("/");

  const org = (jugador as any).organizacion as { id: string; nombre: string } | null;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-navy-900 border-r border-navy-700 p-4 flex flex-col gap-1">
        <div className="mb-5">
          <p className="text-xs font-bold text-court uppercase tracking-widest">MisTorneos.cl</p>
          <p className="text-xs text-slate-400 mt-0.5 font-medium truncate">{org?.nombre ?? "Organización"}</p>
          <p className="text-xs text-slate-600 mt-0.5">Panel organizador</p>
        </div>
        {[
          { href: "/organizador", label: "Torneos" },
          { href: "/organizador/ranking", label: "Ranking" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-navy-800 hover:text-white transition-colors"
          >
            {label}
          </Link>
        ))}
        <div className="mt-auto border-t border-navy-700 pt-3 flex flex-col gap-1">
          {jugador.rol === "admin" && (
            <Link href="/admin" className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-navy-800 hover:text-slate-300 block transition-colors">
              → Panel admin
            </Link>
          )}
          <Link href="/" className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-navy-800 hover:text-slate-300 block transition-colors">
            ← Ver sitio
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
