import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", user.id).single();
  if (jugador?.rol !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${id}/imagen.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin.storage.from("torneos").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = admin.storage.from("torneos").getPublicUrl(path);
  const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

  const { error: dbError } = await admin.from("club").update({ imagen_url: publicUrl } as any).eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl });
}
