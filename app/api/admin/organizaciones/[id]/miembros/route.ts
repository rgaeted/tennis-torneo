import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  return jugador?.rol === "admin" ? user : null;
}

// Agregar jugador a organización → rol pasa a "organizador"
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const { jugador_id } = await request.json();
  if (!jugador_id) return NextResponse.json({ error: "jugador_id requerido" }, { status: 400 });

  const admin = createAdminClient();

  // Verificar que el jugador existe
  const { data: jugadorActual, error: fetchError } = await admin
    .from("jugador")
    .select("id, rol, organizacion_id")
    .eq("id", jugador_id)
    .single();

  if (fetchError || !jugadorActual) {
    return NextResponse.json({ error: `Jugador no encontrado: ${fetchError?.message}` }, { status: 404 });
  }
  if (jugadorActual.rol === "admin") {
    return NextResponse.json({ error: "No se puede modificar un admin" }, { status: 400 });
  }

  const { error } = await admin
    .from("jugador")
    .update({ organizacion_id: id, rol: "organizador" } as any)
    .eq("id", jugador_id);

  if (error) {
    console.error("[miembros POST] update error:", JSON.stringify(error));
    return NextResponse.json({ error: `${error.message} (code: ${error.code})` }, { status: 500 });
  }

  // Verificar que realmente se actualizó
  const { data: verify } = await admin
    .from("jugador")
    .select("id, rol, organizacion_id")
    .eq("id", jugador_id)
    .single();
  console.log("[miembros POST] estado tras update:", JSON.stringify(verify));

  revalidatePath(`/admin/organizaciones/${id}`);
  return NextResponse.json({ ok: true, verify });
}

// Quitar jugador de organización → rol vuelve a "jugador"
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const { jugador_id } = await request.json();
  if (!jugador_id) return NextResponse.json({ error: "jugador_id requerido" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("jugador")
    .update({ organizacion_id: null, rol: "jugador" })
    .eq("id", jugador_id)
    .eq("organizacion_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath(`/admin/organizaciones/${id}`);
  return NextResponse.json({ ok: true });
}
