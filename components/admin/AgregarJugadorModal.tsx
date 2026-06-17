"use client";
import { useState } from "react";

type Jugador = { id: string; nombre: string; apellido: string };

interface Props {
  cuadroId: string;
  partidoId: string;
  slot: "jugador1_id" | "jugador2_id";
  jugadoresDisponibles: Jugador[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AgregarJugadorModal({ cuadroId, partidoId, slot, jugadoresDisponibles, onClose, onSuccess }: Props) {
  const [jugadorId, setJugadorId] = useState(jugadoresDisponibles[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAgregar() {
    if (!jugadorId) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/cuadros/agregar-jugador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuadroId, partidoId, jugadorId, slot }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error); setLoading(false); return; }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-navy-900 border border-navy-700 rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg mb-4">Agregar jugador al cuadro</h3>

        {jugadoresDisponibles.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay jugadores inscritos disponibles para agregar.</p>
        ) : (
          <>
            <label className="block text-xs text-slate-400 mb-2">Seleccionar jugador</label>
            <select
              value={jugadorId}
              onChange={(e) => setJugadorId(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court mb-4"
            >
              {jugadoresDisponibles.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre} {j.apellido}
                </option>
              ))}
            </select>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button
              onClick={handleAgregar}
              disabled={loading}
              className="w-full py-2 bg-court text-white font-bold rounded-lg hover:bg-court-dark disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? "Agregando..." : "Agregar al cuadro"}
            </button>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
