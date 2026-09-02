import { createAdminClient } from "@/lib/supabase/server";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const torneoId = new URL(request.url).searchParams.get("torneoId");
  if (!torneoId) return NextResponse.json({ error: "Falta torneoId" }, { status: 400 });
  if (!await requireTorneoAccess(torneoId)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patrocinador_torneo")
    .select("id, torneo_id, nombre, logo_url, nivel, orden, activo")
    .eq("torneo_id", torneoId)
    .order("nivel")
    .order("orden");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patrocinadores: data ?? [] });
}

export async function POST(request: Request) {
  const { torneoId, nombre, nivel, orden } = await request.json();
  if (!torneoId || !nombre?.trim()) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  if (!await requireTorneoAccess(torneoId)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (nivel && nivel !== "oro" && nivel !== "plata") {
    return NextResponse.json({ error: "Nivel inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patrocinador_torneo")
    .insert({
      torneo_id: torneoId,
      nombre: nombre.trim(),
      nivel: nivel ?? "plata",
      orden: typeof orden === "number" ? orden : 0,
    })
    .select("id, torneo_id, nombre, logo_url, nivel, orden, activo")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patrocinador: data });
}
