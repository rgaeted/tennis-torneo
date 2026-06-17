"use client";
import { useState } from "react";

type Props = {
  partidoId: string;
  jugador1: string;
  jugador2: string;
  horaInicioActual: string | null;
  canchaActual: string | null;
  numCanchas?: number;
  onClose: () => void;
  onSuccess: () => void;
};

export function ProgramarModal({ partidoId, jugador1, jugador2, horaInicioActual, canchaActual, numCanchas, onClose, onSuccess }: Props) {
  const toLocalDate = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toISOString().slice(0, 10);
  };
  const toLocalTime = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toTimeString().slice(0, 5);
  };

  const [fecha, setFecha] = useState(toLocalDate(horaInicioActual));
  const [hora, setHora] = useState(toLocalTime(horaInicioActual));
  const [cancha, setCancha] = useState(canchaActual ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setLoading(true);
    setError(null);

    const horaInicio = fecha && hora ? `${fecha}T${hora}:00` : null;

    const res = await fetch(`/api/admin/partidos/${partidoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horaInicio, cancha: cancha || null }),
    });

    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error); return; }
    onSuccess();
  }

  const inputClass = "w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-lg font-bold">Programar partido</h2>
            <p className="text-sm text-slate-400 mt-0.5">{jugador1} vs {jugador2}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Hora</label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Cancha</label>
            {numCanchas && numCanchas > 0 ? (
              <select
                value={cancha}
                onChange={(e) => setCancha(e.target.value)}
                className={inputClass}
              >
                <option value="">Sin asignar</option>
                {Array.from({ length: numCanchas }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>Cancha {n}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={cancha}
                onChange={(e) => setCancha(e.target.value)}
                placeholder="Ej: 1, Central, Roja..."
                className={inputClass}
              />
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
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
  );
}
