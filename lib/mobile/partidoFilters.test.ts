import { describe, it, expect } from "vitest";
import { filtrarPartidos } from "./partidoFilters";

const now = new Date("2026-09-02T15:00:00-04:00");
const base = {
  started_at: null as string | null,
  ended_at: null as string | null,
  ganador_id: null as string | null,
  jugador1: { id: "a" },
  jugador2: { id: "b" },
};

describe("filtrarPartidos", () => {
  it("hoy usa fecha America/Santiago de hora_inicio", () => {
    const list = [
      { ...base, hora_inicio: "2026-09-02T18:00:00.000Z" },
      { ...base, hora_inicio: "2026-09-01T18:00:00.000Z" },
    ];
    expect(filtrarPartidos(list, "hoy", now)).toHaveLength(1);
  });

  it("pendientes exige ambos jugadores y sin ganador", () => {
    const bye = { ...base, jugador2: null, ganador_id: "a", hora_inicio: null };
    const real = { ...base, hora_inicio: null };
    expect(filtrarPartidos([bye, real], "pendientes", now)).toEqual([real]);
  });

  it("en_curso es started sin ended y sin ganador", () => {
    const live = {
      ...base,
      started_at: now.toISOString(),
      ended_at: null,
      ganador_id: null,
      hora_inicio: null,
    };
    expect(filtrarPartidos([live], "en_curso", now)).toHaveLength(1);
  });
});
