import { codigoPartido, labelSlot, type Ronda } from "@/lib/bracket/matchLabels";

type SetScore = { j1: number; j2: number };
interface Jugador { id?: string; nombre: string; apellido: string; }

interface Props {
  jugador1: Jugador | null;
  jugador2: Jugador | null;
  ganadorId: string | null;
  jugador1Id: string | null;
  jugador2Id: string | null;
  resultado?: unknown;
  horaInicio?: string | null;
  cancha?: string | null;
  ronda?: string;
  posicion?: number;
  primeraRonda?: string;
  onResult?: () => void;
  onSchedule?: () => void;
  onAddPlayer?: (slot: "jugador1_id" | "jugador2_id") => void;
  onRemovePlayer?: (slot: "jugador1_id" | "jugador2_id") => void;
  onSwapSelect?: (slot: "jugador1_id" | "jugador2_id") => void;
  swapHighlight?: "jugador1_id" | "jugador2_id" | null;
}

const NEON = "#C8FF00";
const CARD_BG = "#161616";
const BORDER = "#242424";

export function BracketMatch({
  jugador1, jugador2, ganadorId, jugador1Id, jugador2Id,
  resultado, horaInicio, cancha, ronda, posicion = 0, primeraRonda = "primera_ronda",
  onResult, onSchedule, onAddPlayer, onRemovePlayer,
  onSwapSelect, swapHighlight,
}: Props) {
  const rondaTyped = (ronda ?? "primera_ronda") as Ronda;
  const primeraRondaTyped = (primeraRonda ?? "primera_ronda") as Ronda;

  const slotLabel = (jugador: Jugador | null, id: string | null, slot: "j1" | "j2") =>
    labelSlot({
      ronda: rondaTyped,
      posicion,
      slot,
      jugadorId: id,
      jugador,
      primeraRonda: primeraRondaTyped,
    });

  const codigo = codigoPartido(rondaTyped, posicion);
  const sets = (resultado as SetScore[] | null) ?? [];
  const puedeCargar = onResult && jugador1Id && jugador2Id && !ganadorId;
  const esFinal = ronda === "final";

  const schedule = horaInicio
    ? (() => {
        const d = new Date(horaInicio);
        return {
          fecha: d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }),
          hora: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
        };
      })()
    : null;

  const scheduleLabel = schedule
    ? `${schedule.fecha} · ${schedule.hora}${cancha ? ` · C${cancha}` : ""}`
    : null;

  const slots = [
    { label: slotLabel(jugador1, jugador1Id, "j1"), id: jugador1Id, slot: "jugador1_id" as const, isBye: !jugador1Id && rondaTyped === primeraRondaTyped },
    { label: slotLabel(jugador2, jugador2Id, "j2"), id: jugador2Id, slot: "jugador2_id" as const, isBye: !jugador2Id && rondaTyped === primeraRondaTyped },
  ];

  const j1wins = ganadorId && ganadorId === jugador1Id;
  const j2wins = ganadorId && ganadorId === jugador2Id;

  return (
    <div
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, width: esFinal ? "210px" : "192px" }}
      className="rounded-xl overflow-hidden text-sm"
    >
      {esFinal && (
        <div
          style={{ backgroundColor: "#1E1E1E", borderBottom: `1px solid ${BORDER}`, color: NEON }}
          className="px-3 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest"
        >
          <span>Final · {codigo}</span>
          {scheduleLabel && <span>{scheduleLabel}</span>}
        </div>
      )}

      {!esFinal && (
        <div
          style={{ backgroundColor: "#141414", borderBottom: `1px solid ${BORDER}`, color: "#666" }}
          className="px-3 py-1 text-[10px] font-semibold tracking-wide"
        >
          {codigo}
        </div>
      )}

      {/* Filas de jugadores — nombre ocupa todo el ancho */}
      {slots.map(({ label, id, slot, isBye }, i) => {
        const win = !!(ganadorId && ganadorId === id);
        const lose = !!(ganadorId && id && ganadorId !== id);
        return (
          <div
            key={i}
            style={{ borderBottom: `1px solid ${BORDER}` }}
            className="px-3 py-2 flex items-center gap-1"
          >
            {id ? (
              onSwapSelect ? (
                <button
                  onClick={() => onSwapSelect(slot)}
                  className="font-medium truncate text-left leading-none flex-1"
                  style={{
                    color: swapHighlight === slot ? NEON : "#888888",
                    textDecoration: swapHighlight === slot ? "underline" : "none",
                    textUnderlineOffset: "3px",
                  }}
                >
                  {label}
                </button>
              ) : (
                <span
                  style={{ color: win ? "#FFFFFF" : lose ? "#444" : "#888888" }}
                  className="font-medium truncate flex-1"
                >
                  {label}
                </span>
              )
            ) : (
              <span
                style={{ color: isBye ? "#555" : "#777" }}
                className={`text-xs flex-1 ${isBye ? "italic" : "font-mono tracking-tight"}`}
              >
                {label}
              </span>
            )}

            {onAddPlayer && !id && (
              <button
                onClick={() => onAddPlayer(slot)}
                style={{ color: "#555" }}
                className="hover:text-white leading-none flex-shrink-0 text-base"
              >+</button>
            )}
            {onRemovePlayer && id && !resultado && (
              <button
                onClick={() => onRemovePlayer(slot)}
                style={{ color: "#555" }}
                className="hover:text-red-400 leading-none flex-shrink-0 text-base"
              >×</button>
            )}
          </div>
        );
      })}

      {/* Fila de sets — separada, debajo de ambos jugadores */}
      {sets.length > 0 && (
        <div
          style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: "#111" }}
          className="px-3 py-1.5 flex items-center justify-between"
        >
          <div className="flex gap-2 tabular-nums text-xs font-bold">
            {sets.map((s, j) => (
              <span key={j} style={{ color: j1wins ? NEON : "#555" }}>{s.j1}</span>
            ))}
          </div>
          <span style={{ color: "#2A2A2A" }} className="text-[10px]">vs</span>
          <div className="flex gap-2 tabular-nums text-xs font-bold">
            {sets.map((s, j) => (
              <span key={j} style={{ color: j2wins ? NEON : "#555" }}>{s.j2}</span>
            ))}
          </div>
        </div>
      )}

      {scheduleLabel && !esFinal && !ganadorId && (
        <div style={{ borderBottom: `1px solid ${BORDER}`, color: "#555" }} className="px-3 py-1 text-[11px]">
          {scheduleLabel}
        </div>
      )}

      {(puedeCargar || onSchedule) && (
        <div className="flex">
          {onSchedule && (
            <button
              onClick={onSchedule}
              style={{ color: "#555", flex: 1, borderRight: puedeCargar ? `1px solid ${BORDER}` : undefined }}
              className="py-1.5 text-xs hover:bg-white/5 hover:text-white transition-colors"
            >📅</button>
          )}
          {puedeCargar && (
            <button
              onClick={onResult}
              style={{ color: NEON, flex: 1 }}
              className="py-1.5 text-xs hover:bg-white/5 transition-colors"
            >Resultado →</button>
          )}
        </div>
      )}
    </div>
  );
}
