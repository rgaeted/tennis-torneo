export type MobilePartidoLike = {
  hora_inicio: string | null;
  started_at: string | null;
  ended_at: string | null;
  ganador_id: string | null;
  jugador1: { id: string } | null;
  jugador2: { id: string } | null;
};

export type FiltroPartido = "hoy" | "en_curso" | "pendientes" | "todos";

function fechaSantiago(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
}

export function filtrarPartidos<T extends MobilePartidoLike>(
  partidos: T[],
  filtro: FiltroPartido,
  now: Date
): T[] {
  if (filtro === "todos") return partidos;

  const hoy = fechaSantiago(now.toISOString());

  return partidos.filter((p) => {
    if (filtro === "hoy") {
      return p.hora_inicio ? fechaSantiago(p.hora_inicio) === hoy : false;
    }
    if (filtro === "en_curso") {
      return !!p.started_at && !p.ended_at && !p.ganador_id;
    }
    if (filtro === "pendientes") {
      return !!p.jugador1 && !!p.jugador2 && !p.ganador_id;
    }
    return true;
  });
}
