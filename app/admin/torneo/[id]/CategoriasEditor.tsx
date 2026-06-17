"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Categoria = "cuarta" | "tercera" | "segunda" | "primera" | "damas" | "dobles";

const TODAS: Categoria[] = ["cuarta", "tercera", "segunda", "primera", "damas", "dobles"];

export default function CategoriasEditor({ torneoId, categoriasActuales }: { torneoId: string; categoriasActuales: Categoria[] }) {
  const router = useRouter();
  const [seleccionadas, setSeleccionadas] = useState<Set<Categoria>>(new Set(categoriasActuales));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(cat: Categoria) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
    setMsg(null);
  }

  async function guardar() {
    setLoading(true);
    setMsg(null);
    const categorias = TODAS.filter((c) => seleccionadas.has(c));
    const res = await fetch(`/api/admin/torneo/${torneoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorias }),
    });
    setLoading(false);
    if (res.ok) {
      setMsg("Categorías actualizadas");
      router.refresh();
    } else {
      const json = await res.json();
      setMsg(json.error ?? "Error al guardar");
    }
  }

  const changed =
    seleccionadas.size !== categoriasActuales.length ||
    [...seleccionadas].some((c) => !categoriasActuales.includes(c));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TODAS.map((cat) => {
        const activa = seleccionadas.has(cat);
        return (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${
              activa
                ? "border-court bg-court/20 text-court"
                : "border-navy-700 text-slate-500 hover:border-navy-500 hover:text-slate-300"
            }`}
          >
            {cat}
          </button>
        );
      })}
      {changed && (
        <button
          onClick={guardar}
          disabled={loading || seleccionadas.size === 0}
          className="px-3 py-1.5 bg-court text-white text-sm font-bold rounded-lg hover:bg-court-dark disabled:opacity-40 transition-colors"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      )}
      {msg && (
        <span className={`text-xs ${msg.includes("Error") ? "text-red-400" : "text-court"}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
