import { crearPreferencia } from "@/lib/mercadopago/client";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { torneoId, categoria, esDoble, companeroId } = await request.json();

  const { data: torneo } = await supabase
    .from("torneo")
    .select("id, nombre, monto_inscripcion, estado")
    .eq("id", torneoId)
    .single();

  if (!torneo || torneo.estado !== "activo") {
    return NextResponse.json({ error: "Torneo no disponible" }, { status: 400 });
  }

  const { data: inscripcion, error: inscError } = await supabase
    .from("inscripcion")
    .insert({
      torneo_id: torneoId,
      jugador_id: user.id,
      categoria,
      es_doble: esDoble ?? false,
      companero_id: companeroId ?? null,
      estado_pago: "pendiente",
      monto: torneo.monto_inscripcion,
    })
    .select("id")
    .single();

  if (inscError) {
    return NextResponse.json({ error: inscError.message }, { status: 400 });
  }

  let pref;
  try {
    pref = await crearPreferencia({
      titulo: `${torneo.nombre} — ${categoria}`,
      monto: Number(torneo.monto_inscripcion),
      inscripcionId: inscripcion.id,
      jugadorEmail: user.email!,
      appUrl: process.env.NEXT_PUBLIC_APP_URL!,
    });
  } catch (err) {
    console.error("MercadoPago crearPreferencia error:", err);
    await supabase.from("inscripcion").delete().eq("id", inscripcion.id);
    return NextResponse.json(
      { error: "Error al conectar con MercadoPago. Intentá de nuevo." },
      { status: 502 }
    );
  }

  await supabase
    .from("inscripcion")
    .update({ mercadopago_preference_id: pref.id })
    .eq("id", inscripcion.id);

  return NextResponse.json({ checkoutUrl: pref.init_point });
}
