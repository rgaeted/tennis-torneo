"use client";
import { useScoreButtons } from "@/lib/live/useScoreButtons";
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
    beginHidCapture, cancelCapture, connectBle, disconnect,
  } = useScoreButtons(partidoId, onPoint);

  const slots: Player[] = selfPlayer ? [selfPlayer] : ["j1", "j2"];

  return (
    <div className="w-full max-w-sm bg-navy-900 border border-navy-700 rounded-2xl p-5 space-y-4">
      <p className="text-court text-xs font-bold uppercase tracking-widest text-center">
        Botón Bluetooth
      </p>
      <p className="text-xs text-slate-500 text-center">
        Empareja un mando selfie o presentador. Primero conéctalo en el Bluetooth del teléfono, luego pulsa Conectar y aprieta el botón.
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
                  {bound.kind === "hid" ? `Tecla ${bound.code}` : bound.deviceName}
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
