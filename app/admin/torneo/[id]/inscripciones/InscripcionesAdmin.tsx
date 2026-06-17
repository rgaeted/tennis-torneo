"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Inscripcion = {
  id: string;
  categoria: string;
  monto: number;
  estado_pago: "pagado" | "pendiente" | "rechazado";
  jugador: { nombre: string; apellido: string } | null;
};

type Categoria = "cuarta" | "tercera" | "segunda" | "primera" | "damas" | "dobles";

const ESTADO_COLORS: Record<string, string> = {
  pagado: "bg-court/20 text-court",
  pendiente: "bg-ball/20 text-ball",
  rechazado: "bg-red-900/40 text-red-400",
};

export default function InscripcionesAdmin({ inscripciones, categorias }: { inscripciones: Inscripcion[]; categorias: Categoria[] }) {
  const router = useRouter();
  const [lista, setLista] = useState<Inscripcion[]>(inscripciones);
  const [editando, setEditando] = useState<Inscripcion | null>(null);
  const [categoria, setCategoria] = useState<Categoria>("primera");
  const [estadoPago, setEstadoPago] = useState<"pagado" | "pendiente" | "rechazado">("pagado");
  const [monto, setMonto] = useState("");
  const [loading, setLoading] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function abrirEdicion(i: Inscripcion) {
    setEditando(i);
    setCategoria(i.categoria as Categoria);
    setEstadoPago(i.estado_pago);
    setMonto(String(i.monto));
    setError(null);
  }

  async function guardar() {
    if (!editando) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/inscripciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inscripcionId: editando.id, categoria, estadoPago, monto }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error); return; }
    setLista((prev) =>
      prev.map((item) =>
        item.id === editando.id
          ? { ...item, categoria, estado_pago: estadoPago, monto: Number(monto) }
          : item
      )
    );
    setEditando(null);
    router.refresh();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta inscripción?")) return;
    setEliminando(id);
    await fetch("/api/admin/inscripciones", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inscripcionId: id }),
    });
    setEliminando(null);
    setLista((prev) => prev.filter((item) => item.id !== id));
    setEditando(null);
    router.refresh();
  }

  if (lista.length === 0) {
    return <p className="text-center text-slate-600 py-12">Sin inscripciones aún.</p>;
  }

  const selectClass = "w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court";

  return (
    <>
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
            {lista.map((i) => (
              <tr
                key={i.id}
                onClick={() => abrirEdicion(i)}
                className="cursor-pointer hover:bg-navy-900/50 transition-colors"
              >
                <td className="py-3 pr-4 font-medium">
                  {i.jugador?.apellido}, {i.jugador?.nombre}
                </td>
                <td className="py-3 pr-4 capitalize text-slate-300">{i.categoria}</td>
                <td className="py-3 pr-4 text-slate-300">${i.monto.toLocaleString("es-CL")}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[i.estado_pago] ?? ""}`}>
                    {i.estado_pago}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de edición */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-bold">Editar inscripción</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {editando.jugador?.apellido}, {editando.jugador?.nombre}
                </p>
              </div>
              <button onClick={() => setEditando(null)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              {/* Categoría */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Categoría</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} className={selectClass}>
                  {categorias.map((c) => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select>
              </div>

              {/* Estado de pago */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Estado de pago</label>
                <div className="flex gap-2">
                  {(["pagado", "pendiente", "rechazado"] as const).map((ep) => (
                    <button
                      key={ep}
                      type="button"
                      onClick={() => setEstadoPago(ep)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                        estadoPago === ep
                          ? ep === "pagado"
                            ? "border-court bg-court/20 text-court"
                            : ep === "pendiente"
                            ? "border-ball bg-ball/20 text-ball"
                            : "border-red-700 bg-red-900/30 text-red-400"
                          : "border-navy-700 text-slate-500 hover:border-navy-600"
                      }`}
                    >
                      {ep}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Monto ($)</label>
                <input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => eliminar(editando.id)}
                  disabled={eliminando === editando.id}
                  className="px-3 py-2 border border-red-900 text-red-500 hover:bg-red-900/20 rounded-lg text-sm transition-colors disabled:opacity-40"
                >
                  {eliminando === editando.id ? "..." : "Eliminar"}
                </button>
                <button
                  onClick={() => setEditando(null)}
                  className="flex-1 py-2 border border-navy-700 rounded-lg text-sm text-slate-400 hover:border-navy-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={loading}
                  className="flex-1 py-2 bg-court text-white rounded-lg text-sm font-bold hover:bg-court-dark disabled:opacity-40 transition-colors"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
