"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Player } from "./types";
import {
  bindingFromKeyboardEvent,
  parseBindings,
  playerForKeyEvent,
  serializeBindings,
  shouldAcceptPress,
  storageKey,
  type ScoreButtonBindings,
} from "./buttonBindings";
import { connectBleNotifyButton, type BluetoothRequestApi } from "./bleButton";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useScoreButtons(partidoId: string, onPoint: (player: Player) => void) {
  const [bindings, setBindings] = useState<ScoreButtonBindings>({ j1: null, j2: null });
  const [capturing, setCapturing] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPressAt = useRef<Record<Player, number>>({ j1: 0, j2: 0 });
  const bleStops = useRef<Partial<Record<Player, () => Promise<void>>>>({});
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;
  const capturingRef = useRef(capturing);
  capturingRef.current = capturing;
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  const bleSupported = typeof navigator !== "undefined" && "bluetooth" in navigator;

  useEffect(() => {
    setBindings(parseBindings(sessionStorage.getItem(storageKey(partidoId))));
  }, [partidoId]);

  useEffect(() => {
    sessionStorage.setItem(storageKey(partidoId), serializeBindings(bindings));
  }, [partidoId, bindings]);

  const tryPoint = useCallback((player: Player) => {
    const now = Date.now();
    if (!shouldAcceptPress(lastPressAt.current[player], now)) return;
    lastPressAt.current[player] = now;
    onPointRef.current(player);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || isTypingTarget(e.target)) return;
      if (capturingRef.current) {
        e.preventDefault();
        const player = capturingRef.current;
        setBindings((prev) => ({ ...prev, [player]: bindingFromKeyboardEvent(e) }));
        setCapturing(null);
        setError(null);
        return;
      }
      const player = playerForKeyEvent(e, bindingsRef.current);
      if (!player) return;
      e.preventDefault();
      e.stopPropagation();
      tryPoint(player);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tryPoint]);

  useEffect(() => {
    return () => {
      void Promise.all(Object.values(bleStops.current).map((stop) => stop?.()));
    };
  }, []);

  return {
    bindings,
    capturing,
    bleSupported,
    error,
    beginHidCapture: (player: Player) => { setError(null); setCapturing(player); },
    cancelCapture: () => setCapturing(null),
    connectBle: async (player: Player) => {
      setError(null);
      if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
        setError("Este navegador no soporta Web Bluetooth. Empareja un mando como teclado.");
        return;
      }
      try {
        await bleStops.current[player]?.();
        const handle = await connectBleNotifyButton(
          navigator.bluetooth as BluetoothRequestApi,
          () => tryPoint(player),
        );
        bleStops.current[player] = handle.stop;
        setBindings((prev) => ({
          ...prev,
          [player]: { kind: "ble", deviceId: handle.deviceId, deviceName: handle.deviceName },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo conectar el sensor BLE");
      }
    },
    disconnect: (player: Player) => {
      void bleStops.current[player]?.();
      delete bleStops.current[player];
      setBindings((prev) => ({ ...prev, [player]: null }));
    },
  };
}
