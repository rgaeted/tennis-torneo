"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Org = { id: string; nombre: string };

export default function OrganizacionSelector({
  torneoId,
  orgActual,
  orgs,
}: {
  torneoId: string;
  orgActual: { id: string; nombre: string } | null;
  orgs: Org[];
}) {
  const router = useRouter();
  const [orgId, setOrgId] = useState(orgActual?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const changed = orgId !== (orgActual?.id ?? "");

  async function guardar() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/torneo/${torneoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizacion_id: orgId || null }),
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

  if (orgs.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No hay organizaciones.{" "}
        <a href="/admin/organizaciones" className="text-court hover:underline">Crear una →</a>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select value={orgId} onChange={(e) => { setOrgId(e.target.value); setMsg(null); }} className={selectClass}>
        <option value="">— Sin organización —</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>{o.nombre}</option>
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
            onClick={() => { setOrgId(orgActual?.id ?? ""); setMsg(null); }}
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
