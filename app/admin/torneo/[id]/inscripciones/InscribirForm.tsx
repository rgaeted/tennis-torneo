"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Jugador = { id: string; nombre: string; apellido: string; categoria_habitual: string | null };
type Categoria = "cuarta" | "tercera" | "segunda" | "primera" | "damas" | "dobles";

export default function InscribirForm({
  torneoId,
  jugadores,
  montoDefault,
  categorias,
}: {
  torneoId: string;
  jugadores: Jugador[];
  montoDefault: number;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [jugadorId, setJugadorId] = useState("");
  const [categoria, setCategoria] = useState<Categoria>((categorias[0] ?? "primera") as Categoria);
  const [estadoPago, setEstadoPago] = useState<"pagado" | "pendiente">("pagado");
  const [monto, setMonto] = useState(String(montoDefault));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jugadoresFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return jugadores.filter(
      (j) =>
        j.nombre.toLowerCase().includes(q) ||
        j.apellido.toLowerCase().includes(q)
    );
  }, [busqueda, jugadores]);

  const jugadorSeleccionado = jugadores.find((j) => j.id === jugadorId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jugadorId) { setError("Selecciona un jugador"); return; }
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/inscripciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ torneoId, jugadorId, categoria, estadoPago, monto }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) { setError(json.error); return; }

    setOpen(false);
    setBusqueda("");
    setJugadorId("");
    setCategoria("primera");
    setEstadoPago("pagado");
    setMonto(String(montoDefault));
    router.refresh();
  }

  const selectClass = "w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-court text-white text-sm font-medium rounded-lg hover:bg-court-dark transition-colors"
      >
        + Inscribir jugador
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">Inscribir jugador</h2>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Búsqueda de jugador */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Jugador</label>
                {jugadorSeleccionado ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-navy-950 border border-court rounded-lg">
                    <span className="text-sm text-white">
                      {jugadorSeleccionado.apellido}, {jugadorSeleccionado.nombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setJugadorId(""); setBusqueda(""); }}
                      className="text-slate-500 hover:text-white text-xs ml-2"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Buscar por nombre o apellido..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-court"
                      autoFocus
                    />
                    {busqueda && (
                      <div className="max-h-48 overflow-y-auto bg-navy-950 border border-navy-700 rounded-lg divide-y divide-navy-800">
                        {jugadoresFiltrados.length === 0 ? (
                          <p className="text-slate-500 text-sm px-3 py-2">Sin resultados</p>
                        ) : (
                          jugadoresFiltrados.slice(0, 20).map((j) => (
                            <button
                              key={j.id}
                              type="button"
                              onClick={() => { setJugadorId(j.id); setBusqueda(""); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-navy-800 transition-colors"
                            >
                              <span className="text-white">{j.apellido}, {j.nombre}</span>
                              {j.categoria_habitual && (
                                <span className="text-slate-500 text-xs ml-2 capitalize">{j.categoria_habitual}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                  {(["pagado", "pendiente"] as const).map((ep) => (
                    <button
                      key={ep}
                      type="button"
                      onClick={() => setEstadoPago(ep)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                        estadoPago === ep
                          ? ep === "pagado"
                            ? "border-court bg-court/20 text-court"
                            : "border-ball bg-ball/20 text-ball"
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
                  required
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 border border-navy-700 rounded-lg text-sm text-slate-400 hover:border-navy-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !jugadorId}
                  className="flex-1 py-2 bg-court text-white rounded-lg text-sm font-bold hover:bg-court-dark disabled:opacity-40 transition-colors"
                >
                  {loading ? "Inscribiendo..." : "Inscribir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
