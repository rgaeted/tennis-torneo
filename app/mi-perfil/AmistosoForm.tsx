"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Jugador = { id: string; nombre: string; apellido: string; categoria_habitual: string | null };
type Club = { id: string; nombre: string; num_canchas: number };

export default function AmistosoForm({
  jugadores,
  clubs,
}: {
  jugadores: Jugador[];
  clubs: Club[];
}) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [rival, setRival] = useState<Jugador | null>(null);
  const [clubId, setClubId] = useState("");
  const [cancha, setCancha] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const clubSeleccionado = clubs.find((c) => c.id === clubId);
  const numCanchas = clubSeleccionado?.num_canchas ?? 0;

  const resultados = busqueda.trim().length >= 2
    ? jugadores.filter((j) => {
        const q = busqueda.toLowerCase();
        return `${j.nombre} ${j.apellido}`.toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  async function enviar() {
    if (!rival) { setError("Selecciona un rival"); return; }
    setLoading(true);
    setError(null);
    const fechaHora = fecha && hora ? `${fecha}T${hora}:00` : null;
    const res = await fetch("/api/amistoso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rivalId: rival.id, clubId: clubId || null, cancha: cancha || null, fechaHora }),
    });
    setLoading(false);
    if (!res.ok) { const j = await res.json(); setError(j.error); return; }
    setOk(true);
    setBusqueda(""); setRival(null); setClubId(""); setCancha(""); setFecha(""); setHora("");
    router.refresh();
    setTimeout(() => setOk(false), 3000);
  }

  const inputClass = "w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court placeholder:text-slate-600";

  return (
    <div className="space-y-4">
      {/* Búsqueda de rival */}
      <div>
        <label className="text-xs text-slate-400 mb-1.5 block">Buscar rival</label>
        {rival ? (
          <div className="flex items-center justify-between px-3 py-2 bg-court/10 border border-court/40 rounded-lg">
            <div>
              <span className="text-sm font-medium text-white">{rival.nombre} {rival.apellido}</span>
              {rival.categoria_habitual && (
                <span className="ml-2 text-xs text-slate-400 capitalize">{rival.categoria_habitual}</span>
              )}
            </div>
            <button onClick={() => { setRival(null); setBusqueda(""); }} className="text-slate-500 hover:text-white text-lg leading-none ml-3">×</button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre del jugador..."
              className={inputClass}
            />
            {resultados.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-navy-900 border border-navy-700 rounded-lg overflow-hidden shadow-xl">
                {resultados.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => { setRival(j); setBusqueda(""); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-navy-800 transition-colors text-left"
                  >
                    <span className="text-sm text-white">{j.nombre} {j.apellido}</span>
                    {j.categoria_habitual && (
                      <span className="text-xs text-slate-500 capitalize">{j.categoria_habitual}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {busqueda.trim().length >= 2 && resultados.length === 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2.5">
                <span className="text-sm text-slate-500">Sin resultados</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Club */}
      {clubs.length > 0 && (
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Club <span className="text-slate-600">(opcional)</span></label>
          <select value={clubId} onChange={(e) => { setClubId(e.target.value); setCancha(""); }} className={inputClass}>
            <option value="">Sin club asignado</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {/* Cancha */}
      <div>
        <label className="text-xs text-slate-400 mb-1.5 block">Cancha <span className="text-slate-600">(opcional)</span></label>
        {numCanchas > 0 ? (
          <select value={cancha} onChange={(e) => setCancha(e.target.value)} className={inputClass}>
            <option value="">Sin asignar</option>
            {Array.from({ length: numCanchas }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>Cancha {n}</option>
            ))}
          </select>
        ) : (
          <input type="text" value={cancha} onChange={(e) => setCancha(e.target.value)} placeholder="Ej: Central, 3..." className={inputClass} />
        )}
      </div>

      {/* Fecha y hora */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Fecha <span className="text-slate-600">(opcional)</span></label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Hora <span className="text-slate-600">(opcional)</span></label>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputClass} />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {ok && <p className="text-court text-sm">¡Desafío enviado!</p>}

      <button
        onClick={enviar}
        disabled={loading || !rival}
        className="w-full py-2.5 bg-court text-white font-bold rounded-lg hover:bg-court-dark disabled:opacity-40 transition-colors text-sm"
      >
        {loading ? "Enviando..." : "Enviar desafío"}
      </button>
    </div>
  );
}
