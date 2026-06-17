"use client";
import { useState } from "react";

type Rol = "admin" | "jugador" | "turno";

const ROLES: Rol[] = ["jugador", "turno", "admin"];

const ROL_LABEL: Record<Rol, string> = {
  admin: "Admin",
  jugador: "Jugador",
  turno: "Turno",
};

export default function RolSelector({ jugadorId, rolActual }: { jugadorId: string; rolActual: Rol }) {
  const [rol, setRol] = useState<Rol>(rolActual);
  const [saving, setSaving] = useState(false);

  async function cambiarRol(nuevoRol: Rol) {
    if (nuevoRol === rol) return;
    setSaving(true);
    const res = await fetch("/api/admin/jugadores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jugadorId, rol: nuevoRol }),
    });
    if (res.ok) setRol(nuevoRol);
    setSaving(false);
  }

  return (
    <div className="flex gap-1">
      {ROLES.map((r) => (
        <button
          key={r}
          onClick={() => cambiarRol(r)}
          disabled={saving}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
            rol === r
              ? r === "admin"
                ? "border-ball bg-ball/20 text-ball"
                : r === "turno"
                ? "border-court bg-court/20 text-court"
                : "border-navy-600 bg-navy-800 text-white"
              : "border-navy-700 text-slate-600 hover:border-navy-600 hover:text-slate-400"
          } disabled:opacity-40`}
        >
          {ROL_LABEL[r]}
        </button>
      ))}
    </div>
  );
}
