"use client";

import { useState } from "react";
import { slotsPorDia } from "@/lib/scheduling/autoSchedule";

type Props = {
  torneoId: string;
  fechaInicioDefault?: string;
  fechaFinDefault?: string;
  numCanchas?: number;
  onClose: () => void;
  onSuccess: (programados: number) => void;
};

export function ProgramarAutomaticoModal({
  torneoId,
  fechaInicioDefault = "",
  fechaFinDefault = "",
  numCanchas,
  onClose,
  onSuccess,
}: Props) {
  const [fechaInicio, setFechaInicio] = useState(fechaInicioDefault);
  const [fechaFin, setFechaFin] = useState(fechaFinDefault);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const slotsXDia = numCanchas ? slotsPorDia(numCanchas) : 0;

  async function programar() {
    if (!fechaInicio || !fechaFin) return;
    setLoading(true);
    setError(null);
    setOkMsg(null);

    const res = await fetch("/api/admin/partidos/programar-automatico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ torneoId, fechaInicio, fechaFin }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Error al programar");
      return;
    }

    const n = json.programados ?? 0;
    if (n === 0) {
      setOkMsg("No había partidos pendientes de programar.");
    } else {
      setOkMsg(`${n} partido${n !== 1 ? "s" : ""} programado${n !== 1 ? "s" : ""} correctamente.`);
    }
    onSuccess(n);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Programar automáticamente</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Reserva cancha y horario para <strong className="text-slate-400">todo el torneo</strong> (todas las categorías y rondas) en un solo paso.
            Se mezclan categorías para no dejar canchas vacías. Entre un partido y el siguiente del mismo cuadro hay un slot de descanso (90 min).
            Los partidos duran 90 min, de 09:00 a 21:00. Se reemplazan horarios de partidos pendientes.
            {numCanchas ? ` El club tiene ${numCanchas} cancha${numCanchas !== 1 ? "s" : ""} (${slotsXDia} partidos por día).` : ""}
          </p>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              min={fechaInicio}
              className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {okMsg && <p className="text-court text-xs font-medium">{okMsg}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-navy-700 rounded-lg text-sm text-slate-400 hover:border-navy-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={programar}
              disabled={loading || !fechaInicio || !fechaFin}
              className="flex-1 py-2 bg-court text-black font-bold rounded-lg text-sm hover:opacity-90 disabled:opacity-40 transition-colors"
            >
              {loading ? "Programando..." : "Programar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
