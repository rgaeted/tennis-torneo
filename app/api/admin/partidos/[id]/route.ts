import { createAdminClient } from "@/lib/supabase/server";
import { requirePartidoAccess } from "@/lib/supabase/orgAuth";
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
  const { error } = await admin.from("partido").update(campos as any).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
