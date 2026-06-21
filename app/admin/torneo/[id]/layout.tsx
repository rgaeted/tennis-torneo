import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TorneoNav from "./TorneoNav";

export default async function TorneoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: torneo } = await supabase
    .from("torneo")
    .select("nombre, edicion, anio")
    .eq("id", id)
    .single();

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-4">
        <Link href="/admin/torneo" className="hover:text-slate-400 transition-colors">
          Torneos
        </Link>
        <span>›</span>
        <span className="text-slate-400 truncate">
          {torneo?.nombre ?? "…"}
          {torneo && <span className="text-slate-600 ml-1">· {torneo.anio}</span>}
        </span>
      </div>

      <TorneoNav id={id} />

      {children}
    </div>
  );
}
