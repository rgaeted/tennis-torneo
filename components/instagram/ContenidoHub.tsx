import { PatrocinadoresEditor } from "./PatrocinadoresEditor";
import { GenerarStoryPanel } from "./GenerarStoryPanel";
import type { JugadorStory, PartidoStoryRow, PatrocinadorInput } from "@/lib/instagram/types";

type PatrocinadorRow = PatrocinadorInput & { id: string };

export function ContenidoHub({
  torneoId,
  torneoNombre,
  torneoEdicion,
  clubNombre,
  clubImagenUrl,
  patrocinadores,
  partidos,
  inscritos,
}: {
  torneoId: string;
  torneoNombre: string;
  torneoEdicion?: string | number | null;
  clubNombre: string | null;
  clubImagenUrl: string | null;
  patrocinadores: PatrocinadorRow[];
  partidos: Array<PartidoStoryRow & { categoria: string }>;
  inscritos: Array<{ categoria: string; jugador: JugadorStory }>;
}) {
  return (
    <>
      <PatrocinadoresEditor torneoId={torneoId} inicial={patrocinadores} />
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Generar story</h2>
        <GenerarStoryPanel
          torneoNombre={torneoNombre}
          torneoEdicion={torneoEdicion}
          clubNombre={clubNombre}
          clubImagenUrl={clubImagenUrl}
          patrocinadores={patrocinadores}
          partidos={partidos}
          inscritos={inscritos}
        />
      </div>
    </>
  );
}
