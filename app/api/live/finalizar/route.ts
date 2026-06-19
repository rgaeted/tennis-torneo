import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { avanzarGanadorConByes } from "@/lib/bracket/byes";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

type Ronda = Database["public"]["Enums"]["ronda_tipo"];
type Set = { j1: number; j2: number; tb?: { j1: number; j2: number } };

function errorSet(j1: number, j2: number): string | null {
  if (
    (j1 === 6 && j2 <= 4) || (j2 === 6 && j1 <= 4) ||
    (j1 === 7 && j2 === 5) || (j2 === 7 && j1 === 5) ||
    (j1 === 7 && j2 === 6) || (j2 === 7 && j1 === 6)
  ) return null;
  return `${j1}-${j2} no es un marcador de set válido en tenis`;
}

function errorTiebreak(s: Set): string | null {
  const esTB = (s.j1 === 7 && s.j2 === 6) || (s.j1 === 6 && s.j2 === 7);
  if (!esTB || !s.tb) return null;
  const { j1, j2 } = s.tb;
  const max = Math.max(j1, j2);
  const min = Math.min(j1, j2);
  if (max < 7 || max - min < 2) return `tie-break ${j1}-${j2} no es válido (primero en llegar a 7, ganar por 2)`;
  const tbGanaJ1 = j1 > j2;
  const setGanaJ1 = s.j1 > s.j2;
  if (tbGanaJ1 !== setGanaJ1) return "el ganador del tie-break no coincide con el del set";
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { partidoId, resultado } = await request.json() as { partidoId: string; resultado: Set[] };

  if (!resultado || resultado.length === 0)
    return NextResponse.json({ error: "El resultado no puede estar vacío" }, { status: 400 });

  for (let i = 0; i < resultado.length; i++) {
    const s = resultado[i];
    const errS = errorSet(s.j1, s.j2);
    if (errS) return NextResponse.json({ error: `Set ${i + 1}: ${errS}` }, { status: 400 });
    const errTb = errorTiebreak(s);
    if (errTb) return NextResponse.json({ error: `Set ${i + 1}: ${errTb}` }, { status: 400 });
  }

  const setsJ1 = resultado.filter((s) =>
    (s.j1 === 6 && s.j2 <= 4) || (s.j1 === 7 && (s.j2 === 5 || s.j2 === 6))
  ).length;
  const setsJ2 = resultado.length - setsJ1;

  if (setsJ1 === setsJ2)
    return NextResponse.json({ error: "El marcador está empatado en sets — el partido no puede quedar sin ganador" }, { status: 400 });

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: partido } = await admin
    .from("partido")
    .select("jugador1_id, jugador2_id, cuadro_id, ronda, posicion, ganador_id")
    .eq("id", partidoId)
    .single();

  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  if (partido.ganador_id) return NextResponse.json({ error: "El partido ya tiene resultado" }, { status: 400 });

  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  const esTurnoOAdmin = jugador?.rol === "admin" || jugador?.rol === "turno";
  const esJugador = partido.jugador1_id === user.id || partido.jugador2_id === user.id;
  if (!esTurnoOAdmin && !esJugador)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const ganadorId = setsJ1 > setsJ2 ? partido.jugador1_id : partido.jugador2_id;

  await admin.from("partido").update({ ganador_id: ganadorId, resultado }).eq("id", partidoId);

  if (partido.cuadro_id) {
    await avanzarGanadorConByes(
      partido.cuadro_id,
      partido.ronda as Ronda,
      partido.posicion,
      ganadorId,
      admin
    );
  }

  // Si es partido amistoso, marcar el desafío como finalizado
  if (!partido.cuadro_id) {
    await (admin as any)
      .from("partido_amistoso")
      .update({ estado: "finalizado" })
      .eq("partido_id", partidoId);
  }

  return NextResponse.json({ ok: true, ganadorId });
}
