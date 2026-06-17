"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Campos = {
  imagen_url: string;
  descripcion: string;
};

export default function TorneoDetalleEditor({
  torneoId,
  inicial,
}: {
  torneoId: string;
  inicial: Campos;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [campos, setCampos] = useState<Campos>(inicial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const changed =
    campos.imagen_url !== inicial.imagen_url ||
    campos.descripcion !== inicial.descripcion;

  function set(key: keyof Campos, value: string) {
    setCampos((prev) => ({ ...prev, [key]: value }));
    setMsg(null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMsg(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`/api/admin/torneo/${torneoId}/imagen`, {
      method: "POST",
      body: form,
    });

    setUploading(false);

    if (res.ok) {
      const { url } = await res.json();
      setCampos((prev) => ({ ...prev, imagen_url: url }));
      router.refresh();
    } else {
      const json = await res.json();
      setMsg(json.error ?? "Error al subir imagen");
    }
  }

  async function eliminarImagen() {
    if (!confirm("¿Eliminar la imagen del torneo?")) return;
    setSaving(true);
    const res = await fetch(`/api/admin/torneo/${torneoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagen_url: null }),
    });
    setSaving(false);
    if (res.ok) {
      setCampos((prev) => ({ ...prev, imagen_url: "" }));
      router.refresh();
    }
  }

  async function guardar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/torneo/${torneoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion: campos.descripcion || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Guardado");
      router.refresh();
    } else {
      const json = await res.json();
      setMsg(json.error ?? "Error al guardar");
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-court";

  const textChanged = campos.descripcion !== inicial.descripcion;

  return (
    <div className="space-y-4">
      {/* Imagen */}
      <div>
        <label className="text-xs text-slate-500 mb-2 block">Imagen</label>
        {campos.imagen_url ? (
          <div className="relative group w-full max-w-sm">
            <img
              src={campos.imagen_url}
              alt="Imagen del torneo"
              className="w-full h-40 object-cover rounded-lg border border-navy-700"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 bg-white/10 border border-white/30 text-white text-xs font-medium rounded-lg hover:bg-white/20 transition-colors"
              >
                Cambiar
              </button>
              <button
                onClick={eliminarImagen}
                disabled={saving}
                className="px-3 py-1.5 bg-red-900/60 border border-red-700 text-red-300 text-xs font-medium rounded-lg hover:bg-red-900 transition-colors"
              >
                Eliminar
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-navy-950/80 rounded-lg flex items-center justify-center">
                <span className="text-sm text-slate-300">Subiendo...</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center w-full max-w-sm h-32 border-2 border-dashed border-navy-700 rounded-lg hover:border-court hover:bg-court/5 transition-colors text-slate-500 hover:text-court disabled:opacity-40"
          >
            {uploading ? (
              <span className="text-sm">Subiendo...</span>
            ) : (
              <>
                <span className="text-2xl mb-1">↑</span>
                <span className="text-xs font-medium">Subir imagen</span>
                <span className="text-xs mt-0.5 opacity-60">JPG, PNG, WebP</span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
        <textarea
          value={campos.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Descripción del torneo..."
          rows={3}
          className={inputClass + " resize-none"}
        />
      </div>

      {textChanged && (
        <div className="flex items-center gap-3">
          <button
            onClick={guardar}
            disabled={saving}
            className="px-4 py-2 bg-court text-white text-sm font-bold rounded-lg hover:bg-court-dark disabled:opacity-40 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={() => { setCampos(inicial); setMsg(null); }}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {msg && (
        <p className={`text-xs ${msg === "Guardado" ? "text-court" : "text-red-400"}`}>{msg}</p>
      )}
    </div>
  );
}
