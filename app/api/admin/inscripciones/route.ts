import { createAdminClient } from "@/lib/supabase/server";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { torneoId, jugadorId, categoria, estadoPago, monto } = await request.json();
  if (!await requireTorneoAccess(torneoId)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  if (!torneoId || !jugadorId || !categoria || !monto) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.from("inscripcion").insert({
    torneo_id: torneoId,
    jugador_id: jugadorId,
    categoria,
    estado_pago: estadoPago ?? "pendiente",
    monto: Number(monto),
    es_doble: false,
  }).select("id").single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Este jugador ya está inscrito en esa categoría" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const { inscripcionId, categoria, estadoPago, monto } = await request.json();
  // Look up torneoId from inscripcion to verify access
  const adminLookup = createAdminClient();
  const { data: insc } = await adminLookup.from("inscripcion").select("torneo_id").eq("id", inscripcionId).single();
  if (!insc || !await requireTorneoAccess(insc.torneo_id)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (!inscripcionId) return NextResponse.json({ error: "Falta inscripcionId" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("inscripcion").update({
    categoria,
    estado_pago: estadoPago,
    monto: Number(monto),
  }).eq("id", inscripcionId);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "El jugador ya tiene una inscripción en esa categoría" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { inscripcionId } = await request.json();
  const adminLookup = createAdminClient();
  const { data: insc } = await adminLookup.from("inscripcion").select("torneo_id").eq("id", inscripcionId).single();
  if (!insc || !await requireTorneoAccess(insc.torneo_id)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from("inscripcion").delete().eq("id", inscripcionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
