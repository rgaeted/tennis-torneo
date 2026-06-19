import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  if (jugador?.rol !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { cuadroId, a, b } = await request.json() as {
    cuadroId: string;
    a: { partidoId: string; slot: "jugador1_id" | "jugador2_id" };
    b: { partidoId: string; slot: "jugador1_id" | "jugador2_id" };
  };

  const admin = createAdminClient();

  // Bloquear si el torneo ya comenzó (algún partido tiene ganador)
  const { data: iniciado } = await admin
    .from("partido")
    .select("id")
    .eq("cuadro_id", cuadroId)
    .not("ganador_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (iniciado) {
    return NextResponse.json(
      { error: "No se pueden mover jugadores — el torneo ya ha comenzado" },
      { status: 400 }
    );
  }

  const [{ data: partidoA }, { data: partidoB }] = await Promise.all([
    admin.from("partido").select("jugador1_id, jugador2_id").eq("id", a.partidoId).single(),
    admin.from("partido").select("jugador1_id, jugador2_id").eq("id", b.partidoId).single(),
  ]);

  if (!partidoA || !partidoB) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  const jugadorA = partidoA[a.slot];
  const jugadorB = partidoB[b.slot];

  await Promise.all([
    admin.from("partido").update({ [a.slot]: jugadorB } as any).eq("id", a.partidoId),
    admin.from("partido").update({ [b.slot]: jugadorA } as any).eq("id", b.partidoId),
  ]);

  return NextResponse.json({ ok: true });
}
