import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const ESTADO_COLORS: Record<string, string> = {
  borrador: "text-slate-500 border-slate-700",
  activo: "text-court border-court",
  cerrado: "text-red-400 border-red-800",
};

const ESTADO_BG: Record<string, string> = {
  borrador: "bg-slate-800/30",
  activo: "bg-court/10",
  cerrado: "bg-red-900/10",
};

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: torneos } = await supabase
    .from("torneo")
    .select("id, nombre, edicion, anio, estado, monto_inscripcion, fecha_inicio, fecha_fin")
    .order("anio", { ascending: false })
    .order("edicion", { ascending: false });

  // Fetch inscriptions and cuadros for all torneos in parallel
  const torneoIds = (torneos ?? []).map((t) => t.id);

  const [{ data: inscripciones }, { data: cuadros }] = await Promise.all([
    torneoIds.length
      ? supabase.from("inscripcion").select("torneo_id, estado_pago").in("torneo_id", torneoIds)
      : Promise.resolve({ data: [] }),
    torneoIds.length
      ? supabase.from("cuadro").select("torneo_id, categoria").in("torneo_id", torneoIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Group by torneo
  const statsPorTorneo = (torneos ?? []).map((t) => {
    const ins = (inscripciones ?? []).filter((i) => i.torneo_id === t.id);
    const cats = (cuadros ?? []).filter((c) => c.torneo_id === t.id);
    return {
      ...t,
      total: ins.length,
      pagados: ins.filter((i) => i.estado_pago === "pagado").length,
      pendientes: ins.filter((i) => i.estado_pago === "pendiente").length,
      cuadros: cats.length,
      categorias: cats.map((c) => c.categoria),
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/admin/torneo/nuevo"
          className="px-4 py-2 bg-court text-white font-bold rounded-lg hover:bg-court-dark text-sm transition-colors"
        >
          + Nuevo torneo
        </Link>
      </div>

      {statsPorTorneo.length === 0 ? (
        <p className="text-slate-500">No hay torneos creados aún.</p>
      ) : (
        <div className="space-y-5">
          {statsPorTorneo.map((t) => (
            <div
              key={t.id}
              className={`border rounded-2xl overflow-hidden ${ESTADO_BG[t.estado]} border-navy-700`}
            >
              {/* Header del torneo */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-bold text-lg">{t.nombre}</h2>
                    <span className={`text-xs font-semibold uppercase tracking-wider border rounded-full px-2.5 py-0.5 ${ESTADO_COLORS[t.estado]}`}>
                      {t.estado}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-0.5">
                    Edición {t.edicion} · {t.anio} · ${t.monto_inscripcion.toLocaleString("es-CL")}
                  </p>
                </div>
                <Link
                  href={`/admin/torneo/${t.id}`}
                  className="text-sm text-slate-400 hover:text-white border border-navy-700 hover:border-navy-500 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Gestionar →
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 divide-x divide-navy-800">
                <div className="px-6 py-4">
                  <div className="text-3xl font-bold text-white">{t.total}</div>
                  <div className="text-slate-500 text-xs mt-1">Inscritos</div>
                </div>
                <div className="px-6 py-4">
                  <div className="text-3xl font-bold text-court">{t.pagados}</div>
                  <div className="text-slate-500 text-xs mt-1">Pagaron</div>
                </div>
                <div className="px-6 py-4">
                  <div className="text-3xl font-bold text-ball">{t.pendientes}</div>
                  <div className="text-slate-500 text-xs mt-1">Pendientes</div>
                </div>
                <div className="px-6 py-4">
                  <div className="text-3xl font-bold text-white">{t.cuadros}</div>
                  <div className="text-slate-500 text-xs mt-1">Cuadros</div>
                </div>
              </div>

              {/* Accesos rápidos */}
              <div className="flex gap-2 px-6 py-3 border-t border-navy-800">
                <Link
                  href={`/admin/torneo/${t.id}/inscripciones`}
                  className="text-xs text-slate-400 hover:text-white bg-navy-800 hover:bg-navy-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Inscripciones
                </Link>
                <Link
                  href={`/admin/torneo/${t.id}/cuadros`}
                  className="text-xs text-slate-400 hover:text-white bg-navy-800 hover:bg-navy-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cuadros
                </Link>
                <Link
                  href={`/admin/torneo/${t.id}/partidos`}
                  className="text-xs text-slate-400 hover:text-white bg-navy-800 hover:bg-navy-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Partidos
                </Link>
                {t.categorias.length > 0 && (
                  <div className="ml-auto flex gap-1.5 items-center">
                    {t.categorias.map((c) => (
                      <span key={c} className="text-xs text-slate-600 capitalize">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
