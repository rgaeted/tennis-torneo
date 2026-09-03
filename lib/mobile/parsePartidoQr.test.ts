import { describe, it, expect } from "vitest";
import { parsePartidoIdFromQr } from "./parsePartidoQr";

const id = "11111111-1111-1111-1111-111111111111";

describe("parsePartidoIdFromQr", () => {
  it("acepta URL live", () => {
    expect(parsePartidoIdFromQr(`https://mistorneos.cl/live/${id}`)).toBe(id);
  });
  it("acepta deep link", () => {
    expect(parsePartidoIdFromQr(`mistorneos://partido/${id}`)).toBe(id);
  });
  it("acepta UUID suelto", () => {
    expect(parsePartidoIdFromQr(id)).toBe(id);
  });
  it("rechaza basura", () => {
    expect(parsePartidoIdFromQr("https://google.com")).toBeNull();
  });
});
