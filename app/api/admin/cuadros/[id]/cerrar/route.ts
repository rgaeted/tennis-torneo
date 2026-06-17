import { createAdminClient } from "@/lib/supabase/server";
import { requireCuadroAccess } from "@/lib/supabase/orgAuth";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await requireCuadroAccess(id)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const admin = createAdminClient();

  const { data: cuadro } = await admin.from("cuadro").select("cerrado").eq("id", id).single();
  if (!cuadro) return NextResponse.json({ error: "Cuadro no encontrado" }, { status: 404 });
  if ((cuadro as any).cerrado) return NextResponse.json({ error: "Ya está cerrado" }, { status: 400 });

  const { error } = await admin.from("cuadro").update({ cerrado: true }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
