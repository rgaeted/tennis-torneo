"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BracketView, type Partido } from "@/components/bracket/BracketView";
import { ResultForm } from "@/components/admin/ResultForm";
import { ProgramarModal } from "@/components/admin/ProgramarModal";
import { AgregarJugadorModal } from "@/components/admin/AgregarJugadorModal";

type JugadorDisponible = { id: string; nombre: string; apellido: string };
type AddPlayerTarget = { partido: Partido; slot: "jugador1_id" | "jugador2_id" } | null;
type SwapTarget = { partidoId: string; slot: "jugador1_id" | "jugador2_id"; nombre: string; apellido: string } | null;

export default function CuadrosPage() {
  const { id: torneoId } = useParams<{ id: string }>();
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoria, setCategoria] = useState("");
  const [tamano, setTamano] = useState<"8" | "16" | "32">("16");
  const [generando, setGenerando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [tieneCuadro, setTieneCuadro] = useState(false);
  const [cuadroId, setCuadroId] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [numCanchas, setNumCanchas] = useState(0);
  const [todosInscritos, setTodosInscritos] = useState<JugadorDisponible[]>([]);
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState<JugadorDisponible[]>([]);
  const [resultModal, setResultModal] = useState<Partido | null>(null);
  const [scheduleModal, setScheduleModal] = useState<Partido | null>(null);
  const [addPlayerTarget, setAddPlayerTarget] = useState<AddPlayerTarget>(null);
  const [moverMode, setMoverMode] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<SwapTarget>(null);

  const iniciado = partidos.some((p) => p.ganador_id !== null);

  useEffect(() => {
    createClient().from("torneo").select("categorias, club:club_id(num_canchas)").eq("id", torneoId).single()
      .then(({ data }) => {
        const cats = (data as any)?.categorias ?? [];
        setCategorias(cats);
        setCategoria(cats[0] ?? "");
        setNumCanchas((data as any)?.club?.num_canchas ?? 0);
      });
  }, [torneoId]);

  const cargarCuadro = useCallback(async () => {
    if (!categoria) return;
    const supabase = createClient();

    // Siempre cargar inscripciones para la categoría seleccionada
    const [{ data: cuadro }, { data: inscripcionesData }] = await Promise.all([
      supabase
        .from("cuadro")
        .select("id, cerrado")
        .eq("torneo_id", torneoId)
        .eq("categoria", categoria as any)
        .maybeSingle(),
      supabase
        .from("inscripcion")
        .select("jugador:jugador_id(id, nombre, apellido)")
        .eq("torneo_id", torneoId)
        .eq("categoria", categoria as any),
    ]);

    const inscritos = ((inscripcionesData ?? []) as any[])
      .map((i: any) => i.jugador)
      .filter(Boolean)
      .sort((a: any, b: any) => a.apellido.localeCompare(b.apellido));
    setTodosInscritos(inscritos);

    if (!cuadro) {
      setTieneCuadro(false);
      setPartidos([]);
      setCuadroId(null);
      setCerrado(false);
      setJugadoresDisponibles(inscritos);
      return;
    }

    setCuadroId(cuadro.id);
    setTieneCuadro(true);
    setCerrado((cuadro as any).cerrado ?? false);

    const { data: partidosData } = await supabase
      .from("partido")
      .select(`
        id, ronda, posicion, jugador1_id, jugador2_id, ganador_id, resultado, hora_inicio, cancha,
        jugador1:jugador!jugador1_id(id, nombre, apellido),
        jugador2:jugador!jugador2_id(id, nombre, apellido)
      `)
      .eq("cuadro_id", cuadro.id)
      .order("posicion");

    const ps = (partidosData as unknown as Partido[]) ?? [];
    setPartidos(ps);

    const enCuadro = new Set<string>();
    ps.filter((p) => p.ronda === "primera_ronda").forEach((p) => {
      if (p.jugador1_id) enCuadro.add(p.jugador1_id);
      if (p.jugador2_id) enCuadro.add(p.jugador2_id);
    });

    setJugadoresDisponibles(inscritos.filter((j: any) => !enCuadro.has(j.id)));
  }, [torneoId, categoria]);

  useEffect(() => {
    cargarCuadro();
    setMsg(null);
  }, [cargarCuadro]);

  async function generarCuadro() {
    setGenerando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/cuadros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ torneoId, categoria, tamano }),
      });
      const json = await res.json();
      if (res.ok) {
        setMsg("Cuadro generado correctamente");
        await cargarCuadro();
      } else {
        setMsg(`Error: ${json.error}`);
      }
    } catch (err) {
      setMsg(`Error: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      setGenerando(false);
    }
  }

  async function cerrarCuadro() {
    if (!cuadroId) return;
    if (!confirm("¿Cerrar el cuadro? No se podrán agregar ni quitar jugadores después.")) return;
    setCerrando(true);
    const res = await fetch(`/api/admin/cuadros/${cuadroId}/cerrar`, { method: "POST" });
    setCerrando(false);
    if (res.ok) {
      setCerrado(true);
      setMsg("Cuadro cerrado.");
    } else {
      const json = await res.json();
      setMsg(`Error: ${json.error}`);
    }
  }

  async function removerJugador(partido: Partido, slot: "jugador1_id" | "jugador2_id") {
    if (!cuadroId) return;
    const jugador = slot === "jugador1_id" ? partido.jugador1 : partido.jugador2;
    const nombre = jugador ? `${jugador.nombre} ${jugador.apellido}` : "este jugador";
    if (!confirm(`¿Quitar a ${nombre} del cuadro?`)) return;
    const res = await fetch("/api/admin/cuadros/remover-jugador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuadroId, partidoId: partido.id, slot }),
    });
    const json = await res.json();
    if (res.ok) {
      await cargarCuadro();
    } else {
      setMsg(`Error: ${json.error}`);
    }
  }

  async function handleSwapSelect(partido: Partido, slot: "jugador1_id" | "jugador2_id") {
    const jugadorId = partido[slot];
    if (!jugadorId) return;
    const jugador = slot === "jugador1_id" ? partido.jugador1 : partido.jugador2;

    if (!selectedSwap) {
      setSelectedSwap({ partidoId: partido.id, slot, nombre: jugador!.nombre, apellido: jugador!.apellido });
      return;
    }

    if (selectedSwap.partidoId === partido.id && selectedSwap.slot === slot) {
      setSelectedSwap(null);
      return;
    }

    // Intercambiar los dos jugadores
    setSelectedSwap(null);
    if (!cuadroId) return;
    const res = await fetch("/api/admin/cuadros/intercambiar-jugadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuadroId,
        a: { partidoId: selectedSwap.partidoId, slot: selectedSwap.slot },
        b: { partidoId: partido.id, slot },
      }),
    });
    const json = await res.json();
    if (res.ok) {
      await cargarCuadro();
    } else {
      setMsg(`Error: ${json.error}`);
    }
  }

  return (
    <div>
      {/* Controles */}
      <div className="flex flex-wrap items-end gap-4 mb-8 p-4 bg-navy-900 border border-navy-700 rounded-xl">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court"
          >
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Tamaño</label>
          <div className="flex gap-2">
            {(["8", "16", "32"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTamano(t)}
                disabled={cerrado}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  tamano === t ? "border-court bg-court/20 text-court" : "border-navy-700 text-slate-400 hover:border-navy-600"
                } disabled:opacity-40`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={generarCuadro}
          disabled={generando || cerrado}
          className="px-4 py-2 bg-court text-white font-bold rounded-lg hover:bg-court-dark disabled:opacity-50 transition-colors text-sm"
        >
          {generando ? "Generando..." : tieneCuadro ? "Regenerar cuadro" : "Generar cuadro"}
        </button>

        {/* Cerrar cuadro */}
        {tieneCuadro && (
          cerrado ? (
            <span className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm font-medium">
              🔒 Cuadro cerrado
            </span>
          ) : (
            <button
              onClick={cerrarCuadro}
              disabled={cerrando}
              className="px-4 py-2 border border-red-800 text-red-400 hover:bg-red-900/20 font-bold rounded-lg disabled:opacity-50 transition-colors text-sm"
            >
              {cerrando ? "Cerrando..." : "Cerrar cuadro"}
            </button>
          )
        )}

        {/* Botón mover jugadores */}
        {tieneCuadro && !iniciado && !cerrado && (
          moverMode ? (
            <button
              onClick={() => { setMoverMode(false); setSelectedSwap(null); }}
              className="px-4 py-2 border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white font-bold rounded-lg transition-colors text-sm"
            >
              Cancelar movimiento
            </button>
          ) : (
            <button
              onClick={() => setMoverMode(true)}
              className="px-4 py-2 border border-navy-600 text-slate-300 hover:border-court hover:text-court font-bold rounded-lg transition-colors text-sm"
            >
              ⇄ Mover jugadores
            </button>
          )
        )}

        {iniciado && tieneCuadro && (
          <span className="text-xs text-slate-600 border border-navy-800 rounded-lg px-3 py-2">
            Torneo iniciado — posiciones bloqueadas
          </span>
        )}

        {msg && (
          <p className={`text-sm ${msg.startsWith("Error") ? "text-red-400" : "text-court"}`}>{msg}</p>
        )}
      </div>

      {/* Banner modo mover */}
      {moverMode && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3"
          style={{ backgroundColor: "rgba(200,255,0,0.08)", border: "1px solid rgba(200,255,0,0.25)", color: "#C8FF00" }}
        >
          <span className="text-lg">⇄</span>
          {selectedSwap
            ? <>Ahora haz clic en el jugador con quien intercambiar a <strong>{selectedSwap.apellido}, {selectedSwap.nombre}</strong></>
            : <>Haz clic en el jugador que quieres mover</>
          }
        </div>
      )}

      {/* Lista de inscritos */}
      {categoria && (
        <div className="mb-8 p-4 bg-navy-900 border border-navy-700 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-bold text-white">
              Inscritos en {categoria}
            </h3>
            <span className="text-xs bg-navy-800 border border-navy-600 text-slate-400 px-2 py-0.5 rounded-full">
              {todosInscritos.length}
            </span>
          </div>

          {todosInscritos.length === 0 ? (
            <p className="text-slate-600 text-sm">No hay inscripciones en esta categoría.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {todosInscritos.map((j) => {
                const enCuadro = !jugadoresDisponibles.find((d) => d.id === j.id);
                return (
                  <span
                    key={j.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border"
                    style={
                      enCuadro && tieneCuadro
                        ? { backgroundColor: "rgba(200,255,0,0.08)", borderColor: "rgba(200,255,0,0.3)", color: "#C8FF00" }
                        : { backgroundColor: "#161616", borderColor: "#2E2E2E", color: "#888" }
                    }
                  >
                    {enCuadro && tieneCuadro && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#C8FF00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {j.apellido}, {j.nombre}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cuadro */}
      {partidos.length > 0 ? (
        <BracketView
          partidos={partidos}
          onResult={!moverMode ? (p) => setResultModal(p) : undefined}
          onSchedule={!moverMode ? (p) => setScheduleModal(p) : undefined}
          onAddPlayer={!cerrado && !moverMode ? (p, slot) => setAddPlayerTarget({ partido: p, slot }) : undefined}
          onRemovePlayer={!cerrado && !moverMode ? removerJugador : undefined}
          onSwapSelect={moverMode ? handleSwapSelect : undefined}
          swapSelected={moverMode ? (selectedSwap ? { partidoId: selectedSwap.partidoId, slot: selectedSwap.slot } : null) : null}
        />
      ) : (
        !tieneCuadro && (
          <p className="text-slate-500 text-sm">No hay cuadro generado para esta categoría.</p>
        )
      )}

      {/* Modal de programación */}
      {scheduleModal && (
        <ProgramarModal
          partidoId={scheduleModal.id}
          jugador1={scheduleModal.jugador1 ? `${scheduleModal.jugador1.nombre} ${scheduleModal.jugador1.apellido}` : "BYE"}
          jugador2={scheduleModal.jugador2 ? `${scheduleModal.jugador2.nombre} ${scheduleModal.jugador2.apellido}` : "BYE"}
          horaInicioActual={scheduleModal.hora_inicio ?? null}
          canchaActual={scheduleModal.cancha ?? null}
          numCanchas={numCanchas}
          onClose={() => setScheduleModal(null)}
          onSuccess={async () => { setScheduleModal(null); await cargarCuadro(); }}
        />
      )}

      {/* Modal agregar jugador */}
      {addPlayerTarget && cuadroId && (
        <AgregarJugadorModal
          cuadroId={cuadroId}
          partidoId={addPlayerTarget.partido.id}
          slot={addPlayerTarget.slot}
          jugadoresDisponibles={jugadoresDisponibles}
          onClose={() => setAddPlayerTarget(null)}
          onSuccess={async () => { setAddPlayerTarget(null); await cargarCuadro(); }}
        />
      )}

      {/* Modal de resultado */}
      {resultModal && resultModal.jugador1 && resultModal.jugador2 && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setResultModal(null)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ResultForm
              partidoId={resultModal.id}
              jugador1={resultModal.jugador1 as any}
              jugador2={resultModal.jugador2 as any}
              onSuccess={async () => {
                setResultModal(null);
                await cargarCuadro();
              }}
            />
            <button
              onClick={() => setResultModal(null)}
              className="mt-3 w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
