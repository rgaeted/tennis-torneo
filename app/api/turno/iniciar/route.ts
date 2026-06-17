import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  const rol = jugador?.rol;
  if (rol !== "admin" && rol !== "turno") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { partidoId, cancha } = await request.json();
  if (!partidoId) return NextResponse.json({ error: "Falta partidoId" }, { status: 400 });

  const admin = createAdminClient();

  // Verify match has two players and hasn't started
  const { data: partido } = await admin
    .from("partido")
    .select("jugador1_id, jugador2_id, resultado, ganador_id")
    .eq("id", partidoId)
    .single();

  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  if (!partido.jugador1_id || !partido.jugador2_id) {
    return NextResponse.json({ error: "El partido no tiene dos jugadores asignados" }, { status: 400 });
  }
  if (partido.ganador_id) {
    return NextResponse.json({ error: "El partido ya está finalizado" }, { status: 400 });
  }

  const update: Record<string, unknown> = { resultado: [{ j1: 0, j2: 0 }] };
  if (cancha) update.cancha = cancha;

  const { error } = await admin
    .from("partido")
    .update(update as any)
    .eq("id", partidoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
