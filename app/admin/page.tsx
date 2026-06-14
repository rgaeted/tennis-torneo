import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: torneos } = await supabase
    .from("torneo")
    .select("id, nombre, edicion, anio, estado")
    .order("anio", { ascending: false })
    .order("edicion", { ascending: false })
    .limit(1);

  const torneo = torneos?.[0];

  let stats = { total: 0, pagados: 0, pendientes: 0 };

  if (torneo) {
    const { data: inscripciones } = await supabase
      .from("inscripcion")
      .select("estado_pago")
      .eq("torneo_id", torneo.id);

    if (inscripciones) {
      stats.total = inscripciones.length;
      stats.pagados = inscripciones.filter((i) => i.estado_pago === "pagado").length;
      stats.pendientes = inscripciones.filter((i) => i.estado_pago === "pendiente").length;
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {torneo ? (
        <>
          <p className="text-gray-400 mb-6">
            Torneo activo: <span className="text-white font-medium">{torneo.nombre}</span>
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Inscriptos", value: stats.total, color: "text-white" },
              { label: "Pagaron", value: stats.pagados, color: "text-green-400" },
              { label: "Pendientes", value: stats.pendientes, color: "text-yellow-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className={`text-4xl font-bold ${color}`}>{value}</div>
                <div className="text-gray-500 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-gray-500">No hay torneos creados aún.</p>
      )}
    </div>
  );
}
