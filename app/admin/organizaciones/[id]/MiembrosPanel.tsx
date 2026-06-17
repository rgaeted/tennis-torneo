"use client";
import { useState } from "react";

type Jugador = { id: string; nombre: string; apellido: string; rol: string; categoria_habitual?: string | null };

export default function MiembrosPanel({
  orgId,
  miembros,
  disponibles,
}: {
  orgId: string;
  miembros: Jugador[];
  disponibles: Jugador[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtrados = busqueda.trim().length >= 2
    ? disponibles.filter(j =>
        `${j.nombre} ${j.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
      )
    : [];

  async function agregar(jugador_id: string) {
    setLoading(jugador_id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizaciones/${orgId}/miembros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jugador_id }),
      });
      const data = await res.json();
      setLoading(null);
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); return; }
      window.location.reload();
    } catch (e) {
      setLoading(null);
      setError("Error de red. Intenta nuevamente.");
    }
  }

  async function quitar(jugador_id: string) {
    setLoading(jugador_id);
    setError(null);
    const res = await fetch(`/api/admin/organizaciones/${orgId}/miembros`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jugador_id }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error); return; }
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {/* Buscador para agregar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar jugador para agregar como organizador…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
          className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#C8FF00] transition-colors"
        />
        {filtrados.length > 0 && (
          <div
            style={{ backgroundColor: "#1E1E1E", border: "1px solid #2E2E2E" }}
            className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10 shadow-xl"
          >
            {filtrados.slice(0, 6).map((j) => (
              <button
                key={j.id}
                onClick={() => agregar(j.id)}
                disabled={loading === j.id}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <span className="text-white">{j.nombre} {j.apellido}</span>
                <span style={{ color: "#C8FF00" }} className="text-xs font-bold">
                  {loading === j.id ? "..." : "+ Agregar"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Lista de miembros actuales */}
      {miembros.length === 0 ? (
        <div style={{ backgroundColor: "#161616", border: "1px solid #242424" }} className="rounded-xl px-5 py-6 text-center">
          <p style={{ color: "#555" }} className="text-sm">Sin miembros. Busca un jugador arriba para agregarlo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {miembros.map((m) => (
            <div
              key={m.id}
              style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
              className="flex items-center justify-between rounded-xl px-5 py-3"
            >
              <div>
                <span className="text-white text-sm font-medium">{m.nombre} {m.apellido}</span>
                {m.categoria_habitual && (
                  <span style={{ color: "#555" }} className="text-xs ml-2 capitalize">{m.categoria_habitual}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  style={{ backgroundColor: "rgba(200,255,0,0.1)", color: "#C8FF00" }}
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                >
                  Organizador
                </span>
                <button
                  onClick={() => quitar(m.id)}
                  disabled={loading === m.id}
                  style={{ color: "#555" }}
                  className="text-xs hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {loading === m.id ? "..." : "Quitar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
