import { createClient } from "./server";

/** Retorna el user si es admin O si es organizador con acceso al torneo indicado. */
export async function requireTorneoAccess(torneoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: jugador } = await supabase
    .from("jugador")
    .select("rol, organizacion_id")
    .eq("id", user.id)
    .single();

  if (!jugador) return null;
  if (jugador.rol === "admin") return user;

  if (jugador.rol === "organizador" && jugador.organizacion_id) {
    const { data: torneo } = await supabase
      .from("torneo")
      .select("organizacion_id")
      .eq("id", torneoId)
      .single();
    if (torneo?.organizacion_id === jugador.organizacion_id) return user;
  }

  return null;
}

/** Para APIs que solo tienen cuadroId: busca el torneoId y delega. */
export async function requireCuadroAccess(cuadroId: string) {
  const supabase = await createClient();
  const { data: cuadro } = await supabase
    .from("cuadro")
    .select("torneo_id")
    .eq("id", cuadroId)
    .single();
  if (!cuadro) return null;
  return requireTorneoAccess(cuadro.torneo_id);
}

/** Para APIs que solo tienen partidoId: busca cuadro -> torneo y delega. */
export async function requirePartidoAccess(partidoId: string) {
  const supabase = await createClient();
  const { data: partido } = await supabase
    .from("partido")
    .select("cuadro:cuadro_id(torneo_id)")
    .eq("id", partidoId)
    .single();
  const torneoId = (partido as any)?.cuadro?.torneo_id;
  if (!torneoId) return null;
  return requireTorneoAccess(torneoId);
}
