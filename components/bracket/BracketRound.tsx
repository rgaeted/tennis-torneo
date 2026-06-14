import { BracketMatch } from "./BracketMatch";

type Partido = {
  id: string;
  posicion: number;
  jugador1_id: string | null;
  jugador2_id: string | null;
  ganador_id: string | null;
  jugador1: { nombre: string; apellido: string } | null;
  jugador2: { nombre: string; apellido: string } | null;
};

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda",
  segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos",
  semis: "Semifinal",
  final: "Final",
};

interface Props {
  ronda: string;
  partidos: Partido[];
}

export function BracketRound({ ronda, partidos }: Props) {
  const sorted = [...partidos].sort((a, b) => a.posicion - b.posicion);

  return (
    <div className="flex flex-col gap-4 min-w-[196px]">
      <div className="text-xs text-blue-400 uppercase tracking-widest font-medium pb-1 border-b border-gray-800">
        {RONDA_LABELS[ronda] ?? ronda}
      </div>
      <div className="flex flex-col justify-around flex-1 gap-4">
        {sorted.map((p) => (
          <BracketMatch
            key={p.id}
            jugador1={p.jugador1}
            jugador2={p.jugador2}
            ganadorId={p.ganador_id}
            jugador1Id={p.jugador1_id}
            jugador2Id={p.jugador2_id}
          />
        ))}
      </div>
    </div>
  );
}
