import type { Database } from "@/lib/supabase/types";

export type Categoria = Database["public"]["Enums"]["categoria_tipo"];

/** All categories, strongest first (admin selectors, ranking tabs, home links). */
export const CATEGORIAS_ORDEN: Categoria[] = [
  "open",
  "primera",
  "segunda",
  "tercera",
  "cuarta",
  "damas",
  "dobles",
];

export function labelCategoria(c: Categoria): string {
  return c === "open" ? "Open" : c.charAt(0).toUpperCase() + c.slice(1);
}

export const PUNTOS_RANKING = {
  open:    { campeon: 700, finalista: 400, semis: 200, cuartos: 100, primera_ronda: 35 },
  primera: { campeon: 500, finalista: 300, semis: 150, cuartos: 75,  primera_ronda: 25 },
  segunda: { campeon: 350, finalista: 200, semis: 100, cuartos: 50,  primera_ronda: 15 },
  damas:   { campeon: 300, finalista: 180, semis: 90,  cuartos: 45,  primera_ronda: 12 },
  tercera: { campeon: 200, finalista: 120, semis: 60,  cuartos: 30,  primera_ronda: 8  },
  dobles:  { campeon: 150, finalista: 90,  semis: 45,  cuartos: 20,  primera_ronda: 6  },
  cuarta:  { campeon: 100, finalista: 60,  semis: 30,  cuartos: 15,  primera_ronda: 5  },
} as const satisfies Record<Categoria, Record<string, number>>;
