import { createAdminClient } from "@/lib/supabase/server";
import RolSelector from "./RolSelector";

export default async function AdminJugadoresPage() {
  const admin = createAdminClient();

  const { data: jugadores } = await admin
    .from("jugador")
    .select("id, nombre, apellido, categoria_habitual, rol")
    .order("apellido")
    .order("nombre") as any;

  const ROL_LABEL: Record<string, string> = {
    admin: "Admin",
    jugador: "Jugador",
    turno: "Turno",
  };

  const ROL_COLOR: Record<string, string> = {
    admin: "text-ball",
    jugador: "text-slate-400",
    turno: "text-court",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Jugadores</h1>
      <p className="text-slate-500 text-sm mb-6">
        Gestión de roles · <span className="text-court">Turno</span> puede actualizar cualquier marcador ·{" "}
        <span className="text-ball">Admin</span> tiene acceso completo
      </p>

      <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-0 text-xs text-slate-500 uppercase tracking-wider px-5 py-3 border-b border-navy-800">
          <span />
          <span>Jugador</span>
          <span>Categoría</span>
          <span>Rol actual</span>
          <span />
        </div>

        <div className="divide-y divide-navy-800">
          {((jugadores ?? []) as any[]).map((j) => (
            <div
              key={j.id}
              className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-5 py-2.5"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full overflow-hidden bg-navy-800 border border-navy-700 flex-shrink-0 flex items-center justify-center">
                {(j as any).foto_url ? (
                  <img src={(j as any).foto_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">
                {j.apellido}, {j.nombre}
              </span>
              <span className="text-sm text-slate-500 capitalize">
                {j.categoria_habitual ?? "—"}
              </span>
              <span className={`text-sm font-semibold ${ROL_COLOR[j.rol] ?? "text-slate-400"}`}>
                {ROL_LABEL[j.rol] ?? j.rol}
              </span>
              <RolSelector jugadorId={j.id} rolActual={j.rol as "admin" | "jugador" | "turno"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
