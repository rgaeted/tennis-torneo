import { describe, it, expect } from "vitest";
import { awardPoint, removePoint, formatPunto, formatPuntos } from "./tennisScore";
import type { Resultado } from "./types";

const vacío = (): Resultado => [{ j1: 0, j2: 0 }];

describe("formatPunto", () => {
  it("mapea 0–4 a etiquetas de tenis", () => {
    expect(formatPunto(0)).toBe("0");
    expect(formatPunto(1)).toBe("15");
    expect(formatPunto(2)).toBe("30");
    expect(formatPunto(3)).toBe("40");
    expect(formatPunto(4)).toBe("Ad");
  });
});

describe("formatPuntos", () => {
  it("formatea el game con en-dash", () => {
    expect(formatPuntos({ j1: 1, j2: 0 })).toBe("15–0");
    expect(formatPuntos({ j1: 3, j2: 3 })).toBe("40–40");
    expect(formatPuntos({ j1: 4, j2: 3 })).toBe("Ad–40");
  });
});

describe("awardPoint — game regular", () => {
  it("0 → 15 → 30 → 40", () => {
    let r = vacío();
    r = awardPoint(r, "j1");
    expect(r[0].puntos).toEqual({ j1: 1, j2: 0 });
    r = awardPoint(r, "j1");
    expect(r[0].puntos).toEqual({ j1: 2, j2: 0 });
    r = awardPoint(r, "j1");
    expect(r[0].puntos).toEqual({ j1: 3, j2: 0 });
  });

  it("game ganado desde 40–0 resetea puntos e incrementa games", () => {
    let r: Resultado = [{ j1: 0, j2: 0, puntos: { j1: 3, j2: 0 } }];
    r = awardPoint(r, "j1");
    expect(r[0].j1).toBe(1);
    expect(r[0].j2).toBe(0);
    expect(r[0].puntos).toBeUndefined();
  });

  it("40–40 → Ad, Ad + punto del que tiene Ad → game", () => {
    let r: Resultado = [{ j1: 0, j2: 0, puntos: { j1: 3, j2: 3 } }];
    r = awardPoint(r, "j2");
    expect(r[0].puntos).toEqual({ j1: 3, j2: 4 });
    r = awardPoint(r, "j2");
    expect(r[0].j2).toBe(1);
    expect(r[0].puntos).toBeUndefined();
  });

  it("Ad del rival + punto propio vuelve a 40–40", () => {
    let r: Resultado = [{ j1: 0, j2: 0, puntos: { j1: 4, j2: 3 } }];
    r = awardPoint(r, "j2");
    expect(r[0].puntos).toEqual({ j1: 3, j2: 3 });
  });

  it("no muta el resultado original", () => {
    const r: Resultado = [{ j1: 0, j2: 0, puntos: { j1: 1, j2: 0 } }];
    awardPoint(r, "j1");
    expect(r[0].puntos).toEqual({ j1: 1, j2: 0 });
  });
});

describe("removePoint", () => {
  it("baja un punto del jugador y no baja de 0", () => {
    let r: Resultado = [{ j1: 0, j2: 0, puntos: { j1: 2, j2: 1 } }];
    r = removePoint(r, "j1");
    expect(r[0].puntos).toEqual({ j1: 1, j2: 1 });
    r = removePoint(r, "j1");
    r = removePoint(r, "j1");
    expect(r[0].puntos).toEqual({ j1: 0, j2: 1 });
  });
});
