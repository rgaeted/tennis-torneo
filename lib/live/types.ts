export type Player = "j1" | "j2";

export type Puntos = { j1: number; j2: number };

export type SetScore = {
  j1: number;
  j2: number;
  tb?: { j1: number; j2: number };
  puntos?: Puntos;
};

export type Resultado = SetScore[];
