import { calcularRondas } from "./generator";
import type { Database } from "@/lib/supabase/types";

export type Ronda = Database["public"]["Enums"]["ronda_tipo"];

const RONDAS_ORDER: Ronda[] = [
  "primera_ronda",
  "segunda_ronda",
  "cuartos",
  "semis",
  "final",
];

const PREFIJO_RONDA: Record<Ronda, string> = {
  primera_ronda: "1R",
  segunda_ronda: "2R",
  cuartos: "C",
  semis: "S",
  final: "F",
};

export function primeraRondaDelCuadro(tamano?: 8 | 16 | 32): Ronda {
  return calcularRondas(tamano ?? 16)[0];
}

export function inferirPrimeraRonda(partidos: { ronda: string }[]): Ronda {
  for (const ronda of RONDAS_ORDER) {
    if (partidos.some((p) => p.ronda === ronda)) return ronda;
  }
  return "primera_ronda";
}

export function codigoPartido(ronda: Ronda, posicion: number): string {
  if (ronda === "final") return "F";
  return `${PREFIJO_RONDA[ronda]}-${posicion + 1}`;
}

export function anteriorRonda(ronda: Ronda): Ronda | null {
  const idx = RONDAS_ORDER.indexOf(ronda);
  return idx > 0 ? RONDAS_ORDER[idx - 1] : null;
}

export function partidoAlimentador(
  ronda: Ronda,
  posicion: number,
  slot: "j1" | "j2"
): { ronda: Ronda; posicion: number } | null {
  const prev = anteriorRonda(ronda);
  if (!prev) return null;
  return {
    ronda: prev,
    posicion: slot === "j1" ? posicion * 2 : posicion * 2 + 1,
  };
}

export function codigoAlimentador(ronda: Ronda, posicion: number, slot: "j1" | "j2"): string {
  const feed = partidoAlimentador(ronda, posicion, slot);
  if (!feed) return "—";
  return codigoPartido(feed.ronda, feed.posicion);
}

type JugadorRef = { nombre: string; apellido: string } | null;

export function labelSlot(input: {
  ronda: Ronda;
  posicion: number;
  slot: "j1" | "j2";
  jugadorId: string | null;
  jugador: JugadorRef;
  primeraRonda: Ronda;
}): string {
  if (input.jugador) return `${input.jugador.nombre} ${input.jugador.apellido}`;

  if (input.ronda === input.primeraRonda) return "BYE";

  return `G. ${codigoAlimentador(input.ronda, input.posicion, input.slot)}`;
}

export function labelsPartido(input: {
  ronda: Ronda;
  posicion: number;
  jugador1_id: string | null;
  jugador2_id: string | null;
  jugador1: JugadorRef;
  jugador2: JugadorRef;
  primeraRonda: Ronda;
}): { j1: string; j2: string } {
  return {
    j1: labelSlot({
      ronda: input.ronda,
      posicion: input.posicion,
      slot: "j1",
      jugadorId: input.jugador1_id,
      jugador: input.jugador1,
      primeraRonda: input.primeraRonda,
    }),
    j2: labelSlot({
      ronda: input.ronda,
      posicion: input.posicion,
      slot: "j2",
      jugadorId: input.jugador2_id,
      jugador: input.jugador2,
      primeraRonda: input.primeraRonda,
    }),
  };
}

export function partidoVsLabel(input: {
  ronda: Ronda;
  posicion: number;
  jugador1_id: string | null;
  jugador2_id: string | null;
  jugador1: JugadorRef;
  jugador2: JugadorRef;
  primeraRonda: Ronda;
}): string {
  const { j1, j2 } = labelsPartido(input);
  return `${j1} vs ${j2}`;
}
