"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PatrocinadorInput, NivelPatrocinador } from "@/lib/instagram/types";

type PatrocinadorRow = PatrocinadorInput & { id: string };

export function PatrocinadoresEditor({
  torneoId,
  inicial,
}: {
  torneoId: string;
  inicial: PatrocinadorRow[];
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [nivel, setNivel] = useState<NivelPatrocinador>("plata");
  const [orden, setOrden] = useState(0);
  const [loading, setLoading] = useState<string | null>(null);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setLoading("new");
    await fetch("/api/admin/patrocinadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ torneoId, nombre, nivel, orden }),
    });
    setLoading(null);
    setNombre("");
    router.refresh();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setLoading(id);
    await fetch(`/api/admin/patrocinadores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(null);
    router.refresh();
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar patrocinador?")) return;
    setLoading(id);
    await fetch(`/api/admin/patrocinadores/${id}`, { method: "DELETE" });
    setLoading(null);
    router.refresh();
  }

  async function subirLogo(id: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    setLoading(id);
    await fetch(`/api/admin/patrocinadores/${id}/logo`, { method: "POST", body: fd });
    setLoading(null);
    router.refresh();
  }

  function lista(nivelFiltro: NivelPatrocinador) {
    return inicial
      .filter((p) => p.nivel === nivelFiltro)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }

  function renderSeccion(titulo: string, nivelFiltro: NivelPatrocinador) {
    const items = lista(nivelFiltro);
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {titulo}
        </h3>
        {items.length === 0 ? (
          <p className="text-slate-600 text-sm">Sin patrocinadores {nivelFiltro}.</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 bg-navy-800/40 border border-navy-700 rounded-lg px-3 py-2"
              >
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.nombre} className="h-10 w-16 object-contain bg-white/5 rounded" />
                ) : (
                  <div className="h-10 w-16 bg-navy-700 rounded flex items-center justify-center text-[10px] text-slate-500">
                    Sin logo
                  </div>
                )}
                <span className="text-sm text-white flex-1 min-w-[8rem]">{p.nombre}</span>
                <label className="text-xs text-slate-500">
                  Orden
                  <input
                    type="number"
                    defaultValue={p.orden ?? 0}
                    className="ml-1 w-14 px-1 py-0.5 bg-navy-900 border border-navy-600 rounded text-white text-xs"
                    onBlur={(e) => patch(p.id, { orden: Number(e.target.value) })}
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={p.activo}
                    onChange={(e) => patch(p.id, { activo: e.target.checked })}
                  />
                  Activo
                </label>
                <select
                  value={p.nivel}
                  onChange={(e) => patch(p.id, { nivel: e.target.value })}
                  className="text-xs bg-navy-900 border border-navy-600 rounded px-2 py-1"
                >
                  <option value="oro">Oro</option>
                  <option value="plata">Plata</option>
                </select>
                <label className="text-xs px-2 py-1 border border-navy-600 rounded cursor-pointer text-slate-400 hover:text-white">
                  Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) subirLogo(p.id, f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => borrar(p.id)}
                  disabled={loading === p.id}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl p-5">
      <h2 className="text-lg font-semibold mb-4">Patrocinadores</h2>
      {inicial.length === 0 && (
        <p className="text-slate-500 text-sm mb-4">
          Aún no hay patrocinadores. Agrégalos para que aparezcan en las stories.
        </p>
      )}
      {renderSeccion("Oro", "oro")}
      {renderSeccion("Plata", "plata")}
      <form onSubmit={crear} className="flex flex-wrap gap-2 items-end pt-4 border-t border-navy-800">
        <label className="text-xs text-slate-500 flex flex-col gap-1">
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm min-w-[12rem]"
            placeholder="Empresa"
          />
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">
          Nivel
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value as NivelPatrocinador)}
            className="px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm"
          >
            <option value="oro">Oro</option>
            <option value="plata">Plata</option>
          </select>
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">
          Orden
          <input
            type="number"
            value={orden}
            onChange={(e) => setOrden(Number(e.target.value))}
            className="px-3 py-2 bg-navy-950 border border-navy-600 rounded-lg text-sm w-20"
          />
        </label>
        <button
          type="submit"
          disabled={loading === "new"}
          className="px-4 py-2 text-sm border border-court/40 text-court rounded-lg hover:bg-court/10"
        >
          Agregar
        </button>
      </form>
    </div>
  );
}
