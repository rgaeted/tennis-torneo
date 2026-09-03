import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  AB_SHUTTER3_IOS_BINDING,
  DEVICE_BINDINGS_STORAGE_KEY,
  parseBindings,
  serializeBindings,
  type ButtonBinding,
  type ScoreButtonBindings,
} from "../../../lib/live/buttonBindings";
import type { Player } from "../../../lib/live/types";

export function useDeviceBindings() {
  const [bindings, setBindings] = useState<ScoreButtonBindings>({ j1: null, j2: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(DEVICE_BINDINGS_STORAGE_KEY).then((raw) => {
      setBindings(parseBindings(raw));
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (next: ScoreButtonBindings) => {
    setBindings(next);
    await AsyncStorage.setItem(DEVICE_BINDINGS_STORAGE_KEY, serializeBindings(next));
  }, []);

  const assignAbShutter3 = useCallback(
    (player: Player) => persist({ ...bindings, [player]: AB_SHUTTER3_IOS_BINDING }),
    [bindings, persist]
  );

  const assignHid = useCallback(
    (player: Player, code: string, key: string) =>
      persist({ ...bindings, [player]: { kind: "hid", code, key } }),
    [bindings, persist]
  );

  const clear = useCallback(
    (player: Player) => persist({ ...bindings, [player]: null }),
    [bindings, persist]
  );

  return { bindings, loading, assignAbShutter3, assignHid, clear };
}

export type { ButtonBinding, ScoreButtonBindings };
