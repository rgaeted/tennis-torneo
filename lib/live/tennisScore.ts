import type { Player, Puntos, Resultado, SetScore } from "./types";

const LABELS = ["0", "15", "30", "40", "Ad"] as const;

export function other(player: Player): Player {
  return player === "j1" ? "j2" : "j1";
}

export function formatPunto(n: number): string {
  return LABELS[Math.min(Math.max(n, 0), 4)] ?? "0";
}

export function formatPuntos(p: Puntos): string {
  return `${formatPunto(p.j1)}–${formatPunto(p.j2)}`;
}

function clone(resultado: Resultado): Resultado {
  return resultado.map((s) => ({
    j1: s.j1,
    j2: s.j2,
    ...(s.tb ? { tb: { ...s.tb } } : {}),
    ...(s.puntos ? { puntos: { ...s.puntos } } : {}),
  }));
}

export function isSetComplete(set: SetScore): boolean {
  const { j1, j2 } = set;
  if ((j1 === 6 && j2 <= 4) || (j2 === 6 && j1 <= 4)) return true;
  if ((j1 === 7 && j2 === 5) || (j2 === 7 && j1 === 5)) return true;
  const esTbGames = (j1 === 7 && j2 === 6) || (j2 === 7 && j1 === 6);
  if (!esTbGames || !set.tb) return false;
  const max = Math.max(set.tb.j1, set.tb.j2);
  const min = Math.min(set.tb.j1, set.tb.j2);
  return max >= 7 && max - min >= 2;
}

export function setsWon(resultado: Resultado, player: Player): number {
  const rival = other(player);
  return resultado.filter((s) => isSetComplete(s) && s[player] > s[rival]).length;
}

export function isMatchOver(resultado: Resultado): boolean {
  return setsWon(resultado, "j1") >= 2 || setsWon(resultado, "j2") >= 2;
}

export function currentSetIndex(resultado: Resultado): number {
  const i = resultado.findIndex((s) => !isSetComplete(s));
  return i === -1 ? Math.max(0, resultado.length - 1) : i;
}

export function inTiebreak(set: SetScore): boolean {
  return set.j1 === 6 && set.j2 === 6;
}

export function stripPuntos(resultado: Resultado): Resultado {
  return resultado.map((s) => {
    const next: SetScore = { j1: s.j1, j2: s.j2 };
    if (s.tb) next.tb = { ...s.tb };
    return next;
  });
}

function maybeOpenNextSet(next: Resultado): void {
  if (!isMatchOver(next)) next.push({ j1: 0, j2: 0 });
}

export function awardPoint(resultado: Resultado, player: Player): Resultado {
  if (resultado.length === 0 || isMatchOver(resultado)) return clone(resultado);
  const next = clone(resultado);
  const i = currentSetIndex(next);
  const set = next[i];
  const rival = other(player);

  if (inTiebreak(set)) {
    const tb = set.tb ?? { j1: 0, j2: 0 };
    tb[player] += 1;
    set.tb = tb;
    const provisional: SetScore = {
      j1: tb.j1 > tb.j2 ? 7 : 6,
      j2: tb.j2 > tb.j1 ? 7 : 6,
      tb,
    };
    if (isSetComplete(provisional)) {
      set.j1 = provisional.j1;
      set.j2 = provisional.j2;
      maybeOpenNextSet(next);
    }
    return next;
  }

  const puntos = set.puntos ?? { j1: 0, j2: 0 };
  const mine = puntos[player];
  const theirs = puntos[rival];
  let wonGame = false;
  if (mine === 3 && theirs === 3) puntos[player] = 4;
  else if (mine === 3 && theirs === 4) {
    puntos[player] = 3;
    puntos[rival] = 3;
  } else if ((mine === 3 && theirs < 3) || (mine === 4 && theirs === 3)) wonGame = true;
  else if (mine < 3) puntos[player] = mine + 1;

  if (!wonGame) {
    set.puntos = puntos;
    return next;
  }

  set[player] += 1;
  delete set.puntos;
  if (inTiebreak(set)) {
    set.tb = { j1: 0, j2: 0 };
    return next;
  }
  if (isSetComplete(set)) maybeOpenNextSet(next);
  return next;
}

export function removePoint(resultado: Resultado, player: Player): Resultado {
  const next = clone(resultado);
  const set = next[currentSetIndex(next)];
  if (!set.puntos) return next;
  set.puntos = { ...set.puntos, [player]: Math.max(0, set.puntos[player] - 1) };
  return next;
}
