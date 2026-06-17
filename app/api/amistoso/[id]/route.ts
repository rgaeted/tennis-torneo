import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: amistoso } = await admin
    .from("partido_amistoso")
    .select("retador_id, rival_id, estado")
    .eq("id", id)
    .single();

  if (!amistoso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { accion } = await request.json();

  if (accion === "aceptar") {
    if (amistoso.rival_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    if (amistoso.estado !== "pendiente") return NextResponse.json({ error: "El desafío no está pendiente" }, { status: 400 });
    const { error } = await admin.from("partido_amistoso").update({ estado: "aceptado" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (accion === "cancelar") {
    if (amistoso.retador_id !== user.id && amistoso.rival_id !== user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const { error } = await admin.from("partido_amistoso").update({ estado: "cancelado" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
