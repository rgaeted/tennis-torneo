"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/types";

type Categoria = Database["public"]["Enums"]["categoria_tipo"];
type Club = { id: string; nombre: string; num_canchas: number };
type Org = { id: string; nombre: string };

const TODAS_CATEGORIAS: Categoria[] = ["cuarta", "tercera", "segunda", "primera", "damas", "dobles"];

export default function NuevoTorneoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Set<Categoria>>(new Set(TODAS_CATEGORIAS));
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState<string>("");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string>("");

  useEffect(() => {
    const sb = createClient();
    sb.from("club").select("id, nombre, num_canchas").order("nombre")
      .then(({ data }) => {
        const list = (data as Club[]) ?? [];
        setClubs(list);
        if (list.length > 0) setClubId(list[0].id);
      });
    sb.from("organizacion").select("id, nombre").order("nombre")
      .then(({ data }) => setOrgs((data as Org[]) ?? []));
  }, []);

  function toggleCategoria(c: Categoria) {
    setCategorias((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (categorias.size === 0) { setError("Debes seleccionar al menos una categoría."); return; }
    if (!clubId) { setError("Debes seleccionar un club."); return; }
    if (!orgId) { setError("Debes seleccionar una organización."); return; }
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
      club_id: clubId,
      categorias: TODAS_CATEGORIAS.filter((c) => categorias.has(c)),
      estado: "borrador",
      organizacion_id: orgId,
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/admin/torneo");
  }

  const inputClass =
    "w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg focus:outline-none focus:border-court text-sm text-white placeholder:text-slate-500";
  const labelClass = "block text-sm text-slate-400 mb-1";

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

        {/* Club */}
        <div>
          <label className={labelClass}>Club</label>
          {clubs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay clubes registrados.{" "}
              <a href="/admin/clubes" className="text-court hover:underline">Crear un club primero →</a>
            </p>
          ) : (
            <select
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className={inputClass}
              required
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.num_canchas} cancha{c.num_canchas !== 1 ? "s" : ""})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Organización */}
        <div>
          <label className={labelClass}>Organización</label>
          {orgs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay organizaciones.{" "}
              <a href="/admin/organizaciones" className="text-court hover:underline">Crear una primero →</a>
            </p>
          ) : (
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">— Selecciona una organización —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          )}
        </div>

        {/* Categorías */}
        <div>
          <label className={labelClass}>Categorías del torneo</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {TODAS_CATEGORIAS.map((c) => {
              const activa = categorias.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategoria(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    activa
                      ? "border-court bg-court/20 text-court"
                      : "border-navy-700 text-slate-500 hover:border-navy-500"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            {categorias.size} categoría{categorias.size !== 1 ? "s" : ""} seleccionada{categorias.size !== 1 ? "s" : ""}
          </p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || clubs.length === 0 || orgs.length === 0}
          className="w-full py-2 bg-court text-white font-bold rounded-lg hover:bg-court-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Guardando..." : "Crear torneo"}
        </button>
      </form>
    </div>
  );
}
