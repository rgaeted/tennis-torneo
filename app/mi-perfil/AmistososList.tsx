"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Amistoso = {
  id: string;
  retador_id: string;
  cancha: string | null;
  fecha_hora: string | null;
  estado: string;
  partido_id: string | null;
  created_at: string;
  retador: { nombre: string; apellido: string } | null;
  rival: { nombre: string; apellido: string } | null;
  club: { nombre: string } | null;
};

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-ball/20 text-ball",
  aceptado: "bg-court/20 text-court",
  en_curso: "bg-red-900/30 text-red-400",
  cancelado: "bg-navy-800 text-slate-500",
};

export default function AmistososList({ amistosos, userId }: { amistosos: Amistoso[]; userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function aceptar(id: string) {
    setLoading(id + "-aceptar");
    const res = await fetch(`/api/amistoso/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aceptar" }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
  }

  async function iniciar(id: string) {
    setLoading(id + "-iniciar");
    const res = await fetch(`/api/amistoso/${id}/iniciar`, { method: "POST" });
    const json = await res.json();
    setLoading(null);
    if (res.ok) {
      router.push(`/live/${json.partidoId}/control`);
    } else {
      alert("Error al iniciar: " + (json.error ?? res.status));
    }
  }

  async function cancelar(id: string) {
    if (!confirm("¿Cancelar este desafío?")) return;
    setLoading(id + "-cancelar");
    const res = await fetch(`/api/amistoso/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "cancelar" }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      {amistosos.map((a) => {
        const soyRetador = a.retador_id === userId;
        const oponente = soyRetador ? a.rival : a.retador;
        const rol = soyRetador ? "Desafié a" : "Desafío de";

        const fh = a.fecha_hora
          ? {
              fecha: new Date(a.fecha_hora).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "2-digit" }),
              hora: new Date(a.fecha_hora).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
            }
          : null;

        const puedoAceptar = !soyRetador && a.estado === "pendiente";
        const puedoIniciar = a.estado === "aceptado";
        const puedoCancelar = a.estado === "pendiente" || a.estado === "aceptado";

        return (
          <div key={a.id} className="bg-navy-900 border border-navy-700 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">
                  <span className="text-slate-500 font-normal">{rol} </span>
                  {oponente?.nombre} {oponente?.apellido}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
                  {a.club && <span>{a.club.nombre}</span>}
                  {a.cancha && <span>· Cancha {a.cancha}</span>}
                  {fh && <span>· {fh.fecha} {fh.hora}</span>}
                  {!a.club && !fh && <span className="text-slate-600">Sin fecha ni lugar asignado</span>}
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize flex-shrink-0 ${ESTADO_STYLES[a.estado] ?? ""}`}>
                {a.estado.replace("_", " ")}
              </span>
            </div>

            {(puedoAceptar || puedoIniciar || puedoCancelar) && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-navy-800">
                {puedoAceptar && (
                  <button
                    onClick={() => aceptar(a.id)}
                    disabled={loading === a.id + "-aceptar"}
                    className="px-3 py-1.5 bg-court text-white text-xs font-bold rounded-lg hover:bg-court-dark disabled:opacity-40 transition-colors"
                  >
                    {loading === a.id + "-aceptar" ? "..." : "Aceptar"}
                  </button>
                )}
                {puedoIniciar && (
                  <button
                    onClick={() => iniciar(a.id)}
                    disabled={loading === a.id + "-iniciar"}
                    className="px-3 py-1.5 bg-red-700 text-white text-xs font-bold rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors"
                  >
                    {loading === a.id + "-iniciar" ? "..." : "▶ Iniciar partido"}
                  </button>
                )}
                {puedoCancelar && (
                  <button
                    onClick={() => cancelar(a.id)}
                    disabled={!!loading}
                    className="px-3 py-1.5 border border-navy-600 text-slate-500 text-xs rounded-lg hover:text-red-400 hover:border-red-900 disabled:opacity-40 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
