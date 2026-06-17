import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { partidoId, resultado } = await request.json();

  const admin = createAdminClient();
  const { data: partido } = await admin
    .from("partido")
    .select("jugador1_id, jugador2_id")
    .eq("id", partidoId)
    .single();

  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  const { data: jugador } = await supabase
    .from("jugador")
    .select("rol")
    .eq("id", user.id)
    .single();

  const esTurnoOAdmin = jugador?.rol === "admin" || jugador?.rol === "turno";
  const esJugador = partido.jugador1_id === user.id || partido.jugador2_id === user.id;

  if (!esTurnoOAdmin && !esJugador) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await admin.from("partido").update({ resultado }).eq("id", partidoId);

  return NextResponse.json({ ok: true });
}
