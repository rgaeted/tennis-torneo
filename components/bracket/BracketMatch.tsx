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
  onResult?: () => void;
  onSchedule?: () => void;
  onAddPlayer?: (slot: "jugador1_id" | "jugador2_id") => void;
  onRemovePlayer?: (slot: "jugador1_id" | "jugador2_id") => void;
}

const NEON = "#C8FF00";
const CARD_BG = "#161616";
const BORDER = "#242424";

export function BracketMatch({
  jugador1, jugador2, ganadorId, jugador1Id, jugador2Id,
  resultado, horaInicio, cancha, ronda,
  onResult, onSchedule, onAddPlayer, onRemovePlayer,
}: Props) {
  const abbr = (j: Jugador | null) => j ? `${j.nombre[0]}. ${j.apellido}` : null;
  const sets = (resultado as SetScore[] | null) ?? [];
  const puedeCargar = onResult && jugador1Id && jugador2Id && !ganadorId;
  const esFinal = ronda === "final";

  const hora = horaInicio
    ? new Date(horaInicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
    : null;

  const slots = [
    { jugador: jugador1, id: jugador1Id, slot: "jugador1_id" as const, scores: sets.map(s => s.j1) },
    { jugador: jugador2, id: jugador2Id, slot: "jugador2_id" as const, scores: sets.map(s => s.j2) },
  ];

  return (
    <div
      style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, width: esFinal ? "224px" : "208px" }}
      className="rounded-xl overflow-hidden text-sm"
    >
      {esFinal && (
        <div
          style={{ backgroundColor: "#1E1E1E", borderBottom: `1px solid ${BORDER}`, color: NEON }}
          className="px-3 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest"
        >
          <span>Final</span>
          {hora && <span>{hora}</span>}
        </div>
      )}

      {slots.map(({ jugador, id, slot, scores }, i) => {
        const win = !!(ganadorId && ganadorId === id);
        const lose = !!(ganadorId && id && ganadorId !== id);
        return (
          <div
            key={i}
            style={{ borderBottom: i === 0 ? `1px solid ${BORDER}` : undefined }}
            className="px-3 py-2.5 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-1 min-w-0 flex-1">
              {id ? (
                <span
                  style={{ color: win ? "#FFFFFF" : lose ? "#383838" : "#888888" }}
                  className="font-medium truncate"
                >
                  {abbr(jugador)}
                </span>
              ) : (
                <span style={{ color: "#383838" }} className="text-xs italic">—</span>
              )}
              {onAddPlayer && !id && (
                <button
                  onClick={() => onAddPlayer(slot)}
                  style={{ color: "#555" }}
                  className="hover:text-white ml-1 leading-none flex-shrink-0 text-base"
                >+</button>
              )}
              {onRemovePlayer && id && !resultado && (
                <button
                  onClick={() => onRemovePlayer(slot)}
                  style={{ color: "#555" }}
                  className="hover:text-red-400 ml-1 leading-none flex-shrink-0 text-base"
                >×</button>
              )}
            </div>

            {scores.length > 0 && (
              <div className="flex gap-1.5 flex-shrink-0 tabular-nums font-bold text-base">
                {scores.map((s, j) => (
                  <span key={j} style={{ color: win ? NEON : "#383838" }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {hora && !esFinal && !ganadorId && (
        <div style={{ borderTop: `1px solid ${BORDER}`, color: "#555" }} className="px-3 py-1 text-[11px]">
          {hora}{cancha && ` · Cancha ${cancha}`}
        </div>
      )}

      {(puedeCargar || onSchedule) && (
        <div style={{ borderTop: `1px solid ${BORDER}` }} className="flex">
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
