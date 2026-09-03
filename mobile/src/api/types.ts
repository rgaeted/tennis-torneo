export type MobileJugador = { id: string; nombre: string; apellido: string };

export type MobileTorneo = {
  id: string;
  nombre: string;
  edicion: string | number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
};

export type MobilePartido = {
  id: string;
  ronda: string;
  posicion: number;
  categoria: string;
  hora_inicio: string | null;
  cancha: string | null;
  started_at: string | null;
  ended_at: string | null;
  ganador_id: string | null;
  foto_url: string | null;
  resultado: {
    j1: number;
    j2: number;
    tb?: { j1: number; j2: number };
    puntos?: { j1: number; j2: number };
  }[] | null;
  jugador1: MobileJugador | null;
  jugador2: MobileJugador | null;
};
