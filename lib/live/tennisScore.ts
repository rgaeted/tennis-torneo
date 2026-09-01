import type { Player, Puntos, Resultado } from "./types";

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

function currentIndex(resultado: Resultado): number {
  return Math.max(0, resultado.length - 1);
}

export function awardPoint(resultado: Resultado, player: Player): Resultado {
  const next = clone(resultado);
  const i = currentIndex(next);
  const set = next[i];
  const rival = other(player);
  const puntos = set.puntos ?? { j1: 0, j2: 0 };
  const mine = puntos[player];
  const theirs = puntos[rival];

  let wonGame = false;
  if (mine === 3 && theirs === 3) {
    puntos[player] = 4;
  } else if (mine === 3 && theirs === 4) {
    puntos[player] = 3;
    puntos[rival] = 3;
  } else if (mine === 3 && theirs < 3) {
    wonGame = true;
  } else if (mine === 4 && theirs === 3) {
    wonGame = true;
  } else if (mine < 3) {
    puntos[player] = mine + 1;
  }

  if (wonGame) {
    set[player] += 1;
    delete set.puntos;
  } else {
    set.puntos = puntos;
  }
  return next;
}

export function removePoint(resultado: Resultado, player: Player): Resultado {
  const next = clone(resultado);
  const set = next[currentIndex(next)];
  if (!set.puntos) return next;
  set.puntos = { ...set.puntos, [player]: Math.max(0, set.puntos[player] - 1) };
  return next;
}
