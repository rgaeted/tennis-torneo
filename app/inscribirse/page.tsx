"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/types";

type Torneo = Database["public"]["Tables"]["torneo"]["Row"];
type Categoria = Database["public"]["Enums"]["categoria_tipo"];

const CATEGORIAS: Categoria[] = ["cuarta", "tercera", "segunda", "primera", "damas", "dobles"];

export default function InscribirsePage() {
  const router = useRouter();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [torneoId, setTorneoId] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("cuarta");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("torneo")
      .select("*")
      .eq("estado", "activo")
      .then(({ data }) => {
        setTorneos(data ?? []);
        if (data?.[0]) setTorneoId(data[0].id);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const res = await fetch("/api/pagos/preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ torneoId, categoria }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error); setLoading(false); return; }

    window.location.href = json.checkoutUrl;
  }

  const selectClass =
    "w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-green-500 text-sm";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">🎾 Inscribirme al torneo</h1>
        {torneos.length === 0 ? (
          <p className="text-gray-500">No hay torneos activos en este momento.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Torneo</label>
              <select
                value={torneoId}
                onChange={(e) => setTorneoId(e.target.value)}
                className={selectClass}
              >
                {torneos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} — ${t.monto_inscripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Categoria)}
                className={selectClass}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 disabled:opacity-50"
            >
              {loading ? "Redirigiendo a MercadoPago..." : "Pagar inscripción"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
