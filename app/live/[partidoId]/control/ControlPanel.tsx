"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import BluetoothButtons from "@/components/live/BluetoothButtons";
import type { Player, Resultado, SetScore } from "@/lib/live/types";
import { awardPoint, currentSetIndex, formatPuntos, inTiebreak, isMatchOver, isSetComplete, removePoint, setsWon } from "@/lib/live/tennisScore";
type Partido = {
  id: string;
  ganador_id: string | null;
  jugador1_id: string;
  jugador2_id: string;
  jugador1: { nombre: string; apellido: string } | null;
  jugador2: { nombre: string; apellido: string } | null;
};

function esTiebreak(s: SetScore) {
  return (s.j1 === 7 && s.j2 === 6) || (s.j1 === 6 && s.j2 === 7);
}

function errorSet(j1: number, j2: number): string | null {
  if (
    (j1 === 6 && j2 <= 4) || (j2 === 6 && j1 <= 4) ||
    (j1 === 7 && j2 === 5) || (j2 === 7 && j1 === 5) ||
    (j1 === 7 && j2 === 6) || (j2 === 7 && j1 === 6)
  ) return null;
  return `${j1}-${j2} no es válido`;
}

function errorTiebreak(s: SetScore): string | null {
  if (!s.tb || !esTiebreak(s)) return null;
  const { j1, j2 } = s.tb;
  const max = Math.max(j1, j2);
  const min = Math.min(j1, j2);
  if (max < 7 || max - min < 2) return `TB ${j1}-${j2} no es válido`;
  const tbGanaJ1 = j1 > j2;
  const setGanaJ1 = s.j1 > s.j2;
  if (tbGanaJ1 !== setGanaJ1) return "El ganador del TB no coincide con el del set";
  return null;
}

function setsGanados(resultado: Resultado) {
  return { j1: setsWon(resultado, "j1"), j2: setsWon(resultado, "j2") };
}

function validarResultado(resultado: Resultado): string | null {
  const cerrados = resultado.filter(isSetComplete);
  if (cerrados.length === 0) return "No hay sets registrados";
  for (let i = 0; i < resultado.length; i++) {
    if (!isSetComplete(resultado[i])) {
      if (i !== resultado.length - 1) return `Set ${i + 1}: incompleto`;
      continue;
    }
    const err = errorSet(resultado[i].j1, resultado[i].j2);
    if (err) return `Set ${i + 1}: ${err}`;
    const errTb = errorTiebreak(resultado[i]);
    if (errTb) return `Set ${i + 1}: ${errTb}`;
  }
  const sets = setsGanados(cerrados);
  if (sets.j1 === sets.j2) return "El marcador está empatado en sets";
  return null;
}

function formatSet(s: SetScore) {
  if (!esTiebreak(s) || !s.tb) return `${s.j1}-${s.j2}`;
  const perdedor = s.j1 < s.j2 ? s.tb.j1 : s.tb.j2;
  return `${s.j1}-${s.j2}(${perdedor})`;
}

export default function ControlPanel() {
  const { partidoId } = useParams<{ partidoId: string }>();
  const router = useRouter();
  const [partido, setPartido] = useState<Partido | null>(null);
  const [resultado, setResultado] = useState<Resultado>([{ j1: 0, j2: 0 }]);
  const [currentSet, setCurrentSet] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [finalizarError, setFinalizarError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [yoId, setYoId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setYoId(user.id);

      const { data } = await supabase
        .from("partido")
        .select(`
          id, ganador_id, jugador1_id, jugador2_id, resultado,
          jugador1:jugador!jugador1_id(nombre, apellido),
          jugador2:jugador!jugador2_id(nombre, apellido)
        `)
        .eq("id", partidoId)
        .single();

      if (!data) return;
      setPartido(data as unknown as Partido);

      const { data: jugador } = await supabase
        .from("jugador").select("rol").eq("id", user.id).single();

      const esTurnoOAdmin = jugador?.rol === "admin" || jugador?.rol === "turno";
      const esJugador = data.jugador1_id === user.id || data.jugador2_id === user.id;
      setAutorizado(esTurnoOAdmin || esJugador);

      if (data.resultado) {
        const r = data.resultado as Resultado;
        setResultado(r);
        setCurrentSet(currentSetIndex(r));
      }
    }
    init();
  }, [partidoId, router]);

  const saveScore = useCallback(async (nuevoResultado: Resultado) => {
    setSaving(true);
    await fetch("/api/live/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partidoId, resultado: nuevoResultado }),
    });
    setSaving(false);
  }, [partidoId]);

  const applyResultado = useCallback((nuevo: Resultado) => {
    setResultado(nuevo);
    setCurrentSet(currentSetIndex(nuevo));
    saveScore(nuevo);
    setFinalizarError(null);
  }, [saveScore]);

  function addPunto(player: Player) {
    applyResultado(awardPoint(resultado, player));
  }

  function subtractPunto(player: Player) {
    applyResultado(removePoint(resultado, player));
  }

  function updateGame(player: "j1" | "j2", delta: number) {
    const nuevo = resultado.map((s, i) =>
      i === currentSet ? { ...s, [player]: Math.max(0, s[player] + delta) } : s
    );
    setResultado(nuevo);
    saveScore(nuevo);
    setFinalizarError(null);
  }

  function updateTiebreak(player: "j1" | "j2", delta: number) {
    const nuevo = resultado.map((s, i) => {
      if (i !== currentSet) return s;
      const tb = s.tb ?? { j1: 0, j2: 0 };
      return { ...s, tb: { ...tb, [player]: Math.max(0, tb[player] + delta) } };
    });
    setResultado(nuevo);
    saveScore(nuevo);
    setFinalizarError(null);
  }

  function addSet() {
    const nuevo = [...resultado, { j1: 0, j2: 0 }];
    setResultado(nuevo);
    setCurrentSet(nuevo.length - 1);
    saveScore(nuevo);
  }

  async function finalizar() {
    const err = validarResultado(resultado);
    if (err) { setFinalizarError(err); setConfirmar(false); return; }
    setFinalizando(true);
    setFinalizarError(null);
    const res = await fetch("/api/live/finalizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partidoId, resultado }),
    });
    const json = await res.json();
    setFinalizando(false);
    setConfirmar(false);
    if (!res.ok) { setFinalizarError(json.error ?? "Error al finalizar"); return; }
    router.push(`/live/${partidoId}`);
  }

  if (autorizado === null) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">Cargando...</p></div>;
  }

  if (!autorizado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Solo los jugadores del partido o un admin pueden actualizar el marcador.</p>
          <Link href={`/live/${partidoId}`} className="text-court hover:underline text-sm">← Ver marcador</Link>
        </div>
      </div>
    );
  }

  if (!partido) return null;

  if (partido.ganador_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-300 font-semibold">Este partido ya finalizó.</p>
          <Link href={`/live/${partidoId}`} className="text-court hover:underline text-sm block">← Ver marcador</Link>
        </div>
      </div>
    );
  }

  const selfPlayer: Player | null =
    yoId && partido
      ? partido.jugador1_id === yoId
        ? "j1"
        : partido.jugador2_id === yoId
          ? "j2"
          : null
      : null;

  const set = resultado[currentSet] ?? { j1: 0, j2: 0 };
  const enTB = inTiebreak(set) || esTiebreak(set);
  const puntos = set.puntos ?? { j1: 0, j2: 0 };
  const tb = set.tb ?? { j1: 0, j2: 0 };
  const sets = setsGanados(resultado);
  const validacionError = validarResultado(resultado);

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-navy-800">
        <Link href={`/live/${partidoId}`} className="text-slate-500 hover:text-white text-sm transition-colors">
          ← Ver pantalla
        </Link>
        <span className="text-xs text-court font-bold uppercase tracking-widest">Control</span>
        <span className={`text-xs ${saving ? "text-ball" : "text-slate-600"}`}>
          {saving ? "Guardando..." : "Sincronizado"}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-8">

        {/* Set selector */}
        <div className="flex gap-2 flex-wrap justify-center">
          {resultado.map((s, i) => {
            const invalid = errorSet(s.j1, s.j2) !== null || errorTiebreak(s) !== null;
            return (
              <button
                key={i}
                onClick={() => setCurrentSet(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  currentSet === i
                    ? invalid ? "border-red-600 bg-red-900/20 text-red-400" : "border-court bg-court/20 text-court"
                    : invalid ? "border-red-900 text-red-500 hover:border-red-700" : "border-navy-700 text-slate-400 hover:border-navy-600"
                }`}
              >
                Set {i + 1}{invalid && <span className="ml-1">!</span>}
              </button>
            );
          })}
          <button
            onClick={addSet}
            className="px-4 py-2 rounded-lg text-sm border border-navy-700 text-slate-500 hover:border-navy-600 hover:text-slate-300 transition-colors"
          >
            + Set
          </button>
        </div>

        {!enTB && (
          <div className="w-full max-w-sm bg-navy-900 border border-ball/30 rounded-2xl p-5">
            <p className="text-ball text-xs font-bold uppercase tracking-widest text-center mb-4">
              Game
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-slate-500 truncate w-full text-center">{partido.jugador1?.nombre}</span>
                <span className="text-5xl font-black text-ball tabular-nums">{formatPuntos(puntos).split("–")[0]}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => subtractPunto("j1")} className="w-9 h-9 rounded-full border border-navy-600 text-slate-400 hover:bg-navy-800 text-lg font-bold">−</button>
                  <button type="button" onClick={() => addPunto("j1")} disabled={isMatchOver(resultado)} className="w-9 h-9 rounded-full bg-ball/20 border border-ball/40 text-ball hover:bg-ball/30 text-lg font-bold disabled:opacity-40">+</button>
                </div>
              </div>
              <span className="text-slate-700 text-xl font-bold">–</span>
              <div className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-slate-500 truncate w-full text-center">{partido.jugador2?.nombre}</span>
                <span className="text-5xl font-black text-ball tabular-nums">{formatPuntos(puntos).split("–")[1]}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => subtractPunto("j2")} className="w-9 h-9 rounded-full border border-navy-600 text-slate-400 hover:bg-navy-800 text-lg font-bold">−</button>
                  <button type="button" onClick={() => addPunto("j2")} disabled={isMatchOver(resultado)} className="w-9 h-9 rounded-full bg-ball/20 border border-ball/40 text-ball hover:bg-ball/30 text-lg font-bold disabled:opacity-40">+</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Score controls — games */}
        <div className="flex gap-6 items-stretch">
          {/* J1 */}
          <div className="flex flex-col items-center gap-4 bg-navy-900 border border-navy-700 rounded-2xl p-6 min-w-[160px]">
            <span className="text-sm font-bold text-center leading-tight">
              {partido.jugador1?.nombre}<br />
              <span className="text-slate-400">{partido.jugador1?.apellido}</span>
            </span>
            <span className="text-7xl font-black text-ball tabular-nums">{set.j1}</span>
            <div className="flex gap-3">
              <button onClick={() => updateGame("j1", -1)} className="w-12 h-12 rounded-full border border-navy-600 text-slate-400 hover:bg-navy-800 text-xl font-bold transition-colors">−</button>
              <button onClick={() => updateGame("j1", 1)}  className="w-12 h-12 rounded-full bg-court text-white hover:bg-court-dark text-xl font-bold transition-colors">+</button>
            </div>
          </div>

          <div className="flex items-center text-slate-700 text-2xl font-bold self-center">vs</div>

          {/* J2 */}
          <div className="flex flex-col items-center gap-4 bg-navy-900 border border-navy-700 rounded-2xl p-6 min-w-[160px]">
            <span className="text-sm font-bold text-center leading-tight">
              {partido.jugador2?.nombre}<br />
              <span className="text-slate-400">{partido.jugador2?.apellido}</span>
            </span>
            <span className="text-7xl font-black text-ball tabular-nums">{set.j2}</span>
            <div className="flex gap-3">
              <button onClick={() => updateGame("j2", -1)} className="w-12 h-12 rounded-full border border-navy-600 text-slate-400 hover:bg-navy-800 text-xl font-bold transition-colors">−</button>
              <button onClick={() => updateGame("j2", 1)}  className="w-12 h-12 rounded-full bg-court text-white hover:bg-court-dark text-xl font-bold transition-colors">+</button>
            </div>
          </div>
        </div>

        {/* Tie-break controls — only when set is 7-6 or 6-6 in progress */}
        {enTB && (
          <div className="w-full max-w-sm bg-navy-900 border border-ball/30 rounded-2xl p-5">
            <p className="text-ball text-xs font-bold uppercase tracking-widest text-center mb-4">
              Tie-break
            </p>
            <div className="flex items-center gap-4">
              {/* TB J1 */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-slate-500 truncate w-full text-center">{partido.jugador1?.nombre}</span>
                <span className="text-4xl font-black text-ball tabular-nums">{tb.j1}</span>
                <div className="flex gap-2">
                  <button onClick={() => inTiebreak(set) ? subtractPunto("j1") : updateTiebreak("j1", -1)} className="w-9 h-9 rounded-full border border-navy-600 text-slate-400 hover:bg-navy-800 text-lg font-bold transition-colors">−</button>
                  <button onClick={() => inTiebreak(set) ? addPunto("j1") : updateTiebreak("j1", 1)}  className="w-9 h-9 rounded-full bg-ball/20 border border-ball/40 text-ball hover:bg-ball/30 text-lg font-bold transition-colors">+</button>
                </div>
              </div>

              <span className="text-slate-700 text-xl font-bold">–</span>

              {/* TB J2 */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-slate-500 truncate w-full text-center">{partido.jugador2?.nombre}</span>
                <span className="text-4xl font-black text-ball tabular-nums">{tb.j2}</span>
                <div className="flex gap-2">
                  <button onClick={() => inTiebreak(set) ? subtractPunto("j2") : updateTiebreak("j2", -1)} className="w-9 h-9 rounded-full border border-navy-600 text-slate-400 hover:bg-navy-800 text-lg font-bold transition-colors">−</button>
                  <button onClick={() => inTiebreak(set) ? addPunto("j2") : updateTiebreak("j2", 1)}  className="w-9 h-9 rounded-full bg-ball/20 border border-ball/40 text-ball hover:bg-ball/30 text-lg font-bold transition-colors">+</button>
                </div>
              </div>
            </div>

            {errorTiebreak(set) && (
              <p className="mt-3 text-xs text-red-400 text-center">{errorTiebreak(set)}</p>
            )}
            {!errorTiebreak(set) && set.tb && (
              <p className="mt-3 text-xs text-slate-500 text-center">
                Se registrará como {set.j1}-{set.j2}({Math.min(tb.j1, tb.j2)})
              </p>
            )}
          </div>
        )}

        <BluetoothButtons
          partidoId={partidoId}
          j1Name={partido.jugador1?.nombre ?? "Jugador 1"}
          j2Name={partido.jugador2?.nombre ?? "Jugador 2"}
          onPoint={addPunto}
          selfPlayer={selfPlayer}
        />

        {/* Resumen */}
        <div className="text-center space-y-1">
          <div className="flex gap-4 justify-center text-sm flex-wrap">
            {resultado.map((s, i) => {
              const invalid = errorSet(s.j1, s.j2) !== null || errorTiebreak(s) !== null;
              return (
                <span
                  key={i}
                  className={`${i === currentSet ? "text-ball" : "text-slate-500"} ${invalid ? "line-through text-red-500" : ""}`}
                >
                  {formatSet(s)}
                </span>
              );
            })}
          </div>
          {!validacionError && (
            <div className="text-xs text-slate-500">
              Sets:{" "}
              <span className="text-white font-bold">{partido.jugador1?.nombre} {sets.j1}</span>
              <span className="mx-1 text-slate-700">–</span>
              <span className="text-white font-bold">{sets.j2} {partido.jugador2?.nombre}</span>
            </div>
          )}
        </div>

        {isMatchOver(resultado) && (
          <p className="text-sm text-court text-center font-semibold">
            Partido listo para finalizar
          </p>
        )}

        {/* Finalizar */}
        <div className="w-full max-w-sm space-y-3">
          {finalizarError && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
              {finalizarError}
            </div>
          )}

          {validacionError && !finalizarError && (
            <div className="bg-navy-900 border border-navy-800 rounded-xl px-4 py-3 text-xs text-slate-500 text-center">
              {validacionError} — corrige el marcador para finalizar
            </div>
          )}

          {!confirmar ? (
            <button
              onClick={() => {
                const err = validarResultado(resultado);
                if (err) { setFinalizarError(err); return; }
                setFinalizarError(null);
                setConfirmar(true);
              }}
              disabled={finalizando}
              className="w-full py-3 rounded-xl border border-navy-600 text-slate-300 hover:bg-navy-800 hover:border-navy-500 font-semibold text-sm transition-colors disabled:opacity-40"
            >
              Finalizar partido
            </button>
          ) : (
            <div className="bg-navy-900 border border-navy-700 rounded-xl p-4 space-y-3">
              {!validacionError && (
                <p className="text-sm text-slate-300 text-center font-medium">
                  {sets.j1 > sets.j2 ? partido.jugador1?.nombre : partido.jugador2?.nombre}{" "}
                  {sets.j1 > sets.j2 ? partido.jugador1?.apellido : partido.jugador2?.apellido}{" "}
                  gana {sets.j1 > sets.j2 ? `${sets.j1}–${sets.j2}` : `${sets.j2}–${sets.j1}`} en sets
                </p>
              )}
              <p className="text-xs text-slate-500 text-center">Esta acción no se puede deshacer</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmar(false)} className="flex-1 py-2 rounded-lg border border-navy-600 text-slate-400 hover:text-white text-sm transition-colors">
                  Cancelar
                </button>
                <button onClick={finalizar} disabled={finalizando} className="flex-1 py-2 rounded-lg bg-court text-white font-bold text-sm hover:bg-court-dark disabled:opacity-40 transition-colors">
                  {finalizando ? "..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>

        <Link href={`/live/${partidoId}`} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
          Ver pantalla de transmisión →
        </Link>
      </div>
    </div>
  );
}
