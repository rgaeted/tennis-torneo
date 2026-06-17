import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const ESTADO_COLOR: Record<string, string> = {
  activo: "#C8FF00",
  cerrado: "#555",
  borrador: "#888",
};

export default async function OrganizadorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: jugador } = await supabase
    .from("jugador")
    .select("organizacion_id")
    .eq("id", user.id)
    .single();

  if (!jugador?.organizacion_id) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Torneos</h1>
        <p className="text-slate-500 text-sm">No tienes una organización asignada.</p>
      </div>
    );
  }

  const { data: torneos } = await supabase
    .from("torneo")
    .select("id, nombre, edicion, anio, estado, fecha_inicio, fecha_fin, club:club_id(nombre)")
    .eq("organizacion_id", jugador.organizacion_id)
    .order("anio", { ascending: false })
    .order("edicion", { ascending: false });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Torneos</h1>
      </div>

      {(torneos ?? []).length === 0 ? (
        <div
          style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
          className="rounded-xl px-6 py-10 text-center"
        >
          <p style={{ color: "#555" }} className="text-sm">
            No hay torneos asignados a tu organización aún.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(torneos ?? []).map((t) => (
            <Link
              key={t.id}
              href={`/organizador/torneo/${t.id}`}
              style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
              className="flex items-center justify-between rounded-xl px-5 py-4 hover:border-[#C8FF00]/40 transition-colors group"
            >
              <div>
                <p className="text-white font-medium group-hover:text-[#C8FF00] transition-colors">
                  {t.nombre}
                </p>
                <p style={{ color: "#555" }} className="text-xs mt-0.5">
                  Ed. {t.edicion} · {t.anio} · {(t as any).club?.nombre}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span style={{ color: "#555" }} className="text-xs">
                  {t.fecha_inicio ? new Date(t.fecha_inicio).toLocaleDateString("es-CL") : ""}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{
                    color: ESTADO_COLOR[t.estado] ?? "#555",
                    backgroundColor: `${ESTADO_COLOR[t.estado] ?? "#555"}15`,
                  }}
                >
                  {t.estado}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
