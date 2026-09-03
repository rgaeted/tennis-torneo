export type StaffJugador = { rol: string; organizacion_id: string | null };
export type StaffTorneo = { organizacion_id: string | null };

export function isStaffRol(rol: string | null | undefined): boolean {
  return rol === "admin" || rol === "organizador" || rol === "turno";
}

export function isStaffForTorneo(jugador: StaffJugador, torneo: StaffTorneo): boolean {
  if (jugador.rol === "admin" || jugador.rol === "turno") return true;
  if (
    jugador.rol === "organizador" &&
    jugador.organizacion_id &&
    torneo.organizacion_id &&
    jugador.organizacion_id === torneo.organizacion_id
  ) {
    return true;
  }
  return false;
}
