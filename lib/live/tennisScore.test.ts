import { describe, it, expect } from "vitest";
import {
  awardPoint,
  removePoint,
  formatPunto,
  formatPuntos,
  isSetComplete,
  isMatchOver,
  setsWon,
  inTiebreak,
  stripPuntos,
  currentSetIndex,
} from "./tennisScore";
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

describe("cierre de set y partido", () => {
  it("game que pone 6–4 cierra el set y abre el siguiente", () => {
    let r: Resultado = [{ j1: 5, j2: 4, puntos: { j1: 3, j2: 0 } }];
    r = awardPoint(r, "j1");
    expect(r[0].j1).toBe(6);
    expect(r[0].j2).toBe(4);
    expect(isSetComplete(r[0])).toBe(true);
    expect(r).toHaveLength(2);
    expect(r[1]).toEqual({ j1: 0, j2: 0 });
  });

  it("6–5 no cierra; el siguiente game a 6–6 entra a tie-break", () => {
    let r: Resultado = [{ j1: 5, j2: 5, puntos: { j1: 3, j2: 1 } }];
    r = awardPoint(r, "j1");
    expect(r[0]).toMatchObject({ j1: 6, j2: 5 });
    expect(isSetComplete(r[0])).toBe(false);
    expect(r).toHaveLength(1);

    r = [{ j1: 6, j2: 5, puntos: { j1: 0, j2: 3 } }];
    r = awardPoint(r, "j2");
    expect(inTiebreak(r[0])).toBe(true);
    expect(r[0].tb).toEqual({ j1: 0, j2: 0 });
    expect(isSetComplete(r[0])).toBe(false);
  });

  it("tie-break a 7–5 cierra 7–6 y abre set si el partido sigue", () => {
    let r: Resultado = [{ j1: 6, j2: 6, tb: { j1: 6, j2: 5 } }];
    r = awardPoint(r, "j1");
    expect(r[0].j1).toBe(7);
    expect(r[0].j2).toBe(6);
    expect(r[0].tb).toEqual({ j1: 7, j2: 5 });
    expect(isSetComplete(r[0])).toBe(true);
    expect(r).toHaveLength(2);
  });

  it("tie-break 6–6 exige diferencia de 2", () => {
    let r: Resultado = [{ j1: 6, j2: 6, tb: { j1: 6, j2: 6 } }];
    r = awardPoint(r, "j1");
    expect(r[0].j1).toBe(6);
    expect(r[0].tb).toEqual({ j1: 7, j2: 6 });
    expect(isSetComplete(r[0])).toBe(false);
    r = awardPoint(r, "j1");
    expect(r[0].j1).toBe(7);
    expect(r[0].tb).toEqual({ j1: 8, j2: 6 });
    expect(isSetComplete(r[0])).toBe(true);
  });

  it("al llegar a 2 sets no abre un tercero y awardPoint es no-op", () => {
    let r: Resultado = [
      { j1: 6, j2: 4 },
      { j1: 5, j2: 3, puntos: { j1: 3, j2: 0 } },
    ];
    r = awardPoint(r, "j1");
    expect(setsWon(r, "j1")).toBe(2);
    expect(isMatchOver(r)).toBe(true);
    expect(r).toHaveLength(2);
    const after = awardPoint(r, "j2");
    expect(after).toEqual(r);
  });

  it("stripPuntos elimina puntos y conserva tb", () => {
    const r: Resultado = [
      { j1: 7, j2: 6, tb: { j1: 7, j2: 3 }, puntos: { j1: 1, j2: 0 } },
    ];
    expect(stripPuntos(r)[0]).toEqual({ j1: 7, j2: 6, tb: { j1: 7, j2: 3 } });
  });

  it("currentSetIndex apunta al primer set incompleto", () => {
    const r: Resultado = [{ j1: 6, j2: 4 }, { j1: 2, j2: 1, puntos: { j1: 0, j2: 1 } }];
    expect(currentSetIndex(r)).toBe(1);
  });
});
