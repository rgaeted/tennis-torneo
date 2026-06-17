import type { Database } from "@/lib/supabase/types";

type Inscripcion = Database["public"]["Tables"]["inscripcion"]["Row"] & {
  jugador: { nombre: string; apellido: string; } | null;
};

const ESTADO_COLORS: Record<string, string> = {
  pagado: "bg-court/20 text-court",
  pendiente: "bg-ball/20 text-ball",
  rechazado: "bg-red-900/40 text-red-400",
};

export function InscripcionTable({ inscripciones }: { inscripciones: Inscripcion[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-700 text-slate-500 text-left">
            <th className="pb-3 pr-4">Jugador</th>
            <th className="pb-3 pr-4">Categoría</th>
            <th className="pb-3 pr-4">Monto</th>
            <th className="pb-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-800">
          {inscripciones.map((i) => (
            <tr key={i.id}>
              <td className="py-3 pr-4">
                {i.jugador?.nombre} {i.jugador?.apellido}
              </td>
              <td className="py-3 pr-4 capitalize">{i.categoria}</td>
              <td className="py-3 pr-4">${i.monto}</td>
              <td className="py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[i.estado_pago] ?? ""}`}>
                  {i.estado_pago}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {inscripciones.length === 0 && (
        <p className="text-center text-slate-600 py-8">Sin inscripciones aún.</p>
      )}
    </div>
  );
}
