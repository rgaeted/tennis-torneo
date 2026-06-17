import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  return jugador?.rol === "admin" ? user : null;
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizacion")
    .select("id, nombre, created_at")
    .order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { nombre } = await request.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizacion")
    .insert({ nombre: nombre.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
