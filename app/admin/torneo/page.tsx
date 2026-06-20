import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const ESTADO_COLORS: Record<string, string> = {
  borrador: "text-slate-400",
  activo: "text-court",
  cerrado: "text-red-400",
};

const PAGO_COLORS: Record<string, string> = {
  pagado: "bg-court/20 text-court",
  pendiente: "bg-ball/20 text-ball",
  rechazado: "bg-red-900/40 text-red-400",
};

export default async function TorneosPage() {
  const supabase = await createClient();
  const { data: torneos } = await supabase
    .from("torneo")
    .select(`*, inscripciones:inscripcion(id, categoria, estado_pago, monto)`)
    .order("anio", { ascending: false })
    .order("edicion", { ascending: false });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Torneos</h1>
        <Link
          href="/admin/torneo/nuevo"
          className="px-4 py-2 bg-court text-white font-bold rounded-lg hover:bg-court-dark text-sm transition-colors"
        >
          + Nuevo torneo
        </Link>
      </div>
      <div className="space-y-3">
        {(torneos ?? []).map((t) => {
          const inscripciones: { id: string; categoria: string; estado_pago: string; monto: number }[] =
            (t as any).inscripciones ?? [];
          const total = inscripciones.length;
          const pagados = inscripciones.filter((i) => i.estado_pago === "pagado").length;
          const pendientes = inscripciones.filter((i) => i.estado_pago === "pendiente").length;
          const recaudado = inscripciones
            .filter((i) => i.estado_pago === "pagado")
            .reduce((sum, i) => sum + i.monto, 0);

          const porCategoria = inscripciones.reduce<Record<string, number>>((acc, i) => {
            acc[i.categoria] = (acc[i.categoria] ?? 0) + 1;
            return acc;
          }, {});

          return (
            <Link
              key={t.id}
              href={`/admin/torneo/${t.id}`}
              className="flex gap-4 bg-navy-900 border border-navy-700 rounded-xl overflow-hidden hover:border-navy-600 transition-colors"
            >
              {(t as any).imagen_url ? (
                <img
                  src={(t as any).imagen_url}
                  alt={t.nombre}
                  className="w-20 object-cover flex-shrink-0 self-stretch"
                />
              ) : (
                <div className="w-20 bg-navy-800 flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0 py-3 pr-5">
                {/* Fila superior: nombre + estado */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium truncate">{t.nombre}</span>
                  <span className={`text-sm font-medium capitalize flex-shrink-0 ${ESTADO_COLORS[t.estado] ?? ""}`}>
                    {t.estado}
                  </span>
                </div>

                <div className="text-sm text-slate-500 mb-2">
                  Edición {t.edicion} · {t.anio} · ${t.monto_inscripcion?.toLocaleString("es-CL")}
                </div>

                {total > 0 ? (
                  <div className="space-y-2">
                    {/* Contadores */}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="text-slate-300 font-medium">{total} inscritos</span>
                      {pagados > 0 && (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${PAGO_COLORS.pagado}`}>
                          {pagados} pagado{pagados !== 1 ? "s" : ""}
                        </span>
                      )}
                      {pendientes > 0 && (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${PAGO_COLORS.pendiente}`}>
                          {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
                        </span>
                      )}
                      {recaudado > 0 && (
                        <span className="text-slate-400">
                          ${recaudado.toLocaleString("es-CL")} recaudado
                        </span>
                      )}
                    </div>

                    {/* Categorías */}
                    {Object.keys(porCategoria).length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.entries(porCategoria)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([cat, count]) => (
                            <span
                              key={cat}
                              className="text-xs px-2 py-0.5 bg-navy-800 border border-navy-700 rounded-full text-slate-400 capitalize"
                            >
                              {cat} ({count})
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">Sin inscripciones</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
