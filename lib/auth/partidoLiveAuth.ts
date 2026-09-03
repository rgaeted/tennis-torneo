import { isStaffForTorneo } from "./staffAccess";
import { createAdminClient } from "../supabase/server";
import { getRequestUser } from "../supabase/requestUser";

export async function authorizeLivePartidoAccess(request: Request, partidoId: string) {
  const user = await getRequestUser(request);
  if (!user) return { ok: false as const, status: 401, error: "No autenticado" };

  const admin = createAdminClient();
  const { data: partido } = await admin
    .from("partido")
    .select("jugador1_id, jugador2_id, cuadro_id, ronda, posicion, ganador_id")
    .eq("id", partidoId)
    .single();

  if (!partido) return { ok: false as const, status: 404, error: "Partido no encontrado" };

  const { data: jugador } = await admin
    .from("jugador")
    .select("rol, organizacion_id")
    .eq("id", user.id)
    .single();

  let torneoOrg: { organizacion_id: string | null } | null = null;
  if (partido.cuadro_id) {
    const { data: cuadro } = await admin
      .from("cuadro")
      .select("torneo_id")
      .eq("id", partido.cuadro_id)
      .single();
    if (cuadro) {
      const { data: torneo } = await admin
        .from("torneo")
        .select("organizacion_id")
        .eq("id", cuadro.torneo_id)
        .single();
      torneoOrg = torneo;
    }
  }

  const esStaff =
    jugador &&
    (torneoOrg
      ? isStaffForTorneo(jugador, torneoOrg)
      : jugador.rol === "admin" || jugador.rol === "turno");
  const esJugador = partido.jugador1_id === user.id || partido.jugador2_id === user.id;

  if (!esStaff && !esJugador) {
    return { ok: false as const, status: 403, error: "No autorizado" };
  }

  return { ok: true as const, user, partido, admin };
}
