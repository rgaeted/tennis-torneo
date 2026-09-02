import type { Player } from "./types";

export type HidBinding = { kind: "hid"; code: string; key: string };
export type BleBinding = { kind: "ble"; deviceId: string; deviceName: string };
export type ButtonBinding = HidBinding | BleBinding;
export type ScoreButtonBindings = { j1: ButtonBinding | null; j2: ButtonBinding | null };

export const BINDINGS_STORAGE_PREFIX = "score-buttons:";
export const DEFAULT_DEBOUNCE_MS = 400;

/** AB Shutter3 en modo iPhone envía Volume Up; no hace falta capturar la tecla. */
export const AB_SHUTTER3_IOS_BINDING: HidBinding = {
  kind: "hid",
  code: "AudioVolumeUp",
  key: "VolumeUp",
};

export function storageKey(partidoId: string): string {
  return `${BINDINGS_STORAGE_PREFIX}${partidoId}`;
}

export function bindingFromKeyboardEvent(e: { code: string; key: string }): HidBinding {
  return { kind: "hid", code: e.code, key: e.key };
}

const VOLUME_UP_CODES = new Set(["AudioVolumeUp", "VolumeUp"]);
const VOLUME_UP_KEYS = new Set(["AudioVolumeUp", "VolumeUp", "AudioVolumeUpChange"]);
const ENTER_CODES = new Set(["Enter", "NumpadEnter"]);

export function isAbShutter3Binding(binding: HidBinding): boolean {
  return binding.code === AB_SHUTTER3_IOS_BINDING.code;
}

export function isAbShutter3Key(e: { code: string; key: string }): boolean {
  return VOLUME_UP_CODES.has(e.code) || VOLUME_UP_KEYS.has(e.key) || ENTER_CODES.has(e.code) || e.key === "Enter";
}

export function eventMatchesBinding(e: { code: string; key: string }, binding: HidBinding): boolean {
  if (isAbShutter3Binding(binding)) return isAbShutter3Key(e);
  return e.code === binding.code || (e.code === "" && e.key === binding.key);
}

type TypingLike = {
  tagName?: string;
  isContentEditable?: boolean;
  dataset?: { scoreButtonCapture?: string };
};

export function isTypingTarget(target: EventTarget | TypingLike | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as TypingLike;
  if (el.dataset?.scoreButtonCapture === "true") return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el.isContentEditable;
}

export function parseBindings(raw: string | null): ScoreButtonBindings {
  const empty: ScoreButtonBindings = { j1: null, j2: null };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<ScoreButtonBindings>;
    return { j1: parsed.j1 ?? null, j2: parsed.j2 ?? null };
  } catch {
    return empty;
  }
}

export function serializeBindings(b: ScoreButtonBindings): string {
  return JSON.stringify(b);
}

export function shouldAcceptPress(lastAt: number, now: number, windowMs = DEFAULT_DEBOUNCE_MS): boolean {
  if (lastAt === 0) return true;
  return now - lastAt >= windowMs;
}

export function playerForKeyEvent(
  e: { code: string; key: string },
  bindings: ScoreButtonBindings,
): Player | null {
  if (bindings.j1?.kind === "hid" && eventMatchesBinding(e, bindings.j1)) return "j1";
  if (bindings.j2?.kind === "hid" && eventMatchesBinding(e, bindings.j2)) return "j2";
  return null;
}
