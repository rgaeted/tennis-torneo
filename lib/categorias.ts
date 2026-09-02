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

/** Colores distintivos por categoría para calendario y leyendas. */
export const CATEGORIA_COLORS: Record<Categoria, { bg: string; border: string; text: string }> = {
  open:    { bg: "rgba(200,255,0,0.18)",  border: "#C8FF00", text: "#C8FF00" },
  primera: { bg: "rgba(255,107,107,0.18)", border: "#FF6B6B", text: "#FF6B6B" },
  segunda: { bg: "rgba(78,205,196,0.18)", border: "#4ECDC4", text: "#4ECDC4" },
  tercera: { bg: "rgba(255,217,61,0.18)", border: "#FFD93D", text: "#FFD93D" },
  cuarta:  { bg: "rgba(107,203,255,0.18)", border: "#6BCBFF", text: "#6BCBFF" },
  damas:   { bg: "rgba(199,125,255,0.18)", border: "#C77DFF", text: "#C77DFF" },
  dobles:  { bg: "rgba(255,146,43,0.18)",  border: "#FF922B", text: "#FF922B" },
};

export function colorCategoria(categoria: string) {
  return CATEGORIA_COLORS[categoria as Categoria] ?? CATEGORIA_COLORS.cuarta;
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
