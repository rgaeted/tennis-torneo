"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NuevoTorneoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const fd = new FormData(e.currentTarget);

    const { error } = await supabase.from("torneo").insert({
      nombre: fd.get("nombre") as string,
      edicion: Number(fd.get("edicion")),
      anio: Number(fd.get("anio")),
      fecha_inicio: fd.get("fecha_inicio") as string,
      fecha_fin: fd.get("fecha_fin") as string,
      monto_inscripcion: Number(fd.get("monto_inscripcion")),
      estado: "borrador",
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/admin/torneo");
  }

  const inputClass =
    "w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-green-500 text-sm";
  const labelClass = "block text-sm text-gray-400 mb-1";

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Nuevo torneo</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Nombre</label>
          <input name="nombre" type="text" required placeholder="Torneo Ciudad 2026" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Edición (1-4)</label>
            <input name="edicion" type="number" min={1} max={4} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Año</label>
            <input name="anio" type="number" defaultValue={new Date().getFullYear()} required className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Fecha inicio</label>
            <input name="fecha_inicio" type="date" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fecha fin</label>
            <input name="fecha_fin" type="date" required className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Monto inscripción ($)</label>
          <input name="monto_inscripcion" type="number" min={0} step={0.01} required className={inputClass} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Crear torneo"}
        </button>
      </form>
    </div>
  );
}
