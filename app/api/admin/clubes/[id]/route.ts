import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  return jugador?.rol === "admin";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const update: Record<string, unknown> = {};
  if (body.nombre !== undefined) update.nombre = body.nombre.trim();
  if (body.direccion !== undefined) update.direccion = body.direccion?.trim() || null;
  if (body.num_canchas !== undefined) update.num_canchas = Number(body.num_canchas) || 2;
  if (body.descripcion !== undefined) update.descripcion = body.descripcion?.trim() || null;
  if (body.imagen_url !== undefined) update.imagen_url = body.imagen_url;

  const admin = createAdminClient();
  const { data, error } = await admin.from("club").update(update as any).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("club").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
