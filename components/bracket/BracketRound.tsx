import { BracketMatch } from "./BracketMatch";

type Jugador = { id?: string; nombre: string; apellido: string };

export type Partido = {
  id: string;
  posicion: number;
  ronda: string;
  jugador1_id: string | null;
  jugador2_id: string | null;
  ganador_id: string | null;
  resultado?: unknown;
  jugador1: Jugador | null;
  jugador2: Jugador | null;
  hora_inicio?: string | null;
  cancha?: string | null;
};

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda",
  segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos",
  semis: "Semis",
  final: "Final",
};

interface Props {
  ronda: string;
  partidos: Partido[];
  totalHeight: number;
  onResult?: (partido: Partido) => void;
  onSchedule?: (partido: Partido) => void;
  onAddPlayer?: (partido: Partido, slot: "jugador1_id" | "jugador2_id") => void;
  onRemovePlayer?: (partido: Partido, slot: "jugador1_id" | "jugador2_id") => void;
  onSwapSelect?: (partido: Partido, slot: "jugador1_id" | "jugador2_id") => void;
  swapSelected?: { partidoId: string; slot: "jugador1_id" | "jugador2_id" } | null;
}

export function BracketRound({ ronda, partidos, totalHeight, onResult, onSchedule, onAddPlayer, onRemovePlayer, onSwapSelect, swapSelected }: Props) {
  const sorted = [...partidos].sort((a, b) => a.posicion - b.posicion);

  return (
    <div className="flex flex-col" style={{ minWidth: ronda === "final" ? "226px" : "208px" }}>
      <div
        style={{ color: "#555", borderBottom: "1px solid #1E1E1E" }}
        className="text-[10px] uppercase tracking-widest font-semibold pb-2 mb-4"
      >
        {RONDA_LABELS[ronda] ?? ronda}
      </div>

      <div
        className="flex flex-col justify-around"
        style={{ height: `${totalHeight}px` }}
      >
        {sorted.map((p) => (
          <BracketMatch
            key={p.id}
            jugador1={p.jugador1}
            jugador2={p.jugador2}
            ganadorId={p.ganador_id}
            jugador1Id={p.jugador1_id}
            jugador2Id={p.jugador2_id}
            resultado={p.resultado}
            horaInicio={p.hora_inicio}
            cancha={p.cancha}
            ronda={ronda}
            onResult={onResult ? () => onResult(p) : undefined}
            onSchedule={onSchedule ? () => onSchedule(p) : undefined}
            onAddPlayer={
              onAddPlayer && ronda === "primera_ronda"
                ? (slot) => onAddPlayer(p, slot)
                : undefined
            }
            onRemovePlayer={
              onRemovePlayer && ronda === "primera_ronda"
                ? (slot) => onRemovePlayer(p, slot)
                : undefined
            }
            onSwapSelect={
              onSwapSelect && ronda === "primera_ronda"
                ? (slot) => onSwapSelect(p, slot)
                : undefined
            }
            swapHighlight={
              swapSelected?.partidoId === p.id ? swapSelected.slot : null
            }
          />
        ))}
      </div>
    </div>
  );
}
