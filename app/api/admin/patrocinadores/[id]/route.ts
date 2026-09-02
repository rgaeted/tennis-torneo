import { createAdminClient } from "@/lib/supabase/server";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import type { Database } from "@/lib/supabase/types";
import { NextResponse } from "next/server";

type PatrocinadorUpdate = Database["public"]["Tables"]["patrocinador_torneo"]["Update"];

async function loadAndAuthorize(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("patrocinador_torneo")
    .select("id, torneo_id")
    .eq("id", id)
    .single();
  if (!data) return { error: NextResponse.json({ error: "No encontrado" }, { status: 404 }) };
  if (!await requireTorneoAccess(data.torneo_id)) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return { admin, row: data };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await loadAndAuthorize(id);
  if ("error" in gate && gate.error) return gate.error;

  const body = await request.json();
  const update: PatrocinadorUpdate = {};
  if (typeof body.nombre === "string") update.nombre = body.nombre.trim();
  if (body.nivel === "oro" || body.nivel === "plata") update.nivel = body.nivel;
  if (typeof body.orden === "number") update.orden = body.orden;
  if (typeof body.activo === "boolean") update.activo = body.activo;
  if (body.logo_url === null) update.logo_url = null;

  const { data, error } = await gate.admin!
    .from("patrocinador_torneo")
    .update(update)
    .eq("id", id)
    .select("id, torneo_id, nombre, logo_url, nivel, orden, activo")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patrocinador: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await loadAndAuthorize(id);
  if ("error" in gate && gate.error) return gate.error;

  const { error } = await gate.admin!.from("patrocinador_torneo").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
