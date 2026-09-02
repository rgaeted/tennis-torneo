import type { PatrocinadorInput } from "./types";

export const MAX_OROS = 3;
export const MAX_PLATAS = 6;

function sortedActivosConLogo(
  list: PatrocinadorInput[],
  nivel: "oro" | "plata"
): PatrocinadorInput[] {
  return list
    .filter((p) => p.activo && p.nivel === nivel && !!p.logo_url)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

export function logosVisibles(list: PatrocinadorInput[]) {
  return {
    oros: sortedActivosConLogo(list, "oro").slice(0, MAX_OROS),
    platas: sortedActivosConLogo(list, "plata").slice(0, MAX_PLATAS),
  };
}
