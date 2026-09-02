import { createAdminClient } from "@/lib/supabase/server";
import { requirePartidoAccess } from "@/lib/supabase/orgAuth";
import { NextResponse } from "next/server";

function storagePathFromPublicUrl(url: string): string | null {
  const marker = "/torneos/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split("?")[0];
}

async function loadPartido(id: string) {
  const admin = createAdminClient();
  const { data: partido } = await admin
    .from("partido")
    .select("id, jugador1_id, jugador2_id, foto_url, cuadro_id")
    .eq("id", id)
    .single();
  if (!partido?.cuadro_id) return { admin, partido, torneoId: null as string | null };

  const { data: cuadro } = await admin
    .from("cuadro")
    .select("torneo_id")
    .eq("id", partido.cuadro_id)
    .single();

  return { admin, partido, torneoId: cuadro?.torneo_id ?? null };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requirePartidoAccess(id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { admin, partido, torneoId } = await loadPartido(id);
  if (!partido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!partido.jugador1_id || !partido.jugador2_id) {
    return NextResponse.json({ error: "Ambos jugadores deben estar definidos" }, { status: 422 });
  }

  if (!torneoId) return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `partidos/${torneoId}/${id}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin.storage.from("torneos").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = admin.storage.from("torneos").getPublicUrl(path);
  const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

  const { error: dbError } = await admin.from("partido").update({ foto_url: publicUrl }).eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requirePartidoAccess(id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { admin, partido } = await loadPartido(id);
  if (!partido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (partido.foto_url) {
    const path = storagePathFromPublicUrl(partido.foto_url);
    if (path) await admin.storage.from("torneos").remove([path]);
  }

  const { error } = await admin.from("partido").update({ foto_url: null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
