import { labelCategoria, type Categoria } from "../categorias";
import type { CaptionInput, PatrocinadorInput } from "./types";

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda",
  segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos",
  semis: "Semifinal",
  final: "Final",
};

export function slugHashtag(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function hashtagCategoria(categoria: string): string {
  return `#${categoria.toLowerCase()}`;
}

function headline(input: CaptionInput): string {
  const ronda = input.ronda ? (RONDA_LABELS[input.ronda] ?? input.ronda) : null;
  const cat = input.categoria
    ? labelCategoria(input.categoria as Categoria)
    : null;
  const bits = ["🎾", ronda, cat].filter(Boolean);
  return `${bits.join(" ")} — ${input.torneoNombre}`;
}

function lineaPatrocinan(patrocinadores: PatrocinadorInput[]): string | null {
  const activos = patrocinadores.filter((p) => p.activo);
  const oros = activos.filter((p) => p.nivel === "oro").map((p) => p.nombre);
  const platas = activos.filter((p) => p.nivel === "plata").map((p) => p.nombre);
  const nombres = [...oros, ...platas];
  if (!nombres.length) return null;
  return `Patrocinan: ${nombres.join(", ")}`;
}

export function buildCaption(input: CaptionInput): string {
  const tags = [
    input.categoria ? hashtagCategoria(input.categoria) : null,
    `#${slugHashtag(input.torneoNombre)}`,
    "#tenischile",
    "#mistorneos",
  ].filter(Boolean);

  return [
    headline(input),
    input.lineaPrincipal,
    tags.join(" "),
    lineaPatrocinan(input.patrocinadores),
  ]
    .filter(Boolean)
    .join("\n");
}

export function filenameStory(tipo: string, slug: string, fechaISO: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${tipo}-${safe}-${fechaISO}.png`;
}
