import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .select("retador_id, rival_id, estado, cancha, partido_id, fecha_hora")
    .eq("id", id)
    .single();

  if (!amistoso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (amistoso.retador_id !== user.id && amistoso.rival_id !== user.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (amistoso.estado !== "aceptado")
    return NextResponse.json({ error: "El desafío debe estar aceptado para iniciarse" }, { status: 400 });
  if (amistoso.partido_id)
    return NextResponse.json({ partidoId: amistoso.partido_id });

  // Create partido without cuadro (friendly)
  const { data: partido, error: createError } = await admin
    .from("partido")
    .insert({
      cuadro_id: null,
      ronda: "amistoso",
      posicion: 0,
      jugador1_id: amistoso.retador_id,
      jugador2_id: amistoso.rival_id,
      cancha: amistoso.cancha,
      hora_inicio: amistoso.fecha_hora ?? null,
      resultado: [{ j1: 0, j2: 0 }],
    } as any)
    .select("id")
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

  await admin.from("partido_amistoso").update({ partido_id: partido.id, estado: "en_curso" }).eq("id", id);

  return NextResponse.json({ partidoId: partido.id });
}
