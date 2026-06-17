"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Club = { id: string; nombre: string; num_canchas: number };

export default function ClubSelector({
  torneoId,
  clubActual,
  clubs,
}: {
  torneoId: string;
  clubActual: { id: string; nombre: string; num_canchas: number } | null;
  clubs: Club[];
}) {
  const router = useRouter();
  const [clubId, setClubId] = useState(clubActual?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const changed = clubId !== (clubActual?.id ?? "");

  async function guardar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/torneo/${torneoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ club_id: clubId || null }),
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

  const selectClass =
    "px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-court";

  if (clubs.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No hay clubes registrados.{" "}
        <a href="/admin/clubes" className="text-court hover:underline">Crear un club →</a>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select value={clubId} onChange={(e) => { setClubId(e.target.value); setMsg(null); }} className={selectClass}>
        <option value="">Sin club asignado</option>
        {clubs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre} · {c.num_canchas} cancha{c.num_canchas !== 1 ? "s" : ""}
          </option>
        ))}
      </select>

      {changed && (
        <>
          <button
            onClick={guardar}
            disabled={saving}
            className="px-4 py-2 bg-court text-white text-sm font-bold rounded-lg hover:bg-court-dark disabled:opacity-40 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={() => { setClubId(clubActual?.id ?? ""); setMsg(null); }}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Cancelar
          </button>
        </>
      )}

      {msg && (
        <span className={`text-xs ${msg === "Guardado" ? "text-court" : "text-red-400"}`}>{msg}</span>
      )}
    </div>
  );
}
