import { createClient, createAdminClient } from "@/lib/supabase/server";
import { siguienteRonda } from "@/lib/bracket/generator";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

type Ronda = Database["public"]["Enums"]["ronda_tipo"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: jugador } = await supabase.from("jugador").select("es_admin").eq("id", user.id).single();
  if (!jugador?.es_admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { partidoId, ganadorId, resultado } = await request.json();

  const admin = await createAdminClient();

  const { data: partido } = await admin
    .from("partido")
    .select("*")
    .eq("id", partidoId)
    .single();

  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  await admin.from("partido").update({ ganador_id: ganadorId, resultado }).eq("id", partidoId);

  const siguienteRondaNombre = siguienteRonda(partido.ronda as Ronda);
  if (siguienteRondaNombre) {
    const posicionSiguiente = Math.floor(partido.posicion / 2);
    const esPrimerJugador = partido.posicion % 2 === 0;

    const { data: siguientePartido } = await admin
      .from("partido")
      .select("id")
      .eq("cuadro_id", partido.cuadro_id)
      .eq("ronda", siguienteRondaNombre)
      .eq("posicion", posicionSiguiente)
      .single();

    if (siguientePartido) {
      await admin.from("partido").update(
        esPrimerJugador
          ? { jugador1_id: ganadorId }
          : { jugador2_id: ganadorId }
      ).eq("id", siguientePartido.id);
    }
  }

  return NextResponse.json({ ok: true });
}
