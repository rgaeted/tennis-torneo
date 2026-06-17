"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Estado = "borrador" | "activo" | "cerrado";

const ESTADOS: { value: Estado; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "activo",   label: "Activo"   },
  { value: "cerrado",  label: "Cerrado"  },
];

const COLORES: Record<Estado, string> = {
  borrador: "border-slate-600 bg-slate-800/40 text-slate-300",
  activo:   "border-court   bg-court/20    text-court",
  cerrado:  "border-red-700 bg-red-900/30  text-red-400",
};

const INACTIVO = "border-navy-700 text-slate-600 hover:border-navy-500 hover:text-slate-400";

export default function EstadoSelector({ torneoId, estadoActual }: { torneoId: string; estadoActual: Estado }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(estadoActual);
  const [saving, setSaving] = useState(false);

  async function cambiar(nuevoEstado: Estado) {
    if (nuevoEstado === estado || saving) return;
    setSaving(true);
    const res = await fetch(`/api/admin/torneo/${torneoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) {
      setEstado(nuevoEstado);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 mr-1">Estado:</span>
      {ESTADOS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => cambiar(value)}
          disabled={saving}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
            estado === value ? COLORES[value] : INACTIVO
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
