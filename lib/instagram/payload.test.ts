import { describe, it, expect } from "vitest";
import {
  formatScore,
  campeonDeFinal,
  logroJugador,
  lineaPrincipalDePayload,
} from "./payload";
import type { PartidoStoryRow, StoryPayload } from "./types";

const ana = { id: "a", nombre: "Ana", apellido: "Pérez", foto_url: null };
const luis = { id: "l", nombre: "Luis", apellido: "Soto", foto_url: null };

describe("formatScore", () => {
  it("une sets con espacio", () => {
    expect(formatScore([{ j1: 6, j2: 4 }, { j1: 6, j2: 2 }])).toBe("6-4 6-2");
  });
  it("retorna vacio si no hay sets", () => {
    expect(formatScore(null)).toBe("");
  });
});

describe("campeonDeFinal", () => {
  it("retorna el ganador de la final", () => {
    const partidos: PartidoStoryRow[] = [
      {
        id: "f",
        ronda: "final",
        posicion: 0,
        ganador_id: "a",
        resultado: [{ j1: 6, j2: 3 }],
        jugador1_id: "a",
        jugador2_id: "l",
        jugador1: ana,
        jugador2: luis,
      },
    ];
    expect(campeonDeFinal(partidos)?.id).toBe("a");
  });
  it("retorna null si la final no tiene ganador", () => {
    expect(
      campeonDeFinal([
        {
          id: "f",
          ronda: "final",
          posicion: 0,
          ganador_id: null,
          resultado: null,
          jugador1_id: "a",
          jugador2_id: "l",
          jugador1: ana,
          jugador2: luis,
        },
      ])
    ).toBeNull();
  });
});

describe("logroJugador", () => {
  it("usa la ronda mas avanzada donde aparece", () => {
    const partidos: PartidoStoryRow[] = [
      {
        id: "c",
        ronda: "cuartos",
        posicion: 0,
        ganador_id: "a",
        resultado: null,
        jugador1_id: "a",
        jugador2_id: "l",
        jugador1: ana,
        jugador2: luis,
      },
      {
        id: "s",
        ronda: "semis",
        posicion: 0,
        ganador_id: "l",
        resultado: null,
        jugador1_id: "a",
        jugador2_id: "l",
        jugador1: ana,
        jugador2: luis,
      },
    ];
    expect(logroJugador("a", partidos)).toBe("Semifinal");
  });
});

describe("lineaPrincipalDePayload", () => {
  it("resultado usa nombres y score", () => {
    const payload: StoryPayload = {
      tipo: "resultado",
      torneoNombre: "X",
      clubNombre: null,
      clubImagenUrl: null,
      patrocinadores: [],
      categoria: "cuarta",
      ronda: "final",
      j1: ana,
      j2: luis,
      score: "6-4 6-2",
    };
    expect(lineaPrincipalDePayload(payload)).toBe("Ana Pérez 6-4 6-2 Luis Soto");
  });
});
