import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import NuevaOrganizacionForm from "./NuevaOrganizacionForm";

export default async function OrganizacionesPage() {
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from("organizacion")
    .select("id, nombre, created_at")
    .order("nombre");

  // Contar miembros y torneos por organización
  const { data: miembros } = await supabase
    .from("jugador")
    .select("organizacion_id")
    .not("organizacion_id", "is", null);

  const { data: torneos } = await supabase
    .from("torneo")
    .select("organizacion_id")
    .not("organizacion_id", "is", null);

  const miembrosPorOrg = (miembros ?? []).reduce<Record<string, number>>((acc, j) => {
    if (j.organizacion_id) acc[j.organizacion_id] = (acc[j.organizacion_id] ?? 0) + 1;
    return acc;
  }, {});

  const torneosPorOrg = (torneos ?? []).reduce<Record<string, number>>((acc, t) => {
    if (t.organizacion_id) acc[t.organizacion_id] = (acc[t.organizacion_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizaciones</h1>
          <p style={{ color: "#666" }} className="text-sm mt-1">
            Gestiona las organizaciones y sus miembros organizadores.
          </p>
        </div>
      </div>

      <NuevaOrganizacionForm />

      <div className="mt-8 space-y-3">
        {(orgs ?? []).length === 0 ? (
          <div style={{ backgroundColor: "#161616", border: "1px solid #242424" }} className="rounded-xl px-6 py-10 text-center">
            <p style={{ color: "#555" }} className="text-sm">No hay organizaciones creadas aún.</p>
          </div>
        ) : (
          (orgs ?? []).map((org) => (
            <Link
              key={org.id}
              href={`/admin/organizaciones/${org.id}`}
              style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
              className="flex items-center justify-between rounded-xl px-5 py-4 hover:border-[#C8FF00]/50 transition-colors group"
            >
              <div>
                <p className="text-white font-semibold group-hover:text-[#C8FF00] transition-colors">
                  {org.nombre}
                </p>
                <p style={{ color: "#555" }} className="text-xs mt-0.5">
                  {miembrosPorOrg[org.id] ?? 0} organizador{(miembrosPorOrg[org.id] ?? 0) !== 1 ? "es" : ""}
                  {" · "}
                  {torneosPorOrg[org.id] ?? 0} torneo{(torneosPorOrg[org.id] ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <span style={{ color: "#C8FF00" }} className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Gestionar →
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
