import {
  codigoPartido,
  inferirPrimeraRonda,
  labelSlot,
  type Ronda,
} from "../bracket/matchLabels";
import type { PartidoStoryRow, StoryPayload, JugadorStory } from "./types";

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda",
  segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos",
  semis: "Semifinal",
  final: "Final",
};

const RONDA_RANK: Record<string, number> = {
  primera_ronda: 1,
  segunda_ronda: 2,
  cuartos: 3,
  semis: 4,
  final: 5,
};

export function formatScore(sets: { j1: number; j2: number }[] | null): string {
  if (!sets?.length) return "";
  return sets.map((s) => `${s.j1}-${s.j2}`).join(" ");
}

export function campeonDeFinal(partidos: PartidoStoryRow[]): JugadorStory | null {
  const final = partidos.find((p) => p.ronda === "final" && p.ganador_id);
  if (!final?.ganador_id) return null;
  if (final.jugador1?.id === final.ganador_id) return final.jugador1;
  if (final.jugador2?.id === final.ganador_id) return final.jugador2;
  return null;
}

export function logroJugador(jugadorId: string, partidos: PartidoStoryRow[]): string {
  const propios = partidos.filter(
    (p) => p.jugador1_id === jugadorId || p.jugador2_id === jugadorId
  );
  if (!propios.length) return "Inscrito";
  const top = propios.reduce((best, p) =>
    (RONDA_RANK[p.ronda] ?? 0) > (RONDA_RANK[best.ronda] ?? 0) ? p : best
  );
  if (top.ronda === "final" && top.ganador_id === jugadorId) return "Campeón";
  return RONDA_LABELS[top.ronda] ?? top.ronda;
}

export function lineasCuadro(partidos: PartidoStoryRow[], ronda: string): string[] {
  const primera = inferirPrimeraRonda(partidos);
  return partidos
    .filter((p) => p.ronda === ronda)
    .sort((a, b) => a.posicion - b.posicion)
    .map((p) => {
      const j1 = labelSlot({
        ronda: p.ronda as Ronda,
        posicion: p.posicion,
        slot: "j1",
        jugadorId: p.jugador1_id,
        jugador: p.jugador1,
        primeraRonda: primera,
      });
      const j2 = labelSlot({
        ronda: p.ronda as Ronda,
        posicion: p.posicion,
        slot: "j2",
        jugadorId: p.jugador2_id,
        jugador: p.jugador2,
        primeraRonda: primera,
      });
      return `${codigoPartido(p.ronda as Ronda, p.posicion)}  ${j1} vs ${j2}`;
    });
}

export function lineaPrincipalFotoPartido(
  j1: JugadorStory,
  j2: JugadorStory,
  score?: string | null
): string {
  const vs = `${j1.nombre} ${j1.apellido} vs ${j2.nombre} ${j2.apellido}`;
  if (score) return `${vs} — ${score}`;
  return vs;
}

export function lineaPrincipalDePayload(payload: StoryPayload): string {
  switch (payload.tipo) {
    case "resultado":
      return `${payload.j1.nombre} ${payload.j1.apellido} ${payload.score} ${payload.j2.nombre} ${payload.j2.apellido}`.trim();
    case "foto_partido":
      return lineaPrincipalFotoPartido(payload.j1, payload.j2, payload.score);
    case "campeon":
      return `${payload.campeon.nombre} ${payload.campeon.apellido} — Campeón`;
    case "cuadro":
      return `${RONDA_LABELS[payload.ronda] ?? payload.ronda}`;
    case "patrocinador":
      return `${payload.destacado.nombre} patrocina ${payload.torneoNombre}`;
    case "jugador":
      return `${payload.jugador.nombre} ${payload.jugador.apellido} · ${payload.logro}`;
  }
}
