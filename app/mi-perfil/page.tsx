import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ESTADO_COLORS: Record<string, string> = {
  pagado: "bg-green-900 text-green-300",
  pendiente: "bg-yellow-900 text-yellow-300",
  rechazado: "bg-red-900 text-red-300",
};

export default async function MiPerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: jugador } = await supabase
    .from("jugador")
    .select("nombre, apellido, categoria_habitual")
    .eq("id", user.id)
    .single();

  const { data: inscripciones } = await supabase
    .from("inscripcion")
    .select("id, categoria, estado_pago, monto, created_at, torneo:torneo_id(nombre, edicion, anio)")
    .eq("jugador_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            {jugador?.nombre} {jugador?.apellido}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{user.email}</p>
        </div>
        <Link
          href="/inscribirse"
          className="px-4 py-2 bg-green-500 text-black font-bold rounded-lg text-sm hover:bg-green-400"
        >
          + Inscribirme
        </Link>
      </div>

      <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Mis inscripciones</h2>
      {(!inscripciones || inscripciones.length === 0) ? (
        <p className="text-gray-600">No estás inscripto a ningún torneo aún.</p>
      ) : (
        <div className="space-y-3">
          {(inscripciones as any[]).map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
            >
              <div>
                <div className="font-medium text-sm capitalize">
                  {i.torneo?.nombre} · {i.categoria}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Edición {i.torneo?.edicion} · {i.torneo?.anio} · ${i.monto}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[i.estado_pago] ?? ""}`}>
                {i.estado_pago}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
