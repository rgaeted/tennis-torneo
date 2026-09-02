"use client";
import { useEffect, useRef } from "react";
import { useScoreButtons } from "@/lib/live/useScoreButtons";
import { AB_SHUTTER3_IOS_BINDING } from "@/lib/live/buttonBindings";
import { isIosSafari } from "@/lib/live/platform";
import type { Player } from "@/lib/live/types";

export default function BluetoothButtons({
  partidoId, j1Name, j2Name, onPoint, selfPlayer,
}: {
  partidoId: string;
  j1Name: string;
  j2Name: string;
  onPoint: (player: Player) => void;
  selfPlayer?: Player | null;
}) {
  const {
    bindings, capturing, bleSupported, error,
    beginHidCapture, assignAbShutter3, cancelCapture, connectBle, disconnect,
    keepCaptureFocus,
  } = useScoreButtons(partidoId, onPoint);

  const iosSafari = isIosSafari();
  const captureRef = useRef<HTMLInputElement>(null);
  const slots: Player[] = selfPlayer ? [selfPlayer] : ["j1", "j2"];

  useEffect(() => {
    if (!keepCaptureFocus) return;
    const el = captureRef.current;
    if (!el) return;
    const focus = () => el.focus({ preventScroll: true });
    focus();
    const onVis = () => { if (document.visibilityState === "visible") focus(); };
    const onClick = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.closest("button") || t.closest("a"))) {
        window.setTimeout(focus, 300);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("click", onClick);
    };
  }, [keepCaptureFocus]);

  function bindingLabel(b: typeof bindings.j1) {
    if (!b) return "";
    if (b.kind === "ble") return b.deviceName;
    if (b.code === AB_SHUTTER3_IOS_BINDING.code) return "AB Shutter3";
    return `Tecla ${b.code}`;
  }

  return (
    <div className="w-full max-w-sm bg-navy-900 border border-navy-700 rounded-2xl p-5 space-y-4">
      <p className="text-court text-xs font-bold uppercase tracking-widest text-center">
        Botón Bluetooth
      </p>
      {keepCaptureFocus && (
        <input
          ref={captureRef}
          data-score-button-capture="true"
          readOnly
          inputMode="none"
          autoComplete="off"
          aria-label="Captura del mando Bluetooth"
          className="sr-only absolute -left-[9999px] h-px w-px opacity-0"
          onBlur={(e) => {
            const next = e.relatedTarget;
            if (next instanceof HTMLElement && (next.closest("button") || next.closest("a") || next.closest("input"))) return;
            requestAnimationFrame(() => captureRef.current?.focus({ preventScroll: true }));
          }}
        />
      )}
      <p className="text-xs text-slate-500 text-center">
        {iosSafari
          ? "Usa el botón Android del AB Shutter3 (el que no es el de cámara). El de iOS solo sube el volumen y Safari no lo entrega a la web. Dejá esta pantalla abierta y no tapées otro campo."
          : "Empareja un mando selfie o presentador. Primero conéctalo en el Bluetooth del teléfono, luego pulsa Conectar y aprieta el botón."}
      </p>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      {slots.map((player) => {
        const name = player === "j1" ? j1Name : j2Name;
        const bound = bindings[player];
        return (
          <div key={player} className="space-y-2">
            <p className="text-sm text-white text-center">{selfPlayer ? "Mi botón" : name}</p>
            {bound ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ball truncate">
                  {bindingLabel(bound)}
                </span>
                <button
                  type="button"
                  onClick={() => disconnect(player)}
                  className="text-xs text-slate-400 hover:text-white border border-navy-600 rounded-lg px-3 py-1.5"
                >
                  Desconectar
                </button>
              </div>
            ) : capturing === player ? (
              <div className="space-y-2 text-center">
                <p className="text-sm text-ball">Pulsa el botón de {name}…</p>
                <button type="button" onClick={cancelCapture} className="text-xs text-slate-500 hover:text-white">
                  Cancelar
                </button>
              </div>
            ) : iosSafari ? (
              <button
                type="button"
                onClick={() => assignAbShutter3(player)}
                className="w-full py-2 rounded-xl bg-court text-white text-sm font-semibold hover:bg-court-dark"
              >
                AB Shutter3 (iPhone)
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => beginHidCapture(player)}
                  className="flex-1 py-2 rounded-xl bg-court text-white text-sm font-semibold hover:bg-court-dark"
                >
                  Conectar mando
                </button>
                {bleSupported && (
                  <button
                    type="button"
                    onClick={() => void connectBle(player)}
                    className="flex-1 py-2 rounded-xl border border-navy-600 text-slate-300 text-sm hover:bg-navy-800"
                  >
                    Sensor BLE
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
