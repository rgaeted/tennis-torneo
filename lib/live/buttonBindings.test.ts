import { describe, it, expect } from "vitest";
import {
  bindingFromKeyboardEvent,
  eventMatchesBinding,
  parseBindings,
  serializeBindings,
  shouldAcceptPress,
  playerForKeyEvent,
  storageKey,
} from "./buttonBindings";

describe("storageKey", () => {
  it("namespaced por partido", () => {
    expect(storageKey("abc")).toBe("score-buttons:abc");
  });
});

describe("HID binding", () => {
  it("captura code y key", () => {
    expect(bindingFromKeyboardEvent({ code: "AudioVolumeUp", key: "AudioVolumeUp" })).toEqual({
      kind: "hid",
      code: "AudioVolumeUp",
      key: "AudioVolumeUp",
    });
  });

  it("matchea por code aunque key cambie", () => {
    const b = bindingFromKeyboardEvent({ code: "KeyA", key: "a" });
    expect(eventMatchesBinding({ code: "KeyA", key: "A" }, b)).toBe(true);
    expect(eventMatchesBinding({ code: "KeyB", key: "a" }, b)).toBe(false);
  });
});

describe("serialize/parse", () => {
  it("roundtrip y default vacío", () => {
    expect(parseBindings(null)).toEqual({ j1: null, j2: null });
    const original = {
      j1: { kind: "hid" as const, code: "KeyQ", key: "q" },
      j2: { kind: "ble" as const, deviceId: "xx", deviceName: "ITAG" },
    };
    expect(parseBindings(serializeBindings(original))).toEqual(original);
  });

  it("JSON inválido no tira", () => {
    expect(parseBindings("{nope")).toEqual({ j1: null, j2: null });
  });
});

describe("shouldAcceptPress", () => {
  it("rechaza dentro de 400ms y acepta después", () => {
    expect(shouldAcceptPress(1000, 1200)).toBe(false);
    expect(shouldAcceptPress(1000, 1400)).toBe(true);
    expect(shouldAcceptPress(0, 1)).toBe(true);
  });
});

describe("playerForKeyEvent", () => {
  it("resuelve j1 / j2 / null", () => {
    const bindings = {
      j1: { kind: "hid" as const, code: "KeyQ", key: "q" },
      j2: { kind: "hid" as const, code: "KeyP", key: "p" },
    };
    expect(playerForKeyEvent({ code: "KeyQ", key: "q" }, bindings)).toBe("j1");
    expect(playerForKeyEvent({ code: "KeyP", key: "p" }, bindings)).toBe("j2");
    expect(playerForKeyEvent({ code: "Space", key: " " }, bindings)).toBeNull();
  });
});
