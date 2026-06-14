import { BracketRound } from "./BracketRound";

const ORDEN_RONDAS = ["primera_ronda", "segunda_ronda", "cuartos", "semis", "final"];

type Partido = {
  id: string;
  ronda: string;
  posicion: number;
  jugador1_id: string | null;
  jugador2_id: string | null;
  ganador_id: string | null;
  jugador1: { nombre: string; apellido: string } | null;
  jugador2: { nombre: string; apellido: string } | null;
};

export function BracketView({ partidos }: { partidos: Partido[] }) {
  const porRonda = ORDEN_RONDAS.reduce<Record<string, Partido[]>>((acc, ronda) => {
    acc[ronda] = partidos.filter((p) => p.ronda === ronda);
    return acc;
  }, {});

  const rondasConPartidos = ORDEN_RONDAS.filter((r) => porRonda[r]?.length > 0);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max p-4">
        {rondasConPartidos.map((ronda) => (
          <BracketRound key={ronda} ronda={ronda} partidos={porRonda[ronda]} />
        ))}
      </div>
    </div>
  );
}
