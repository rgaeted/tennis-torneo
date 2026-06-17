"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BracketView, type Partido } from "@/components/bracket/BracketView";
import { ProgramarModal } from "@/components/admin/ProgramarModal";

export default function BracketConAdmin({
  partidos,
  esAdmin,
  numCanchas,
}: {
  partidos: Partido[];
  esAdmin: boolean;
  numCanchas?: number;
}) {
  const router = useRouter();
  const [scheduleModal, setScheduleModal] = useState<Partido | null>(null);

  return (
    <>
      <BracketView
        partidos={partidos}
        onSchedule={esAdmin ? (p) => setScheduleModal(p) : undefined}
      />

      {scheduleModal && (
        <ProgramarModal
          partidoId={scheduleModal.id}
          jugador1={scheduleModal.jugador1 ? `${scheduleModal.jugador1.nombre} ${scheduleModal.jugador1.apellido}` : "Por definir"}
          jugador2={scheduleModal.jugador2 ? `${scheduleModal.jugador2.nombre} ${scheduleModal.jugador2.apellido}` : "Por definir"}
          horaInicioActual={scheduleModal.hora_inicio ?? null}
          canchaActual={scheduleModal.cancha ?? null}
          numCanchas={numCanchas}
          onClose={() => setScheduleModal(null)}
          onSuccess={() => { setScheduleModal(null); router.refresh(); }}
        />
      )}
    </>
  );
}
