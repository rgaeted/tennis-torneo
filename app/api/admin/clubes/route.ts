import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  return jugador?.rol === "admin" ? user : null;
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { nombre, direccion, num_canchas, descripcion } = await request.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("club")
    .insert({
      nombre: nombre.trim(),
      direccion: direccion?.trim() || null,
      num_canchas: Number(num_canchas) || 2,
      descripcion: descripcion?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
