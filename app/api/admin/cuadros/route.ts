import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generarPartidosEliminacion } from "@/lib/bracket/generator";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

type Categoria = Database["public"]["Enums"]["categoria_tipo"];
type Tamano = "16" | "32";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: jugador } = await supabase.from("jugador").select("es_admin").eq("id", user.id).single();
  if (!jugador?.es_admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { torneoId, categoria, tamano }: { torneoId: string; categoria: Categoria; tamano: Tamano } =
    await request.json();

  const admin = await createAdminClient();

  const { data: inscripciones } = await admin
    .from("inscripcion")
    .select("jugador_id")
    .eq("torneo_id", torneoId)
    .eq("categoria", categoria)
    .eq("estado_pago", "pagado");

  if (!inscripciones || inscripciones.length < 2) {
    return NextResponse.json({ error: "Se necesitan al menos 2 jugadores confirmados" }, { status: 400 });
  }

  const jugadorIds = inscripciones.map((i) => i.jugador_id);
  const tamanoNum = Number(tamano) as 16 | 32;

  if (jugadorIds.length > tamanoNum) {
    return NextResponse.json({ error: `Hay más jugadores (${jugadorIds.length}) que posiciones en el bracket (${tamanoNum})` }, { status: 400 });
  }

  // Pad with byes to fill the bracket
  const slots = [...jugadorIds];
  while (slots.length < tamanoNum) slots.push("bye");

  let partidos;
  try {
    partidos = generarPartidosEliminacion(slots, tamanoNum);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error generando cuadro" }, { status: 400 });
  }

  const { error: deleteError } = await admin
    .from("cuadro")
    .delete()
    .eq("torneo_id", torneoId)
    .eq("categoria", categoria);

  if (deleteError) {
    return NextResponse.json({ error: "Error al eliminar cuadro existente" }, { status: 500 });
  }

  const { data: cuadro, error: cuadroError } = await admin
    .from("cuadro")
    .insert({ torneo_id: torneoId, categoria, tamano })
    .select("id")
    .single();

  if (cuadroError) return NextResponse.json({ error: cuadroError.message }, { status: 500 });

  await admin.from("partido").insert(
    partidos.map((p) => ({ ...p, cuadro_id: cuadro.id }))
  );

  return NextResponse.json({ ok: true, cuadroId: cuadro.id });
}
