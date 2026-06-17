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

  const { partidoId } = await request.json();
  if (!partidoId) return NextResponse.json({ error: "Falta partidoId" }, { status: 400 });

  const admin = createAdminClient();

  const { data: partido } = await admin
    .from("partido")
    .select("ganador_id, resultado_confirmado")
    .eq("id", partidoId)
    .single();

  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  if (!partido.ganador_id) return NextResponse.json({ error: "El partido no tiene resultado aún" }, { status: 400 });
  if ((partido as any).resultado_confirmado) return NextResponse.json({ error: "El resultado ya fue confirmado" }, { status: 400 });

  const { error } = await admin
    .from("partido")
    .update({ resultado_confirmado: true } as any)
    .eq("id", partidoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
