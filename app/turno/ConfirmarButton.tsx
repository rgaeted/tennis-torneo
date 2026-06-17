"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmarButton({ partidoId }: { partidoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirmar() {
    setLoading(true);
    const res = await fetch("/api/turno/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partidoId }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={confirmar}
      disabled={loading}
      className="px-3 py-1.5 border border-court text-court text-xs font-bold rounded-lg hover:bg-court/10 disabled:opacity-40 transition-colors"
    >
      {loading ? "..." : "Confirmar"}
    </button>
  );
}
