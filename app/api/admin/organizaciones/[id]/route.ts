import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  return jugador?.rol === "admin" ? user : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const { nombre } = await request.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizacion")
    .update({ nombre: nombre.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  const admin = createAdminClient();

  // Desvincular jugadores y torneos antes de eliminar
  await admin.from("jugador").update({ organizacion_id: null, rol: "jugador" }).eq("organizacion_id", id).eq("rol", "organizador");
  await admin.from("torneo").update({ organizacion_id: null }).eq("organizacion_id", id);

  const { error } = await admin.from("organizacion").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
