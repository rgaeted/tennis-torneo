import { createClient } from "@/lib/supabase/server";
import { BracketView } from "@/components/bracket/BracketView";

export default async function BracketPage({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const supabase = await createClient();

  const { data: cuadro } = await supabase
    .from("cuadro")
    .select("id, categoria, tamano, torneo:torneo_id(nombre, edicion, anio)")
    .eq("categoria", categoria as any)
    .order("generado_en", { ascending: false })
    .limit(1)
    .single();

  if (!cuadro) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2 capitalize">Categoría {categoria}</h1>
        <p className="text-gray-500">No hay cuadro generado para esta categoría aún.</p>
      </div>
    );
  }

  const { data: partidos } = await supabase
    .from("partido")
    .select(`
      id, ronda, posicion, jugador1_id, jugador2_id, ganador_id,
      jugador1:jugador1_id (nombre, apellido),
      jugador2:jugador2_id (nombre, apellido)
    `)
    .eq("cuadro_id", cuadro.id)
    .order("ronda")
    .order("posicion");

  const torneo = cuadro.torneo as any;

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold capitalize">Categoría {categoria}</h1>
        <p className="text-gray-400 text-sm mt-1">
          {torneo?.nombre} · Edición {torneo?.edicion} · {torneo?.anio}
        </p>
        {partidos?.some((p: any) => !p.ganador_id) && (
          <div className="mt-2 inline-flex items-center gap-2 bg-red-900/40 border border-red-800 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-300 font-medium">En vivo</span>
          </div>
        )}
      </div>
      <BracketView partidos={(partidos as any[]) ?? []} />
    </div>
  );
}
