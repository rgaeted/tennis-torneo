import { describe, it, expect } from "vitest";
import { isStaffRol, isStaffForTorneo } from "./staffAccess";

describe("isStaffRol", () => {
  it("acepta admin organizador y turno", () => {
    expect(isStaffRol("admin")).toBe(true);
    expect(isStaffRol("organizador")).toBe(true);
    expect(isStaffRol("turno")).toBe(true);
  });
  it("rechaza jugador y vacio", () => {
    expect(isStaffRol("jugador")).toBe(false);
    expect(isStaffRol(null)).toBe(false);
  });
});

describe("isStaffForTorneo", () => {
  const torneoOrg = { organizacion_id: "org-1" };
  const torneoSinOrg = { organizacion_id: null };

  it("admin y turno entran a cualquier torneo", () => {
    expect(isStaffForTorneo({ rol: "admin", organizacion_id: null }, torneoOrg)).toBe(true);
    expect(isStaffForTorneo({ rol: "turno", organizacion_id: null }, torneoSinOrg)).toBe(true);
  });
  it("organizador solo si coincide organizacion_id", () => {
    expect(isStaffForTorneo({ rol: "organizador", organizacion_id: "org-1" }, torneoOrg)).toBe(true);
    expect(isStaffForTorneo({ rol: "organizador", organizacion_id: "org-2" }, torneoOrg)).toBe(false);
    expect(isStaffForTorneo({ rol: "organizador", organizacion_id: "org-1" }, torneoSinOrg)).toBe(false);
  });
  it("jugador nunca", () => {
    expect(isStaffForTorneo({ rol: "jugador", organizacion_id: "org-1" }, torneoOrg)).toBe(false);
  });
});
