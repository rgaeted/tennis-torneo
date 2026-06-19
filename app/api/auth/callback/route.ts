import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) return NextResponse.redirect(`${origin}/login`);

  const user = data.user;

  // Crear registro jugador si es la primera vez (OAuth no dispara el trigger de email)
  const admin = createAdminClient();
  const { data: existing } = await admin.from("jugador").select("id").eq("id", user.id).maybeSingle();

  if (!existing) {
    const meta = user.user_metadata ?? {};
    // Google usa given_name/family_name; email usa nombre/apellido
    const nombre = (
      meta.nombre ??
      meta.given_name ??
      (meta.full_name ?? meta.name ?? "").split(" ")[0] ??
      "Usuario"
    ).trim();

    const apellidoRaw =
      meta.apellido ??
      meta.family_name ??
      (meta.full_name ?? meta.name ?? "").split(" ").slice(1).join(" ");
    const apellido = (apellidoRaw || nombre).trim();

    await admin.from("jugador").insert({ id: user.id, nombre, apellido });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
