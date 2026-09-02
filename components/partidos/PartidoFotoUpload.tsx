"use client";

import { useState } from "react";

export function PartidoFotoUpload({
  partidoId,
  fotoUrl,
  canUpload,
  onChange,
  compact = false,
}: {
  partidoId: string;
  fotoUrl: string | null;
  canUpload: boolean;
  onChange: (url: string | null) => void;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(file: File) {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/admin/partidos/${partidoId}/foto`, { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error al subir");
      return;
    }
    onChange(data.url);
  }

  async function eliminar() {
    if (!confirm("¿Eliminar la foto del partido?")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/partidos/${partidoId}/foto`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al eliminar");
      return;
    }
    onChange(null);
  }

  if (!canUpload) {
    return (
      <p className={`text-slate-500 ${compact ? "text-xs" : "text-sm"}`}>
        Define ambos jugadores para subir foto.
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className={`text-slate-400 ${compact ? "text-xs" : "text-sm"}`}>Foto del partido</p>
      {fotoUrl ? (
        <div className="space-y-2">
          <img
            src={fotoUrl}
            alt="Foto del partido"
            className={`rounded-lg object-cover border border-navy-600 ${compact ? "max-h-40 w-full" : "max-h-56 w-full"}`}
          />
          <div className="flex flex-wrap gap-2">
            <label className="text-xs px-3 py-1.5 border border-navy-600 rounded-lg text-slate-300 hover:text-white cursor-pointer">
              Reemplazar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={loading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) subir(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={eliminar}
              disabled={loading}
              className="text-xs px-3 py-1.5 border border-red-900 text-red-400 rounded-lg disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <label className="inline-flex text-xs px-3 py-1.5 border border-navy-600 rounded-lg text-slate-300 hover:text-white cursor-pointer">
          {loading ? "Subiendo…" : "Subir foto"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) subir(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
