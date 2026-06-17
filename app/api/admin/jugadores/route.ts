import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  if (jugador?.rol !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { jugadorId, rol }: { jugadorId: string; rol: string } = await request.json();

  if (!["admin", "jugador", "turno"].includes(rol)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("jugador").update({ rol } as any).eq("id", jugadorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
