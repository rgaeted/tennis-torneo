export type NivelPatrocinador = "oro" | "plata";
export type PlantillaStory = "neon" | "clasico" | "bold";
export type TipoStory = "resultado" | "campeon" | "cuadro" | "patrocinador" | "jugador";

export type PatrocinadorInput = {
  id?: string;
  nombre: string;
  logo_url?: string | null;
  nivel: NivelPatrocinador;
  orden?: number;
  activo: boolean;
};

export type CaptionInput = {
  tipo: TipoStory;
  torneoNombre: string;
  categoria?: string | null;
  ronda?: string | null;
  lineaPrincipal: string;
  patrocinadores: PatrocinadorInput[];
};

export type JugadorStory = {
  id: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
};

export type StoryContext = {
  torneoNombre: string;
  torneoEdicion?: string | number | null;
  clubNombre: string | null;
  clubImagenUrl: string | null;
  patrocinadores: PatrocinadorInput[];
};

export type PartidoStoryRow = {
  id: string;
  ronda: string;
  posicion: number;
  ganador_id: string | null;
  resultado: { j1: number; j2: number }[] | null;
  jugador1_id: string | null;
  jugador2_id: string | null;
  jugador1: JugadorStory | null;
  jugador2: JugadorStory | null;
};

export type StoryPayload =
  | (StoryContext & {
      tipo: "resultado";
      categoria: string;
      ronda: string;
      j1: JugadorStory;
      j2: JugadorStory;
      score: string;
    })
  | (StoryContext & {
      tipo: "campeon";
      categoria: string;
      campeon: JugadorStory;
    })
  | (StoryContext & {
      tipo: "cuadro";
      categoria: string;
      ronda: string;
      lineas: string[];
    })
  | (StoryContext & {
      tipo: "patrocinador";
      destacado: PatrocinadorInput;
    })
  | (StoryContext & {
      tipo: "jugador";
      categoria: string;
      jugador: JugadorStory;
      logro: string;
    });
