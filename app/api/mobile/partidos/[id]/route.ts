import { requireStaffPartidoAccess } from "@/lib/supabase/orgAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireStaffPartidoAccess(request, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: p } = await admin
    .from("partido")
    .select(`
      id, cuadro_id, ronda, posicion, hora_inicio, cancha, started_at, ended_at,
      ganador_id, foto_url, resultado,
      jugador1:jugador!jugador1_id(id, nombre, apellido),
      jugador2:jugador!jugador2_id(id, nombre, apellido)
    `)
    .eq("id", id)
    .single();
  if (!p) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let categoria = "";
  if (p.cuadro_id) {
    const { data: cuadro } = await admin
      .from("cuadro")
      .select("categoria")
      .eq("id", p.cuadro_id)
      .single();
    categoria = cuadro?.categoria ?? "";
  }

  return NextResponse.json({
    partido: {
      id: p.id,
      ronda: p.ronda,
      posicion: p.posicion,
      categoria,
      hora_inicio: p.hora_inicio,
      cancha: p.cancha,
      started_at: p.started_at,
      ended_at: p.ended_at,
      ganador_id: p.ganador_id,
      foto_url: p.foto_url,
      resultado: p.resultado,
      jugador1: p.jugador1,
      jugador2: p.jugador2,
    },
  });
}
