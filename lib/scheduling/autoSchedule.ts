import type { Database } from "@/lib/supabase/types";

export type Ronda = Database["public"]["Enums"]["ronda_tipo"];

export interface Slot {
  fechaISO: string;
  cancha: number;
}

export interface PartidoScheduleInput {
  id: string;
  cuadro_id: string;
  ronda: Ronda;
  posicion: number;
  jugador1_id: string | null;
  jugador2_id: string | null;
  ganador_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  hora_inicio: string | null;
  cancha: string | null;
}

export interface ScheduleAssignment {
  hora_inicio: string;
  cancha: string;
}

export type AssignResult =
  | { ok: true; assignments: Record<string, ScheduleAssignment> }
  | { ok: false; error: string; sinSlot: number };

const RONDA_ORDER: Ronda[] = [
  "primera_ronda",
  "segunda_ronda",
  "cuartos",
  "semis",
  "final",
];

export const START_MINUTES = 9 * 60;
export const LAST_START = 22 * 60;
export const DURATION = 90;
export const REST_MINUTES = 180;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function chileOffset(ymd: string): string {
  const month = parseInt(ymd.substring(5, 7), 10);
  return month >= 5 && month <= 8 ? "-04:00" : "-03:00";
}

function* iterarDias(desde: string, hasta: string) {
  const fin = new Date(hasta + "T12:00:00Z");
  const cur = new Date(desde + "T12:00:00Z");
  while (cur <= fin) {
    yield cur.toISOString().substring(0, 10);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

export function generarSlots(
  fechaInicioStr: string,
  fechaFinStr: string,
  numCanchas: number
): Slot[] {
  const slots: Slot[] = [];

  for (const ymd of iterarDias(fechaInicioStr, fechaFinStr)) {
    const offset = chileOffset(ymd);
    for (let min = START_MINUTES; min <= LAST_START; min += DURATION) {
      const hh = pad2(Math.floor(min / 60));
      const mm = pad2(min % 60);
      const fechaISO = `${ymd}T${hh}:${mm}:00${offset}`;
      for (let c = 1; c <= numCanchas; c++) {
        slots.push({ fechaISO, cancha: c });
      }
    }
  }

  return slots;
}

function rondaIndex(ronda: Ronda): number {
  return RONDA_ORDER.indexOf(ronda);
}

function anteriorRonda(ronda: Ronda): Ronda | null {
  const idx = rondaIndex(ronda);
  return idx > 0 ? RONDA_ORDER[idx - 1] : null;
}

function jugadoresReales(p: PartidoScheduleInput): number {
  return (p.jugador1_id ? 1 : 0) + (p.jugador2_id ? 1 : 0);
}

function primeraRondaEnCuadro(partidos: PartidoScheduleInput[]): Ronda {
  let minIdx = Infinity;
  let primera: Ronda = partidos[0]?.ronda ?? "cuartos";
  for (const p of partidos) {
    const idx = rondaIndex(p.ronda);
    if (idx >= 0 && idx < minIdx) {
      minIdx = idx;
      primera = p.ronda;
    }
  }
  return primera;
}

export type Clasificacion = "bye" | "fijo" | "asignable";

export function clasificarPartido(
  p: PartidoScheduleInput,
  partidosCuadro: PartidoScheduleInput[]
): Clasificacion {
  if (p.ganador_id && !p.started_at) return "bye";

  const primera = primeraRondaEnCuadro(partidosCuadro);
  if (p.ronda === primera && jugadoresReales(p) < 2) return "bye";

  if (p.started_at || p.ended_at) return "fijo";
  if (p.ganador_id && p.started_at) return "fijo";

  return "asignable";
}

export function contarAsignables(partidos: PartidoScheduleInput[]): number {
  const porCuadro = new Map<string, PartidoScheduleInput[]>();
  for (const p of partidos) {
    const list = porCuadro.get(p.cuadro_id) ?? [];
    list.push(p);
    porCuadro.set(p.cuadro_id, list);
  }

  let n = 0;
  for (const p of partidos) {
    if (clasificarPartido(p, porCuadro.get(p.cuadro_id) ?? []) === "asignable") n++;
  }
  return n;
}

function slotKey(fechaISO: string, cancha: number): string {
  return `${fechaISO}|${cancha}`;
}

function horaDePartido(
  p: PartidoScheduleInput,
  assignments: Record<string, ScheduleAssignment>
): string | null {
  return assignments[p.id]?.hora_inicio ?? p.hora_inicio;
}

function feedersReales(
  p: PartidoScheduleInput,
  porCuadro: Map<string, PartidoScheduleInput[]>
): PartidoScheduleInput[] {
  const prev = anteriorRonda(p.ronda);
  if (!prev) return [];

  const delCuadro = porCuadro.get(p.cuadro_id) ?? [];
  const f1 = delCuadro.find((x) => x.ronda === prev && x.posicion === p.posicion * 2);
  const f2 = delCuadro.find((x) => x.ronda === prev && x.posicion === p.posicion * 2 + 1);
  const feeders = [f1, f2].filter(Boolean) as PartidoScheduleInput[];

  return feeders.filter((f) => clasificarPartido(f, delCuadro) !== "bye");
}

function minInicioPermitido(
  p: PartidoScheduleInput,
  porCuadro: Map<string, PartidoScheduleInput[]>,
  assignments: Record<string, ScheduleAssignment>
): number {
  const feeders = feedersReales(p, porCuadro);
  if (!feeders.length) return 0;

  let maxStart = 0;
  for (const f of feeders) {
    const hora = horaDePartido(f, assignments);
    if (!hora) {
      throw new Error(`Feeder ${f.id} sin horario asignado`);
    }
    const t = new Date(hora).getTime() + REST_MINUTES * 60_000;
    if (t > maxStart) maxStart = t;
  }
  return maxStart;
}

function jugadoresEnPartido(p: PartidoScheduleInput): string[] {
  return [p.jugador1_id, p.jugador2_id].filter(Boolean) as string[];
}

function ordenarAsignables(partidos: PartidoScheduleInput[]): PartidoScheduleInput[] {
  return [...partidos].sort((a, b) => {
    const dr = rondaIndex(a.ronda) - rondaIndex(b.ronda);
    if (dr !== 0) return dr;
    const dc = a.cuadro_id.localeCompare(b.cuadro_id);
    if (dc !== 0) return dc;
    return a.posicion - b.posicion;
  });
}

export function asignarHorarios(input: {
  slots: Slot[];
  partidos: PartidoScheduleInput[];
}): AssignResult {
  const { slots, partidos } = input;

  const porCuadro = new Map<string, PartidoScheduleInput[]>();
  for (const p of partidos) {
    const list = porCuadro.get(p.cuadro_id) ?? [];
    list.push(p);
    porCuadro.set(p.cuadro_id, list);
  }

  const ocupados = new Set<string>();
  const jugadoresPorHora = new Map<string, Set<string>>();
  const assignments: Record<string, ScheduleAssignment> = {};

  for (const p of partidos) {
    const delCuadro = porCuadro.get(p.cuadro_id) ?? [];
    if (clasificarPartido(p, delCuadro) !== "fijo") continue;
    if (!p.hora_inicio || !p.cancha) continue;

    const canchaNum = Number(p.cancha);
    if (!Number.isFinite(canchaNum)) continue;

    ocupados.add(slotKey(p.hora_inicio, canchaNum));
    const set = jugadoresPorHora.get(p.hora_inicio) ?? new Set<string>();
    for (const j of jugadoresEnPartido(p)) set.add(j);
    jugadoresPorHora.set(p.hora_inicio, set);
  }

  const asignables = ordenarAsignables(
    partidos.filter((p) => clasificarPartido(p, porCuadro.get(p.cuadro_id) ?? []) === "asignable")
  );

  if (!asignables.length) {
    return { ok: true, assignments: {} };
  }

  let sinSlot = 0;

  for (const p of asignables) {
    let minTime: number;
    try {
      minTime = minInicioPermitido(p, porCuadro, assignments);
    } catch {
      return {
        ok: false,
        error: "Error interno: dependencia de horario sin resolver.",
        sinSlot: asignables.length,
      };
    }

    const jugadores = jugadoresEnPartido(p);
    let found: Slot | null = null;

    for (const slot of slots) {
      const key = slotKey(slot.fechaISO, slot.cancha);
      if (ocupados.has(key)) continue;

      const slotTime = new Date(slot.fechaISO).getTime();
      if (slotTime < minTime) continue;

      if (jugadores.length) {
        const busy = jugadoresPorHora.get(slot.fechaISO);
        if (busy && jugadores.some((j) => busy.has(j))) continue;
      }

      found = slot;
      break;
    }

    if (!found) {
      sinSlot++;
      continue;
    }

    const key = slotKey(found.fechaISO, found.cancha);
    ocupados.add(key);
    assignments[p.id] = {
      hora_inicio: found.fechaISO,
      cancha: String(found.cancha),
    };

    if (jugadores.length) {
      const set = jugadoresPorHora.get(found.fechaISO) ?? new Set<string>();
      for (const j of jugadores) set.add(j);
      jugadoresPorHora.set(found.fechaISO, set);
    }
  }

  const asignados = Object.keys(assignments).length;
  if (sinSlot > 0 || asignados < asignables.length) {
    const faltan = asignables.length - asignados;
    return {
      ok: false,
      error: `No hay suficientes slots: ${faltan} partido${faltan !== 1 ? "s" : ""} sin horario. Amplía el rango de fechas o el número de canchas.`,
      sinSlot: faltan,
    };
  }

  return { ok: true, assignments };
}

export function slotsPorDia(numCanchas: number): number {
  return (Math.floor((LAST_START - START_MINUTES) / DURATION) + 1) * numCanchas;
}
