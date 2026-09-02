import { createAdminClient } from "@/lib/supabase/server";
import { requireTorneoAccess } from "@/lib/supabase/orgAuth";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("patrocinador_torneo")
    .select("id, torneo_id")
    .eq("id", id)
    .single();
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!await requireTorneoAccess(row.torneo_id)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `patrocinadores/${row.torneo_id}/${id}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin.storage.from("torneos").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = admin.storage.from("torneos").getPublicUrl(path);
  const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

  const { error: dbError } = await admin
    .from("patrocinador_torneo")
    .update({ logo_url: publicUrl })
    .eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl });
}
