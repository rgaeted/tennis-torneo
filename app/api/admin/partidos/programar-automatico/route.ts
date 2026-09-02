import { createAdminClient } from "@/lib/supabase/server";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import {
  asignarHorarios,
  generarSlots,
  validarHorariosPorDia,
  type PartidoScheduleInput,
} from "@/lib/scheduling/autoSchedule";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { torneoId, fechaInicio, fechaFin, horariosPorDia } = await request.json();

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

  const { data: partidosRaw } = await admin
    .from("partido")
    .select(
      "id, cuadro_id, ronda, posicion, jugador1_id, jugador2_id, ganador_id, started_at, ended_at, hora_inicio, cancha"
    )
    .in("cuadro_id", cuadroIds);

  const partidos = (partidosRaw ?? []) as PartidoScheduleInput[];
  if (!partidos.length) return NextResponse.json({ ok: true, programados: 0 });

  const errorHorarios = horariosPorDia ? validarHorariosPorDia(horariosPorDia) : null;
  if (errorHorarios) {
    return NextResponse.json({ error: errorHorarios }, { status: 422 });
  }

  let slots;
  try {
    slots = generarSlots(fechaInicio, fechaFin, numCanchas, horariosPorDia);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Horario inválido";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  const result = asignarHorarios({ slots, partidos });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const entries = Object.entries(result.assignments);
  if (!entries.length) return NextResponse.json({ ok: true, programados: 0 });

  await Promise.all(
    entries.map(([id, { hora_inicio, cancha }]) =>
      admin.from("partido").update({ hora_inicio, cancha }).eq("id", id)
    )
  );

  return NextResponse.json({ ok: true, programados: entries.length });
}
