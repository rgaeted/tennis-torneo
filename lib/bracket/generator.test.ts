import { describe, it, expect } from "vitest";
import { generarPartidosEliminacion, calcularRondas, siguienteRonda } from "./generator";

describe("generarPartidosEliminacion", () => {
  it("genera 15 partidos para un bracket de 16", () => {
    const jugadores = Array.from({ length: 16 }, (_, i) => `jugador-${i}`);
    const partidos = generarPartidosEliminacion(jugadores, 16);
    expect(partidos).toHaveLength(15); // 8 + 4 + 2 + 1
  });

  it("genera 31 partidos para un bracket de 32", () => {
    const jugadores = Array.from({ length: 32 }, (_, i) => `jugador-${i}`);
    const partidos = generarPartidosEliminacion(jugadores, 32);
    expect(partidos).toHaveLength(31);
  });

  it("los partidos de primera ronda tienen ambos jugadores asignados", () => {
    const jugadores = Array.from({ length: 16 }, (_, i) => `jugador-${i}`);
    const partidos = generarPartidosEliminacion(jugadores, 16);
    const primeraRonda = partidos.filter((p) => p.ronda === "primera_ronda");
    expect(primeraRonda).toHaveLength(8);
    primeraRonda.forEach((p) => {
      expect(p.jugador1_id).toBeTruthy();
      expect(p.jugador2_id).toBeTruthy();
    });
  });

  it("rondas posteriores no tienen jugadores aún (se asignan al avanzar)", () => {
    const jugadores = Array.from({ length: 16 }, (_, i) => `jugador-${i}`);
    const partidos = generarPartidosEliminacion(jugadores, 16);
    const segundaRonda = partidos.filter((p) => p.ronda === "segunda_ronda");
    expect(segundaRonda).toHaveLength(4);
    segundaRonda.forEach((p) => {
      expect(p.jugador1_id).toBeNull();
      expect(p.jugador2_id).toBeNull();
    });
  });

  it("lanza error si hay más jugadores que posiciones en el bracket", () => {
    const jugadores = Array.from({ length: 20 }, (_, i) => `jugador-${i}`);
    expect(() => generarPartidosEliminacion(jugadores, 16)).toThrow();
  });

  it("acepta menos jugadores que el tamaño del bracket (con byes)", () => {
    const jugadores = Array.from({ length: 12 }, (_, i) => `jugador-${i}`);
    const slots = [...jugadores];
    while (slots.length < 16) slots.push("bye");
    const partidos = generarPartidosEliminacion(slots, 16);
    expect(partidos).toHaveLength(15);
  });
});

describe("calcularRondas", () => {
  it("retorna las rondas correctas para bracket 16", () => {
    expect(calcularRondas(16)).toEqual(["primera_ronda", "segunda_ronda", "cuartos", "semis", "final"]);
  });

  it("retorna las rondas correctas para bracket 32", () => {
    expect(calcularRondas(32)).toEqual(["primera_ronda", "segunda_ronda", "cuartos", "semis", "final"]);
  });
});
