"use client";

import { useState } from "react";
import {
  DIAS_SEMANA,
  HORARIO_DIA_DEFAULT,
  horariosPorDefecto,
  slotsPorDia,
  validarHorariosPorDia,
  type DiaSemana,
  type HorarioDia,
} from "@/lib/scheduling/autoSchedule";

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
  const [horarios, setHorarios] = useState<Record<DiaSemana, HorarioDia>>(horariosPorDefecto);
  const [mostrarHorarios, setMostrarHorarios] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const slotsXDia = numCanchas ? slotsPorDia(numCanchas) : 0;

  function setHorarioDia(key: DiaSemana, campo: keyof HorarioDia, valor: string) {
    setHorarios((prev) => ({
      ...prev,
      [key]: { ...prev[key], [campo]: valor },
    }));
  }

  async function programar() {
    if (!fechaInicio || !fechaFin) return;
    setLoading(true);
    setError(null);
    setOkMsg(null);

    const errorHorarios = validarHorariosPorDia(horarios);
    if (errorHorarios) {
      setLoading(false);
      setError(errorHorarios);
      return;
    }

    const res = await fetch("/api/admin/partidos/programar-automatico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ torneoId, fechaInicio, fechaFin, horariosPorDia: horarios }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "No se pudo programar el torneo.");
      return;
    }

    const n = json.programados ?? 0;
    if (n === 0) {
      setOkMsg("No había partidos pendientes de programar.");
    } else {
      setOkMsg(`${n} partido${n !== 1 ? "s" : ""} programado${n !== 1 ? "s" : ""} correctamente.`);
      onSuccess(n);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Programar automáticamente</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Reserva cancha y horario para <strong className="text-slate-400">todo el torneo</strong> (todas las categorías y rondas).
            Partidos de 90 min con descanso de un slot entre rondas del mismo cuadro.
            {numCanchas ? ` ${numCanchas} cancha${numCanchas !== 1 ? "s" : ""} (~${slotsXDia} partidos/día con horario por defecto).` : ""}
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

          <div className="border border-navy-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setMostrarHorarios((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-300 hover:bg-navy-800/50 transition-colors"
            >
              <span>Horarios por día de la semana</span>
              <span className="text-slate-500 text-xs">{mostrarHorarios ? "▲" : "▼"}</span>
            </button>

            {mostrarHorarios && (
              <div className="px-3 pb-3 space-y-2 border-t border-navy-800">
                <p className="text-[11px] text-slate-600 pt-2 leading-relaxed">
                  Primer y último horario de inicio por día (ej. jueves desde las 17:00).
                </p>
                {DIAS_SEMANA.map(({ key, label }) => (
                  <div key={key} className="grid grid-cols-[72px_1fr_1fr] gap-2 items-center text-xs">
                    <span className="text-slate-400">{label}</span>
                    <div>
                      <label className="text-[10px] text-slate-600 block mb-0.5">Desde</label>
                      <input
                        type="time"
                        value={horarios[key].inicio}
                        onChange={(e) => setHorarioDia(key, "inicio", e.target.value)}
                        className="w-full px-2 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-court"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 block mb-0.5">Hasta</label>
                      <input
                        type="time"
                        value={horarios[key].fin ?? HORARIO_DIA_DEFAULT.fin}
                        onChange={(e) => setHorarioDia(key, "fin", e.target.value)}
                        className="w-full px-2 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-court"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2.5">
              <p className="text-red-300 text-xs font-medium mb-0.5">No se pudo programar</p>
              <p className="text-red-400 text-xs leading-relaxed">{error}</p>
            </div>
          )}
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
