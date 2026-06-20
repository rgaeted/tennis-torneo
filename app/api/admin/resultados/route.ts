import { createAdminClient } from "@/lib/supabase/server";
import { requirePartidoAccess } from "@/lib/supabase/orgAuth";
import { avanzarGanadorConByes } from "@/lib/bracket/byes";
import { siguienteRonda } from "@/lib/bracket/generator";
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

export async function PATCH(request: Request) {
  const { partidoId, ganadorId, resultado } = await request.json();
  if (!await requirePartidoAccess(partidoId)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const admin = createAdminClient();

  const { data: partido } = await admin.from("partido").select("*").eq("id", partidoId).single();
  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  const oldGanadorId = partido.ganador_id;

  // Buscar partido de siguiente ronda para actualizar el slot del ganador
  if (partido.cuadro_id && oldGanadorId !== ganadorId) {
    const sigRonda = siguienteRonda(partido.ronda as Ronda);
    if (sigRonda) {
      const posicionSiguiente = Math.floor(partido.posicion / 2);
      const { data: sigPartido } = await admin
        .from("partido")
        .select("id, jugador1_id, jugador2_id, ganador_id")
        .eq("cuadro_id", partido.cuadro_id)
        .eq("ronda", sigRonda)
        .eq("posicion", posicionSiguiente)
        .maybeSingle();

      if (sigPartido?.ganador_id) {
        return NextResponse.json(
          { error: "No se puede modificar — el ganador ya jugó la siguiente ronda" },
          { status: 409 }
        );
      }

      if (sigPartido) {
        const esPrimerJugador = partido.posicion % 2 === 0;
        await admin
          .from("partido")
          .update(esPrimerJugador ? { jugador1_id: ganadorId } : { jugador2_id: ganadorId })
          .eq("id", (sigPartido as any).id);
      }
    }
  }

  await admin.from("partido").update({ ganador_id: ganadorId, resultado }).eq("id", partidoId);

  return NextResponse.json({ ok: true });
}
