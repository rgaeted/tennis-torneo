"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Jugador = { id: string; nombre: string; apellido: string };
type Club = { id: string; nombre: string };
type Amistoso = {
  id: string;
  estado: string;
  fecha_hora: string | null;
  cancha: string | null;
  partido_id: string | null;
  retador_id: string;
  rival_id: string;
  retador: { nombre: string; apellido: string } | null;
  rival: { nombre: string; apellido: string } | null;
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  en_curso: "En curso",
  cancelado: "Cancelado",
  finalizado: "Finalizado",
};
const ESTADO_COLOR: Record<string, string> = {
  pendiente: "#888",
  aceptado: "#C8FF00",
  en_curso: "#f87171",
  cancelado: "#555",
  finalizado: "#555",
};

export default function AmistososPanel({
  userId,
  amistosos,
  jugadores,
  clubs,
}: {
  userId: string;
  amistosos: Amistoso[];
  jugadores: Jugador[];
  clubs: Club[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [rivalSeleccionado, setRivalSeleccionado] = useState<Jugador | null>(null);
  const [clubId, setClubId] = useState("");
  const [cancha, setCancha] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activos = amistosos.filter((a) => a.estado !== "cancelado" && a.estado !== "finalizado");
  const filtrados = busqueda.trim().length >= 2
    ? jugadores.filter((j) =>
        `${j.nombre} ${j.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
      ).slice(0, 6)
    : [];

  async function desafiar() {
    if (!rivalSeleccionado) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/amistoso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rivalId: rivalSeleccionado.id,
        clubId: clubId || null,
        cancha: cancha || null,
        fechaHora: fechaHora || null,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setError(data.error ?? "Error al enviar el desafío"); return; }
    setShowForm(false);
    setBusqueda(""); setRivalSeleccionado(null); setClubId(""); setCancha(""); setFechaHora("");
    router.refresh();
  }

  async function accion(id: string, accion: "aceptar" | "cancelar") {
    setLoadingId(id);
    await fetch(`/api/amistoso/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    });
    setLoadingId(null);
    router.refresh();
  }

  async function iniciar(id: string) {
    setLoadingId(id);
    const res = await fetch(`/api/amistoso/${id}/iniciar`, { method: "POST" });
    const data = await res.json();
    setLoadingId(null);
    if (data.partidoId) router.push(`/live/${data.partidoId}`);
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-[#C8FF00] transition-colors"

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Mis amistosos</h2>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          style={showForm
            ? { backgroundColor: "#242424", color: "#888", border: "1px solid #242424" }
            : { backgroundColor: "#C8FF00", color: "#0F0F0F" }
          }
          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nuevo desafío"}
        </button>
      </div>

      {/* Formulario nuevo desafío */}
      {showForm && (
        <div
          style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
          className="rounded-2xl p-5 mb-4 space-y-4"
        >
          <p style={{ color: "#C8FF00" }} className="text-xs font-bold uppercase tracking-widest">Desafiar jugador</p>

          {/* Búsqueda rival */}
          <div className="relative">
            {rivalSeleccionado ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: "#0F0F0F", border: "1px solid #C8FF00" }}>
                <span className="text-white text-sm">{rivalSeleccionado.nombre} {rivalSeleccionado.apellido}</span>
                <button onClick={() => { setRivalSeleccionado(null); setBusqueda(""); }} style={{ color: "#555" }} className="text-xs hover:text-white">✕</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Buscar rival por nombre…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ backgroundColor: "#0F0F0F", border: "1px solid #242424" }}
                  className={inputClass}
                />
                {filtrados.length > 0 && (
                  <div style={{ backgroundColor: "#1E1E1E", border: "1px solid #2E2E2E" }} className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10 shadow-xl">
                    {filtrados.map((j) => (
                      <button
                        key={j.id}
                        onClick={() => { setRivalSeleccionado(j); setBusqueda(""); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                      >
                        {j.nombre} {j.apellido}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Club + Cancha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color: "#555" }} className="text-xs block mb-1">Club <span style={{ color: "#444" }}>(opcional)</span></label>
              <select
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                style={{ backgroundColor: "#0F0F0F", border: "1px solid #242424" }}
                className={inputClass}
              >
                <option value="">— Sin club —</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: "#555" }} className="text-xs block mb-1">Cancha <span style={{ color: "#444" }}>(opcional)</span></label>
              <input
                type="text"
                placeholder="Ej: 3"
                value={cancha}
                onChange={(e) => setCancha(e.target.value)}
                style={{ backgroundColor: "#0F0F0F", border: "1px solid #242424" }}
                className={inputClass}
              />
            </div>
          </div>

          {/* Fecha y hora */}
          <div>
            <label style={{ color: "#555" }} className="text-xs block mb-1">Fecha y hora <span style={{ color: "#444" }}>(opcional)</span></label>
            <input
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              style={{ backgroundColor: "#0F0F0F", border: "1px solid #242424" }}
              className={inputClass}
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={desafiar}
            disabled={!rivalSeleccionado || sending}
            style={{ backgroundColor: !rivalSeleccionado ? "#242424" : "#C8FF00", color: !rivalSeleccionado ? "#555" : "#0F0F0F" }}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed"
          >
            {sending ? "Enviando…" : "Enviar desafío"}
          </button>
        </div>
      )}

      {/* Lista de amistosos */}
      {activos.length === 0 && !showForm ? (
        <div style={{ backgroundColor: "#161616", border: "1px solid #242424" }} className="rounded-2xl px-6 py-8 text-center">
          <p style={{ color: "#555" }} className="text-sm">No tienes partidos amistosos activos.</p>
          <p style={{ color: "#444" }} className="text-xs mt-1">Desafía a otro jugador con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activos.map((a) => {
            const soyRetador = a.retador_id === userId;
            const rival = soyRetador ? a.rival : a.retador;
            const isLoading = loadingId === a.id;

            return (
              <div
                key={a.id}
                style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
                className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">
                      {soyRetador ? "Tú" : `${a.retador?.nombre} ${a.retador?.apellido}`}
                      <span style={{ color: "#555" }} className="mx-2 font-normal">vs</span>
                      {soyRetador ? `${rival?.nombre} ${rival?.apellido}` : "Ti"}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ color: ESTADO_COLOR[a.estado], backgroundColor: `${ESTADO_COLOR[a.estado]}18` }}
                    >
                      {ESTADO_LABEL[a.estado] ?? a.estado}
                    </span>
                  </div>
                  {a.fecha_hora && (
                    <p style={{ color: "#555" }} className="text-xs mt-0.5">
                      {new Date(a.fecha_hora).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      {a.cancha && ` · Cancha ${a.cancha}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Rival acepta/rechaza */}
                  {a.estado === "pendiente" && !soyRetador && (
                    <>
                      <button onClick={() => accion(a.id, "aceptar")} disabled={isLoading}
                        style={{ backgroundColor: "#C8FF00", color: "#0F0F0F" }}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50">
                        {isLoading ? "…" : "Aceptar"}
                      </button>
                      <button onClick={() => accion(a.id, "cancelar")} disabled={isLoading}
                        style={{ color: "#555", border: "1px solid #242424" }}
                        className="text-xs px-3 py-1.5 rounded-lg hover:text-white disabled:opacity-50">
                        Rechazar
                      </button>
                    </>
                  )}

                  {/* Retador cancela pendiente */}
                  {a.estado === "pendiente" && soyRetador && (
                    <button onClick={() => accion(a.id, "cancelar")} disabled={isLoading}
                      style={{ color: "#555", border: "1px solid #242424" }}
                      className="text-xs px-3 py-1.5 rounded-lg hover:text-red-400 disabled:opacity-50">
                      {isLoading ? "…" : "Cancelar"}
                    </button>
                  )}

                  {/* Iniciar partido */}
                  {a.estado === "aceptado" && (
                    <button onClick={() => iniciar(a.id)} disabled={isLoading}
                      style={{ border: "1px solid #C8FF00", color: "#C8FF00" }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#C8FF00]/10 disabled:opacity-50">
                      {isLoading ? "…" : "▶ Iniciar"}
                    </button>
                  )}

                  {/* Ver partido en vivo */}
                  {a.estado === "en_curso" && a.partido_id && (
                    <a href={`/live/${a.partido_id}`}
                      style={{ border: "1px solid #f87171", color: "#f87171" }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-900/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      Ver en vivo
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
