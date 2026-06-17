import { createAdminClient } from "@/lib/supabase/server";
import { requirePartidoAccess } from "@/lib/supabase/orgAuth";
import { avanzarGanadorConByes } from "@/lib/bracket/byes";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

type Ronda = Database["public"]["Enums"]["ronda_tipo"];

export async function POST(request: Request) {
  const { partidoId, ganadorId, resultado } = await request.json();
  if (!await requirePartidoAccess(partidoId)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const admin = createAdminClient();

  const { data: partido } = await admin
    .from("partido")
    .select("*")
    .eq("id", partidoId)
    .single();

  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  await admin.from("partido").update({ ganador_id: ganadorId, resultado }).eq("id", partidoId);

  // Advance winner to next round (only for tournament matches, not amistosos)
  if (partido.cuadro_id) {
    await avanzarGanadorConByes(
      partido.cuadro_id,
      partido.ronda as Ronda,
      partido.posicion,
      ganadorId,
      admin
    );
  }

  return NextResponse.json({ ok: true });
}
