import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { rivalId, clubId, cancha, fechaHora } = await request.json();
  if (!rivalId) return NextResponse.json({ error: "Falta el rival" }, { status: 400 });
  if (rivalId === user.id) return NextResponse.json({ error: "No puedes desafiarte a ti mismo" }, { status: 400 });

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await admin
    .from("partido_amistoso")
    .insert({
      retador_id: user.id,
      rival_id: rivalId,
      club_id: clubId || null,
      cancha: cancha || null,
      fecha_hora: fechaHora || null,
      estado: "pendiente",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
