import { createAdminClient } from "@/lib/supabase/server";
import { requireCuadroAccess } from "@/lib/supabase/orgAuth";
import { procesarByes, revertirAvanceBye } from "@/lib/bracket/byes";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

type Ronda = Database["public"]["Enums"]["ronda_tipo"];

export async function POST(request: Request) {
  const { cuadroId, partidoId, jugadorId, slot } = await request.json() as {
    cuadroId: string;
    partidoId: string;
    jugadorId: string;
    slot: "jugador1_id" | "jugador2_id";
  };
  if (!await requireCuadroAccess(cuadroId)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const admin = createAdminClient();

  const { data: cuadro } = await admin.from("cuadro").select("cerrado").eq("id", cuadroId).single();
  if ((cuadro as any)?.cerrado) return NextResponse.json({ error: "El cuadro está cerrado" }, { status: 400 });

  const { data: partido } = await admin
    .from("partido")
    .select("id, ronda, posicion, jugador1_id, jugador2_id, ganador_id, resultado")
    .eq("id", partidoId)
    .single();

  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  if (partido.ronda !== "primera_ronda") {
    return NextResponse.json({ error: "Solo se puede agregar jugadores en primera ronda" }, { status: 400 });
  }
  if (partido[slot] !== null) {
    return NextResponse.json({ error: "Ese slot ya tiene un jugador" }, { status: 400 });
  }
  if (partido.resultado) {
    return NextResponse.json({ error: "Este partido ya fue jugado" }, { status: 400 });
  }

  // If this BYE slot had a player auto-advanced (ganador_id set), revert that cascade first
  const byeGanadorId = partido.ganador_id;

  // Place the new player and clear the BYE result (it's now a real match)
  await admin.from("partido").update({
    [slot]: jugadorId,
    ganador_id: null,
  } as any).eq("id", partidoId);

  // Revert the previously auto-advanced player from downstream rounds
  if (byeGanadorId) {
    await revertirAvanceBye(
      cuadroId,
      partido.ronda as Ronda,
      partido.posicion,
      byeGanadorId,
      admin
    );
  }

  // Re-run BYE cascade in case new player-vs-bye situations arose
  await procesarByes(cuadroId, admin);

  return NextResponse.json({ ok: true });
}
