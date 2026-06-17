"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Database } from "@/lib/supabase/types";

type Torneo = Database["public"]["Tables"]["torneo"]["Row"];
type Categoria = Database["public"]["Enums"]["categoria_tipo"];

export default function InscribirseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const torneoIdParam = searchParams.get("torneo") ?? "";
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [torneoId, setTorneoId] = useState(torneoIdParam);
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [loading, setLoading] = useState<"pagar" | "despues" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const torneoActual = torneos.find((t) => t.id === torneoId);
  const categoriasDisponibles: Categoria[] = torneoActual?.categorias ?? [];

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("torneo")
      .select("*")
      .eq("estado", "activo")
      .then(({ data }) => {
        const lista = data ?? [];
        setTorneos(lista);
        const inicial = torneoIdParam
          ? lista.find((t) => t.id === torneoIdParam) ?? lista[0]
          : lista[0];
        if (inicial) {
          setTorneoId(inicial.id);
          setCategoria(inicial.categorias?.[0] ?? "");
        }
      });
  }, []);

  // Reset categoria when torneo changes
  useEffect(() => {
    if (torneoActual) setCategoria(torneoActual.categorias?.[0] ?? "");
  }, [torneoId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePagar() {
    if (!categoria) return;
    setLoading("pagar");
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
    if (!res.ok) { setError(json.error); setLoading(null); return; }

    window.location.href = json.checkoutUrl;
  }

  async function handleDespues() {
    if (!categoria) return;
    setLoading("despues");
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const res = await fetch("/api/inscribirse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ torneoId, categoria }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error); setLoading(null); return; }

    router.push("/mi-perfil");
  }

  const selectClass =
    "w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg focus:outline-none focus:border-court text-sm text-white";

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">Inscribirme al torneo</h1>
        {torneos.length === 0 ? (
          <p className="text-slate-500">No hay torneos activos en este momento.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Torneo</label>
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
              <label className="block text-sm text-slate-400 mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Categoria)}
                className={selectClass}
              >
                {categoriasDisponibles.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handlePagar}
              disabled={loading !== null}
              className="w-full py-2.5 bg-court text-white font-bold rounded-lg hover:bg-court-dark disabled:opacity-50 transition-colors"
            >
              {loading === "pagar" ? "Redirigiendo a MercadoPago..." : "Pagar ahora"}
            </button>
            <button
              onClick={handleDespues}
              disabled={loading !== null}
              className="w-full py-2.5 bg-navy-800 border border-navy-600 text-slate-300 font-medium rounded-lg hover:bg-navy-700 hover:text-white disabled:opacity-50 transition-colors"
            >
              {loading === "despues" ? "Guardando..." : "Pagar después"}
            </button>
            <p className="text-xs text-slate-600 text-center">
              Si pagas después, tu inscripción quedará pendiente hasta confirmar el pago.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
