import { requireStaffTorneoAccess } from "@/lib/supabase/orgAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireStaffTorneoAccess(request, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: cuadros } = await admin.from("cuadro").select("id, categoria").eq("torneo_id", id);
  const cuadroIds = (cuadros ?? []).map((c) => c.id);
  const catByCuadro = new Map((cuadros ?? []).map((c) => [c.id, c.categoria]));

  if (!cuadroIds.length) return NextResponse.json({ partidos: [] });

  const { data: rows } = await admin
    .from("partido")
    .select(`
      id, cuadro_id, ronda, posicion, hora_inicio, cancha, started_at, ended_at,
      ganador_id, foto_url, resultado, jugador1_id, jugador2_id,
      jugador1:jugador!jugador1_id(id, nombre, apellido),
      jugador2:jugador!jugador2_id(id, nombre, apellido)
    `)
    .in("cuadro_id", cuadroIds)
    .order("hora_inicio", { ascending: true, nullsFirst: false });

  const partidos = (rows ?? []).map((p: any) => ({
    id: p.id,
    ronda: p.ronda,
    posicion: p.posicion,
    categoria: catByCuadro.get(p.cuadro_id) ?? "",
    hora_inicio: p.hora_inicio,
    cancha: p.cancha,
    started_at: p.started_at,
    ended_at: p.ended_at,
    ganador_id: p.ganador_id,
    foto_url: p.foto_url,
    resultado: p.resultado,
    jugador1: p.jugador1,
    jugador2: p.jugador2,
  }));

  return NextResponse.json({ partidos });
}
