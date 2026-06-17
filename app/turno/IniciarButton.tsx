"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IniciarButton({ partidoId, canchas }: { partidoId: string; canchas: string[] }) {
  const router = useRouter();
  const [cancha, setCancha] = useState("");
  const [loading, setLoading] = useState(false);

  async function iniciar() {
    setLoading(true);
    const res = await fetch("/api/turno/iniciar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partidoId, cancha: cancha || null }),
    });
    setLoading(false);
    if (res.ok) router.push(`/live/${partidoId}/control`);
  }

  return (
    <div className="flex items-center gap-2">
      {canchas.length > 0 && (
        <select
          value={cancha}
          onChange={(e) => setCancha(e.target.value)}
          className="px-2 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-xs text-white focus:outline-none focus:border-court"
        >
          <option value="">Cancha</option>
          {canchas.map((c) => (
            <option key={c} value={c}>Cancha {c}</option>
          ))}
        </select>
      )}
      <button
        onClick={iniciar}
        disabled={loading}
        className="px-3 py-1.5 bg-court text-white text-xs font-bold rounded-lg hover:bg-court-dark disabled:opacity-40 transition-colors"
      >
        {loading ? "..." : "Iniciar"}
      </button>
    </div>
  );
}
