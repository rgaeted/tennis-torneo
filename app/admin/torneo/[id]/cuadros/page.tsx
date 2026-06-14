"use client";
import { useState } from "react";
import { useParams } from "next/navigation";

const CATEGORIAS = ["cuarta", "tercera", "segunda", "primera", "damas", "dobles"] as const;

export default function CuadrosPage() {
  const { id: torneoId } = useParams<{ id: string }>();
  const [categoria, setCategoria] = useState<string>("primera");
  const [tamano, setTamano] = useState<"16" | "32">("16");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function generarCuadro() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/cuadros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ torneoId, categoria, tamano }),
    });
    const json = await res.json();
    setMsg(res.ok ? "✅ Cuadro generado correctamente" : `❌ ${json.error}`);
    setLoading(false);
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">Generar cuadros</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-green-500"
          >
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Tamaño del cuadro</label>
          <div className="flex gap-2">
            {(["16", "32"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTamano(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  tamano === t ? "border-green-500 bg-green-900 text-green-300" : "border-gray-700 text-gray-400"
                }`}
              >
                {t} jugadores
              </button>
            ))}
          </div>
        </div>
        {msg && <p className="text-sm">{msg}</p>}
        <button
          onClick={generarCuadro}
          disabled={loading}
          className="w-full py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 disabled:opacity-50"
        >
          {loading ? "Generando..." : "Generar cuadro"}
        </button>
      </div>
    </div>
  );
}
