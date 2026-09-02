import { describe, it, expect } from "vitest";
import {
  asignarHorarios,
  generarSlots,
  REST_MINUTES,
  type PartidoScheduleInput,
} from "./autoSchedule";

const CUADRO_A = "cuadro-a";
const CUADRO_B = "cuadro-b";

function p(overrides: Partial<PartidoScheduleInput> & Pick<PartidoScheduleInput, "id" | "ronda" | "posicion">): PartidoScheduleInput {
  return {
    cuadro_id: CUADRO_A,
    jugador1_id: "j1",
    jugador2_id: "j2",
    ganador_id: null,
    started_at: null,
    ended_at: null,
    hora_inicio: null,
    cancha: null,
    ...overrides,
  };
}

function bracket8(): PartidoScheduleInput[] {
  return [
    p({ id: "c0", ronda: "cuartos", posicion: 0, jugador1_id: "a0", jugador2_id: "a1" }),
    p({ id: "c1", ronda: "cuartos", posicion: 1, jugador1_id: "a2", jugador2_id: "a3" }),
    p({ id: "c2", ronda: "cuartos", posicion: 2, jugador1_id: "a4", jugador2_id: "a5" }),
    p({ id: "c3", ronda: "cuartos", posicion: 3, jugador1_id: "a6", jugador2_id: "a7" }),
    p({ id: "s0", ronda: "semis", posicion: 0, jugador1_id: null, jugador2_id: null }),
    p({ id: "s1", ronda: "semis", posicion: 1, jugador1_id: null, jugador2_id: null }),
    p({ id: "f0", ronda: "final", posicion: 0, jugador1_id: null, jugador2_id: null }),
  ];
}

function ms(iso: string) {
  return new Date(iso).getTime();
}

describe("asignarHorarios", () => {
  it("cuadro de 8: cuartos primero, semis con descanso, final después", () => {
    const slots = generarSlots("2026-09-05", "2026-09-07", 1);
    const result = asignarHorarios({ slots, partidos: bracket8() });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const h = (id: string) => result.assignments[id].hora_inicio;

    expect(ms(h("c0"))).toBeLessThan(ms(h("c1")));
    expect(ms(h("c1"))).toBeLessThan(ms(h("c2")));

    const latestCuartoFeeder = Math.max(ms(h("c0")), ms(h("c1")));
    expect(ms(h("s0"))).toBeGreaterThanOrEqual(latestCuartoFeeder + REST_MINUTES * 60_000);

    const latestSemiFeeder = Math.max(ms(h("s0")), ms(h("s1")));
    expect(ms(h("f0"))).toBeGreaterThanOrEqual(latestSemiFeeder + REST_MINUTES * 60_000);
  });

  it("bye en primera ronda no ocupa cancha", () => {
    const partidos: PartidoScheduleInput[] = [
      p({ id: "bye", ronda: "cuartos", posicion: 0, jugador1_id: "solo", jugador2_id: null }),
      p({ id: "real", ronda: "cuartos", posicion: 1, jugador1_id: "b1", jugador2_id: "b2" }),
      p({ id: "semi", ronda: "semis", posicion: 0, jugador1_id: null, jugador2_id: null }),
    ];
    const slots = generarSlots("2026-09-05", "2026-09-05", 1);
    const result = asignarHorarios({ slots, partidos });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.assignments["bye"]).toBeUndefined();
    expect(result.assignments["real"]).toBeDefined();
    expect(result.assignments["semi"]).toBeDefined();

    expect(ms(result.assignments["semi"].hora_inicio)).toBeGreaterThanOrEqual(
      ms(result.assignments["real"].hora_inicio) + REST_MINUTES * 60_000
    );
  });

  it("dos categorías usan canchas en paralelo sin dejarlas vacías", () => {
    const catA = bracket8().map((x) => ({ ...x, cuadro_id: CUADRO_A }));
    const catB = [
      p({ id: "b-c0", cuadro_id: CUADRO_B, ronda: "cuartos", posicion: 0, jugador1_id: "b0", jugador2_id: "b1" }),
      p({ id: "b-c1", cuadro_id: CUADRO_B, ronda: "cuartos", posicion: 1, jugador1_id: "b2", jugador2_id: "b3" }),
      p({ id: "b-s0", cuadro_id: CUADRO_B, ronda: "semis", posicion: 0, jugador1_id: null, jugador2_id: null }),
      p({ id: "b-f0", cuadro_id: CUADRO_B, ronda: "final", posicion: 0, jugador1_id: null, jugador2_id: null }),
    ];
    const slots = generarSlots("2026-06-05", "2026-06-05", 2);
    const result = asignarHorarios({ slots, partidos: [...catA, ...catB] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const aLasNueve = Object.values(result.assignments).filter((a) =>
      a.hora_inicio.startsWith("2026-06-05T09:00:00")
    );
    expect(aLasNueve.length).toBeGreaterThanOrEqual(2);
    expect(new Set(aLasNueve.map((a) => a.cancha)).size).toBeGreaterThanOrEqual(2);
  });

  it("mismo jugador en dos categorías no juega a la misma hora", () => {
    const partidos: PartidoScheduleInput[] = [
      p({ id: "a1", cuadro_id: CUADRO_A, ronda: "cuartos", posicion: 0, jugador1_id: "shared", jugador2_id: "x1" }),
      p({ id: "b1", cuadro_id: CUADRO_B, ronda: "cuartos", posicion: 0, jugador1_id: "shared", jugador2_id: "x2" }),
    ];
    const slots = generarSlots("2026-09-05", "2026-09-05", 1);
    const result = asignarHorarios({ slots, partidos });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.assignments["a1"].hora_inicio).not.toBe(result.assignments["b1"].hora_inicio);
  });

  it("falla si no hay slots suficientes para todo el cuadro", () => {
    const partidos: PartidoScheduleInput[] = [];
    for (let i = 0; i < 8; i++) {
      partidos.push(
        p({
          id: `pr${i}`,
          ronda: "primera_ronda",
          posicion: i,
          jugador1_id: `p${i * 2}`,
          jugador2_id: `p${i * 2 + 1}`,
        })
      );
    }
    for (let i = 0; i < 4; i++) {
      partidos.push(p({ id: `sr${i}`, ronda: "segunda_ronda", posicion: i, jugador1_id: null, jugador2_id: null }));
    }
    for (let i = 0; i < 2; i++) {
      partidos.push(p({ id: `cf${i}`, ronda: "cuartos", posicion: i, jugador1_id: null, jugador2_id: null }));
    }
    partidos.push(p({ id: "s0", ronda: "semis", posicion: 0, jugador1_id: null, jugador2_id: null }));
    partidos.push(p({ id: "s1", ronda: "semis", posicion: 1, jugador1_id: null, jugador2_id: null }));
    partidos.push(p({ id: "f0", ronda: "final", posicion: 0, jugador1_id: null, jugador2_id: null }));

    const slots = generarSlots("2026-06-05", "2026-06-05", 1);
    const result = asignarHorarios({ slots, partidos });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.sinSlot).toBeGreaterThan(0);
  });

  it("partido fijo mantiene su slot y no se reasigna", () => {
    const fijoHora = "2026-09-05T09:00:00-04:00";
    const partidos: PartidoScheduleInput[] = [
      p({
        id: "fijo",
        ronda: "cuartos",
        posicion: 0,
        hora_inicio: fijoHora,
        cancha: "1",
        started_at: "2026-09-05T09:05:00-04:00",
        ended_at: "2026-09-05T10:30:00-04:00",
        ganador_id: "a0",
      }),
      p({ id: "c1", ronda: "cuartos", posicion: 1, jugador1_id: "a2", jugador2_id: "a3" }),
      p({ id: "s0", ronda: "semis", posicion: 0, jugador1_id: null, jugador2_id: null }),
    ];
    const slots = generarSlots("2026-09-05", "2026-09-05", 1);
    const result = asignarHorarios({ slots, partidos });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.assignments["fijo"]).toBeUndefined();
    expect(result.assignments["c1"].hora_inicio).not.toBe(fijoHora);
    expect(ms(result.assignments["s0"].hora_inicio)).toBeGreaterThanOrEqual(
      ms(fijoHora) + REST_MINUTES * 60_000
    );
  });
});

describe("generarSlots", () => {
  it("genera slots en orden cronológico sin barajar", () => {
    const slots = generarSlots("2026-06-05", "2026-06-05", 2);
    expect(slots[0]).toEqual({ fechaISO: "2026-06-05T09:00:00-04:00", cancha: 1 });
    expect(slots[1]).toEqual({ fechaISO: "2026-06-05T09:00:00-04:00", cancha: 2 });
    expect(slots[2]).toEqual({ fechaISO: "2026-06-05T10:30:00-04:00", cancha: 1 });
  });

  it("respeta hora de inicio por dia de semana", () => {
    const slots = generarSlots("2026-06-04", "2026-06-04", 1, {
      jue: { inicio: "17:00", fin: "21:00" },
    });
    expect(slots[0].fechaISO).toBe("2026-06-04T17:00:00-04:00");
    expect(slots[1].fechaISO).toBe("2026-06-04T18:30:00-04:00");
    expect(slots[2].fechaISO).toBe("2026-06-04T20:00:00-04:00");
  });
});
