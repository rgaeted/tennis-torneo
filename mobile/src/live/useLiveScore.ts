import { useCallback, useState } from "react";
import { apiFetch } from "../api/client";
import type { MobilePartido } from "../api/types";
import type { Player, Resultado } from "../../../lib/live/types";
import {
  awardPoint,
  currentSetIndex,
  formatPuntos,
  inTiebreak,
  isMatchOver,
  removePoint,
} from "../../../lib/live/tennisScore";

export function useLiveScore(
  partidoId: string,
  accessToken: string | null,
  initial: MobilePartido | null
) {
  const [resultado, setResultado] = useState<Resultado>(
    (initial?.resultado as Resultado) ?? [{ j1: 0, j2: 0 }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (next: Resultado) => {
      setSaving(true);
      setError(null);
      const res = await apiFetch("/api/live/score", accessToken, {
        method: "POST",
        body: JSON.stringify({ partidoId, resultado: next }),
      });
      setSaving(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar");
      }
    },
    [partidoId, accessToken]
  );

  const apply = useCallback(
    (next: Resultado) => {
      setResultado(next);
      void save(next);
    },
    [save]
  );

  const addPunto = useCallback(
    (player: Player) => apply(awardPoint(resultado, player)),
    [resultado, apply]
  );

  const subPunto = useCallback(
    (player: Player) => apply(removePoint(resultado, player)),
    [resultado, apply]
  );

  const updateGame = useCallback(
    (player: "j1" | "j2", delta: number) => {
      const idx = currentSetIndex(resultado);
      const next = resultado.map((s, i) =>
        i === idx ? { ...s, [player]: Math.max(0, s[player] + delta) } : s
      );
      apply(next);
    },
    [resultado, apply]
  );

  const finalizar = useCallback(async () => {
    setSaving(true);
    setError(null);
    const res = await apiFetch("/api/live/finalizar", accessToken, {
      method: "POST",
      body: JSON.stringify({ partidoId, resultado }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo finalizar");
      return false;
    }
    return true;
  }, [partidoId, accessToken, resultado]);

  const currentSet = currentSetIndex(resultado);
  const setActual = resultado[currentSet];
  const matchOver = isMatchOver(resultado);
  const tb = inTiebreak(setActual);

  return {
    resultado,
    currentSet,
    setActual,
    matchOver,
    tb,
    formatPuntos: () => formatPuntos(setActual.puntos ?? { j1: 0, j2: 0 }),
    addPunto,
    subPunto,
    updateGame,
    finalizar,
    saving,
    error,
  };
}
