import { describe, it, expect } from "vitest";
import {
  codigoAlimentador,
  codigoPartido,
  inferirPrimeraRonda,
  labelSlot,
  labelsPartido,
  primeraRondaDelCuadro,
} from "./matchLabels";

describe("matchLabels", () => {
  it("genera codigos de partido por ronda", () => {
    expect(codigoPartido("primera_ronda", 0)).toBe("1R-1");
    expect(codigoPartido("segunda_ronda", 2)).toBe("2R-3");
    expect(codigoPartido("cuartos", 1)).toBe("C-2");
    expect(codigoPartido("semis", 0)).toBe("S-1");
    expect(codigoPartido("final", 0)).toBe("F");
  });

  it("primera ronda depende del tamano del cuadro", () => {
    expect(primeraRondaDelCuadro(8)).toBe("cuartos");
    expect(primeraRondaDelCuadro(16)).toBe("primera_ronda");
  });

  it("BYE solo en la primera ronda del cuadro", () => {
    expect(
      labelSlot({
        ronda: "primera_ronda",
        posicion: 0,
        slot: "j2",
        jugadorId: null,
        jugador: null,
        primeraRonda: "primera_ronda",
      })
    ).toBe("BYE");

    expect(
      labelSlot({
        ronda: "segunda_ronda",
        posicion: 0,
        slot: "j1",
        jugadorId: null,
        jugador: null,
        primeraRonda: "primera_ronda",
      })
    ).toBe("G. 1R-1");
  });

  it("cuartos es primera ronda en cuadro de 8", () => {
    const primera = primeraRondaDelCuadro(8);
    expect(
      labelsPartido({
        ronda: "semis",
        posicion: 0,
        jugador1_id: null,
        jugador2_id: null,
        jugador1: null,
        jugador2: null,
        primeraRonda: primera,
      })
    ).toEqual({ j1: "G. C-1", j2: "G. C-2" });
  });

  it("inferirPrimeraRonda desde partidos existentes", () => {
    expect(
      inferirPrimeraRonda([
        { ronda: "cuartos" },
        { ronda: "semis" },
      ])
    ).toBe("cuartos");
  });

  it("codigoAlimentador apunta al partido previo correcto", () => {
    expect(codigoAlimentador("cuartos", 1, "j2")).toBe("2R-4");
    expect(codigoAlimentador("semis", 0, "j1")).toBe("C-1");
  });
});
