import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { torneoId, categoria } = await request.json();

  const { data: torneo } = await supabase
    .from("torneo")
    .select("monto_inscripcion, estado")
    .eq("id", torneoId)
    .single();

  if (!torneo || torneo.estado !== "activo") {
    return NextResponse.json({ error: "Torneo no disponible" }, { status: 400 });
  }

  const { error } = await supabase.from("inscripcion").insert({
    torneo_id: torneoId,
    jugador_id: user.id,
    categoria,
    estado_pago: "pendiente",
    monto: torneo.monto_inscripcion,
  });

  if (error) {
    const msg = error.code === "23505"
      ? "Ya estás inscrito en este torneo con esa categoría."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
