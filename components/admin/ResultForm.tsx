"use client";
import { useState } from "react";

interface Jugador { id: string; nombre: string; apellido: string; }

interface Props {
  partidoId: string;
  jugador1: Jugador;
  jugador2: Jugador;
  onSuccess: () => void;
}

export function ResultForm({ partidoId, jugador1, jugador2, onSuccess }: Props) {
  const [ganadorId, setGanadorId] = useState(jugador1.id);
  const [sets, setSets] = useState([{ j1: "", j2: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const resultado = sets.map((s) => ({ j1: Number(s.j1), j2: Number(s.j2) }));

    const res = await fetch("/api/admin/resultados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partidoId, ganadorId, resultado }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error); setLoading(false); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-navy-900 rounded-xl border border-navy-700">
      <h3 className="font-semibold text-sm">
        {jugador1.nombre} {jugador1.apellido} vs {jugador2.nombre} {jugador2.apellido}
      </h3>

      <div>
        <label className="block text-xs text-slate-400 mb-2">Ganador</label>
        <div className="flex gap-2">
          {[jugador1, jugador2].map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => setGanadorId(j.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                ganadorId === j.id
                  ? "border-court bg-court/20 text-court"
                  : "border-navy-700 text-slate-400 hover:border-navy-600"
              }`}
            >
              {j.nombre} {j.apellido}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-2">Sets</label>
        <div className="space-y-2">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-12">Set {i + 1}</span>
              <input
                type="number" min={0} max={7} value={s.j1} placeholder="J1"
                onChange={(e) => setSets(sets.map((x, j) => j === i ? { ...x, j1: e.target.value } : x))}
                className="w-16 px-2 py-1 bg-navy-800 border border-navy-700 rounded text-sm text-center text-white"
              />
              <span className="text-slate-600">–</span>
              <input
                type="number" min={0} max={7} value={s.j2} placeholder="J2"
                onChange={(e) => setSets(sets.map((x, j) => j === i ? { ...x, j2: e.target.value } : x))}
                className="w-16 px-2 py-1 bg-navy-800 border border-navy-700 rounded text-sm text-center text-white"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSets([...sets, { j1: "", j2: "" }])}
          className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          + Agregar set
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-court text-white font-bold rounded-lg text-sm hover:bg-court-dark disabled:opacity-50 transition-colors"
      >
        {loading ? "Guardando..." : "Confirmar resultado"}
      </button>
    </form>
  );
}
