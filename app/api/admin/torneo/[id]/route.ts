import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = await request.json();
  if (!await requireTorneoAccess(id)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const campos: Record<string, unknown> = {};
  if (body.estado !== undefined) campos.estado = body.estado;
  if (body.categorias !== undefined) campos.categorias = body.categorias;
  if (body.imagen_url !== undefined) campos.imagen_url = body.imagen_url;
  if (body.direccion !== undefined) campos.direccion = body.direccion;
  if (body.descripcion !== undefined) campos.descripcion = body.descripcion;
  if (body.club_id !== undefined) campos.club_id = body.club_id;
  if (body.organizacion_id !== undefined) campos.organizacion_id = body.organizacion_id;

  if (Object.keys(campos).length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("torneo").update(campos as any).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
