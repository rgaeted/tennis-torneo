import { describe, it, expect } from "vitest";
import { logosVisibles } from "./sponsors";
import type { PatrocinadorInput } from "./types";

function p(
  overrides: Partial<PatrocinadorInput> & Pick<PatrocinadorInput, "nombre" | "nivel">
): PatrocinadorInput {
  return { activo: true, orden: 0, logo_url: "https://x/logo.png", ...overrides };
}

describe("logosVisibles", () => {
  it("omite inactivos y sin logo", () => {
    const { oros, platas } = logosVisibles([
      p({ nombre: "A", nivel: "oro", activo: false }),
      p({ nombre: "B", nivel: "oro", logo_url: null }),
      p({ nombre: "C", nivel: "plata" }),
    ]);
    expect(oros).toHaveLength(0);
    expect(platas.map((x) => x.nombre)).toEqual(["C"]);
  });

  it("corta a 3 oros y 6 platas por orden ascendente", () => {
    const list: PatrocinadorInput[] = [];
    for (let i = 0; i < 5; i++) {
      list.push(p({ nombre: `O${i}`, nivel: "oro", orden: i }));
    }
    for (let i = 0; i < 8; i++) {
      list.push(p({ nombre: `P${i}`, nivel: "plata", orden: i }));
    }
    const { oros, platas } = logosVisibles(list);
    expect(oros.map((x) => x.nombre)).toEqual(["O0", "O1", "O2"]);
    expect(platas.map((x) => x.nombre)).toEqual(["P0", "P1", "P2", "P3", "P4", "P5"]);
  });
});
