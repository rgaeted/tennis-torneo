import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { avanzarGanadorConByes } from "@/lib/bracket/byes";
import { authorizeLivePartidoAccess } from "@/lib/auth/partidoLiveAuth";
import { stripPuntos, isSetComplete, setsWon } from "@/lib/live/tennisScore";
import type { Resultado } from "@/lib/live/types";
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
  const { partidoId, resultado } = await request.json() as { partidoId: string; resultado: Set[] };

  if (!resultado || resultado.length === 0)
    return NextResponse.json({ error: "El resultado no puede estar vacío" }, { status: 400 });

  for (let i = 0; i < resultado.length; i++) {
    const s = resultado[i];
    if (!isSetComplete(s)) {
      if (i !== resultado.length - 1) {
        return NextResponse.json({ error: `Set ${i + 1}: incompleto` }, { status: 400 });
      }
      continue;
    }
    const errS = errorSet(s.j1, s.j2);
    if (errS) return NextResponse.json({ error: `Set ${i + 1}: ${errS}` }, { status: 400 });
    const errTb = errorTiebreak(s);
    if (errTb) return NextResponse.json({ error: `Set ${i + 1}: ${errTb}` }, { status: 400 });
  }

  const resultadoLimpio = stripPuntos(resultado as Resultado);
  const cerrados = resultadoLimpio.filter(isSetComplete);
  if (cerrados.length === 0) {
    return NextResponse.json({ error: "No hay sets registrados" }, { status: 400 });
  }

  const setsJ1 = setsWon(cerrados, "j1");
  const setsJ2 = setsWon(cerrados, "j2");

  if (setsJ1 === setsJ2)
    return NextResponse.json({ error: "El marcador está empatado en sets — el partido no puede quedar sin ganador" }, { status: 400 });

  const auth = await authorizeLivePartidoAccess(request, partidoId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { partido } = auth;
  if (partido.ganador_id) return NextResponse.json({ error: "El partido ya tiene resultado" }, { status: 400 });

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const ganadorId = setsJ1 > setsJ2 ? partido.jugador1_id : partido.jugador2_id;
  if (!ganadorId) {
    return NextResponse.json({ error: "Partido sin jugadores válidos" }, { status: 400 });
  }

  await admin.from("partido").update({ ganador_id: ganadorId, resultado: resultadoLimpio }).eq("id", partidoId);

  if (partido.cuadro_id) {
    await avanzarGanadorConByes(
      partido.cuadro_id,
      partido.ronda as Ronda,
      partido.posicion,
      ganadorId,
      admin
    );
  }

  if (!partido.cuadro_id) {
    await (admin as any)
      .from("partido_amistoso")
      .update({ estado: "finalizado" })
      .eq("partido_id", partidoId);
  }

  return NextResponse.json({ ok: true, ganadorId });
}
