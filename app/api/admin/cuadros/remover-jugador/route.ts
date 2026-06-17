import { createAdminClient } from "@/lib/supabase/server";
import { requireCuadroAccess } from "@/lib/supabase/orgAuth";
import { procesarByes, revertirAvanceBye } from "@/lib/bracket/byes";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

type Ronda = Database["public"]["Enums"]["ronda_tipo"];

export async function POST(request: Request) {
  const { cuadroId, partidoId, slot } = await request.json() as {
    cuadroId: string;
    partidoId: string;
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
  if ((partido as any).resultado) return NextResponse.json({ error: "Este partido ya fue jugado" }, { status: 400 });

  const jugadorId = (partido as any)[slot] as string | null;
  if (!jugadorId) return NextResponse.json({ error: "El slot ya está vacío" }, { status: 400 });

  // Check no downstream match with a real result exists for this player
  const { data: matchesConResultado } = await admin
    .from("partido")
    .select("id")
    .eq("cuadro_id", cuadroId)
    .not("ronda", "eq", (partido as any).ronda)
    .not("resultado", "is", null)
    .or(`jugador1_id.eq.${jugadorId},jugador2_id.eq.${jugadorId}`);

  if (matchesConResultado && (matchesConResultado as any[]).length > 0) {
    return NextResponse.json({ error: "El jugador ya tiene partidos jugados en rondas posteriores" }, { status: 400 });
  }

  const ganadorIdActual = (partido as any).ganador_id as string | null;

  // Clear the slot (and ganador_id if this was a BYE auto-advance)
  const updateData: Record<string, null> = { [slot]: null };
  if (ganadorIdActual === jugadorId) updateData.ganador_id = null;
  await admin.from("partido").update(updateData as any).eq("id", partidoId);

  // Revert BYE cascade for this player
  await revertirAvanceBye(cuadroId, (partido as any).ronda as Ronda, (partido as any).posicion, jugadorId, admin);

  // Re-process remaining BYEs
  await procesarByes(cuadroId, admin);

  return NextResponse.json({ ok: true });
}
