import { authorizeLivePartidoAccess } from "@/lib/auth/partidoLiveAuth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { partidoId, resultado } = await request.json();

  const auth = await authorizeLivePartidoAccess(request, partidoId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await auth.admin.from("partido").update({ resultado }).eq("id", partidoId);

  return NextResponse.json({ ok: true });
}
