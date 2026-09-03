import { getRequestUser } from "@/lib/supabase/requestUser";
import { createAdminClient } from "@/lib/supabase/server";
import { isStaffForTorneo, isStaffRol } from "@/lib/auth/staffAccess";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: jugador } = await admin
    .from("jugador")
    .select("rol, organizacion_id")
    .eq("id", user.id)
    .single();
  if (!jugador || !isStaffRol(jugador.rol)) {
    return NextResponse.json({ error: "Esta app es solo para staff" }, { status: 403 });
  }

  const { data: torneos } = await admin
    .from("torneo")
    .select("id, nombre, edicion, fecha_inicio, fecha_fin, estado, organizacion_id")
    .order("fecha_inicio", { ascending: false });

  const visibles = (torneos ?? []).filter((t) =>
    isStaffForTorneo(jugador, { organizacion_id: t.organizacion_id })
  );

  return NextResponse.json({
    torneos: visibles.map(({ organizacion_id: _o, ...rest }) => rest),
  });
}
