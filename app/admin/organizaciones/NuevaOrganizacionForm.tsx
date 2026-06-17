"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaOrganizacionForm() {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/admin/organizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setNombre("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        placeholder="Nombre de la organización"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
        className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#C8FF00] transition-colors"
      />
      <button
        type="submit"
        disabled={loading}
        style={{ backgroundColor: "#C8FF00", color: "#0F0F0F" }}
        className="px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0"
      >
        {loading ? "..." : "Crear organización"}
      </button>
      {error && <p className="text-red-400 text-sm self-center">{error}</p>}
    </form>
  );
}
