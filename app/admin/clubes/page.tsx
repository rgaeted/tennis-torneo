"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Club = {
  id: string;
  nombre: string;
  direccion: string | null;
  num_canchas: number;
  imagen_url: string | null;
  descripcion: string | null;
};

const inputClass =
  "w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court placeholder:text-slate-600";

function ClubCard({ club, onUpdated }: { club: Club; onUpdated: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState({
    nombre: club.nombre,
    direccion: club.direccion ?? "",
    num_canchas: club.num_canchas,
    descripcion: club.descripcion ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagen, setImagen] = useState(club.imagen_url ?? "");
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/clubes/${club.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: datos.nombre,
        direccion: datos.direccion || null,
        num_canchas: datos.num_canchas,
        descripcion: datos.descripcion || null,
      }),
    });
    setSaving(false);
    if (!res.ok) { const j = await res.json(); setError(j.error); return; }
    setEditando(false);
    onUpdated();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el club "${club.nombre}"?`)) return;
    const res = await fetch(`/api/admin/clubes/${club.id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json(); setError(j.error); return; }
    onUpdated();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/clubes/${club.id}/imagen`, { method: "POST", body: form });
    setUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      setImagen(url);
    } else {
      const j = await res.json();
      setError(j.error ?? "Error al subir imagen");
    }
  }

  async function eliminarImagen() {
    if (!confirm("¿Eliminar la imagen del club?")) return;
    const res = await fetch(`/api/admin/clubes/${club.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagen_url: null }),
    });
    if (res.ok) setImagen("");
  }

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden">
      {/* Imagen */}
      <div className="relative group">
        {imagen ? (
          <div className="relative h-32">
            <img src={imagen} alt={club.nombre} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 bg-white/10 border border-white/30 text-white text-xs font-medium rounded-lg hover:bg-white/20 transition-colors"
              >
                Cambiar
              </button>
              <button
                onClick={eliminarImagen}
                className="px-3 py-1.5 bg-red-900/60 border border-red-700 text-red-300 text-xs font-medium rounded-lg hover:bg-red-900 transition-colors"
              >
                Eliminar
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-navy-950/80 flex items-center justify-center">
                <span className="text-sm text-slate-300">Subiendo...</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center w-full h-20 border-b border-dashed border-navy-700 hover:border-court hover:bg-court/5 transition-colors text-slate-600 hover:text-court disabled:opacity-40"
          >
            {uploading ? (
              <span className="text-xs">Subiendo...</span>
            ) : (
              <>
                <span className="text-xl mb-0.5">↑</span>
                <span className="text-xs">Subir imagen</span>
              </>
            )}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
      </div>

      <div className="p-4">
        {editando ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nombre</label>
              <input className={inputClass} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Dirección</label>
              <input className={inputClass} value={datos.direccion} onChange={(e) => setDatos({ ...datos, direccion: e.target.value })} placeholder="Av. Ejemplo 123" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">N° de canchas</label>
              <input type="number" min={1} max={20} className={inputClass} value={datos.num_canchas} onChange={(e) => setDatos({ ...datos, num_canchas: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Descripción</label>
              <textarea rows={2} className={inputClass + " resize-none"} value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} placeholder="Descripción del club..." />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button onClick={guardar} disabled={saving} className="px-4 py-1.5 bg-court text-white text-sm font-bold rounded-lg hover:bg-court-dark disabled:opacity-40">
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => setEditando(false)} className="px-4 py-1.5 border border-navy-600 text-slate-400 text-sm rounded-lg hover:border-navy-500">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{club.nombre}</p>
              {club.direccion && <p className="text-xs text-slate-500 mt-0.5">{club.direccion}</p>}
              {club.descripcion && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{club.descripcion}</p>}
              <p className="text-xs text-slate-500 mt-1">{club.num_canchas} cancha{club.num_canchas !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex gap-2 ml-3 flex-shrink-0">
              <button onClick={() => setEditando(true)} className="text-xs px-3 py-1.5 border border-navy-600 text-slate-400 hover:text-white hover:border-navy-500 rounded-lg transition-colors">
                Editar
              </button>
              <button onClick={eliminar} className="text-xs px-3 py-1.5 border border-red-900 text-red-500 hover:bg-red-900/20 rounded-lg transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        )}
        {error && !editando && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    </div>
  );
}

export default function ClubesPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [newData, setNewData] = useState({ nombre: "", direccion: "", num_canchas: 2 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const supabase = createClient();
    const { data } = await supabase.from("club").select("*").order("nombre");
    setClubs((data as Club[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function crear() {
    if (!newData.nombre.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/clubes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newData),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error); return; }
    setNewData({ nombre: "", direccion: "", num_canchas: 2 });
    await cargar();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Clubes</h1>

      <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Agregar club</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nombre</label>
            <input className={inputClass} placeholder="Club de Tenis Ejemplo" value={newData.nombre} onChange={(e) => setNewData({ ...newData, nombre: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Dirección <span className="text-slate-600">(opcional)</span></label>
            <input className={inputClass} placeholder="Av. Ejemplo 123, Ciudad" value={newData.direccion} onChange={(e) => setNewData({ ...newData, direccion: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">N° de canchas</label>
            <input type="number" min={1} max={20} className={inputClass} value={newData.num_canchas} onChange={(e) => setNewData({ ...newData, num_canchas: Number(e.target.value) })} />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <button
          onClick={crear}
          disabled={saving || !newData.nombre.trim()}
          className="mt-4 px-4 py-2 bg-court text-white text-sm font-bold rounded-lg hover:bg-court-dark disabled:opacity-40 transition-colors"
        >
          {saving ? "Guardando..." : "Agregar club"}
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Cargando...</p>
      ) : clubs.length === 0 ? (
        <p className="text-slate-500 text-sm">No hay clubes registrados.</p>
      ) : (
        <div className="space-y-4">
          {clubs.map((c) => (
            <ClubCard key={c.id} club={c} onUpdated={cargar} />
          ))}
        </div>
      )}
    </div>
  );
}
