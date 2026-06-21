import { createAdminClient } from "@/lib/supabase/server";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import { NextResponse } from "next/server";

const START_MINUTES = 9 * 60;   // 09:00
const LAST_START   = 22 * 60;   // 22:00 — último horario permitido
const DURATION     = 90;        // minutos por partido

// Chile: UTC-4 en invierno (may-ago), UTC-3 en verano
function chileOffset(ymd: string): string {
  const month = parseInt(ymd.substring(5, 7), 10);
  return month >= 5 && month <= 8 ? "-04:00" : "-03:00";
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

// Itera días entre las dos fechas (strings "YYYY-MM-DD") inclusivas
function* iterarDias(desde: string, hasta: string) {
  const fin = new Date(hasta + "T12:00:00Z");
  const cur = new Date(desde + "T12:00:00Z");
  while (cur <= fin) {
    yield cur.toISOString().substring(0, 10);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

function generarSlots(fechaInicioStr: string, fechaFinStr: string, numCanchas: number) {
  const slots: { fechaISO: string; cancha: number }[] = [];

  for (const ymd of iterarDias(fechaInicioStr, fechaFinStr)) {
    const offset = chileOffset(ymd);
    for (let min = START_MINUTES; min <= LAST_START; min += DURATION) {
      const hh = pad2(Math.floor(min / 60));
      const mm = pad2(min % 60);
      const fechaISO = `${ymd}T${hh}:${mm}:00${offset}`;
      for (let c = 1; c <= numCanchas; c++) {
        slots.push({ fechaISO, cancha: c });
      }
    }
  }

  // Fisher-Yates shuffle para asignación aleatoria
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  return slots;
}

export async function POST(request: Request) {
  const { torneoId, fechaInicio, fechaFin } = await request.json();

  if (!torneoId || !fechaInicio || !fechaFin) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  if (!await requireTorneoAccess(torneoId)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: torneo } = await admin
    .from("torneo")
    .select("club:club_id(num_canchas)")
    .eq("id", torneoId)
    .single();

  const numCanchas: number = (torneo as any)?.club?.num_canchas ?? 1;

  const { data: cuadros } = await admin
    .from("cuadro")
    .select("id")
    .eq("torneo_id", torneoId);

  const cuadroIds = (cuadros ?? []).map((c) => c.id);
  if (!cuadroIds.length) return NextResponse.json({ ok: true, programados: 0 });

  // Partidos con ambos jugadores y sin horario asignado
  const { data: partidos } = await admin
    .from("partido")
    .select("id")
    .in("cuadro_id", cuadroIds)
    .not("jugador1_id", "is", null)
    .not("jugador2_id", "is", null)
    .is("hora_inicio", null);

  if (!partidos?.length) return NextResponse.json({ ok: true, programados: 0 });

  const slots = generarSlots(fechaInicio, fechaFin, numCanchas);

  if (slots.length < partidos.length) {
    return NextResponse.json(
      { error: `No hay suficientes slots: ${partidos.length} partidos pero solo ${slots.length} horarios disponibles. Amplía el rango de fechas o el número de canchas.` },
      { status: 422 }
    );
  }

  await Promise.all(
    partidos.map((p, i) =>
      admin
        .from("partido")
        .update({ hora_inicio: slots[i].fechaISO, cancha: String(slots[i].cancha) })
        .eq("id", p.id)
    )
  );

  return NextResponse.json({ ok: true, programados: partidos.length });
}
