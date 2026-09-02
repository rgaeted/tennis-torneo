import { createAdminClient } from "@/lib/supabase/server";
import { requirePartidoAccess } from "@/lib/supabase/orgAuth";
import {
  validarHorarioManual,
  type PartidoScheduleInput,
} from "@/lib/scheduling/autoSchedule";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!await requirePartidoAccess(id)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const campos: Record<string, unknown> = {};
  if (body.horaInicio !== undefined) campos.hora_inicio = body.horaInicio || null;
  if (body.cancha !== undefined) campos.cancha = body.cancha || null;
  if (body.started_at !== undefined) campos.started_at = body.started_at;
  if (body.ended_at !== undefined) campos.ended_at = body.ended_at;

  if (Object.keys(campos).length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (body.horaInicio && body.cancha) {
    const { data: partidoRaw } = await admin
      .from("partido")
      .select(`
        id, cuadro_id, ronda, posicion, jugador1_id, jugador2_id, ganador_id,
        started_at, ended_at, hora_inicio, cancha,
        cuadro:cuadro_id(torneo_id)
      `)
      .eq("id", id)
      .single();

    if (!partidoRaw) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    const torneoId = (partidoRaw as any).cuadro?.torneo_id;
    const { data: cuadros } = await admin.from("cuadro").select("id").eq("torneo_id", torneoId);
    const cuadroIds = (cuadros ?? []).map((c) => c.id);

    const { data: todos } = await admin
      .from("partido")
      .select(
        "id, cuadro_id, ronda, posicion, jugador1_id, jugador2_id, ganador_id, started_at, ended_at, hora_inicio, cancha"
      )
      .in("cuadro_id", cuadroIds);

    const partido = partidoRaw as PartidoScheduleInput;
    const errorValidacion = validarHorarioManual({
      partido,
      horaInicio: body.horaInicio,
      cancha: String(body.cancha),
      partidos: (todos ?? []) as PartidoScheduleInput[],
    });

    if (errorValidacion) {
      return NextResponse.json({ error: errorValidacion }, { status: 422 });
    }
  }

  const { error } = await admin.from("partido").update(campos as any).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
