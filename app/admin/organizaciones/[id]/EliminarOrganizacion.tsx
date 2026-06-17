"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EliminarOrganizacion({ id, nombre }: { id: string; nombre: string }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function eliminar() {
    setLoading(true);
    const res = await fetch(`/api/admin/organizaciones/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/organizaciones");
    else setLoading(false);
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        style={{ color: "#555" }}
        className="text-xs hover:text-red-400 transition-colors mt-2 flex-shrink-0"
      >
        Eliminar organización
      </button>
    );
  }

  return (
    <div style={{ backgroundColor: "#1E1E1E", border: "1px solid #3A1A1A" }} className="rounded-xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
      <p className="text-xs text-red-300">¿Eliminar <strong>{nombre}</strong>?</p>
      <button
        onClick={eliminar}
        disabled={loading}
        className="text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
      >
        {loading ? "..." : "Confirmar"}
      </button>
      <button onClick={() => setConfirm(false)} style={{ color: "#555" }} className="text-xs hover:text-white">
        Cancelar
      </button>
    </div>
  );
}
