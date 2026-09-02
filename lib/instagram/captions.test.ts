import { describe, it, expect } from "vitest";
import { buildCaption, filenameStory, hashtagCategoria, slugHashtag } from "./captions";
import type { CaptionInput } from "./types";

const base: CaptionInput = {
  tipo: "resultado",
  torneoNombre: "Torneo Fiestas Patrias",
  categoria: "cuarta",
  ronda: "final",
  lineaPrincipal: "Ana Pérez 6-4 6-2 Luis Soto",
  patrocinadores: [],
};

describe("slugHashtag", () => {
  it("normaliza nombre del torneo", () => {
    expect(slugHashtag("Torneo Fiestas Patrias")).toBe("torneofiestaspatrias");
  });
});

describe("hashtagCategoria", () => {
  it("usa la categoria real", () => {
    expect(hashtagCategoria("cuarta")).toBe("#cuarta");
    expect(hashtagCategoria("open")).toBe("#open");
  });
});

describe("buildCaption", () => {
  it("arma caption de resultado sin patrocinadores", () => {
    expect(buildCaption(base)).toBe(
      [
        "🎾 Final Cuarta — Torneo Fiestas Patrias",
        "Ana Pérez 6-4 6-2 Luis Soto",
        "#cuarta #torneofiestaspatrias #tenischile #mistorneos",
      ].join("\n")
    );
  });

  it("lista oros antes que platas", () => {
    const text = buildCaption({
      ...base,
      patrocinadores: [
        { nombre: "Banco Sur", nivel: "plata", activo: true },
        { nombre: "RedBull", nivel: "oro", activo: true },
        { nombre: "Inactivo SA", nivel: "oro", activo: false },
      ],
    });
    expect(text).toContain("Patrocinan: RedBull, Banco Sur");
    expect(text).not.toContain("Inactivo");
  });

  it("omite linea Patrocinan si no hay activos", () => {
    expect(buildCaption(base)).not.toContain("Patrocinan");
  });
});

describe("filenameStory", () => {
  it("usa tipo, slug y fecha", () => {
    expect(filenameStory("resultado", "cuarta", "2026-09-02")).toBe(
      "resultado-cuarta-2026-09-02.png"
    );
  });
});
