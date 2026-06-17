type Ronda = "primera_ronda" | "segunda_ronda" | "cuartos" | "semis" | "final";

export interface PartidoGenerado {
  ronda: Ronda;
  posicion: number;
  jugador1_id: string | null;
  jugador2_id: string | null;
}

const RONDAS_8: Ronda[]  = ["cuartos", "semis", "final"];
const RONDAS_16: Ronda[] = ["primera_ronda", "segunda_ronda", "cuartos", "semis", "final"];
const RONDAS_32: Ronda[] = ["primera_ronda", "segunda_ronda", "cuartos", "semis", "final"];

export function calcularRondas(tamano: 8 | 16 | 32): Ronda[] {
  if (tamano === 8) return RONDAS_8;
  return tamano === 16 ? RONDAS_16 : RONDAS_32;
}

export function siguienteRonda(ronda: Ronda): Ronda | null {
  const orden: Ronda[] = ["primera_ronda", "segunda_ronda", "cuartos", "semis", "final"];
  const idx = orden.indexOf(ronda);
  return idx < orden.length - 1 ? orden[idx + 1] : null;
}

/**
 * Generates all matches for a single-elimination bracket.
 * First round: players assigned randomly.
 * Later rounds: jugador1_id and jugador2_id are null (filled when results are loaded).
 * Byes are represented as null players (auto-advance).
 */
export function generarPartidosEliminacion(
  jugadores: string[],
  tamano: 8 | 16 | 32
): PartidoGenerado[] {
  if (jugadores.length > tamano) {
    throw new Error(`Hay más jugadores (${jugadores.length}) que posiciones en el bracket (${tamano})`);
  }

  const slots = [...jugadores];

  // Fisher-Yates shuffle for random draw
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  const partidos: PartidoGenerado[] = [];
  const rondas = calcularRondas(tamano);
  let partidosPorRonda = tamano / 2;

  rondas.forEach((ronda, rondaIdx) => {
    for (let pos = 0; pos < partidosPorRonda; pos++) {
      if (rondaIdx === 0) {
        const j1 = slots[pos * 2];
        const j2 = slots[pos * 2 + 1];
        partidos.push({
          ronda,
          posicion: pos,
          jugador1_id: j1 === "bye" ? null : j1,
          jugador2_id: j2 === "bye" ? null : j2,
        });
      } else {
        partidos.push({
          ronda,
          posicion: pos,
          jugador1_id: null,
          jugador2_id: null,
        });
      }
    }
    partidosPorRonda = Math.floor(partidosPorRonda / 2);
  });

  return partidos;
}
