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

export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export interface HorarioDia {
  inicio: string;
  fin?: string;
}

export const DIAS_SEMANA: { key: DiaSemana; label: string; jsDay: number }[] = [
  { key: "lun", label: "Lunes", jsDay: 1 },
  { key: "mar", label: "Martes", jsDay: 2 },
  { key: "mie", label: "Miércoles", jsDay: 3 },
  { key: "jue", label: "Jueves", jsDay: 4 },
  { key: "vie", label: "Viernes", jsDay: 5 },
  { key: "sab", label: "Sábado", jsDay: 6 },
  { key: "dom", label: "Domingo", jsDay: 0 },
];

const JS_DAY_TO_KEY: Record<number, DiaSemana> = Object.fromEntries(
  DIAS_SEMANA.map((d) => [d.jsDay, d.key])
) as Record<number, DiaSemana>;

export const HORARIO_DIA_DEFAULT: HorarioDia = { inicio: "09:00", fin: "21:00" };

export function horariosPorDefecto(): Record<DiaSemana, HorarioDia> {
  return Object.fromEntries(DIAS_SEMANA.map((d) => [d.key, { ...HORARIO_DIA_DEFAULT }])) as Record<
    DiaSemana,
    HorarioDia
  >;
}

export function parseHoraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || h < 0 || h > 23) throw new Error(`Hora inválida: ${hhmm}`);
  if (!Number.isFinite(m) || m < 0 || m > 59) throw new Error(`Hora inválida: ${hhmm}`);
  return h * 60 + m;
}

function weekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function horarioParaDia(
  ymd: string,
  horariosPorDia?: Partial<Record<DiaSemana, HorarioDia>>
): { startMin: number; lastStartMin: number } {
  if (!horariosPorDia) {
    return { startMin: START_MINUTES, lastStartMin: LAST_START };
  }

  const key = JS_DAY_TO_KEY[weekdayFromYmd(ymd)] ?? "lun";
  const h = { ...HORARIO_DIA_DEFAULT, ...horariosPorDia[key] };
  const startMin = parseHoraMinutos(h.inicio);
  const lastStartMin = parseHoraMinutos(h.fin ?? HORARIO_DIA_DEFAULT.fin!);
  if (startMin > lastStartMin) {
    throw new Error(`El inicio (${h.inicio}) no puede ser después del fin (${h.fin}) para ${key}`);
  }
  return { startMin, lastStartMin };
}

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
  numCanchas: number,
  horariosPorDia?: Partial<Record<DiaSemana, HorarioDia>>
): Slot[] {
  const slots: Slot[] = [];

  for (const ymd of iterarDias(fechaInicioStr, fechaFinStr)) {
    const offset = chileOffset(ymd);
    const { startMin, lastStartMin } = horarioParaDia(ymd, horariosPorDia);

    for (let min = startMin; min <= lastStartMin; min += DURATION) {
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

export function slotsPorDia(numCanchas: number, horario: HorarioDia = HORARIO_DIA_DEFAULT): number {
  const start = parseHoraMinutos(horario.inicio);
  const last = parseHoraMinutos(horario.fin ?? HORARIO_DIA_DEFAULT.fin!);
  return (Math.floor((last - start) / DURATION) + 1) * numCanchas;
}

export function validarHorariosPorDia(
  horarios: Partial<Record<DiaSemana, HorarioDia>>
): string | null {
  for (const { key, label } of DIAS_SEMANA) {
    const h = { ...HORARIO_DIA_DEFAULT, ...horarios[key] };
    try {
      const start = parseHoraMinutos(h.inicio);
      const fin = parseHoraMinutos(h.fin ?? HORARIO_DIA_DEFAULT.fin!);
      if (start > fin) {
        return `${label}: la hora de inicio no puede ser después de la hora de fin.`;
      }
    } catch (e) {
      return e instanceof Error ? e.message : "Horario inválido";
    }
  }
  return null;
}

function horariosSeSolapan(aInicio: string, bInicio: string): boolean {
  const ta = new Date(aInicio).getTime();
  const tb = new Date(bInicio).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return false;
  return Math.abs(ta - tb) < DURATION * 60_000;
}

export function validarHorarioManual(input: {
  partido: PartidoScheduleInput;
  horaInicio: string;
  cancha: string;
  partidos: PartidoScheduleInput[];
}): string | null {
  const { partido, horaInicio, cancha, partidos } = input;
  const porCuadro = new Map<string, PartidoScheduleInput[]>();
  for (const p of partidos) {
    const list = porCuadro.get(p.cuadro_id) ?? [];
    list.push(p);
    porCuadro.set(p.cuadro_id, list);
  }

  for (const otro of partidos) {
    if (otro.id === partido.id || !otro.hora_inicio || !otro.cancha) continue;
    if (otro.cancha !== cancha) continue;
    if (horariosSeSolapan(horaInicio, otro.hora_inicio)) {
      return `La cancha ${cancha} ya tiene un partido en ese horario. Elegí otra hora o cancha.`;
    }
  }

  const jugadores = jugadoresEnPartido(partido);
  if (jugadores.length) {
    for (const otro of partidos) {
      if (otro.id === partido.id || !otro.hora_inicio) continue;
      if (!horariosSeSolapan(horaInicio, otro.hora_inicio)) continue;
      for (const j of jugadoresEnPartido(otro)) {
        if (jugadores.includes(j)) {
          return "Uno de los jugadores ya tiene partido en ese horario.";
        }
      }
    }
  }

  const feeders = feedersReales(partido, porCuadro);
  let minTime = 0;
  for (const f of feeders) {
    if (!f.hora_inicio) continue;
    const t = new Date(f.hora_inicio).getTime() + REST_MINUTES * 60_000;
    if (t > minTime) minTime = t;
  }
  if (minTime > 0 && new Date(horaInicio).getTime() < minTime) {
    return "Este horario es muy temprano: deben pasar al menos 3 horas desde los partidos previos del cuadro.";
  }

  return null;
}
